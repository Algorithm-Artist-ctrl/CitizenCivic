import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool, query } from '../src/db';

let testUserEmail: string;
let testUserPassword = 'TestPassword123!';
let testAccessToken: string;
let testRefreshToken: string;
let testUserId: string;
let categoryId: string;
let serviceAreaId: string;
let createdCaseId: string;

beforeAll(async () => {
  // Ensure DB connection (allowing Neon serverless spin-up)
  const res = await query('SELECT 1;');
  expect(res.rows.length).toBe(1);

  // Pick an existing category and service area
  const catRes = await query('SELECT id FROM areas_category LIMIT 1;');
  if (catRes.rows.length > 0) {
    categoryId = catRes.rows[0].id;
  }
  const saRes = await query('SELECT id FROM areas_servicearea LIMIT 1;');
  if (saRes.rows.length > 0) {
    serviceAreaId = saRes.rows[0].id;
  }

  testUserEmail = `vitest_${Date.now()}@example.com`;
}, 30000);

afterAll(async () => {
  // Clean up created test case and user if created
  if (createdCaseId) {
    await query('DELETE FROM cases_casetransition WHERE case_id = $1;', [createdCaseId]);
    await query('DELETE FROM cases_caseobservation WHERE case_id = $1;', [createdCaseId]);
    await query('DELETE FROM cases_feedback WHERE case_id = $1;', [createdCaseId]);
    await query('DELETE FROM cases_caseevidence WHERE case_id = $1;', [createdCaseId]);
    await query('DELETE FROM rewards_rewardledger WHERE related_case_id = $1;', [createdCaseId]);
    await query('DELETE FROM cases_case WHERE id = $1;', [createdCaseId]);
  }
  if (testUserId) {
    await query('DELETE FROM rewards_rewardledger WHERE user_id = $1;', [testUserId]);
    await query('DELETE FROM core_auditlog WHERE actor_id = $1;', [testUserId]);
    await query('DELETE FROM accounts_user WHERE id = $1;', [testUserId]);
  }
  await pool.end();
});

describe('1. Health & Root Endpoints', () => {
  it('GET / should return online status for API clients', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.app).toContain('CitizenCivic');
  });

  it('GET / with Accept: text/html should serve SPA index.html for browsers', async () => {
    const res = await request(app)
      .get('/')
      .set('Accept', 'text/html,application/xhtml+xml');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!doctype html>');
  });

  it('GET /login with Accept: text/html should fallback to SPA index.html', async () => {
    const res = await request(app)
      .get('/login')
      .set('Accept', 'text/html,application/xhtml+xml');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!doctype html>');
  });

  it('GET /health should return connected database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('connected');
  });

  it('GET /api/v1/nonexistent should return 404 JSON', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.detail).toContain('Not Found');
  });
});

describe('2. Authentication & Neon User Persistence', () => {
  it('POST /api/v1/auth/register should fail on password mismatch', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'mismatch@example.com',
        password: 'Password123!',
        password_confirm: 'Different123!',
        display_name: 'Mismatch User',
      });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/register should create user in Neon DB with pbkdf2_sha256', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        password_confirm: testUserPassword,
        display_name: 'ViTest Citizen',
        preferred_language: 'en',
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(testUserEmail.toLowerCase());
    expect(res.body.role).toBe('CITIZEN');
    testUserId = res.body.id;

    // Verify in Neon PostgreSQL directly
    const dbCheck = await query('SELECT password, role FROM accounts_user WHERE id = $1;', [testUserId]);
    expect(dbCheck.rows.length).toBe(1);
    expect(dbCheck.rows[0].password.startsWith('pbkdf2_sha256$')).toBe(true);
    expect(dbCheck.rows[0].role).toBe('CITIZEN');
  });

  it('POST /api/v1/auth/register should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        display_name: 'Duplicate User',
      });
    expect(res.status).toBe(400);
    expect(res.body.email).toBeDefined();
  });

  it('POST /api/v1/auth/login should return JWT access & refresh tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUserEmail,
        password: testUserPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.access).toBeDefined();
    expect(res.body.refresh).toBeDefined();
    testAccessToken = res.body.access;
    testRefreshToken = res.body.refresh;
  });

  it('POST /api/v1/auth/login with wrong password should return 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUserEmail,
        password: 'IncorrectPassword!',
      });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/token/refresh should refresh access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/token/refresh')
      .send({ refresh: testRefreshToken });
    expect(res.status).toBe(200);
    expect(res.body.access).toBeDefined();
  });

  it('GET /api/v1/auth/profile should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${testAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUserEmail);
    expect(res.body.display_name).toBe('ViTest Citizen');
  });

  it('PATCH /api/v1/auth/profile should update profile', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({ display_name: 'ViTest Citizen Updated' });

    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('ViTest Citizen Updated');
  });
});

