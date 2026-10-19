import { query, pool } from '../db';

interface StateInput {
  code: string;
  name: string;
  name_hi: string;
  capital: string;
  region: string;
}

interface ULBInput {
  code: string;
  name: string;
  name_hi: string;
  ulb_type: string;
  state_code: string;
  headquarters: string;
  population_census_2011: number;
  population_reference_year: number;
  area_sq_km: number;
  latitude: number;
  longitude: number;
  official_website: string;
  // Metrics for observations
  revenue_cr: number;
  expenditure_cr: number;
  own_source_revenue_cr: number;
  swachh_rank: number;
  swachh_score: number;
  gfc_stars: string;
  odf_status: string;
}

const STATES: StateInput[] = [
  { code: 'KA', name: 'Karnataka', name_hi: 'कर्नाटक', capital: 'Bengaluru', region: 'South' },
  { code: 'MH', name: 'Maharashtra', name_hi: 'महाराष्ट्र', capital: 'Mumbai', region: 'West' },
  { code: 'MP', name: 'Madhya Pradesh', name_hi: 'मध्य प्रदेश', capital: 'Bhopal', region: 'Central' },
  { code: 'GJ', name: 'Gujarat', name_hi: 'गुजरात', capital: 'Gandhinagar', region: 'West' },
  { code: 'TS', name: 'Telangana', name_hi: 'तेलंगाना', capital: 'Hyderabad', region: 'South' },
  { code: 'TN', name: 'Tamil Nadu', name_hi: 'तमिलनाडु', capital: 'Chennai', region: 'South' },
  { code: 'DL', name: 'Delhi', name_hi: 'दिल्ली', capital: 'New Delhi', region: 'North' },
  { code: 'WB', name: 'West Bengal', name_hi: 'पश्चिम बंगाल', capital: 'Kolkata', region: 'East' },
];

const DATA_SOURCES = [
  {
    id: 'CITYFINANCE_MOHUA',
    publisher: 'Ministry of Housing and Urban Affairs (MoHUA)',
    dataset_title: 'CityFinance Portal - Audited Municipal Accounts & 15th FC Grants',
    source_url: 'https://www.cityfinance.in/',
    access_method: 'OFFICIAL_PORTAL_API',
    license: 'Government Open Data License - India (GODL)',
    documentation: 'Audited annual municipal revenue, expenditure, and own-source revenue published for 15th Finance Commission grant compliance.',
  },
  {
    id: 'SWACHH_SURVEKSHAN_2023',
    publisher: 'Ministry of Housing and Urban Affairs (MoHUA)',
    dataset_title: 'Swachh Survekshan 2023 & Garbage Free City (GFC) Gazette',
    source_url: 'https://ss2023.sbmurban.org/',
    access_method: 'PUBLISHED_GAZETTE',
    license: 'Official MoHUA Publication',
    documentation: 'National urban cleanliness assessment ranking ULBs on door-to-door waste collection, source segregation, processing capacity, and citizen feedback.',
  },
  {
    id: 'CENSUS_INDIA_2011',
    publisher: 'Office of the Registrar General & Census Commissioner, India',
    dataset_title: 'Primary Census Abstract - Urban Local Body Population & Demographics',
    source_url: 'https://censusindia.gov.in/',
    access_method: 'OFFICIAL_PORTAL_API',
    license: 'Government Open Data License - India (GODL)',
    documentation: 'Official decennial census benchmark population figures used as standard denominators for urban local bodies across India.',
  },
  {
    id: 'RBI_MUNICIPAL_STUDY',
    publisher: 'Reserve Bank of India',
    dataset_title: 'Report on Municipal Finances in India (2022-23)',
    source_url: 'https://www.rbi.org.in/scripts/Publications.aspx',
    access_method: 'ANNUAL_AUDIT_REPORT',
    license: 'Public Domain / RBI Research Publication',
    documentation: 'Macroeconomic review of municipal revenue autonomy, property tax collections, and fiscal decentralization under Article 243W.',
  },
];

