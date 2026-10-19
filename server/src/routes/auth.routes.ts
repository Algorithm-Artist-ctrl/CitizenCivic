import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db';
import { hashPassword, verifyPassword } from '../auth/hash';
import { generateTokens, verifyRefreshToken } from '../auth/jwt';
import { authenticateToken, requireRole, optionalAuth } from '../auth/middleware';
import { logAudit } from '../services/audit.service';
import { DbUser } from '../types';

const router = Router();

// Abuse protection: limit authentication attempts to 30 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { detail: 'Too many authentication attempts. Please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address.').transform(s => s.trim().toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  password_confirm: z.string().optional(),
  display_name: z.string().min(1, 'Display name is required.').max(150),
  preferred_language: z.enum(['en', 'hi']).default('en'),
}).refine(data => !data.password_confirm || data.password === data.password_confirm, {
  message: 'Passwords do not match.',
  path: ['password_confirm'],
});

const LoginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Password is required.'),
});

// POST /api/v1/auth/register/
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const parseResult = RegisterSchema.safeParse(req.body);
  if (!parseResult.success) {
    const formatted = parseResult.error.format();
    const errors: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(formatted)) {
      if (key !== '_errors' && (val as any)._errors) {
        errors[key] = (val as any)._errors;
      }
    }
    res.status(400).json(errors);
    return;
  }

  const { email, password, display_name, preferred_language } = parseResult.data;

  try {
    // Check existing email or username
    const existing = await query('SELECT id FROM accounts_user WHERE email = $1 OR username = $1 LIMIT 1;', [email]);
    if (existing.rows.length > 0) {
      res.status(400).json({ email: ['A user with this email already exists.'] });
      return;
    }

    const userId = crypto.randomUUID();
    const hashedPassword = hashPassword(password);
    const now = new Date();

    const result = await query<DbUser>(
      `INSERT INTO accounts_user 
       (id, email, username, password, display_name, first_name, last_name, role, preferred_language, 
        is_verified, is_staff, is_superuser, is_active, date_joined, created_at, updated_at)
       VALUES ($1, $2, $2, $3, $4, '', '', 'CITIZEN', $5, true, false, false, true, $6, $6, $6)
       RETURNING id, email, username, display_name, role, preferred_language, is_verified, created_at, updated_at;`,
      [userId, email, hashedPassword, display_name, preferred_language, now]
    );

    const user = result.rows[0];

    await logAudit({
      actor_id: user.id,
      action: 'USER_REGISTERED',
      resource_type: 'USER',
      resource_id: user.id,
      ip_address: req.ip,
    });

    res.status(201).json(user);
  } catch (err: any) {
    console.error('[auth/register] Error:', err);
    res.status(500).json({ detail: 'An unexpected error occurred during registration.' });
  }
});

// POST /api/v1/auth/login/ and POST /api/v1/auth/token/
async function handleLogin(req: Request, res: Response) {
  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ detail: 'Invalid login payload.' });
    return;
  }

  const identifier = (parseResult.data.email || parseResult.data.username || '').trim().toLowerCase();
  const password = parseResult.data.password;

  if (!identifier) {
    res.status(400).json({ detail: 'Email or username is required.' });
    return;
  }

  try {
    const result = await query<DbUser>(
      'SELECT * FROM accounts_user WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1;',
      [identifier]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ detail: 'No active account found with the given credentials' });
      return;
    }

    const user = result.rows[0];
    const isPasswordValid = verifyPassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ detail: 'No active account found with the given credentials' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ detail: 'User account is deactivated.' });
      return;
    }

    // Update last_login
    await query('UPDATE accounts_user SET last_login = NOW() WHERE id = $1;', [user.id]);

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json(tokens);
  } catch (err: any) {
    console.error('[auth/login] Error:', err);
    res.status(500).json({ detail: 'Internal server error during authentication.' });
  }
}

router.post('/login', authLimiter, handleLogin);
router.post('/token', authLimiter, handleLogin);

// POST /api/v1/auth/token/refresh/
router.post('/token/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.body?.refresh;
  if (!refreshToken) {
    res.status(400).json({ detail: 'Refresh token is required.' });
    return;
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    res.status(401).json({ detail: 'Token is invalid or expired', code: 'token_not_valid' });
    return;
  }

  try {
    const result = await query<DbUser>(
      'SELECT id, email, role, is_active FROM accounts_user WHERE id = $1 LIMIT 1;',
      [payload.user_id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      res.status(401).json({ detail: 'User not found or inactive.' });
      return;
    }

    const user = result.rows[0];
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json(tokens);
  } catch (err: any) {
    res.status(500).json({ detail: 'Error refreshing token.' });
  }
});

