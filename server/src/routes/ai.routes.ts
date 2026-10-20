import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, optionalAuth } from '../auth/middleware';
import { query } from '../db';
import {
  checkAIHealth,
  triageCivicIssue,
  refineIssueDescription,
  detectDuplicateReport,
  summarizeCaseTimeline,
  reviewResolutionNotes,
} from '../services/openai.service';

const router = Router();

// Dedicated rate limiter for AI operations: max 20 requests per 15 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  validate: { xForwardedForHeader: false },
  message: { detail: 'AI request limit reached for this session. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/v1/ai/status — Diagnostic health check (never returns secret keys)
router.get('/status', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const health = await checkAIHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({
      configured: false,
      operational: false,
      model: 'gpt-4o-mini',
      status: 'network_error',
      message: err.message || 'Diagnostic health check failed.',
      checked_at: new Date().toISOString(),
    });
  }
});

// Alias for convenience
router.get('/health', optionalAuth, async (_req: Request, res: Response) => {
  const health = await checkAIHealth();
  res.json(health);
});

// POST /api/v1/ai/triage — AI-assisted categorization using REAL DB categories
router.post('/triage', optionalAuth, aiLimiter, async (req: Request, res: Response) => {
  const { description, landmark, category_slug } = req.body;

  if (!description || !String(description).trim()) {
    res.status(400).json({ detail: 'description is required for category triage.' });
    return;
  }

  try {
    // 1. Fetch real active categories from Neon database
    const catRes = await query('SELECT slug, name_en FROM areas_category WHERE is_active = true ORDER BY sort_order ASC;');
    const categories = catRes.rows.map(r => ({ slug: r.slug, name_en: r.name_en }));

    // 2. Perform AI classification
    const result = await triageCivicIssue(
      String(description).trim(),
      String(landmark || '').trim(),
      categories,
      category_slug ? String(category_slug) : undefined
    );

    res.json(result);
  } catch (err: any) {
    console.warn('[ai/triage] Notice:', err.message);
    res.status(503).json({
      detail: err.message || 'AI triage service is temporarily unavailable.',
    });
  }
});

// POST /api/v1/ai/refine — Drafting assistant for clearer reports
router.post('/refine', authenticateToken, aiLimiter, async (req: Request, res: Response) => {
  const { description, landmark } = req.body;

  if (!description || String(description).trim().length < 5) {
    res.status(400).json({ detail: 'Please provide at least 5 characters to refine your description.' });
    return;
  }

  try {
    const result = await refineIssueDescription(
      String(description).trim(),
      landmark ? String(landmark).trim() : undefined
    );
    res.json(result);
  } catch (err: any) {
    console.warn('[ai/refine] Notice:', err.message);
    res.status(503).json({
      detail: err.message || 'AI description refinement is temporarily unavailable.',
    });
  }
});

// POST /api/v1/ai/check-duplicate — Duplicate report detection using real database cases
router.post('/check-duplicate', authenticateToken, aiLimiter, async (req: Request, res: Response) => {
  const { description, category_slug, latitude, longitude } = req.body;

  if (!description) {
    res.status(400).json({ detail: 'description is required for duplicate checking.' });
    return;
  }

  const hasValidCoordinates =
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;

  if (!hasValidCoordinates) {
    res.status(400).json({
      detail: 'Valid latitude and longitude are required for location-aware duplicate checking. Select the incident location first.',
      field: 'coordinates',
    });
    return;
  }

  try {
    const lat = latitude as number;
    const lng = longitude as number;
    const radiusDeg = 1.0 / 111.0; // Approximate 1 km latitude bounding box.

    // Query active non-closed cases around the actual supplied incident coordinates.
    const casesRes = await query(
      `SELECT case_number, description, landmark, status 
       FROM cases_case 
       WHERE status NOT IN ('VERIFIED_RESOLVED', 'REJECTED', 'DRAFT')
         AND latitude BETWEEN $1 AND $2
         AND longitude BETWEEN $3 AND $4
       ORDER BY created_at DESC 
       LIMIT 5;`,
      [lat - radiusDeg, lat + radiusDeg, lng - radiusDeg, lng + radiusDeg]
    );

    const result = await detectDuplicateReport(
      String(description).trim(),
      String(category_slug || 'general'),
      casesRes.rows
    );

    res.json(result);
  } catch (err: any) {
    console.warn('[ai/check-duplicate] Notice:', err.message);
    res.status(503).json({
      detail: err.message || 'AI duplicate checking is temporarily unavailable.',
    });
  }
});

// GET /api/v1/ai/cases/:id/summary — Summarize real case timeline
router.get('/cases/:id/summary', authenticateToken, aiLimiter, async (req: Request, res: Response) => {
  const caseId = req.params.id;

  try {
    const caseRes = await query(
      `SELECT id, case_number, status, description, landmark, primary_reporter_id 
       FROM cases_case WHERE id = $1;`,
      [caseId]
    );

    if (caseRes.rows.length === 0) {
      res.status(404).json({ detail: 'Case not found.' });
      return;
    }

    const c = caseRes.rows[0];

    // Fetch real transitions
    const transRes = await query(
      `SELECT t.from_status, t.to_status, t.reason, t.created_at, u.display_name AS actor_name
       FROM cases_casetransition t
       LEFT JOIN accounts_user u ON t.actor_id = u.id
       WHERE t.case_id = $1
       ORDER BY t.created_at ASC;`,
      [caseId]
    );

    const summary = await summarizeCaseTimeline(
      c.case_number,
      c.status,
      c.description,
      c.landmark,
      transRes.rows
    );

    res.json(summary);
  } catch (err: any) {
    console.warn('[ai/case-summary] Notice:', err.message);
    res.status(503).json({
      detail: err.message || 'AI case summary is temporarily unavailable.',
    });
  }
});

// POST /api/v1/ai/verify — Advisory resolution analysis (NON-AUTHORITATIVE)
router.post('/verify', authenticateToken, aiLimiter, async (req: Request, res: Response) => {
  const { case_description, resolution_notes } = req.body;

  if (!case_description || !resolution_notes) {
    res.status(400).json({ detail: 'case_description and resolution_notes are required.' });
    return;
  }

  try {
    const result = await reviewResolutionNotes(
      String(case_description).trim(),
      String(resolution_notes).trim()
    );

    // Keep backwards compatibility fields for existing UI while marking advisory nature
    res.json({
      verification_passed: result.operator_notes_clear,
      confidence_score: result.operator_notes_clear ? 0.9 : 0.4,
      assessment: result.advisory_notes,
      deficiencies_found: result.operator_notes_clear ? [] : ['Detailed clearance confirmation required'],
      advisory_note: 'AI evaluation is advisory only. Authoritative closure requires verified operator photographic proof.',
      requires_human_verification: true,
      checklist_items_covered: result.checklist_items_covered,
    });
  } catch (err: any) {
    console.warn('[ai/verify] Notice:', err.message);
    res.status(503).json({
      detail: err.message || 'AI advisory review is temporarily unavailable.',
    });
  }
});

export default router;
