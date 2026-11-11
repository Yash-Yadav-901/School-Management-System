import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

let adminToken, teacherToken, guardianToken;
let baseRule0, rule80;
let rahulStudent;

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

  baseRule0 = await prisma.gradeRule.findFirst({ where: { minPercent: 0 } });
  rule80 = await prisma.gradeRule.findFirst({ where: { minPercent: 80 } });
  rahulStudent = await prisma.student.findFirst({ where: { name: 'Rahul Singh' } });
});

describe('Admin CRUD for GradeRule & Guard Rails', () => {
  it('blocks non-admin users with 403', async () => {
    const tRes = await request(app)
      .get('/api/admin/grade-rules')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(tRes.status).toBe(403);

    const gRes = await request(app)
      .get('/api/admin/grade-rules')
      .set('Authorization', `Bearer ${guardianToken}`);
    expect(gRes.status).toBe(403);
  });

  it('admin lists grade rules ordered by minPercent desc', async () => {
    const res = await request(app)
      .get('/api/admin/grade-rules')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
  });

  it('validates minPercent between 0 and 100, and grade label required', async () => {
    const res = await request(app)
      .post('/api/admin/grade-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minPercent: 120, grade: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details).toContain('minPercent is required and must be a number between 0 and 100.');
    expect(res.body.details).toContain('Grade label is required.');
  });

  it('rejects duplicate minPercent with 409 CONFLICT', async () => {
    const res = await request(app)
      .post('/api/admin/grade-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minPercent: 90, grade: 'A-Star', gradePoint: 10 });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
  });

  it('guard: cannot delete rule with minPercent 0', async () => {
    const res = await request(app)
      .delete(`/api/admin/grade-rules/${baseRule0.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('BAD_REQUEST');
    expect(res.body.message).toContain('base grade rule with minPercent 0 cannot be deleted');
  });

  it('guard: cannot update rule with minPercent 0 to another minPercent', async () => {
    const res = await request(app)
      .put(`/api/admin/grade-rules/${baseRule0.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minPercent: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('BAD_REQUEST');
    expect(res.body.message).toContain('cannot have its minPercent changed away from 0');
  });

  it('creates, updates and deletes a custom grade rule successfully', async () => {
    // Create rule for 95% -> A*
    const createRes = await request(app)
      .post('/api/admin/grade-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minPercent: 95, grade: 'A*', gradePoint: 10 });

    expect(createRes.status).toBe(201);
    const createdId = createRes.body.id;

    // Update
    const updateRes = await request(app)
      .put(`/api/admin/grade-rules/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ grade: 'A**' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.grade).toBe('A**');

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/admin/grade-rules/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
  });

  it('editing a rule changes the same student report card grade dynamically', async () => {
    // First ensure rahulStudent has an exam result in the 80% range (e.g. 85%)
    // Read current report card
    const cardBefore = await request(app)
      .get(`/api/exams/report-card/${rahulStudent.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cardBefore.status).toBe(200);
    expect(cardBefore.body.exams.length).toBeGreaterThan(0);

    // Update rule for 80% to "Honors"
    const originalGrade = rule80.grade;
    const updateRuleRes = await request(app)
      .put(`/api/admin/grade-rules/${rule80.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ grade: 'Honors' });
    expect(updateRuleRes.status).toBe(200);

    // Read report card again without touching exam results
    const cardAfter = await request(app)
      .get(`/api/exams/report-card/${rahulStudent.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cardAfter.status).toBe(200);
    // Any subject or exam in the 80s should now have grade "Honors"
    const hasHonors = cardAfter.body.exams.some(
      (e) => e.overallGrade === 'Honors' || e.subjects.some((s) => s.grade === 'Honors')
    );
    expect(hasHonors).toBe(true);

    // Restore original rule grade
    await request(app)
      .put(`/api/admin/grade-rules/${rule80.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ grade: originalGrade });
  });
});