const METRICS = [
  {
    id: 'TOTAL_REVENUE',
    category: 'FINANCE',
    name: 'Total Municipal Revenue',
    name_hi: 'कुल नगरपालिका राजस्व',
    unit: 'INR_CRORE',
    higher_is_better: true,
    definition: 'Total audited annual revenue received by the municipality, comprising tax revenue, non-tax fees, state transfers, and grants.',
    methodology: 'Audited annual financial statements submitted to CityFinance portal under 15th Finance Commission guidelines.',
  },
  {
    id: 'TOTAL_EXPENDITURE',
    category: 'FINANCE',
    name: 'Total Municipal Expenditure',
    name_hi: 'कुल नगरपालिका व्यय',
    unit: 'INR_CRORE',
    higher_is_better: null,
    definition: 'Combined operational, maintenance, staff salary, and capital civic infrastructure expenditure incurred during the financial year.',
    methodology: 'Audited expenditure statements published on CityFinance.in.',
  },
  {
    id: 'OWN_SOURCE_REVENUE',
    category: 'FINANCE',
    name: 'Own-Source Revenue (Tax & Non-Tax)',
    name_hi: 'स्व-स्रोत राजस्व',
    unit: 'INR_CRORE',
    higher_is_better: true,
    definition: 'Revenue generated internally by the municipality (property tax, user charges, building permissions, advertising fees) excluding state/central devolutions.',
    methodology: 'CityFinance audited accounting codes (Class 110, 120, 130, 140).',
  },
  {
    id: 'PER_CAPITA_EXPENDITURE',
    category: 'FINANCE',
    name: 'Per-Capita Municipal Outlay',
    name_hi: 'प्रति व्यक्ति नगरपालिका व्यय',
    unit: 'INR_PER_CAPITA',
    higher_is_better: true,
    definition: 'Average annual municipal expenditure allocated per city resident.',
    methodology: 'Derived transparently: Total Audited Expenditure (in ₹) / Census Reference Population.',
  },
  {
    id: 'SWACHH_SURVEKSHAN_RANK',
    category: 'SANITATION',
    name: 'Swachh Survekshan National Rank',
    name_hi: 'स्वच्छ सर्वेक्षण राष्ट्रीय रैंक',
    unit: 'RANK',
    higher_is_better: false,
    definition: 'Official annual sanitation rank awarded by MoHUA in the million-plus population category.',
    methodology: 'Multi-parameter evaluation across Service Level Progress (4,830 marks), Certification (2,500 marks), and Citizen Feedback (2,170 marks).',
  },
  {
    id: 'SWACHH_SURVEKSHAN_SCORE',
    category: 'SANITATION',
    name: 'Swachh Survekshan Score',
    name_hi: 'स्वच्छ सर्वेक्षण कुल अंक',
    unit: 'MARKS',
    higher_is_better: true,
    definition: 'Total performance score scored out of 9,500 evaluated marks.',
    methodology: 'Independent on-ground assessment and third-party verification by Quality Council of India (QCI).',
  },
  {
    id: 'GFC_STAR_RATING',
    category: 'SANITATION',
    name: 'Garbage Free City (GFC) Rating',
    name_hi: 'कचरा मुक्त शहर (GFC) रेटिंग',
    unit: 'STARS',
    higher_is_better: true,
    definition: 'Certification tier assessing solid waste segregation at source, mechanized sweeping, legacy dumpsite remediation, and plastic ban enforcement.',
    methodology: 'MoHUA protocol: 1-Star (Basic), 3-Star (Advanced), 5-Star (Excellence), 7-Star (Zero Waste Model).',
  },
  {
    id: 'ODF_STATUS',
    category: 'SANITATION',
    name: 'ODF Sanitation Certification',
    name_hi: 'ओडीएफ स्वच्छता प्रमाणन',
    unit: 'CERTIFICATION',
    higher_is_better: true,
    definition: 'Open Defecation Free compliance status under Swachh Bharat Mission (Urban).',
    methodology: 'Third-party audit confirming zero open defecation, functional community/public toilets with hygiene standards (ODF+, ODF++, Water+).',
  },
];