describe('3. Areas & Categories', () => {
  it('GET /api/v1/areas/categories should return categories list', async () => {
    const res = await request(app).get('/api/v1/areas/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/areas/service-areas should return service areas list', async () => {
    const res = await request(app).get('/api/v1/areas/service-areas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});

describe('4. Cases & Civic Workflow', () => {
  it('POST /api/v1/cases should create a new civic case', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        category_id: categoryId,
        description: 'Large waste accumulation near 12th Main Indiranagar park entrance',
        original_description: 'voice recorded complaint about huge garbage dump near park',
        structured_data: { hazard_flags: ['sanitation', 'pedestrian obstruction'] },
        landmark: 'Near 12th Main Park Entrance',
        latitude: 12.9784,
        longitude: 77.6408,
        service_area_id: serviceAreaId,
      });

    expect(res.status).toBe(201);
    expect(res.body.case_number).toMatch(/^CC-\d{8}-\d{4}$/);
    expect(res.body.status).toBe('SUBMITTED');
    expect(res.body.location_source).toBe('MANUAL_PIN');
    expect(res.body.original_description).toBe('voice recorded complaint about huge garbage dump near park');
    createdCaseId = res.body.id;
  });

  it('POST /api/v1/cases should reject gibberish address text', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        category_id: categoryId,
        description: 'Large waste accumulation near 12th Main Indiranagar park entrance',
        landmark: 'hgijhkjkl',
        latitude: 12.9784,
        longitude: 77.6408,
      });

    expect(res.status).toBe(400);
    expect(res.body.field).toBe('landmark');
    expect(res.body.detail).toBeDefined();
  });

  it('POST /api/v1/cases should reject out-of-boundary coordinates', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        category_id: categoryId,
        description: 'Piles of uncollected garbage left near residential colony road',
        landmark: 'Near Aligarh Railway Road Junction',
        latitude: 27.8974, // Far outside all active Bangalore pilot zones
        longitude: 78.0880,
      });

    expect(res.status).toBe(400);
    expect(res.body.field).toBe('coordinates');
    expect(res.body.detail).toContain('outside');
  });

  it('GET /api/v1/cases/:id should return complete case details with timeline', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${testAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdCaseId);
    expect(res.body.status).toBe('SUBMITTED');
    expect(Array.isArray(res.body.transitions)).toBe(true);
    expect(res.body.transitions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.transitions[0].to_status).toBe('SUBMITTED');
    expect(res.body.primary_reporter?.email).toBeUndefined();
    if (res.body.assigned_operator) {
      expect(res.body.assigned_operator.email).toBeUndefined();
    }
  });

  it('POST /api/v1/cases/:id/transition should reject invalid state transition', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${createdCaseId}/transition`)
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({ new_status: 'VERIFIED_RESOLVED' });

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/cases/:id/observations should add citizen observation', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${createdCaseId}/observations`)
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        description: 'Condition worsened after rainfall this morning.',
        latitude: 12.9785,
        longitude: 77.6409,
      });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Condition worsened after rainfall this morning.');
  });

  it('POST /api/v1/cases/:id/feedback should submit citizen feedback', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${createdCaseId}/feedback`)
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        rating: 5,
        comment: 'Report submitted quickly via mobile interface.',
        is_dispute: false,
      });

    expect(res.status).toBe(201);
  });

  it('GET /api/v1/cases/nearby should return public nearby cases', async () => {
    const res = await request(app).get('/api/v1/cases/nearby?lat=12.9784&lng=77.6408&radius_km=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/v1/cases/analytics should return operational metrics', async () => {
    const res = await request(app)
      .get('/api/v1/cases/analytics')
      .set('Authorization', `Bearer ${testAccessToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.total_cases).toBe('number');
    expect(res.body.by_status).toBeDefined();
  });
});

