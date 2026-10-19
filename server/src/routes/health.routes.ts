import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await query('SELECT 1;');
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'online',
    app: 'CitizenCivic Node.js Express API',
    version: '1.0.0',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