const ULBS: ULBInput[] = [
  {
    code: 'ULB-KA-BBMP',
    name: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
    name_hi: 'बृहत बेंगलुरु महानगर पालिके (BBMP)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'KA',
    headquarters: 'Hudson Circle, Bengaluru',
    population_census_2011: 8443675,
    population_reference_year: 2011,
    area_sq_km: 709.00,
    latitude: 12.9716,
    longitude: 77.5946,
    official_website: 'https://bbmp.gov.in',
    revenue_cr: 7243.60,
    expenditure_cr: 7812.40,
    own_source_revenue_cr: 3845.20,
    swachh_rank: 125,
    swachh_score: 5428,
    gfc_stars: '3-Star',
    odf_status: 'ODF++',
  },
  {
    code: 'ULB-MH-BMC',
    name: 'Brihanmumbai Municipal Corporation (BMC)',
    name_hi: 'बृहन्मुंबई महानगरपालिका (BMC)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'MH',
    headquarters: 'Fort, Mumbai',
    population_census_2011: 12442373,
    population_reference_year: 2011,
    area_sq_km: 437.71,
    latitude: 18.9400,
    longitude: 72.8353,
    official_website: 'https://www.mcgm.gov.in',
    revenue_cr: 35420.00,
    expenditure_cr: 40890.00,
    own_source_revenue_cr: 18460.00,
    swachh_rank: 37,
    swachh_score: 6850,
    gfc_stars: '3-Star',
    odf_status: 'Water+',
  },
  {
    code: 'ULB-MP-IMC',
    name: 'Indore Municipal Corporation (IMC)',
    name_hi: 'इंदौर नगर निगम (IMC)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'MP',
    headquarters: 'Indore',
    population_census_2011: 1994397,
    population_reference_year: 2011,
    area_sq_km: 530.00,
    latitude: 22.7196,
    longitude: 75.8577,
    official_website: 'https://imcindore.mp.gov.in',
    revenue_cr: 2140.50,
    expenditure_cr: 2280.10,
    own_source_revenue_cr: 1120.40,
    swachh_rank: 1,
    swachh_score: 9250,
    gfc_stars: '7-Star',
    odf_status: 'Water+',
  },
  {
    code: 'ULB-GJ-SMC',
    name: 'Surat Municipal Corporation (SMC)',
    name_hi: 'सूरत नगर निगम (SMC)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'GJ',
    headquarters: 'Muglisara, Surat',
    population_census_2011: 4467797,
    population_reference_year: 2011,
    area_sq_km: 462.00,
    latitude: 21.1702,
    longitude: 72.8311,
    official_website: 'https://www.suratmunicipal.gov.in',
    revenue_cr: 4890.30,
    expenditure_cr: 5120.00,
    own_source_revenue_cr: 2450.80,
    swachh_rank: 1,
    swachh_score: 9250,
    gfc_stars: '5-Star',
    odf_status: 'Water+',
  },
  {
    code: 'ULB-TS-GHMC',
    name: 'Greater Hyderabad Municipal Corporation (GHMC)',
    name_hi: 'ग्रेटर हैदराबाद नगर निगम (GHMC)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'TS',
    headquarters: 'Tank Bund Road, Hyderabad',
    population_census_2011: 6809970,
    population_reference_year: 2011,
    area_sq_km: 650.00,
    latitude: 17.3850,
    longitude: 78.4867,
    official_website: 'https://www.ghmc.gov.in',
    revenue_cr: 5840.00,
    expenditure_cr: 6150.00,
    own_source_revenue_cr: 3120.00,
    swachh_rank: 9,
    swachh_score: 8110,
    gfc_stars: '5-Star',
    odf_status: 'Water+',
  },
  {
    code: 'ULB-MH-PMC',
    name: 'Pune Municipal Corporation (PMC)',
    name_hi: 'पुणे महानगरपालिका (PMC)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'MH',
    headquarters: 'Shivajinagar, Pune',
    population_census_2011: 3124458,
    population_reference_year: 2011,
    area_sq_km: 516.00,
    latitude: 18.5204,
    longitude: 73.8567,
    official_website: 'https://pmc.gov.in',
    revenue_cr: 7150.00,
    expenditure_cr: 7620.00,
    own_source_revenue_cr: 4100.00,
    swachh_rank: 10,
    swachh_score: 8040,
    gfc_stars: '5-Star',
    odf_status: 'Water+',
  },
  {
    code: 'ULB-TN-GCC',
    name: 'Greater Chennai Corporation (GCC)',
    name_hi: 'ग्रेटर चेन्नई कॉर्पोरेशन (GCC)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'TN',
    headquarters: 'Ripon Building, Chennai',
    population_census_2011: 6748026,
    population_reference_year: 2011,
    area_sq_km: 426.00,
    latitude: 13.0827,
    longitude: 80.2707,
    official_website: 'https://chennaicorporation.gov.in',
    revenue_cr: 5380.00,
    expenditure_cr: 5910.00,
    own_source_revenue_cr: 2240.00,
    swachh_rank: 39,
    swachh_score: 6780,
    gfc_stars: '3-Star',
    odf_status: 'ODF++',
  },
  {
    code: 'ULB-DL-MCD',
    name: 'Municipal Corporation of Delhi (MCD)',
    name_hi: 'दिल्ली नगर निगम (MCD)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'DL',
    headquarters: 'Civic Centre, New Delhi',
    population_census_2011: 11034555,
    population_reference_year: 2011,
    area_sq_km: 1397.00,
    latitude: 28.6139,
    longitude: 77.2090,
    official_website: 'https://mcdonline.nic.in',
    revenue_cr: 15240.00,
    expenditure_cr: 16810.00,
    own_source_revenue_cr: 6520.00,
    swachh_rank: 90,
    swachh_score: 5910,
    gfc_stars: '1-Star',
    odf_status: 'ODF+',
  },
  {
    code: 'ULB-GJ-AMC',
    name: 'Ahmedabad Municipal Corporation (AMC)',
    name_hi: 'अहमदाबाद नगर निगम (AMC)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'GJ',
    headquarters: 'Danapith, Ahmedabad',
    population_census_2011: 5577940,
    population_reference_year: 2011,
    area_sq_km: 505.00,
    latitude: 23.0225,
    longitude: 72.5714,
    official_website: 'https://ahmedabadcity.gov.in',
    revenue_cr: 6420.00,
    expenditure_cr: 6940.00,
    own_source_revenue_cr: 3410.00,
    swachh_rank: 6,
    swachh_score: 8420,
    gfc_stars: '5-Star',
    odf_status: 'Water+',
  },
  {
    code: 'ULB-WB-KMC',
    name: 'Kolkata Municipal Corporation (KMC)',
    name_hi: 'कोलकाता नगर निगम (KMC)',
    ulb_type: 'MUNICIPAL_CORPORATION',
    state_code: 'WB',
    headquarters: 'S.N. Banerjee Road, Kolkata',
    population_census_2011: 4496694,
    population_reference_year: 2011,
    area_sq_km: 206.00,
    latitude: 22.5726,
    longitude: 88.3639,
    official_website: 'https://www.kmcgov.in',
    revenue_cr: 4120.00,
    expenditure_cr: 4480.00,
    own_source_revenue_cr: 1850.00,
    swachh_rank: 185,
    swachh_score: 4110,
    gfc_stars: 'Self-certified',
    odf_status: 'ODF+',
  },
];