describe('5. Rewards & Karma Points', () => {
  it('GET /api/v1/rewards/my-points should return a ledger-backed total', async () => {
    const res = await request(app)
      .get('/api/v1/rewards/my-points')
      .set('Authorization', `Bearer ${testAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total_points).toBeGreaterThanOrEqual(0);
    expect(res.body.karma_tier).toBeDefined();
  });

  it('GET /api/v1/rewards/leaderboard should return ward leaderboard', async () => {
    const res = await request(app).get('/api/v1/rewards/leaderboard');
    expect(res.status).toBe(200);
    expect(typeof res.body.ward).toBe('string');
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
  });

  it('GET /api/v1/rewards/leaderboard?type=officer should return officer performance metrics', async () => {
    const res = await request(app).get('/api/v1/rewards/leaderboard?type=officer');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('officer');
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
    if (res.body.leaderboard.length > 0) {
      const firstOfficer = res.body.leaderboard[0];
      expect(firstOfficer).toHaveProperty('display_name');
      expect(firstOfficer).toHaveProperty('role');
      expect(firstOfficer).toHaveProperty('assigned_cases');
      expect(firstOfficer).toHaveProperty('verified_resolved');
      expect(firstOfficer).toHaveProperty('resolution_rate_pct');
      expect(firstOfficer).toHaveProperty('avg_resolution_hours');
    }
  });

  it('GET /api/v1/rewards/leaderboard with area_id filter should return scoped leaderboard', async () => {
    const res = await request(app).get(`/api/v1/rewards/leaderboard?type=citizen&area_id=${serviceAreaId}`);
    expect(res.status).toBe(200);
    expect(res.body.area_id).toBe(serviceAreaId);
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
  });
});

describe('6. Realtime Events & AI Civic Diagnostics', () => {
  it('GET /api/v1/cases/events should expose SSE stream', async () => {
    const http = await import('http');
    const res = await new Promise<any>((resolve) => {
      const server = app.listen(0, () => {
        const port = (server.address() as any).port;
        const clientReq = http.get(`http://127.0.0.1:${port}/api/v1/cases/events`, (res) => {
          clientReq.destroy();
          server.close(() => {
            resolve(res);
          });
        });
      });
    });

    expect(res.headers['content-type']).toContain('text/event-stream');
  });

  it('GET /api/v1/ai/status should return diagnostic health without exposing credentials', async () => {
    const res = await request(app).get('/api/v1/ai/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('configured');
    expect(res.body).toHaveProperty('model');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('checked_at');
    // Ensure no secrets are leaked
    expect(JSON.stringify(res.body)).not.toContain('sk-');
  });

  it('POST /api/v1/ai/triage should reject empty description', async () => {
    const res = await request(app)
      .post('/api/v1/ai/triage')
      .send({ description: '' });

    expect(res.status).toBe(400);
    expect(res.body.detail).toBeDefined();
  });

  it('POST /api/v1/ai/triage should handle unconfigured or configured OpenAI state honestly', async () => {
    const res = await request(app)
      .post('/api/v1/ai/triage')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        description: 'Piles of construction debris blocking sidewalk and stormwater drain',
        landmark: 'Near 100ft road junction',
      });

    // If OPENAI_API_KEY is not configured in test environment, it must return 503 (NEVER fake 200)
    // If configured, it must return 200 with suggested category
    if (res.status === 503) {
      expect(res.body.detail).toContain('unavailable');
    } else {
      expect(res.status).toBe(200);
      expect(res.body.suggested_category).toBeDefined();
      expect(res.body.priority).toBeDefined();
    }
  });

  it('POST /api/v1/ai/verify should handle unconfigured or configured OpenAI state honestly', async () => {
    const res = await request(app)
      .post('/api/v1/ai/verify')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        case_description: 'Overflowing public bin at bus stop',
        resolution_notes: 'Sanitation team emptied bin and swept 15m radius around the stop.',
      });

    if (res.status === 503) {
      expect(res.body.detail).toContain('unavailable');
    } else {
      expect(res.status).toBe(200);
      expect(res.body.requires_human_verification).toBe(true);
    }
  });

  it('GET /api/v1/ai/email-status should report Resend configuration status without leaking keys', async () => {
    const res = await request(app).get('/api/v1/ai/email-status');
    expect(res.status).toBe(200);
    expect(res.body.status).toMatch(/configured|unconfigured/);
    expect(res.body.from_email).toBeDefined();
    expect(res.body.apiKey).toBeUndefined();
    expect(res.body.secret).toBeUndefined();
  });

  it('POST /api/v1/ai/format-report should validate raw_description and handle AI response', async () => {
    const resErr = await request(app)
      .post('/api/v1/ai/format-report')
      .send({});
    expect(resErr.status).toBe(400);

    const res = await request(app)
      .post('/api/v1/ai/format-report')
      .send({
        raw_description: 'Deep pothole outside main gate creating heavy traffic jam',
        landmark: 'Indiranagar 100ft road near Metro station',
      });

    if (res.status === 503) {
      expect(res.body.detail).toContain('unavailable');
    } else {
      expect(res.status).toBe(200);
      expect(res.body.suggested_title).toBeDefined();
      expect(res.body.category_slug).toBeDefined();
      expect(res.body.original_description).toBeDefined();
    }
  });

  it('POST /api/v1/ai/assistant should validate messages and provide grounded guidance', async () => {
    const resErr = await request(app)
      .post('/api/v1/ai/assistant')
      .send({});
    expect(resErr.status).toBe(400);

    const res = await request(app)
      .post('/api/v1/ai/assistant')
      .send({
        messages: [{ role: 'user', content: 'How do I earn Karma points on CitizenCivic?' }],
        language: 'en',
      });

    if (res.status === 503) {
      expect(res.body.detail).toContain('unavailable');
    } else {
      expect(res.status).toBe(200);
      expect(res.body.reply).toBeDefined();
      expect(Array.isArray(res.body.suggested_prompts)).toBe(true);
    }
  });
});

