import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

// A fixed date not present in seed data so tests are isolated.
const TEST_DATE = '2026-01-15';

let adminToken, teacher1Token, teacher2Token;
let grade9aSection, grade10aSection;
let grade9aStudents;

beforeAll(async () => {
  async function login(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.token;
  }

  [adminToken, teacher1Token, teacher2Token] = await Promise.all([
    login('admin@school.demo', 'Admin@123'),
    login('teacher1@school.demo', 'Teacher@123'),
    login('teacher2@school.demo', 'Teacher@123'),
  ]);

  // Resolve seeded sections by joining class name + section name
  grade9aSection = await prisma.section.findFirst({
    where: { name: 'A', class: { name: 'Grade 9' } },
    include: { class: true },
  });

  grade10aSection = await prisma.section.findFirst({
    where: { name: 'A', class: { name: 'Grade 10' } },
    include: { class: true },
  });

  grade9aStudents = await prisma.student.findMany({
    where: { sectionId: grade9aSection.id },
    select: { id: true },
  });
});

function attendancePayload(sectionId, students, status = 'PRESENT') {
  return {
    sectionId,
    date: TEST_DATE,
    session: 'MORNING',
    entries: students.map((s) => ({ studentId: s.id, status })),
  };
}

describe('POST /api/attendance — record bulk attendance', () => {
  it('admin records attendance for a section → 201', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(attendancePayload(grade9aSection.id, grade9aStudents));

    expect(res.status).toBe(201);
    expect(res.body.savedCount).toBe(grade9aStudents.length);
    expect(res.body.date).toBe(TEST_DATE);
    expect(res.body.session).toBe('MORNING');
  });

  it('teacher1 records attendance for assigned section (Grade 9-A) → 201', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${teacher1Token}`)
      .send(attendancePayload(grade9aSection.id, grade9aStudents, 'ABSENT'));

    expect(res.status).toBe(201);
    expect(res.body.savedCount).toBe(grade9aStudents.length);
  });

  it('teacher1 records attendance for unassigned section (Grade 10-A) → 403', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${teacher1Token}`)
      .send(attendancePayload(grade10aSection.id, grade9aStudents));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('same student/date/session submitted twice → second call succeeds (upsert, no duplicate error)', async () => {
    const payload = attendancePayload(grade9aSection.id, grade9aStudents.slice(0, 1), 'PRESENT');

    const first = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect(first.status).toBe(201);

    // Update status to LATE — should overwrite, not error
    payload.entries[0].status = 'LATE';
    const second = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect(second.status).toBe(201);

    // Confirm the DB row now holds LATE
    const record = await prisma.attendance.findUnique({
      where: {
        studentId_date_session: {
          studentId: grade9aStudents[0].id,
          date: TEST_DATE,
          session: 'MORNING',
        },
      },
    });
    expect(record.status).toBe('LATE');
  });

  it('invalid session value → 400 VALIDATION_ERROR', async () => {
    const payload = { ...attendancePayload(grade9aSection.id, grade9aStudents), session: 'EVENING' };
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('missing date field → 400 VALIDATION_ERROR', async () => {
    const payload = attendancePayload(grade9aSection.id, grade9aStudents);
    delete payload.date;
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('studentId that does not belong to the section → 400', async () => {
    // Use students from Grade 10-A section — they should not be in Grade 9-A
    const wrongStudents = await prisma.student.findMany({
      where: { sectionId: grade10aSection.id },
      select: { id: true },
    });

    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(attendancePayload(grade9aSection.id, wrongStudents));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/attendance/summary/section/:sectionId', () => {
  it('returns PRESENT, ABSENT, LATE, total and attendanceRate', async () => {
    const res = await request(app)
      .get(`/api/attendance/summary/section/${grade9aSection.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      sectionId: grade9aSection.id,
      PRESENT: expect.any(Number),
      ABSENT: expect.any(Number),
      LATE: expect.any(Number),
      total: expect.any(Number),
      attendanceRate: expect.stringMatching(/^\d+\.\d{2}%$/),
    });
  });

  it('teacher1 accessing summary for unassigned section (Grade 10-A) → 403', async () => {
    const res = await request(app)
      .get(`/api/attendance/summary/section/${grade10aSection.id}`)
      .set('Authorization', `Bearer ${teacher1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});

describe('GET /api/attendance/summary/student/:studentId', () => {
  it('returns per-student attendance summary', async () => {
    const studentId = grade9aStudents[0].id;
    const res = await request(app)
      .get(`/api/attendance/summary/student/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      studentId,
      PRESENT: expect.any(Number),
      ABSENT: expect.any(Number),
      LATE: expect.any(Number),
      total: expect.any(Number),
      attendanceRate: expect.stringMatching(/^\d+\.\d{2}%$/),
    });
  });
});
