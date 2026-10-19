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
  // Ensure DB connection
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
});

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
  it('GET / should return online status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.app).toContain('CitizenCivic');
  });

  it('GET /health should return connected database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('connected');
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
        landmark: 'Near 12th Main Park Entrance',
        latitude: 12.9784,
        longitude: 77.6408,
        service_area_id: serviceAreaId,
      });

    expect(res.status).toBe(201);
    expect(res.body.case_number).toMatch(/^CC-\d{8}-\d{4}$/);
    expect(res.body.status).toBe('SUBMITTED');
    createdCaseId = res.body.id;
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
    const res = await request(app).get('/api/v1/cases/nearby?lat=12.9784&lng=77.6408');
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
  it('GET /api/v1/rewards/my-points should return points credited for reporting', async () => {
    const res = await request(app)
      .get('/api/v1/rewards/my-points')
      .set('Authorization', `Bearer ${testAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total_points).toBeGreaterThanOrEqual(10);
    expect(res.body.karma_tier).toBeDefined();
  });

  it('GET /api/v1/rewards/leaderboard should return ward leaderboard', async () => {
    const res = await request(app).get('/api/v1/rewards/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.ward).toContain('Ward 82');
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
  });
});

describe('6. AI Civic Triage & Verification', () => {
  it('POST /api/v1/ai/triage should return category suggestion and hazards', async () => {
    const res = await request(app)
      .post('/api/v1/ai/triage')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        description: 'Piles of construction debris blocking sidewalk and stormwater drain',
        landmark: 'Near 100ft road junction',
      });

    expect(res.status).toBe(200);
    expect(res.body.suggested_category).toBeDefined();
    expect(res.body.priority).toBeDefined();
    expect(res.body.action_summary).toBeDefined();
  });

  it('POST /api/v1/ai/verify should evaluate resolution notes', async () => {
    const res = await request(app)
      .post('/api/v1/ai/verify')
      .set('Authorization', `Bearer ${testAccessToken}`)
      .send({
        case_description: 'Overflowing public bin at bus stop',
        resolution_notes: 'Sanitation team emptied bin and swept 15m radius around the stop.',
      });

    expect(res.status).toBe(200);
    expect(typeof res.body.verification_passed).toBe('boolean');
    expect(typeof res.body.confidence_score).toBe('number');
  });
});