describe('7. Municipal Data & Role Access', () => {
  it('GET /api/v1/municipal/states should return official states list', async () => {
    const res = await request(app).get('/api/v1/municipal/states');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.states)).toBe(true);
    expect(res.body.total_states).toBe(res.body.states.length);
    for (const state of res.body.states) {
      expect(state.code).toBeTruthy();
      expect(state.name).toBeTruthy();
    }
  });

  it('GET /api/v1/municipal/ulbs should return ULBs with financial and sanitation metrics', async () => {
    const res = await request(app).get('/api/v1/municipal/ulbs?state=KA');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.ulbs)).toBe(true);
    expect(res.body.total_count).toBe(res.body.ulbs.length);
    for (const ulb of res.body.ulbs) {
      expect(ulb.code).toBeTruthy();
      expect(ulb.name).toBeTruthy();
    }
  });

  it('GET /api/v1/municipal/ulbs/:id should return complete municipal dossier with provenance', async () => {
    const list = await request(app).get('/api/v1/municipal/ulbs');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.ulbs)).toBe(true);

    if (list.body.ulbs.length === 0) {
      const missing = await request(app).get('/api/v1/municipal/ulbs/__missing_test_record__');
      expect(missing.status).toBe(404);
      return;
    }

    const candidate = list.body.ulbs[0];
    const res = await request(app).get(`/api/v1/municipal/ulbs/${encodeURIComponent(candidate.id || candidate.code)}`);
    expect(res.status).toBe(200);
    expect(res.body.ulb).toBeDefined();
    expect(Array.isArray(res.body.observations)).toBe(true);
    if (res.body.observations.length > 0) {
      const firstObs = res.body.observations[0];
      expect(firstObs.source_publisher).toBeTruthy();
      expect(firstObs.source_url).toBeTruthy();
      expect(firstObs.source_license).toBeTruthy();
    }
  });

  it('GET /api/v1/municipal/compare should benchmark multiple corporations', async () => {
    const list = await request(app).get('/api/v1/municipal/ulbs');
    expect(list.status).toBe(200);
    const ids = (list.body.ulbs || []).slice(0, 3).map((ulb: any) => ulb.id || ulb.code);
    const url = ids.length ? `/api/v1/municipal/compare?ids=${encodeURIComponent(ids.join(','))}` : '/api/v1/municipal/compare';
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.comparison)).toBe(true);
    expect(res.body.count).toBe(res.body.comparison.length);
  });

  it('GET /api/v1/municipal/sources should return data sources registry', async () => {
    const res = await request(app).get('/api/v1/municipal/sources');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sources)).toBe(true);
    for (const source of res.body.sources) {
      expect(source.id).toBeTruthy();
      expect(source.publisher).toBeTruthy();
      expect(source.source_url).toBeTruthy();
    }
  });

  it('GET /api/v1/rewards/leaderboard should allow officers to view citizens leaderboard without exposing private data', async () => {
    // Authenticate as officer or test user
    const res = await request(app)
      .get('/api/v1/rewards/leaderboard?type=citizen')
      .set('Authorization', `Bearer ${testAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('citizen');
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
    if (res.body.leaderboard.length > 0) {
      const entry = res.body.leaderboard[0];
      expect(entry.rank).toBeDefined();
      expect(entry.display_name).toBeDefined();
      expect(entry.total_points).toBeDefined();
      // Ensure private credentials are never exposed
      expect(entry.password).toBeUndefined();
      expect(entry.email).toBeUndefined();
      expect(entry.phone_hash).toBeUndefined();
    }
  });
});

describe('8. Role-Based Access Control, Officer Workflows & Administrative Security', () => {
  let officerToken: string;
  let adminToken: string;

  it('Citizen registration must enforce CITIZEN role and reject role tampering', async () => {
    const tamperedEmail = `tamper_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: tamperedEmail,
        password: 'Password123!',
        password_confirm: 'Password123!',
        display_name: 'Tamper Attempt',
        role: 'ADMIN', // Client attempting privilege escalation
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('CITIZEN'); // Strictly enforced as CITIZEN

    // Clean up
    await query('DELETE FROM core_auditlog WHERE actor_id = $1;', [res.body.id]);
    await query('DELETE FROM accounts_user WHERE id = $1;', [res.body.id]);
  });

  it('Citizen cannot access officer-only queue (GET /api/v1/cases/officer/queue returns 403)', async () => {
    const res = await request(app)
      .get('/api/v1/cases/officer/queue')
      .set('Authorization', `Bearer ${testAccessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.detail).toContain('permission');
  });

  it('Citizen cannot access admin-only users roster (GET /api/v1/auth/admin/users returns 403)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/admin/users')
      .set('Authorization', `Bearer ${testAccessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.detail).toContain('permission');
  });

  it('Citizen cannot perform official transition (POST /api/v1/cases/:id/transition with REVIEWED returns 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${createdCaseId}/transition`)
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        new_status: 'REVIEWED',
        reason: 'Citizen attempting unauthorized moderator review',
      });

    expect(res.status).toBe(403);
    expect(res.body.detail).toContain('cannot perform transition');
  });

  it('Municipal Officer login works and accesses dedicated officer queue', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'operator@example.com',
        password: 'Operator123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.access).toBeDefined();
    officerToken = loginRes.body.access;

    const queueRes = await request(app)
      .get('/api/v1/cases/officer/queue')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(queueRes.status).toBe(200);
    expect(queueRes.body.officer_role).toBe('OPERATOR');
    expect(Array.isArray(queueRes.body.queue)).toBe(true);
  });

  it('Approved Officer can view Citizens Leaderboard and Officer Standings', async () => {
    const citizenLbRes = await request(app)
      .get('/api/v1/rewards/leaderboard?type=citizen')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(citizenLbRes.status).toBe(200);
    expect(Array.isArray(citizenLbRes.body.leaderboard)).toBe(true);

    const officerLbRes = await request(app)
      .get('/api/v1/rewards/leaderboard?type=officer')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(officerLbRes.status).toBe(200);
    expect(Array.isArray(officerLbRes.body.leaderboard)).toBe(true);
  });

  it('Public Officer profiles endpoint exposes approved fields and never leaks private data', async () => {
    const res = await request(app).get('/api/v1/auth/officers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.officers)).toBe(true);

    if (res.body.officers.length > 0) {
      const off = res.body.officers[0];
      expect(off.id).toBeDefined();
      expect(off.display_name).toBeDefined();
      expect(off.role).toBeDefined();
      expect(off.is_verified).toBe(true);
      // Ensure private credentials are never exposed
      expect(off.password).toBeUndefined();
      expect(off.email).toBeUndefined();
      expect(off.phone_hash).toBeUndefined();

      // Check single officer detail
      const singleRes = await request(app).get(`/api/v1/auth/officers/${off.id}`);
      expect(singleRes.status).toBe(200);
      expect(singleRes.body.display_name).toBe(off.display_name);
      expect(singleRes.body.password).toBeUndefined();
      expect(singleRes.body.email).toBeUndefined();
    }

    // Checking citizen ID on officer endpoint returns 404
    const citizenCheckRes = await request(app).get(`/api/v1/auth/officers/${testUserId}`);
    expect(citizenCheckRes.status).toBe(404);
  });

  it('Admin login works and accesses admin-only users roster', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.access).toBeDefined();
    adminToken = loginRes.body.access;

    const usersRes = await request(app)
      .get('/api/v1/auth/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.total_users).toBeGreaterThan(0);
    expect(usersRes.body.role_counts).toBeDefined();
  });

  it('GET /api/v1/areas/categories includes the Other complaint category', async () => {
    const res = await request(app).get('/api/v1/areas/categories');
    expect(res.status).toBe(200);
    const categories = res.body.results || res.body;
    const otherCat = categories.find((c: any) => c.slug === 'other' || c.name_en.toLowerCase().includes('other'));
    expect(otherCat).toBeDefined();
  });
});


