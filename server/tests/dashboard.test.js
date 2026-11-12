import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

let adminToken, teacherToken, guardianToken;

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
});

describe('Phase 7: Admin Dashboard Endpoint (/api/admin/dashboard)', () => {
  it('blocks teacher and guardian with 403 FORBIDDEN', async () => {
    const resTeacher = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(resTeacher.status).toBe(403);
    expect(resTeacher.body.error).toBe('FORBIDDEN');

    const resGuardian = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${guardianToken}`);
    expect(resGuardian.status).toBe(403);
    expect(resGuardian.body.error).toBe('FORBIDDEN');
  });

  it('admin gets dashboard with all key metrics', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // Totals
    expect(res.body).toHaveProperty('totals');
    expect(res.body.totals).toHaveProperty('students');
    expect(res.body.totals).toHaveProperty('teachers');
    expect(typeof res.body.totals.students).toBe('number');
    expect(typeof res.body.totals.teachers).toBe('number');

    // Today attendance
    expect(res.body).toHaveProperty('todayAttendance');
    expect(res.body.todayAttendance).toHaveProperty('date');
    expect(res.body.todayAttendance).toHaveProperty('totalSessions');
    expect(res.body.todayAttendance).toHaveProperty('attendanceRate');

    // Fees
    expect(res.body).toHaveProperty('fees');
    expect(res.body.fees).toHaveProperty('totalInvoiced');
    expect(res.body.fees).toHaveProperty('totalPaid');
    expect(res.body.fees).toHaveProperty('outstandingFees');
    expect(res.body.fees.outstandingFees).toBeGreaterThanOrEqual(0);

    // Recent audit logs
    expect(res.body).toHaveProperty('recentAuditLogs');
    expect(Array.isArray(res.body.recentAuditLogs)).toBe(true);

    if (res.body.recentAuditLogs.length > 0) {
      const log = res.body.recentAuditLogs[0];
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('entityType');
      expect(log).toHaveProperty('user');
      expect(log.user).not.toHaveProperty('passwordHash');
    }
  });
});

