import { Router, Request, Response } from 'express';
import { query } from '../db';
import { Category, ServiceArea } from '../types';
import { config } from '../config';

const router = Router();

// GET /api/v1/areas/categories/
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const result = await query<Category>(
      'SELECT id, name_en, name_hi, slug, description, is_active, sort_order, created_at FROM areas_category WHERE is_active = true ORDER BY sort_order ASC;'
    );
    // Support both direct array and paginated format for backward compatibility
    res.json({
      count: result.rows.length,
      next: null,
      previous: null,
      results: result.rows,
    });
  } catch (err: any) {
    console.error('[areas/categories] Error:', err);
    res.status(500).json({ detail: 'Failed to fetch categories.' });
  }
});

// GET /api/v1/areas/categories/:id/
router.get('/categories/:id', async (req: Request, res: Response) => {
  try {
    const result = await query<Category>(
      'SELECT * FROM areas_category WHERE id::text = $1 OR slug = $1 LIMIT 1;',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ detail: 'Category not found.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ detail: 'Error fetching category.' });
  }
});

// GET /api/v1/areas/service-areas/
router.get('/service-areas', async (_req: Request, res: Response) => {
  try {
    const result = await query<ServiceArea>(
      'SELECT * FROM areas_servicearea WHERE is_active = true ORDER BY name ASC;'
    );
    res.json({
      count: result.rows.length,
      next: null,
      previous: null,
      results: result.rows,
    });
  } catch (err: any) {
    console.error('[areas/service-areas] Error:', err);
    res.status(500).json({ detail: 'Failed to fetch service areas.' });
  }
});

// GET /api/v1/areas/service-areas/:id/
router.get('/service-areas/:id', async (req: Request, res: Response) => {
  try {
    const result = await query<ServiceArea>(
      'SELECT * FROM areas_servicearea WHERE id::text = $1 LIMIT 1;',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ detail: 'Service area not found.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ detail: 'Error fetching service area.' });
  }
});

// GET /api/v1/areas/config/maps — Get public Google Maps API Key
router.get('/config/maps', async (_req: Request, res: Response) => {
  res.json({
    mapsApiKey: config.googleMapsApiKey || '',
  });
});

export default router;
