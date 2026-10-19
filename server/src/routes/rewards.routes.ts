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
router.get('/leaderboard', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT 
         u.id AS user_id, 
         u.display_name, 
         u.preferred_language,
         COALESCE(SUM(l.points), 0) AS total_points,
         COUNT(DISTINCT l.related_case_id) AS verified_reports
       FROM accounts_user u
       JOIN rewards_rewardledger l ON u.id = l.user_id
       WHERE u.is_active = true
       GROUP BY u.id, u.display_name, u.preferred_language
       ORDER BY total_points DESC
       LIMIT 25;`
    );

    const leaderboard = result.rows.map((row, idx) => ({
      rank: idx + 1,
      user_id: row.user_id,
      display_name: row.display_name,
      total_points: parseInt(row.total_points, 10),
      verified_reports: parseInt(row.verified_reports, 10),
      karma_tier: getKarmaTier(parseInt(row.total_points, 10)),
    }));

    res.json({
      ward: 'Ward 82 — Indiranagar',
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
