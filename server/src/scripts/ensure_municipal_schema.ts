import { query } from '../db';

/**
 * Creates the municipal explorer's database schema only.
 * No synthetic municipal data is inserted by this script.
 * Real records must enter through a documented ingestion process with verifiable provenance.
 */
export async function ensureMunicipalSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS municipal_states (
      code VARCHAR(10) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      name_hi VARCHAR(100) NOT NULL,
      capital VARCHAR(100) NOT NULL,
      region VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS municipal_ulbs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      name_hi VARCHAR(150) NOT NULL,
      ulb_type VARCHAR(50) NOT NULL,
      state_code VARCHAR(10) NOT NULL REFERENCES municipal_states(code),
      headquarters VARCHAR(100) NOT NULL,
      population_census_2011 BIGINT,
      population_reference_year INT DEFAULT 2011,
      area_sq_km NUMERIC(10, 2),
      latitude NUMERIC(9, 6),
      longitude NUMERIC(9, 6),
      official_website VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS municipal_data_sources (
      id VARCHAR(50) PRIMARY KEY,
      publisher VARCHAR(150) NOT NULL,
      dataset_title VARCHAR(200) NOT NULL,
      source_url VARCHAR(300) NOT NULL,
      access_method VARCHAR(50) NOT NULL,
      license VARCHAR(100) NOT NULL,
      documentation TEXT,
      retrieved_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS municipal_metrics (
      id VARCHAR(50) PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      name_hi VARCHAR(100) NOT NULL,
      unit VARCHAR(30) NOT NULL,
      higher_is_better BOOLEAN,
      definition TEXT NOT NULL,
      methodology TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS municipal_observations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ulb_id UUID NOT NULL REFERENCES municipal_ulbs(id) ON DELETE CASCADE,
      metric_id VARCHAR(50) NOT NULL REFERENCES municipal_metrics(id),
      value_numeric NUMERIC(14, 2),
      value_text VARCHAR(100),
      unit VARCHAR(30) NOT NULL,
      reporting_period VARCHAR(50) NOT NULL,
      assessment_year INT NOT NULL,
      source_id VARCHAR(50) NOT NULL REFERENCES municipal_data_sources(id),
      data_quality_status VARCHAR(50) DEFAULT 'UNVERIFIED',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_ulb_metric_period UNIQUE (ulb_id, metric_id, reporting_period)
    );

    CREATE TABLE IF NOT EXISTS municipal_ingestion_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id VARCHAR(50) REFERENCES municipal_data_sources(id),
      status VARCHAR(20) NOT NULL,
      records_imported INT DEFAULT 0,
      summary TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_municipal_ulbs_state ON municipal_ulbs(state_code);
    CREATE INDEX IF NOT EXISTS idx_municipal_obs_ulb_metric ON municipal_observations(ulb_id, metric_id);
  `);
  await query("ALTER TABLE municipal_observations ALTER COLUMN data_quality_status SET DEFAULT 'UNVERIFIED';");
  console.log('[municipal-schema] Schema is ready. No municipal records were inserted.');
}

if (require.main === module) {
  ensureMunicipalSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[municipal-schema] Schema setup failed:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    });
}
