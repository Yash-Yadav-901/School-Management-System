import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

// A fixed date not present in seed data so tests are isolated.
const TEST_DATE = '2026-01-15';

let adminToken, teacher1Token, teacher2Token, guardian1Token;
let grade9aSection, grade10aSection;
let grade9aStudents;
let rahulStudent, priyaStudent;

beforeAll(async () => {
  async function login(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.token;
  }

  [adminToken, teacher1Token, teacher2Token, guardian1Token] = await Promise.all([
    login('admin@school.demo', 'Admin@123'),
    login('teacher1@school.demo', 'Teacher@123'),
    login('teacher2@school.demo', 'Teacher@123'),
    login('guardian1@school.demo', 'Guardian@123'),
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

  rahulStudent = await prisma.student.findFirst({ where: { name: 'Rahul Singh' } });
  priyaStudent = await prisma.student.findFirst({ where: { name: 'Priya Verma' } });
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

  it('rejects future attendance date with 400 VALIDATION_ERROR', async () => {
    const payload = {
      ...attendancePayload(grade9aSection.id, grade9aStudents),
      date: '2099-01-01',
    };

    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details).toContain('Attendance date cannot be in the future.');
  });

  it('rejects invalid status with 400 VALIDATION_ERROR', async () => {
    const payload = attendancePayload(grade9aSection.id, grade9aStudents.slice(0, 1), 'UNKNOWN');

    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('guardian cannot mark attendance → 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${guardian1Token}`)
      .send(attendancePayload(grade9aSection.id, grade9aStudents));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('concurrent duplicate submissions leave exactly one row', async () => {
    const targetStudent = grade9aStudents[1];
    const payloadA = attendancePayload(grade9aSection.id, [targetStudent], 'PRESENT');
    const payloadB = attendancePayload(grade9aSection.id, [targetStudent], 'ABSENT');

    await Promise.all([
      request(app).post('/api/attendance').set('Authorization', `Bearer ${adminToken}`).send(payloadA),
      request(app).post('/api/attendance').set('Authorization', `Bearer ${adminToken}`).send(payloadB),
    ]);

    const count = await prisma.attendance.count({
      where: {
        studentId: targetStudent.id,
        date: TEST_DATE,
        session: 'MORNING',
      },
    });

    expect(count).toBe(1);
  });

  it('audit log stores previous status on update', async () => {
    const targetStudent = grade9aStudents[2];
    const initialPayload = attendancePayload(grade9aSection.id, [targetStudent], 'PRESENT');

    await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(initialPayload);

    // Update from PRESENT to ABSENT
    const updatePayload = attendancePayload(grade9aSection.id, [targetStudent], 'ABSENT');

    await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    const latestAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'ATTENDANCE_UPDATED',
        entityType: 'Section',
        entityId: grade9aSection.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(latestAudit).toBeDefined();
    const meta = JSON.parse(latestAudit.meta);
    expect(meta.updates).toBeDefined();
    const studentUpdate = meta.updates.find((u) => u.studentId === targetStudent.id);
    expect(studentUpdate).toBeDefined();
    expect(studentUpdate.previousStatus).toBe('PRESENT');
    expect(studentUpdate.newStatus).toBe('ABSENT');
  });
});

describe('GET /api/attendance/summary/section/:sectionId', () => {
  it('returns exact summary percentages', async () => {
    const res = await request(app)
      .get(`/api/attendance/summary/section/${grade9aSection.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { PRESENT, ABSENT, LATE, total, attendanceRate } = res.body;
    expect(total).toBe(PRESENT + ABSENT + LATE);
    const expectedRate = total === 0 ? '0.00%' : `${(((PRESENT + LATE) / total) * 100).toFixed(2)}%`;
    expect(attendanceRate).toBe(expectedRate);
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

  it('guardian accesses linked child summary → 200', async () => {
    // guardian1 is linked to rahulStudent
    const res = await request(app)
      .get(`/api/attendance/summary/student/${rahulStudent.id}`)
      .set('Authorization', `Bearer ${guardian1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.studentId).toBe(rahulStudent.id);
  });

  it('guardian accessing unlinked child summary returns 404 NOT_FOUND (privacy)', async () => {
    // guardian1 is NOT linked to priyaStudent (guardian2's child)
    const res = await request(app)
      .get(`/api/attendance/summary/student/${priyaStudent.id}`)
      .set('Authorization', `Bearer ${guardian1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(res.body.message).toBe('Student record not found.');
  });
});

