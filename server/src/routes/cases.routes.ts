import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, getClient } from '../db';
import { authenticateToken, optionalAuth } from '../auth/middleware';
import { upload, saveFile, getFileViewUrl } from '../services/storage.service';
import { logAudit } from '../services/audit.service';
import { CaseStatus, UserRole } from '../types';

const router = Router();

// Abuse protection: limit report creation to 20 reports per 15 minutes per IP
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { detail: 'Reporting rate limit reached. Please wait before filing more reports.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Abuse protection: limit evidence file uploads to 30 files per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { detail: 'Upload rate limit reached. Please wait before uploading more files.' },
  skip: () => process.env.NODE_ENV === 'test',
});

const VALID_TRANSITIONS: Record<string, Record<string, UserRole[]>> = {
  DRAFT: { SUBMITTED: ['CITIZEN'] },
  SUBMITTED: {
    REVIEWED: ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
    REJECTED: ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
  },
  REVIEWED: {
    FORWARDED: ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
    DUPLICATE: ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
  },
  FORWARDED: {
    ACKNOWLEDGED: ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
  },
  ACKNOWLEDGED: {
    IN_PROGRESS: ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
  },
  IN_PROGRESS: {
    RESOLUTION_REPORTED: ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
    ESCALATED: ['SUPERVISOR', 'ADMIN'],
    UNABLE_TO_RESOLVE: ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
  },
  RESOLUTION_REPORTED: {
    VERIFICATION_PENDING: ['OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN'],
  },
  VERIFICATION_PENDING: {
    VERIFIED_RESOLVED: ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
    DISPUTED_CLOSURE: ['CITIZEN'],
  },
  DISPUTED_CLOSURE: {
    IN_PROGRESS: ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
    VERIFIED_RESOLVED: ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
  },
  REJECTED: {
    SUBMITTED: ['CITIZEN'],
  },
  ESCALATED: {
    IN_PROGRESS: ['SUPERVISOR', 'ADMIN'],
  },
};

function generateCaseNumber(): string {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CC-${yyyymmdd}-${rand}`;
}

// GET /api/v1/cases/nearby
router.get('/nearby', optionalAuth, async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(String(req.query.lat || '12.9784'));
    const lng = parseFloat(String(req.query.lng || '77.6408'));
    const radiusKm = parseFloat(String(req.query.radius_km || '5.0'));
    const radiusDeg = radiusKm / 111.0;

    const result = await query(
      `SELECT c.id, c.case_number, c.status, c.landmark, c.latitude, c.longitude, 
              c.is_hotspot, c.created_at, cat.name_en AS category_name
       FROM cases_case c
       JOIN areas_category cat ON c.category_id = cat.id
       WHERE c.status != 'DRAFT'
         AND c.latitude BETWEEN $1 AND $2
         AND c.longitude BETWEEN $3 AND $4
       ORDER BY c.created_at DESC
       LIMIT 50;`,
      [lat - radiusDeg, lat + radiusDeg, lng - radiusDeg, lng + radiusDeg]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ detail: 'Failed to retrieve nearby cases.' });
  }
});

// Realtime SSE Clients registry
const sseClients = new Set<Response>();

export function broadcastCaseEvent(event: {
  type: 'CASE_STATUS_CHANGED' | 'CASE_CREATED' | 'OBSERVATION_ADDED' | 'DISPUTE_RAISED';
  case_id?: string;
  case_number?: string;
  new_status?: string;
  actor_name?: string;
  timestamp: string;
}) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  });
}

// GET /api/v1/cases/events — Realtime Server-Sent Events stream
router.get('/events', optionalAuth, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat ping every 25 seconds to keep connection alive
  const pingTimer = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(pingTimer);
    sseClients.delete(res);
  });
});

// GET /api/v1/cases/analytics — 100% Real Database Analytics
router.get('/analytics', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const totalResult = await query('SELECT count(*) FROM cases_case WHERE status != \'DRAFT\';');
    const totalCases = parseInt(totalResult.rows[0].count, 10);

    const statusCountsResult = await query(
      "SELECT status, count(*) AS count FROM cases_case WHERE status != 'DRAFT' GROUP BY status;"
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusCountsResult.rows) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    const timesResult = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at)) / 3600.0) AS avg_ack_hours,
        AVG(EXTRACT(EPOCH FROM (resolved_at - acknowledged_at)) / 3600.0) AS avg_res_hours
      FROM cases_case;
    `);

    const avgAckHours = timesResult.rows[0].avg_ack_hours ? Number(parseFloat(timesResult.rows[0].avg_ack_hours).toFixed(1)) : 0.0;
    const avgResHours = timesResult.rows[0].avg_res_hours ? Number(parseFloat(timesResult.rows[0].avg_res_hours).toFixed(1)) : 0.0;

    const resolvedCount = byStatus['VERIFIED_RESOLVED'] || 0;
    const closedAttempts = resolvedCount + (byStatus['UNABLE_TO_RESOLVE'] || 0) + (byStatus['REJECTED'] || 0) + (byStatus['IN_PROGRESS'] || 0);
    const resolutionRate = closedAttempts > 0 ? Number(((resolvedCount / closedAttempts) * 100).toFixed(1)) : 0.0;

    const citizensCountRes = await query("SELECT count(*) FROM accounts_user WHERE role = 'CITIZEN' AND is_active = true;");
    const activeCitizens = parseInt(citizensCountRes.rows[0].count, 10);

    const hotspotCountRes = await query("SELECT count(*) FROM cases_case WHERE is_hotspot = true;");
    const hotspotCount = parseInt(hotspotCountRes.rows[0].count, 10);

    const disputedCountRes = await query("SELECT count(*) FROM cases_case WHERE status = 'DISPUTED_CLOSURE';");
    const disputedCount = parseInt(disputedCountRes.rows[0].count, 10);

    res.json({
      total_cases: totalCases,
      by_status: byStatus,
      avg_ack_hours: avgAckHours,
      avg_res_hours: avgResHours,
      verified_resolution_rate: resolutionRate,
      hotspots_count: hotspotCount,
      disputed_count: disputedCount,
      active_volunteers: activeCitizens,
    });
  } catch (err: any) {
    console.error('[cases/analytics] Error:', err);
    res.status(500).json({ detail: 'Failed to compute analytics.' });
  }
});

