import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt';
import { query } from '../db';
import { DbUser, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: DbUser;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    res.status(401).json({ detail: 'Authentication credentials were not provided.' });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ detail: 'Given token not valid for any token type', code: 'token_not_valid' });
    return;
  }

  try {
    const result = await query<DbUser>(
      'SELECT * FROM accounts_user WHERE id = $1 AND is_active = true LIMIT 1;',
      [payload.user_id]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ detail: 'User not found or inactive.' });
      return;
    }

    req.user = result.rows[0];
    next();
  } catch (err: any) {
    res.status(500).json({ detail: 'Internal authentication error.' });
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return next();
  }

  const payload = verifyAccessToken(token);
  if (payload) {
    try {
      const result = await query<DbUser>(
        'SELECT * FROM accounts_user WHERE id = $1 AND is_active = true LIMIT 1;',
        [payload.user_id]
      );
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    } catch {
      // Ignore in optional
    }
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ detail: 'Authentication required.' });
      return;
    }

    if (req.user.is_superuser || roles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({ detail: 'You do not have permission to perform this action.' });
  };
}
