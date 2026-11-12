import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

let adminToken, teacherToken, guardianToken, adminUser;

beforeAll(async () => {
  async function login(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.token;
  }

  [adminToken, teacherToken, guardianToken] = await Promise.all([
    login('admin@school.demo', 'Admin@123'),
    login('teacher1@school.demo', 'Teacher@123'),
    login('guardian1@school.demo', 'Guardian@123'),
  ]);

  adminUser = await prisma.user.findUnique({ where: { email: 'admin@school.demo' } });

  // Create some audit entries, including one with sensitive metadata to verify scrubbing
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'TEST_SENSITIVE_ACTION',
      entityType: 'User',
      entityId: adminUser.id,
      meta: JSON.stringify({
        passwordHash: '$2b$10$secretHashValueCannotBeExposed',
        token: 'superSecretJwtToken12345',
        safeProperty: 'visibleValue',
        nested: {
          password: 'plainPassword',
          refreshToken: 'refreshSecret',
          details: 'nestedSafe',
        },
      }),
      createdAt: new Date('2026-05-15T10:00:00.000Z'),
    },
  });
});

describe('Phase 7: Admin Audit Log Endpoint', () => {
  it('blocks teacher and guardian with 403 FORBIDDEN', async () => {
    const resTeacher = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(resTeacher.status).toBe(403);
    expect(resTeacher.body.error).toBe('FORBIDDEN');

    const resGuardian = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${guardianToken}`);
    expect(resGuardian.status).toBe(403);
    expect(resGuardian.body.error).toBe('FORBIDDEN');
  });

  it('admin gets paginated audit logs', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs?page=1&pageSize=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(10);
    expect(res.body.pagination).toHaveProperty('total');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const first = res.body.data[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('action');
    expect(first).toHaveProperty('entityType');
    expect(first).toHaveProperty('user');
    expect(first.user).not.toHaveProperty('passwordHash');
  });

  it('filters audit logs by action and entityType', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs?action=TEST_SENSITIVE_ACTION&entityType=User')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((l) => l.action === 'TEST_SENSITIVE_ACTION')).toBe(true);
  });

  it('filters audit logs by date range', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((l) => l.action === 'TEST_SENSITIVE_ACTION')).toBe(true);

    const resOut = await request(app)
      .get('/api/admin/audit-logs?from=2025-01-01&to=2025-01-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resOut.status).toBe(200);
    expect(resOut.body.data.length).toBe(0);
  });

  it('strictly scrubs passwords, hashes, and tokens from metadata and user objects', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs?action=TEST_SENSITIVE_ACTION')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const entry = res.body.data.find((l) => l.action === 'TEST_SENSITIVE_ACTION');

    // User object check
    expect(entry.user).not.toHaveProperty('passwordHash');
    expect(entry.user).toHaveProperty('email');

    // Meta object check
    expect(entry.meta).toHaveProperty('safeProperty', 'visibleValue');
    expect(entry.meta).not.toHaveProperty('passwordHash');
    expect(entry.meta).not.toHaveProperty('token');
    expect(entry.meta.nested).toHaveProperty('details', 'nestedSafe');
    expect(entry.meta.nested).not.toHaveProperty('password');
    expect(entry.meta.nested).not.toHaveProperty('refreshToken');
  });
});
