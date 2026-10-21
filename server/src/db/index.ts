import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

const isNeon = config.databaseUrl.includes('neon.tech') || config.databaseUrl.includes('sslmode=require');

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('[pg-pool] Unexpected error on idle client:', err.message);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[pg-query]', { text, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

export async function ensureBaseData(): Promise<void> {
  try {
    await query(`
      ALTER TABLE cases_case ADD COLUMN IF NOT EXISTS original_description TEXT;
      ALTER TABLE cases_case ADD COLUMN IF NOT EXISTS structured_data JSONB;
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS notifications_notification (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        title_hi VARCHAR(255),
        message TEXT NOT NULL,
        message_hi TEXT,
        notification_type VARCHAR(50) NOT NULL,
        related_case_id UUID REFERENCES cases_case(id) ON DELETE SET NULL,
        is_read BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications_notification(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications_notification(user_id, created_at DESC);
    `);
    await query(`
      INSERT INTO areas_category (id, name_en, name_hi, slug, description, is_active, sort_order, created_at)
      VALUES (
        gen_random_uuid(),
        'Other Civic Issue',
        'अन्य नागरिक समस्या',
        'other',
        'Civic problems, street hazards, or municipal maintenance concerns not covered in standard categories.',
        true,
        6,
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE
      SET name_en = EXCLUDED.name_en, name_hi = EXCLUDED.name_hi, is_active = true;
    `);
  } catch (err: any) {
    // Non-fatal if table doesn't exist yet
    console.warn('[db] Note on ensureBaseData:', err.message);
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const res = await query('SELECT NOW() AS current_time;');
    console.log('[db] Connected to PostgreSQL at:', res.rows[0].current_time);
    await ensureBaseData();
    return true;
  } catch (err: any) {
    console.error('[db] Connection check failed:', err.message);
    return false;
  }
}