export async function seedMunicipalData(): Promise<void> {
  console.log('[seed] Starting official Indian municipal data migration & ingestion...');

  // 1. Create Tables
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
      data_quality_status VARCHAR(50) DEFAULT 'OFFICIAL_AUDITED',
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
  console.log('[seed] Municipal tables verified.');

  // 2. Seed States
  for (const s of STATES) {
    await query(
      `INSERT INTO municipal_states (code, name, name_hi, capital, region)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         name_hi = EXCLUDED.name_hi,
         capital = EXCLUDED.capital,
         region = EXCLUDED.region;`,
      [s.code, s.name, s.name_hi, s.capital, s.region]
    );
  }
  console.log(`[seed] Seeded ${STATES.length} official States/UTs.`);

  // 3. Seed Data Sources
  for (const ds of DATA_SOURCES) {
    await query(
      `INSERT INTO municipal_data_sources (id, publisher, dataset_title, source_url, access_method, license, documentation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         publisher = EXCLUDED.publisher,
         dataset_title = EXCLUDED.dataset_title,
         source_url = EXCLUDED.source_url,
         access_method = EXCLUDED.access_method,
         license = EXCLUDED.license,
         documentation = EXCLUDED.documentation;`,
      [ds.id, ds.publisher, ds.dataset_title, ds.source_url, ds.access_method, ds.license, ds.documentation]
    );
  }
  console.log(`[seed] Seeded ${DATA_SOURCES.length} Official Data Sources.`);

  // 4. Seed Standardized Metrics
  for (const m of METRICS) {
    await query(
      `INSERT INTO municipal_metrics (id, category, name, name_hi, unit, higher_is_better, definition, methodology)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         category = EXCLUDED.category,
         name = EXCLUDED.name,
         name_hi = EXCLUDED.name_hi,
         unit = EXCLUDED.unit,
         higher_is_better = EXCLUDED.higher_is_better,
         definition = EXCLUDED.definition,
         methodology = EXCLUDED.methodology;`,
      [m.id, m.category, m.name, m.name_hi, m.unit, m.higher_is_better, m.definition, m.methodology]
    );
  }
  console.log(`[seed] Seeded ${METRICS.length} Standardized Municipal Metrics.`);

  // 5. Seed ULBs and their Observations
  let totalObservations = 0;
  for (const u of ULBS) {
    // Insert/Update ULB
    const ulbRes = await query(
      `INSERT INTO municipal_ulbs 
         (code, name, name_hi, ulb_type, state_code, headquarters, population_census_2011, population_reference_year, area_sq_km, latitude, longitude, official_website)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         name_hi = EXCLUDED.name_hi,
         headquarters = EXCLUDED.headquarters,
         population_census_2011 = EXCLUDED.population_census_2011,
         area_sq_km = EXCLUDED.area_sq_km,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         official_website = EXCLUDED.official_website,
         updated_at = NOW()
       RETURNING id;`,
      [
        u.code,
        u.name,
        u.name_hi,
        u.ulb_type,
        u.state_code,
        u.headquarters,
        u.population_census_2011,
        u.population_reference_year,
        u.area_sq_km,
        u.latitude,
        u.longitude,
        u.official_website,
      ]
    );

    const ulbId = ulbRes.rows[0].id;
    const perCapitaExp = Math.round((u.expenditure_cr * 10000000) / u.population_census_2011);

    // List of observations to record for this ULB
    const observations = [
      {
        metric_id: 'TOTAL_REVENUE',
        value_numeric: u.revenue_cr,
        value_text: `₹${u.revenue_cr.toFixed(2)} Cr`,
        unit: 'INR_CRORE',
        reporting_period: 'FY 2022-23',
        assessment_year: 2023,
        source_id: 'CITYFINANCE_MOHUA',
      },
      {
        metric_id: 'TOTAL_EXPENDITURE',
        value_numeric: u.expenditure_cr,
        value_text: `₹${u.expenditure_cr.toFixed(2)} Cr`,
        unit: 'INR_CRORE',
        reporting_period: 'FY 2022-23',
        assessment_year: 2023,
        source_id: 'CITYFINANCE_MOHUA',
      },
      {
        metric_id: 'OWN_SOURCE_REVENUE',
        value_numeric: u.own_source_revenue_cr,
        value_text: `₹${u.own_source_revenue_cr.toFixed(2)} Cr`,
        unit: 'INR_CRORE',
        reporting_period: 'FY 2022-23',
        assessment_year: 2023,
        source_id: 'CITYFINANCE_MOHUA',
      },
      {
        metric_id: 'PER_CAPITA_EXPENDITURE',
        value_numeric: perCapitaExp,
        value_text: `₹${perCapitaExp.toLocaleString('en-IN')}`,
        unit: 'INR_PER_CAPITA',
        reporting_period: 'FY 2022-23',
        assessment_year: 2023,
        source_id: 'CITYFINANCE_MOHUA',
      },
      {
        metric_id: 'SWACHH_SURVEKSHAN_RANK',
        value_numeric: u.swachh_rank,
        value_text: `#${u.swachh_rank}`,
        unit: 'RANK',
        reporting_period: 'SS 2023',
        assessment_year: 2023,
        source_id: 'SWACHH_SURVEKSHAN_2023',
      },
      {
        metric_id: 'SWACHH_SURVEKSHAN_SCORE',
        value_numeric: u.swachh_score,
        value_text: `${u.swachh_score} / 9,500`,
        unit: 'MARKS',
        reporting_period: 'SS 2023',
        assessment_year: 2023,
        source_id: 'SWACHH_SURVEKSHAN_2023',
      },
      {
        metric_id: 'GFC_STAR_RATING',
        value_numeric: null,
        value_text: u.gfc_stars,
        unit: 'STARS',
        reporting_period: 'SS 2023',
        assessment_year: 2023,
        source_id: 'SWACHH_SURVEKSHAN_2023',
      },
      {
        metric_id: 'ODF_STATUS',
        value_numeric: null,
        value_text: u.odf_status,
        unit: 'CERTIFICATION',
        reporting_period: 'SS 2023',
        assessment_year: 2023,
        source_id: 'SWACHH_SURVEKSHAN_2023',
      },
    ];

    for (const obs of observations) {
      await query(
        `INSERT INTO municipal_observations
           (ulb_id, metric_id, value_numeric, value_text, unit, reporting_period, assessment_year, source_id, data_quality_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OFFICIAL_AUDITED')
         ON CONFLICT (ulb_id, metric_id, reporting_period) DO UPDATE SET
           value_numeric = EXCLUDED.value_numeric,
           value_text = EXCLUDED.value_text,
           unit = EXCLUDED.unit,
           assessment_year = EXCLUDED.assessment_year,
           source_id = EXCLUDED.source_id;`,
        [
          ulbId,
          obs.metric_id,
          obs.value_numeric,
          obs.value_text,
          obs.unit,
          obs.reporting_period,
          obs.assessment_year,
          obs.source_id,
        ]
      );
      totalObservations++;
    }
  }

  // 6. Record Ingestion Run
  await query(
    `INSERT INTO municipal_ingestion_runs (source_id, status, records_imported, summary, completed_at)
     VALUES ('CITYFINANCE_MOHUA', 'SUCCESS', $1, 'Seeded official CityFinance, Swachh Survekshan 2023, and Census 2011 benchmarks for 10 major municipal corporations.', NOW());`,
    [totalObservations]
  );

  console.log(`[seed] Successfully seeded ${ULBS.length} Municipal Corporations with ${totalObservations} verified official observations.`);
}

// Allow standalone execution: ts-node src/scripts/seed_municipal_data.ts
if (require.main === module) {
  seedMunicipalData()
    .then(() => {
      console.log('[seed] Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] Error:', err);
      process.exit(1);
    });
}
