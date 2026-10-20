import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticateToken, optionalAuth } from '../auth/middleware';

const router = Router();

function getKarmaTier(points: number): string {
  if (points >= 500) return 'PLATINUM';
  if (points >= 200) return 'GOLD';
  if (points >= 75) return 'SILVER';
  return 'BRONZE';
}

// GET /api/v1/rewards/my-points/
router.get('/my-points', authenticateToken, async (req: Request, res: Response) => {
  const user = req.user!;

  try {
    const pointsRes = await query(
      'SELECT COALESCE(SUM(points), 0) AS total_points FROM rewards_rewardledger WHERE user_id = $1;',
      [user.id]
    );
    const totalPoints = parseInt(pointsRes.rows[0].total_points, 10);

    const historyRes = await query(
      `SELECT id, points, reason, created_at, related_case_id 
       FROM rewards_rewardledger 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20;`,
      [user.id]
    );

    res.json({
      total_points: totalPoints,
      karma_tier: getKarmaTier(totalPoints),
      user_id: user.id,
      display_name: user.display_name,
      history: historyRes.rows,
    });
  } catch (err: any) {
    console.error('[rewards/my-points] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve rewards.' });
  }
});

// GET /api/v1/rewards/leaderboard/
// Query params:
//   - type: 'citizen' | 'officer' (default: 'citizen')
//   - area_id: optional UUID of service area
router.get('/leaderboard', optionalAuth, async (req: Request, res: Response) => {
  const type = String(req.query.type || 'citizen').toLowerCase();
  const areaId = req.query.area_id ? String(req.query.area_id) : null;

  try {
    let areaName = 'All Service Areas';
    if (areaId) {
      const areaRes = await query('SELECT name, name_hi FROM areas_servicearea WHERE id = $1 LIMIT 1;', [areaId]);
      if (areaRes.rows.length > 0) {
        areaName = areaRes.rows[0].name;
      }
    }

    if (type === 'officer') {
      const officerResult = await query(
        `SELECT 
           u.id AS user_id, 
           u.display_name, 
           u.role,
           COUNT(c.id)::int AS assigned_cases,
           COUNT(CASE WHEN c.status = 'VERIFIED_RESOLVED' THEN 1 END)::int AS verified_resolved,
           COUNT(CASE WHEN c.status IN ('ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLUTION_REPORTED', 'VERIFICATION_PENDING') THEN 1 END)::int AS active_workload,
           COUNT(CASE WHEN c.status = 'DISPUTED_CLOSURE' THEN 1 END)::int AS disputed_cases,
           CASE 
             WHEN COUNT(c.id) > 0 
             THEN ROUND((COUNT(CASE WHEN c.status = 'VERIFIED_RESOLVED' THEN 1 END)::numeric / COUNT(c.id)::numeric) * 100, 1)::float
             ELSE 0.0 
           END AS resolution_rate_pct,
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
         LEFT JOIN cases_case c ON u.id = c.assigned_operator_id AND ($1::uuid IS NULL OR c.service_area_id = $1::uuid)
         WHERE u.is_active = true 
           AND (u.role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN') OR c.id IS NOT NULL)
         GROUP BY u.id, u.display_name, u.role
         ORDER BY verified_resolved DESC, resolution_rate_pct DESC, assigned_cases DESC
         LIMIT 25;`,
        [areaId]
      );

      const officerLeaderboard = officerResult.rows.map((row, idx) => ({
        rank: idx + 1,
        user_id: row.user_id,
        display_name: row.display_name,
        role: row.role,
        assigned_cases: row.assigned_cases,
        verified_resolved: row.verified_resolved,
        active_workload: row.active_workload,
        disputed_cases: row.disputed_cases,
        resolution_rate_pct: row.resolution_rate_pct,
        avg_resolution_hours: row.avg_resolution_hours,
      }));

      res.json({
        type: 'officer',
        ward: areaName,
        area_id: areaId,
        area_name: areaName,
        last_updated: new Date().toISOString(),
        leaderboard: officerLeaderboard,
      });
      return;
    }

    // Default: Citizen Leaderboard
    const result = await query(
      `SELECT 
         u.id AS user_id, 
         u.display_name, 
         u.preferred_language,
         COALESCE(SUM(l.points), 0)::int AS total_points,
         COUNT(DISTINCT l.related_case_id)::int AS verified_reports
       FROM accounts_user u
       JOIN rewards_rewardledger l ON u.id = l.user_id
       LEFT JOIN cases_case c ON l.related_case_id = c.id
       WHERE u.is_active = true
         AND u.role = 'CITIZEN'
         AND ($1::uuid IS NULL OR c.service_area_id = $1::uuid)
       GROUP BY u.id, u.display_name, u.preferred_language
       ORDER BY total_points DESC
       LIMIT 25;`,
      [areaId]
    );

    const leaderboard = result.rows.map((row, idx) => ({
      rank: idx + 1,
      user_id: row.user_id,
      display_name: row.display_name,
      total_points: row.total_points,
      verified_reports: row.verified_reports,
      karma_tier: getKarmaTier(row.total_points),
    }));

    res.json({
      type: 'citizen',
      ward: areaName,
      area_id: areaId,
      area_name: areaName,
      last_updated: new Date().toISOString(),
      leaderboard,
    });
  } catch (err: any) {
    console.error('[rewards/leaderboard] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve leaderboard.' });
  }
});

// GET /api/v1/rewards/configs/
router.get('/configs', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM rewards_rewardconfig WHERE is_active = true ORDER BY points_value DESC;'
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ detail: 'Failed to retrieve reward configs.' });
  }
});

export default router;
