import { Router, Request, Response } from 'express';
import { query } from '../db';
import { optionalAuth } from '../auth/middleware';

const router = Router();

// GET /api/v1/municipal/states — List all States/UTs with ULB counts
router.get('/states', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        s.code,
        s.name,
        s.name_hi,
        s.capital,
        s.region,
        COUNT(u.id)::int AS ulb_count
      FROM municipal_states s
      LEFT JOIN municipal_ulbs u ON s.code = u.state_code
      GROUP BY s.code, s.name, s.name_hi, s.capital, s.region
      ORDER BY s.name ASC;
    `);

    res.json({
      states: result.rows,
      total_states: result.rows.length,
    });
  } catch (err: any) {
    console.error('[municipal/states] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve states list.' });
  }
});

// GET /api/v1/municipal/ulbs — Explore & compare Urban Local Bodies
router.get('/ulbs', optionalAuth, async (req: Request, res: Response) => {
  const state = req.query.state ? String(req.query.state).toUpperCase() : null;
  const search = req.query.search ? String(req.query.search).trim() : null;
  const ulbType = req.query.type ? String(req.query.type) : null;
  const sortBy = String(req.query.sort_by || 'swachh_rank_asc');

  try {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIdx = 1;

    if (state) {
      conditions.push(`u.state_code = $${paramIdx++}`);
      params.push(state);
    }

    if (ulbType) {
      conditions.push(`u.ulb_type = $${paramIdx++}`);
      params.push(ulbType);
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIdx} OR u.name_hi ILIKE $${paramIdx} OR u.headquarters ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Determine sorting
    let orderBy = 'o_rank.value_numeric ASC NULLS LAST';
    if (sortBy === 'revenue_desc') {
      orderBy = 'o_rev.value_numeric DESC NULLS LAST';
    } else if (sortBy === 'population_desc') {
      orderBy = 'u.population_census_2011 DESC NULLS LAST';
    } else if (sortBy === 'name_asc') {
      orderBy = 'u.name ASC';
    } else if (sortBy === 'per_capita_desc') {
      orderBy = 'o_pc.value_numeric DESC NULLS LAST';
    }

    const sql = `
      SELECT 
        u.id,
        u.code,
        u.name,
        u.name_hi,
        u.ulb_type,
        u.state_code,
        s.name AS state_name,
        s.name_hi AS state_name_hi,
        u.headquarters,
        u.population_census_2011,
        u.population_reference_year,
        u.area_sq_km,
        u.latitude,
        u.longitude,
        u.official_website,
        o_rev.value_numeric::float AS total_revenue_cr,
        o_exp.value_numeric::float AS total_expenditure_cr,
        o_osr.value_numeric::float AS own_source_revenue_cr,
        o_pc.value_numeric::float AS per_capita_expenditure,
        o_rank.value_numeric::int AS swachh_rank,
        o_score.value_numeric::int AS swachh_score,
        o_gfc.value_text AS gfc_stars,
        o_odf.value_text AS odf_status
      FROM municipal_ulbs u
      JOIN municipal_states s ON u.state_code = s.code
      LEFT JOIN municipal_observations o_rev ON u.id = o_rev.ulb_id AND o_rev.metric_id = 'TOTAL_REVENUE'
      LEFT JOIN municipal_observations o_exp ON u.id = o_exp.ulb_id AND o_exp.metric_id = 'TOTAL_EXPENDITURE'
      LEFT JOIN municipal_observations o_osr ON u.id = o_osr.ulb_id AND o_osr.metric_id = 'OWN_SOURCE_REVENUE'
      LEFT JOIN municipal_observations o_pc ON u.id = o_pc.ulb_id AND o_pc.metric_id = 'PER_CAPITA_EXPENDITURE'
      LEFT JOIN municipal_observations o_rank ON u.id = o_rank.ulb_id AND o_rank.metric_id = 'SWACHH_SURVEKSHAN_RANK'
      LEFT JOIN municipal_observations o_score ON u.id = o_score.ulb_id AND o_score.metric_id = 'SWACHH_SURVEKSHAN_SCORE'
      LEFT JOIN municipal_observations o_gfc ON u.id = o_gfc.ulb_id AND o_gfc.metric_id = 'GFC_STAR_RATING'
      LEFT JOIN municipal_observations o_odf ON u.id = o_odf.ulb_id AND o_odf.metric_id = 'ODF_STATUS'
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy};
    `;

    const result = await query(sql, params);

    res.json({
      ulbs: result.rows,
      total_count: result.rows.length,
      applied_filters: { state, search, type: ulbType, sort_by: sortBy },
    });
  } catch (err: any) {
    console.error('[municipal/ulbs] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve municipal bodies.' });
  }
});

// GET /api/v1/municipal/ulbs/:id — Complete Municipal Dossier with Full Provenance
router.get('/ulbs/:id', optionalAuth, async (req: Request, res: Response) => {
  const ulbId = req.params.id;

  try {
    const ulbRes = await query(
      `SELECT 
         u.*, 
         s.name AS state_name,
         s.name_hi AS state_name_hi,
         s.region AS state_region
       FROM municipal_ulbs u
       JOIN municipal_states s ON u.state_code = s.code
       WHERE u.id::text = $1 OR u.code = $1
       LIMIT 1;`,
      [ulbId]
    );

    if (ulbRes.rows.length === 0) {
      res.status(404).json({ detail: 'Urban Local Body not found.' });
      return;
    }

    const ulb = ulbRes.rows[0];

    // Get all observations for this ULB with data sources and metric definitions
    const obsRes = await query(
      `SELECT 
         o.id,
         o.metric_id,
         m.category AS metric_category,
         m.name AS metric_name,
         m.name_hi AS metric_name_hi,
         m.definition AS metric_definition,
         m.methodology AS metric_methodology,
         m.higher_is_better,
         o.value_numeric::float AS value_numeric,
         o.value_text,
         o.unit,
         o.reporting_period,
         o.assessment_year,
         o.data_quality_status,
         ds.id AS source_id,
         ds.publisher AS source_publisher,
         ds.dataset_title AS source_dataset_title,
         ds.source_url,
         ds.license AS source_license,
         ds.documentation AS source_documentation,
         o.created_at AS recorded_at
       FROM municipal_observations o
       JOIN municipal_metrics m ON o.metric_id = m.id
       JOIN municipal_data_sources ds ON o.source_id = ds.id
       WHERE o.ulb_id = $1
       ORDER BY m.category ASC, m.id ASC;`,
      [ulb.id]
    );

    res.json({
      ulb,
      observations: obsRes.rows,
    });
  } catch (err: any) {
    console.error('[municipal/ulb-detail] Error:', err);
    res.status(500).json({ detail: 'Failed to retrieve ULB profile.' });
  }
});

// GET /api/v1/municipal/compare — Side-by-Side Municipal Benchmarking
router.get('/compare', optionalAuth, async (req: Request, res: Response) => {
  const idsParam = req.query.ids ? String(req.query.ids).split(',').map(s => s.trim()).filter(Boolean) : [];

  try {
    const filterSql = idsParam.length > 0 ? 'WHERE u.id::text = ANY($1) OR u.code = ANY($1)' : '';
    const params = idsParam.length > 0 ? [idsParam] : [];

    const sql = `
      SELECT 
        u.id,
        u.code,
        u.name,
        u.name_hi,
        u.ulb_type,
        s.name AS state_name,
        u.population_census_2011,
        u.area_sq_km,
        u.official_website,
        o_rev.value_numeric::float AS total_revenue_cr,
        o_exp.value_numeric::float AS total_expenditure_cr,
        o_osr.value_numeric::float AS own_source_revenue_cr,
        o_pc.value_numeric::float AS per_capita_expenditure,
        o_rank.value_numeric::int AS swachh_rank,
        o_score.value_numeric::int AS swachh_score,
        o_gfc.value_text AS gfc_stars,
        o_odf.value_text AS odf_status
      FROM municipal_ulbs u
      JOIN municipal_states s ON u.state_code = s.code
      LEFT JOIN municipal_observations o_rev ON u.id = o_rev.ulb_id AND o_rev.metric_id = 'TOTAL_REVENUE'
      LEFT JOIN municipal_observations o_exp ON u.id = o_exp.ulb_id AND o_exp.metric_id = 'TOTAL_EXPENDITURE'
      LEFT JOIN municipal_observations o_osr ON u.id = o_osr.ulb_id AND o_osr.metric_id = 'OWN_SOURCE_REVENUE'
      LEFT JOIN municipal_observations o_pc ON u.id = o_pc.ulb_id AND o_pc.metric_id = 'PER_CAPITA_EXPENDITURE'
      LEFT JOIN municipal_observations o_rank ON u.id = o_rank.ulb_id AND o_rank.metric_id = 'SWACHH_SURVEKSHAN_RANK'
      LEFT JOIN municipal_observations o_score ON u.id = o_score.ulb_id AND o_score.metric_id = 'SWACHH_SURVEKSHAN_SCORE'
      LEFT JOIN municipal_observations o_gfc ON u.id = o_gfc.ulb_id AND o_gfc.metric_id = 'GFC_STAR_RATING'
      LEFT JOIN municipal_observations o_odf ON u.id = o_odf.ulb_id AND o_odf.metric_id = 'ODF_STATUS'
      ${filterSql}
      ORDER BY o_rank.value_numeric ASC NULLS LAST;
    `;

    const result = await query(sql, params);

    res.json({
      comparison: result.rows,
      count: result.rows.length,
    });
  } catch (err: any) {
    console.error('[municipal/compare] Error:', err);
    res.status(500).json({ detail: 'Failed to benchmark municipal bodies.' });
  }
});

// GET /api/v1/municipal/sources — Provenance Registry
router.get('/sources', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM municipal_data_sources ORDER BY id ASC;');
    res.json({ sources: result.rows });
  } catch (err: any) {
    res.status(500).json({ detail: 'Failed to retrieve data sources.' });
  }
});

// GET /api/v1/municipal/metrics — Metrics Registry
router.get('/metrics', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM municipal_metrics ORDER BY category ASC, id ASC;');
    res.json({ metrics: result.rows });
  } catch (err: any) {
    res.status(500).json({ detail: 'Failed to retrieve metrics registry.' });
  }
});

export default router;