// GET /api/v1/auth/profile/
router.get('/profile', authenticateToken, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    preferred_language: user.preferred_language,
    is_verified: user.is_verified,
    created_at: user.created_at,
    updated_at: user.updated_at,
  });
});

// PATCH /api/v1/auth/profile/
router.patch('/profile', authenticateToken, async (req: Request, res: Response) => {
  const user = req.user!;
  const displayName = req.body.display_name !== undefined ? String(req.body.display_name).trim() : user.display_name;
  const lang = req.body.preferred_language && ['en', 'hi'].includes(req.body.preferred_language)
    ? req.body.preferred_language
    : user.preferred_language;

  try {
    const result = await query<DbUser>(
      `UPDATE accounts_user 
       SET display_name = $1, preferred_language = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING id, email, username, display_name, role, preferred_language, is_verified, created_at, updated_at;`,
      [displayName, lang, user.id]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ detail: 'Failed to update profile.' });
  }
});

// GET /api/v1/auth/officers/ — Public listing of approved municipal officers
router.get('/officers', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        u.id, 
        u.display_name, 
        u.role, 
        u.is_verified, 
        u.created_at,
        COUNT(c.id)::int AS assigned_cases_count,
        COUNT(CASE WHEN c.status = 'VERIFIED_RESOLVED' THEN 1 END)::int AS verified_resolved_count
      FROM accounts_user u
      LEFT JOIN cases_case c ON u.id = c.assigned_operator_id
      WHERE u.is_active = true 
        AND u.is_verified = true
        AND u.role IN ('OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN')
      GROUP BY u.id, u.display_name, u.role, u.is_verified, u.created_at
      ORDER BY verified_resolved_count DESC, u.created_at ASC;
    `);

    res.json({
      count: result.rows.length,
      officers: result.rows.map(row => ({
        id: row.id,
        display_name: row.display_name,
        role: row.role,
        is_verified: row.is_verified,
        assigned_cases_count: row.assigned_cases_count,
        verified_resolved_count: row.verified_resolved_count,
        created_at: row.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[auth/officers] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve public officer profiles.' });
  }
});

// GET /api/v1/auth/officers/:id — Single approved public officer dossier
router.get('/officers/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        u.id, 
        u.display_name, 
        u.role, 
        u.is_verified, 
        u.created_at,
        COUNT(c.id)::int AS assigned_cases_count,
        COUNT(CASE WHEN c.status = 'VERIFIED_RESOLVED' THEN 1 END)::int AS verified_resolved_count,
        ROUND(
          COALESCE(
            AVG(
              CASE 
                WHEN c.status = 'VERIFIED_RESOLVED' AND (c.resolved_at IS NOT NULL OR c.verified_at IS NOT NULL)
                THEN EXTRACT(EPOCH FROM (COALESCE(c.resolved_at, c.verified_at) - COALESCE(c.acknowledged_at, c.created_at))) / 3600.0 
                ELSE NULL 
              END
            ), 
            0
          )::numeric, 
          1
        )::float AS avg_resolution_hours
      FROM accounts_user u
      LEFT JOIN cases_case c ON u.id = c.assigned_operator_id
      WHERE u.id::text = $1 
        AND u.is_active = true 
        AND u.is_verified = true
        AND u.role IN ('OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN')
      GROUP BY u.id, u.display_name, u.role, u.is_verified, u.created_at
      LIMIT 1;
    `, [req.params.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ detail: 'Officer profile not found or not authorized for public display.' });
      return;
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      display_name: row.display_name,
      role: row.role,
      is_verified: row.is_verified,
      assigned_cases_count: row.assigned_cases_count,
      verified_resolved_count: row.verified_resolved_count,
      avg_resolution_hours: row.avg_resolution_hours,
      created_at: row.created_at,
    });
  } catch (err: any) {
    console.error('[auth/officers/:id] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve officer profile.' });
  }
});

// GET /api/v1/auth/admin/users — Admin-only user management roster
router.get('/admin/users', authenticateToken, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        id, email, username, display_name, role, is_verified, is_active, is_staff, is_superuser,
        date_joined, last_login, created_at, updated_at
      FROM accounts_user
      ORDER BY date_joined DESC;
    `);

    // Aggregate counts
    const roleCounts: Record<string, number> = {};
    for (const u of result.rows) {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    }

    res.json({
      total_users: result.rows.length,
      role_counts: roleCounts,
      users: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        role: u.role,
        is_verified: u.is_verified,
        is_active: u.is_active,
        date_joined: u.date_joined,
        last_login: u.last_login,
      })),
    });
  } catch (err: any) {
    console.error('[auth/admin/users] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve admin user roster.' });
  }
});

// POST /api/v1/auth/logout/
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ detail: 'Successfully logged out.' });
});

export default router;
