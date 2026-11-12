import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

let adminToken, teacher1Token, teacher2Token, guardian1Token, guardian2Token;
let grade9aSection, grade10bSection;
let rahulStudent, priyaStudent;

beforeAll(async () => {
  async function login(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.token;
  }

  [adminToken, teacher1Token, teacher2Token, guardian1Token, guardian2Token] = await Promise.all([
    login('admin@school.demo', 'Admin@123'),
    login('teacher1@school.demo', 'Teacher@123'),
    login('teacher2@school.demo', 'Teacher@123'),
    login('guardian1@school.demo', 'Guardian@123'),
    login('guardian2@school.demo', 'Guardian@123'),
  ]);

  grade9aSection = await prisma.section.findFirst({
    where: { name: 'A', class: { name: 'Grade 9' } },
  });
  grade10bSection = await prisma.section.findFirst({
    where: { name: 'B', class: { name: 'Grade 10' } },
  });

  rahulStudent = await prisma.student.findFirst({ where: { name: 'Rahul Singh' } });
  priyaStudent = await prisma.student.findFirst({ where: { name: 'Priya Verma' } });
});

describe('Phase 7: Reports Endpoints & Strict RBAC', () => {
  describe('Attendance Report (/api/reports/attendance)', () => {
    it('admin gets attendance report with summary counts and rates', async () => {
      const res = await request(app)
        .get('/api/reports/attendance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalSessions');
      expect(res.body).toHaveProperty('counts');
      expect(res.body).toHaveProperty('attendanceRate');
      expect(res.body).toHaveProperty('students');
      expect(Array.isArray(res.body.students)).toBe(true);
    });

    it('teacher1 gets attendance report for assigned section (Grade 9-A)', async () => {
      const res = await request(app)
        .get(`/api/reports/attendance?sectionId=${grade9aSection.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalSessions');
    });

    it('teacher1 is blocked with 403 FORBIDDEN when requesting unassigned section (Grade 10-B)', async () => {
      const res = await request(app)
        .get(`/api/reports/attendance?sectionId=${grade10bSection.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('guardian gets attendance report for linked child', async () => {
      const res = await request(app)
        .get(`/api/reports/attendance?studentId=${rahulStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.students.every((s) => s.studentId === rahulStudent.id)).toBe(true);
    });

    it('guardian requesting unlinked child attendance report returns 404 NOT_FOUND', async () => {
      const res = await request(app)
        .get(`/api/reports/attendance?studentId=${priyaStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });

  describe('Academic Report (/api/reports/academic)', () => {
    it('admin gets academic report with average, highest, lowest, and grade distribution', async () => {
      const res = await request(app)
        .get('/api/reports/academic')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('exams');
      expect(Array.isArray(res.body.exams)).toBe(true);

      if (res.body.exams.length > 0) {
        const first = res.body.exams[0];
        expect(first).toHaveProperty('examId');
        expect(first).toHaveProperty('examName');
        expect(first).toHaveProperty('averageMarks');
        expect(first).toHaveProperty('highestMarks');
        expect(first).toHaveProperty('lowestMarks');
        expect(first).toHaveProperty('gradeDistribution');
        expect(typeof first.gradeDistribution).toBe('object');
      }
    });

    it('teacher1 can view academic report for their section', async () => {
      const res = await request(app)
        .get(`/api/reports/academic?sectionId=${grade9aSection.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('exams');
    });

    it('teacher1 is blocked with 403 when requesting academic report for unassigned section', async () => {
      const res = await request(app)
        .get(`/api/reports/academic?sectionId=${grade10bSection.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('guardian can view academic report scoped to their linked child', async () => {
      const res = await request(app)
        .get(`/api/reports/academic?studentId=${rahulStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('exams');
    });

    it('guardian requesting unlinked child academic report returns 404 NOT_FOUND', async () => {
      const res = await request(app)
        .get(`/api/reports/academic?studentId=${priyaStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });

  describe('Fee Report (/api/reports/fees)', () => {
    it('admin gets fee report across all sections', async () => {
      const res = await request(app)
        .get('/api/reports/fees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totals');
      expect(res.body.totals).toHaveProperty('totalInvoiced');
      expect(res.body.totals).toHaveProperty('totalPaid');
      expect(res.body.totals).toHaveProperty('outstandingBalance');
      expect(res.body).toHaveProperty('sections');
    });

    it('teacher is strictly blocked with 403 FORBIDDEN from fee reports', async () => {
      const res = await request(app)
        .get('/api/reports/fees')
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('guardian can view fee report for linked child', async () => {
      const res = await request(app)
        .get(`/api/reports/fees?studentId=${rahulStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totals');
      expect(res.body).toHaveProperty('invoices');
    });

    it('guardian is blocked with 404 NOT_FOUND when requesting unlinked child fee report', async () => {
      const res = await request(app)
        .get(`/api/reports/fees?studentId=${priyaStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });
});

