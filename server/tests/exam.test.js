import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

let adminToken, teacher1Token, teacher2Token, guardian1Token;
let grade9aSection, grade10aSection;
let mathSubject, scienceSubject;
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

  grade9aSection = await prisma.section.findFirst({
    where: { name: 'A', class: { name: 'Grade 9' } },
  });

  grade10aSection = await prisma.section.findFirst({
    where: { name: 'A', class: { name: 'Grade 10' } },
  });

  mathSubject = await prisma.subject.findUnique({ where: { code: 'MATH' } });
  scienceSubject = await prisma.subject.findUnique({ where: { code: 'SCI' } });

  grade9aStudents = await prisma.student.findMany({
    where: { sectionId: grade9aSection.id },
    select: { id: true, name: true },
  });

  rahulStudent = await prisma.student.findFirst({ where: { name: 'Rahul Singh' } });
  priyaStudent = await prisma.student.findFirst({ where: { name: 'Priya Verma' } });
});

describe('Phase 5: Exams, Marks, and Report Cards', () => {
  let createdExamId;

  describe('POST /api/exams — Exam creation', () => {
    it('admin creates an exam successfully → 201', async () => {
      const res = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mid-Term 2026',
          sectionId: grade9aSection.id,
          subjectId: mathSubject.id,
          maxMarks: 100,
          examDate: '2026-03-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Mid-Term 2026');
      expect(res.body.maxMarks).toBe(100);
      createdExamId = res.body.id;
    });

    it('rejects exam creation with 400 when maxMarks is invalid', async () => {
      const res = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mid-Term 2026',
          sectionId: grade9aSection.id,
          subjectId: mathSubject.id,
          maxMarks: 0,
          examDate: '2026-03-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('blocks teacher from creating exam → 403', async () => {
      const res = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          name: 'Class Test',
          sectionId: grade9aSection.id,
          subjectId: mathSubject.id,
          maxMarks: 50,
          examDate: '2026-03-20',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/exams/:id/marks — Marks entry & constraints', () => {
    it('teacher1 enters marks for assigned section and subject (Grade 9-A Math) → 201', async () => {
      const entries = [
        { studentId: grade9aStudents[0].id, marksObtained: 92 },
        { studentId: grade9aStudents[1].id, marksObtained: 78 },
      ];

      const res = await request(app)
        .post(`/api/exams/${createdExamId}/marks`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({ entries });

      expect(res.status).toBe(201);
      expect(res.body.recordedCount).toBe(2);
      expect(res.body.examId).toBe(createdExamId);
    });

    it('teacher2 entering marks for unassigned exam (Grade 9-A Math) → 403', async () => {
      // teacher2 teaches Grade 10, not Grade 9-A Math
      const entries = [{ studentId: grade9aStudents[0].id, marksObtained: 85 }];

      const res = await request(app)
        .post(`/api/exams/${createdExamId}/marks`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({ entries });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
      expect(res.body.message).toContain('not assigned');
    });

    it('rejects marks greater than maxMarks → 400 VALIDATION_ERROR', async () => {
      const entries = [{ studentId: grade9aStudents[0].id, marksObtained: 150 }];

      const res = await request(app)
        .post(`/api/exams/${createdExamId}/marks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ entries });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('rejects negative marks → 400 VALIDATION_ERROR', async () => {
      const entries = [{ studentId: grade9aStudents[0].id, marksObtained: -5 }];

      const res = await request(app)
        .post(`/api/exams/${createdExamId}/marks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ entries });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('student from another section rejected with 400 on marks entry', async () => {
      // priyaStudent is in Grade 10-A, createdExamId is in Grade 9-A
      const entries = [{ studentId: priyaStudent.id, marksObtained: 80 }];

      const res = await request(app)
        .post(`/api/exams/${createdExamId}/marks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ entries });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('not in section');
    });

    it('deleting an exam with results returns 409 CONFLICT', async () => {
      const res = await request(app)
        .delete(`/api/exams/${createdExamId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
      expect(res.body.message).toContain('Cannot delete exam because student results exist for it');
    });

    it('one result per student per exam; update upserts with audit entry', async () => {
      const targetStudent = grade9aStudents[0];
      const initialMarks = 85;
      const updatedMarks = 95;

      // Set initial
      await request(app)
        .post(`/api/exams/${createdExamId}/marks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ entries: [{ studentId: targetStudent.id, marksObtained: initialMarks }] });

      // Update
      const updateRes = await request(app)
        .post(`/api/exams/${createdExamId}/marks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ entries: [{ studentId: targetStudent.id, marksObtained: updatedMarks }] });

      expect(updateRes.status).toBe(201);
      expect(updateRes.body.updatesCount).toBe(1);

      // Verify single row in DB with new marks
      const count = await prisma.examResult.count({
        where: { examId: createdExamId, studentId: targetStudent.id },
      });
      expect(count).toBe(1);

      const dbResult = await prisma.examResult.findUnique({
        where: { examId_studentId: { examId: createdExamId, studentId: targetStudent.id } },
      });
      expect(dbResult.marksObtained).toBe(updatedMarks);

      // Verify grade is null on DB row (computed dynamically at read time)
      expect(dbResult.grade).toBeNull();

      // Check audit log
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'MARKS_UPDATED', entityType: 'Exam', entityId: createdExamId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      const meta = JSON.parse(audit.meta);
      expect(meta.updates[0].previousMarks).toBe(initialMarks);
      expect(meta.updates[0].newMarks).toBe(updatedMarks);
    });
  });

  describe('GET /api/exams/:id — Dynamic grade computation at read time', () => {
    it('computes grades dynamically from GradeRule without storing them', async () => {
      const res = await request(app)
        .get(`/api/exams/${createdExamId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThan(0);

      const studentResult = res.body.results.find((r) => r.studentId === grade9aStudents[0].id);
      expect(studentResult).toBeDefined();
      expect(studentResult.marksObtained).toBe(95);
      expect(studentResult.percentage).toBe(95);
      expect(studentResult.grade).toBe('A+'); // >= 90% is A+
    });
  });

  describe('GET /api/exams/report-card/:studentId — Report Card', () => {
    let secondExamId;

    beforeAll(async () => {
      // Create a second subject exam for the same exam name "Mid-Term 2026"
      const exam2 = await prisma.exam.create({
        data: {
          name: 'Mid-Term 2026',
          sectionId: grade9aSection.id,
          subjectId: scienceSubject.id,
          maxMarks: 100,
          examDate: '2026-03-15',
        },
      });
      secondExamId = exam2.id;

      // Enter science marks for rahulStudent (Grade 9-A)
      await prisma.examResult.create({
        data: {
          examId: secondExamId,
          studentId: rahulStudent.id,
          marksObtained: 85,
        },
      });

      // Create a separate exam with a different name "Final Exam 2026"
      const finalExam = await prisma.exam.create({
        data: {
          name: 'Final Exam 2026',
          sectionId: grade9aSection.id,
          subjectId: mathSubject.id,
          maxMarks: 100,
          examDate: '2026-06-10',
        },
      });

      await prisma.examResult.create({
        data: {
          examId: finalExam.id,
          studentId: rahulStudent.id,
          marksObtained: 90,
        },
      });
    });

    it('groups results per exam name & date and never sums different exams together', async () => {
      const res = await request(app)
        .get(`/api/exams/report-card/${rahulStudent.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.student.id).toBe(rahulStudent.id);
      expect(res.body.exams).toBeInstanceOf(Array);

      // Should have two distinct exam groups: "Final Exam 2026" and "Mid-Term 2026"
      const midTerm = res.body.exams.find((e) => e.examName === 'Mid-Term 2026');
      const finalExam = res.body.exams.find((e) => e.examName === 'Final Exam 2026');

      expect(midTerm).toBeDefined();
      expect(finalExam).toBeDefined();

      // Mid-term should have subjects (Math and Science)
      expect(midTerm.subjects.length).toBeGreaterThanOrEqual(1);
      // Confirm each exam has its own totals and percentage
      expect(midTerm.totalMarksObtained).toBeGreaterThan(0);
      expect(midTerm.totalMaxMarks).toBeGreaterThan(0);
      expect(midTerm.percentage).toBeGreaterThan(0);
      expect(midTerm.overallGrade).toBeDefined();

      // Different exams are NOT lumped into a single grand total
      expect(finalExam.totalMaxMarks).toBe(100);
    });

    it('guardian gets report card for linked student → 200', async () => {
      // guardian1 is linked to rahulStudent
      const res = await request(app)
        .get(`/api/exams/report-card/${rahulStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.student.id).toBe(rahulStudent.id);
      expect(res.body.exams).toBeDefined();
    });

    it('guardian accessing report card for unlinked student returns 404 NOT_FOUND (privacy preservation)', async () => {
      // guardian1 is NOT linked to priyaStudent
      const res = await request(app)
        .get(`/api/exams/report-card/${priyaStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
      expect(res.body.message).toBe('Student record not found.');
    });

    it('teacher cannot view report card of a student outside their sections → 403', async () => {
      // teacher2 is assigned to Grade 10, not Grade 9-A where rahulStudent is enrolled
      const res = await request(app)
        .get(`/api/exams/report-card/${rahulStudent.id}`)
        .set('Authorization', `Bearer ${teacher2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('teacher can view report card of a student in their assigned section → 200', async () => {
      // teacher1 teaches Grade 9-A where rahulStudent is enrolled
      const res = await request(app)
        .get(`/api/exams/report-card/${rahulStudent.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.student.id).toBe(rahulStudent.id);
    });
  });
});