// GET /api/v1/cases/
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const user = req.user;
  const page = parseInt(String(req.query.page || '1'), 10);
  const pageSize = parseInt(String(req.query.page_size || '20'), 10);
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  // RBAC Filter
  if (user && user.role === 'CITIZEN' && req.query.scope === 'mine') {
    conditions.push(`c.primary_reporter_id = $${paramIdx++}`);
    params.push(user.id);
  } else if (user && user.role === 'OPERATOR' && req.query.scope === 'mine') {
    conditions.push(`(c.assigned_operator_id = $${paramIdx++} OR c.assigned_operator_id IS NULL)`);
    params.push(user.id);
  } else if (!user || user.role === 'CITIZEN') {
    // Public directory shows non-draft cases
    conditions.push(`c.status != 'DRAFT'`);
  }
  // MODERATOR, SUPERVISOR, ADMIN see all

  // Status Filter
  if (req.query.status) {
    const statuses = String(req.query.status).split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      conditions.push(`c.status = ANY($${paramIdx++}::text[])`);
      params.push(statuses);
    }
  }

  // Category Filter
  if (req.query.category) {
    conditions.push(`(c.category_id::text = $${paramIdx} OR cat.slug = $${paramIdx})`);
    params.push(String(req.query.category));
    paramIdx++;
  }

  // Search filter
  if (req.query.search) {
    const searchVal = `%${String(req.query.search).trim()}%`;
    conditions.push(`(c.case_number ILIKE $${paramIdx} OR c.description ILIKE $${paramIdx} OR c.landmark ILIKE $${paramIdx})`);
    params.push(searchVal);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Count total
    const countRes = await query(
      `SELECT count(*) FROM cases_case c JOIN areas_category cat ON c.category_id = cat.id ${whereClause};`,
      params
    );
    const totalCount = parseInt(countRes.rows[0].count, 10);

    // Fetch page rows
    const listQuery = `
      SELECT 
        c.id, c.case_number, c.status, c.description, c.landmark, c.latitude, c.longitude,
        c.is_hotspot, c.created_at, c.updated_at, c.acknowledged_at, c.resolved_at, c.verified_at,
        cat.id AS cat_id, cat.name_en AS cat_name_en, cat.name_hi AS cat_name_hi, cat.slug AS cat_slug,
        sa.id AS sa_id, sa.name AS sa_name, sa.name_hi AS sa_name_hi,
        u.id AS rep_id, u.display_name AS rep_name,
        op.id AS op_id, op.display_name AS op_name,
        (
          SELECT f.file FROM cases_caseevidence f 
          WHERE f.case_id = c.id 
          ORDER BY f.created_at DESC LIMIT 1
        ) AS latest_evidence_file
      FROM cases_case c
      JOIN areas_category cat ON c.category_id = cat.id
      LEFT JOIN areas_servicearea sa ON c.service_area_id = sa.id
      JOIN accounts_user u ON c.primary_reporter_id = u.id
      LEFT JOIN accounts_user op ON c.assigned_operator_id = op.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;
    params.push(pageSize, offset);

    const result = await query(listQuery, params);

    const items = await Promise.all(result.rows.map(async row => {
      const evidenceUrl = row.latest_evidence_file ? await getFileViewUrl(row.latest_evidence_file) : null;
      return {
        id: row.id,
        case_number: row.case_number,
        status: row.status,
        description: row.description,
        landmark: row.landmark,
        latitude: row.latitude,
        longitude: row.longitude,
        is_hotspot: row.is_hotspot,
        created_at: row.created_at,
        updated_at: row.updated_at,
        acknowledged_at: row.acknowledged_at,
        resolved_at: row.resolved_at,
        verified_at: row.verified_at,
        category: {
          id: row.cat_id,
          name_en: row.cat_name_en,
          name_hi: row.cat_name_hi,
          slug: row.cat_slug,
        },
        service_area: row.sa_id ? {
          id: row.sa_id,
          name: row.sa_name,
          name_hi: row.sa_name_hi,
        } : null,
        primary_reporter: {
          id: row.rep_id,
          display_name: row.rep_name,
        },
        assigned_operator: row.op_id ? {
          id: row.op_id,
          display_name: row.op_name,
        } : null,
        thumbnail: evidenceUrl,
      };
    }));

    res.json({
      count: totalCount,
      next: offset + pageSize < totalCount ? `/api/v1/cases/?page=${page + 1}` : null,
      previous: page > 1 ? `/api/v1/cases/?page=${page - 1}` : null,
      results: items,
    });
  } catch (err: any) {
    console.error('[cases/list] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve cases.' });
  }
});

// POST /api/v1/cases/ — Create new case
const CreateCaseSchema = z.object({
  category_id: z.string().uuid().optional(),
  category: z.string().uuid().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  landmark: z.string().min(2, 'Landmark is required.'),
  latitude: z.number({ required_error: 'Latitude coordinate is required.' }),
  longitude: z.number({ required_error: 'Longitude coordinate is required.' }),
  service_area_id: z.string().uuid().optional().nullable(),
  service_area: z.string().uuid().optional().nullable(),
  is_hotspot: z.boolean().optional().default(false),
}).refine(data => Boolean(data.category_id || data.category), {
  message: 'Category is required.',
  path: ['category_id'],
});

router.post('/', authenticateToken, reportLimiter, async (req: Request, res: Response) => {
  const parseResult = CreateCaseSchema.safeParse(req.body);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    const message = firstIssue ? firstIssue.message : 'Invalid case submission data.';
    res.status(400).json({ detail: message, errors: parseResult.error.format() });
    return;
  }

  const user = req.user!;
  const data = parseResult.data;
  const categoryId = (data.category_id || data.category)!;
  const caseId = crypto.randomUUID();
  const caseNumber = generateCaseNumber();
  const transitionId = crypto.randomUUID();
  const now = new Date();

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Default to specified service area, or first active service area if not specified
    let serviceAreaId = data.service_area_id || data.service_area || null;
    if (!serviceAreaId) {
      const saRes = await client.query('SELECT id FROM areas_servicearea WHERE is_active = true LIMIT 1;');
      if (saRes.rows.length > 0) {
        serviceAreaId = saRes.rows[0].id;
      }
    }

    // Insert Case
    const insertCaseQuery = `
      INSERT INTO cases_case 
        (id, case_number, status, description, landmark, latitude, longitude,
         is_hotspot, primary_reporter_id, category_id, service_area_id, created_at, updated_at)
      VALUES ($1, $2, 'SUBMITTED', $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      RETURNING *;
    `;
    const caseResult = await client.query(insertCaseQuery, [
      caseId,
      caseNumber,
      data.description,
      data.landmark,
      data.latitude,
      data.longitude,
      data.is_hotspot,
      user.id,
      categoryId,
      serviceAreaId || null,
      now,
    ]);

    // Insert Initial Transition DRAFT -> SUBMITTED
    await client.query(
      `INSERT INTO cases_casetransition (id, case_id, from_status, to_status, actor_id, reason, created_at)
       VALUES ($1, $2, 'DRAFT', 'SUBMITTED', $3, 'Initial citizen submission', $4);`,
      [transitionId, caseId, user.id, now]
    );

    // Credit Karma Points (e.g. 10 points for submission)
    const ledgerId = crypto.randomUUID();
    const idempotencyKey = `report_${caseId}`;
    await client.query(
      `INSERT INTO rewards_rewardledger (id, user_id, points, reason, related_case_id, idempotency_key, created_at)
       VALUES ($1, $2, 10, 'Issue reported', $3, $4, $5)
       ON CONFLICT (idempotency_key) DO NOTHING;`,
      [ledgerId, user.id, caseId, idempotencyKey, now]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: user.id,
      action: 'CASE_CREATED',
      resource_type: 'CASE',
      resource_id: caseId,
      changes: { case_number: caseNumber, status: 'SUBMITTED' },
      ip_address: req.ip,
    });

    broadcastCaseEvent({
      type: 'CASE_CREATED',
      case_id: caseId,
      case_number: caseNumber,
      new_status: 'SUBMITTED',
      actor_name: user.display_name,
      timestamp: now.toISOString(),
    });

    res.status(201).json(caseResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[cases/create] Error:', err);
    res.status(500).json({ detail: 'Failed to create case.' });
  } finally {
    client.release();
  }
});

// GET /api/v1/cases/:id/ — Full detail with timeline, evidence, observations
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const caseId = req.params.id;

  try {
    const caseQuery = `
      SELECT 
        c.*,
        cat.id AS cat_id, cat.name_en AS cat_name_en, cat.name_hi AS cat_name_hi, cat.slug AS cat_slug,
        sa.id AS sa_id, sa.name AS sa_name, sa.name_hi AS sa_name_hi,
        u.id AS rep_id, u.display_name AS rep_name,
        op.id AS op_id, op.display_name AS op_name
      FROM cases_case c
      JOIN areas_category cat ON c.category_id = cat.id
      LEFT JOIN areas_servicearea sa ON c.service_area_id = sa.id
      JOIN accounts_user u ON c.primary_reporter_id = u.id
      LEFT JOIN accounts_user op ON c.assigned_operator_id = op.id
      WHERE c.id::text = $1 OR c.case_number = $1
      LIMIT 1;
    `;
    const caseRes = await query(caseQuery, [caseId]);

    if (caseRes.rows.length === 0) {
      res.status(404).json({ detail: 'Case not found.' });
      return;
    }

    const c = caseRes.rows[0];

    // Restrict unpublished draft access
    if (c.status === 'DRAFT' && (!req.user || req.user.id !== c.primary_reporter_id)) {
      res.status(404).json({ detail: 'Case not found.' });
      return;
    }

    // Fetch Transitions
    const transRes = await query(
      `SELECT t.*, u.display_name AS actor_name
       FROM cases_casetransition t
       JOIN accounts_user u ON t.actor_id = u.id
       WHERE t.case_id = $1
       ORDER BY t.created_at ASC;`,
      [c.id]
    );

    // Fetch Evidence
    const evidRes = await query(
      `SELECT * FROM cases_caseevidence WHERE case_id = $1 ORDER BY created_at ASC;`,
      [c.id]
    );
    const evidenceList = await Promise.all(evidRes.rows.map(async e => ({
      id: e.id,
      evidence_type: e.evidence_type,
      file: await getFileViewUrl(e.file),
      content_type: e.content_type,
      file_size: e.file_size,
      ai_metadata: e.ai_metadata,
      created_at: e.created_at,
    })));

    // Fetch Observations
    const obsRes = await query(
      `SELECT o.*, u.display_name AS reporter_name
       FROM cases_caseobservation o
       JOIN accounts_user u ON o.reporter_id = u.id
       WHERE o.case_id = $1
       ORDER BY o.observed_at ASC;`,
      [c.id]
    );

    // Fetch Feedback
    const fbRes = await query(
      `SELECT f.*, u.display_name AS user_name
       FROM cases_feedback f
       JOIN accounts_user u ON f.user_id = u.id
       WHERE f.case_id = $1
       ORDER BY f.created_at DESC;`,
      [c.id]
    );

    res.json({
      id: c.id,
      case_number: c.case_number,
      status: c.status,
      description: c.description,
      landmark: c.landmark,
      latitude: c.latitude,
      longitude: c.longitude,
      is_hotspot: c.is_hotspot,
      external_reference: c.external_reference,
      rejection_reason: c.rejection_reason,
      created_at: c.created_at,
      updated_at: c.updated_at,
      acknowledged_at: c.acknowledged_at,
      resolved_at: c.resolved_at,
      verified_at: c.verified_at,
      category: {
        id: c.cat_id,
        name_en: c.cat_name_en,
        name_hi: c.cat_name_hi,
        slug: c.cat_slug,
      },
      service_area: c.sa_id ? {
        id: c.sa_id,
        name: c.sa_name,
        name_hi: c.sa_name_hi,
      } : null,
      primary_reporter: {
        id: c.rep_id,
        display_name: c.rep_name,
      },
      assigned_operator: c.op_id ? {
        id: c.op_id,
        display_name: c.op_name,
      } : null,
      transitions: transRes.rows.map(t => ({
        id: t.id,
        from_status: t.from_status,
        to_status: t.to_status,
        actor_name: t.actor_name,
        reason: t.reason,
        evidence_refs: t.evidence_refs,
        created_at: t.created_at,
      })),
      evidence: evidenceList,
      observations: obsRes.rows,
      feedbacks: fbRes.rows,
    });
  } catch (err: any) {
    console.error('[cases/detail] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve case detail.' });
  }
});

// POST /api/v1/cases/:id/transition/
router.post('/:id/transition', authenticateToken, async (req: Request, res: Response) => {
  const user = req.user!;
  const caseId = req.params.id;
  const { new_status, reason, evidence_refs } = req.body;

  if (!new_status) {
    res.status(400).json({ detail: 'new_status is required.' });
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const cRes = await client.query('SELECT * FROM cases_case WHERE id = $1 FOR UPDATE;', [caseId]);
    if (cRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ detail: 'Case not found.' });
      return;
    }

    const currentCase = cRes.rows[0];
    const currentStatus = currentCase.status;

    // Check State Machine Transition
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions[new_status]) {
      await client.query('ROLLBACK');
      res.status(400).json({
        detail: `Invalid transition from ${currentStatus} to ${new_status}.`,
      });
      return;
    }

    const allowedRoles = allowedTransitions[new_status];
    if (!user.is_superuser && !allowedRoles.includes(user.role)) {
      await client.query('ROLLBACK');
      res.status(403).json({
        detail: `User with role ${user.role} cannot perform transition to ${new_status}.`,
      });
      return;
    }

    // Determine timestamp updates
    const now = new Date();
    let ackAt = currentCase.acknowledged_at;
    let resAt = currentCase.resolved_at;
    let verAt = currentCase.verified_at;

    if (new_status === 'ACKNOWLEDGED' && !ackAt) ackAt = now;
    if ((new_status === 'RESOLUTION_REPORTED' || new_status === 'VERIFIED_RESOLVED') && !resAt) resAt = now;
    if (new_status === 'VERIFIED_RESOLVED' && !verAt) verAt = now;

    // Update Case
    await client.query(
      `UPDATE cases_case 
       SET status = $1, acknowledged_at = $2, resolved_at = $3, verified_at = $4, updated_at = $5
       WHERE id = $6;`,
      [new_status, ackAt, resAt, verAt, now, caseId]
    );

    // Record Transition
    const transId = crypto.randomUUID();
    await client.query(
      `INSERT INTO cases_casetransition (id, case_id, from_status, to_status, actor_id, reason, evidence_refs, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [transId, caseId, currentStatus, new_status, user.id, reason || '', evidence_refs ? JSON.stringify(evidence_refs) : null, now]
    );

    // If Verified Resolved, reward reporter with 25 points
    if (new_status === 'VERIFIED_RESOLVED') {
      const ledgerId = crypto.randomUUID();
      const idempotencyKey = `verified_${caseId}`;
      await client.query(
        `INSERT INTO rewards_rewardledger (id, user_id, points, reason, related_case_id, idempotency_key, created_at)
         VALUES ($1, $2, 25, 'Report verified resolved by municipal team', $3, $4, $5)
         ON CONFLICT (idempotency_key) DO NOTHING;`,
        [ledgerId, currentCase.primary_reporter_id, caseId, idempotencyKey, now]
      );
    }

    await client.query('COMMIT');

    await logAudit({
      actor_id: user.id,
      action: 'CASE_TRANSITIONED',
      resource_type: 'CASE',
      resource_id: caseId,
      changes: { from: currentStatus, to: new_status, reason },
      ip_address: req.ip,
    });

    broadcastCaseEvent({
      type: 'CASE_STATUS_CHANGED',
      case_id: caseId,
      case_number: currentCase.case_number,
      new_status,
      actor_name: user.display_name,
      timestamp: now.toISOString(),
    });

    res.json({
      status: 'success',
      detail: `Case transitioned to ${new_status}.`,
      case_id: caseId,
      new_status,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[cases/transition] Error:', err);
    res.status(500).json({ detail: 'Failed to perform transition.' });
  } finally {
    client.release();
  }
});

// POST /api/v1/cases/:id/evidence/ — Upload evidence file
router.post('/:id/evidence', authenticateToken, uploadLimiter, upload.single('file'), async (req: Request, res: Response) => {
  const caseId = req.params.id;
  const user = req.user!;
  const file = req.file;

  if (!file) {
    res.status(400).json({ detail: 'No file uploaded.' });
    return;
  }

  const evidenceType = req.body.evidence_type || 'PHOTO';

  try {
    const saved = await saveFile(file, 'evidence');
    const evidId = crypto.randomUUID();

    const insertQuery = `
      INSERT INTO cases_caseevidence (id, case_id, uploaded_by_id, evidence_type, file, content_type, file_size, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *;
    `;
    const result = await query(insertQuery, [
      evidId,
      caseId,
      user.id,
      evidenceType,
      saved.key,
      file.mimetype,
      file.size,
    ]);

    const created = result.rows[0];
    res.status(201).json({
      id: created.id,
      case_id: created.case_id,
      evidence_type: created.evidence_type,
      file: saved.url,
      content_type: created.content_type,
      file_size: created.file_size,
      created_at: created.created_at,
    });
  } catch (err: any) {
    console.error('[cases/evidence] Error:', err);
    res.status(500).json({ detail: 'Failed to upload evidence.' });
  }
});

// POST /api/v1/cases/:id/observations/
router.post('/:id/observations', authenticateToken, async (req: Request, res: Response) => {
  const caseId = req.params.id;
  const user = req.user!;
  const { description, latitude, longitude } = req.body;

  if (!description) {
    res.status(400).json({ detail: 'Description is required.' });
    return;
  }

  try {
    const obsId = crypto.randomUUID();
    const result = await query(
      `INSERT INTO cases_caseobservation (id, case_id, reporter_id, description, latitude, longitude, observed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *;`,
      [obsId, caseId, user.id, description, latitude || null, longitude || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ detail: 'Failed to add observation.' });
  }
});

// POST /api/v1/cases/:id/feedback/
router.post('/:id/feedback', authenticateToken, async (req: Request, res: Response) => {
  const caseId = req.params.id;
  const user = req.user!;
  const { rating, comment, is_dispute, feedback_type } = req.body;

  try {
    const fbId = crypto.randomUUID();
    const result = await query(
      `INSERT INTO cases_feedback (id, case_id, user_id, feedback_type, rating, comment, is_dispute, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *;`,
      [
        fbId,
        caseId,
        user.id,
        feedback_type || (is_dispute ? 'DISPUTE' : 'SATISFACTION'),
        rating || null,
        comment || '',
        Boolean(is_dispute),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ detail: 'Failed to submit feedback.' });
  }
});

export default router;
