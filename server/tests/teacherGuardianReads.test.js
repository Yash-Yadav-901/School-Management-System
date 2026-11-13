import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

let adminToken, teacher1Token, teacher2Token, guardian1Token, guardian2Token;
let grade9aSection, grade10bSection;

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
});

describe('Teacher and Guardian Safe Read Endpoints', () => {
  describe('GET /api/teacher/sections (My Sections)', () => {
    it('teacher1 gets their assigned sections with subjects', async () => {
      const res = await request(app)
        .get('/api/teacher/sections')
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const section9a = res.body.find((s) => s.id === grade9aSection.id);
      expect(section9a).toBeDefined();
      expect(section9a.name).toBe('A');
      expect(section9a.class.name).toBe('Grade 9');
      expect(Array.isArray(section9a.subjects)).toBe(true);
      expect(section9a.subjects.length).toBeGreaterThan(0);
    });

    it('blocks guardian from teacher sections with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/teacher/sections')
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/teacher/sections/:sectionId/students (Students of Owned Section)', () => {
    it('teacher1 gets students of their assigned section (Grade 9-A)', async () => {
      const res = await request(app)
        .get(`/api/teacher/sections/${grade9aSection.id}/students`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('section');
      expect(res.body).toHaveProperty('students');
      expect(Array.isArray(res.body.students)).toBe(true);
      expect(res.body.students.length).toBeGreaterThan(0);
      expect(res.body.students.every((st) => st.sectionId === grade9aSection.id)).toBe(true);
    });

    it('teacher1 is blocked with 403 when requesting students of an unassigned section (Grade 10-B)', async () => {
      const res = await request(app)
        .get(`/api/teacher/sections/${grade10bSection.id}/students`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
      expect(res.body.message).toContain('do not have permission');
    });

    it('admin can access students of any section', async () => {
      const res = await request(app)
        .get(`/api/teacher/sections/${grade9aSection.id}/students`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.students.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/exams (Filtered to Teacher Sections)', () => {
    it('teacher1 gets exams filtered to their assigned sections', async () => {
      const res = await request(app)
        .get('/api/exams')
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      // All exams must belong to teacher1's sections (Grade 9-A)
      expect(res.body.data.every((exam) => exam.sectionId === grade9aSection.id)).toBe(true);
    });

    it('teacher1 requesting exams for an unassigned section returns 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get(`/api/exams?sectionId=${grade10bSection.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/guardian/children', () => {
    it('guardian1 gets their linked children only (Rahul and Anjali Singh)', async () => {
      const res = await request(app)
        .get('/api/guardian/children')
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const names = res.body.map((c) => c.name);
      expect(names).toContain('Rahul Singh');
      expect(names).toContain('Anjali Singh');
      expect(names).not.toContain('Priya Verma');
    });

    it('guardian2 gets Priya Verma and Karan Verma', async () => {
      const res = await request(app)
        .get('/api/guardian/children')
        .set('Authorization', `Bearer ${guardian2Token}`);

      expect(res.status).toBe(200);
      const names = res.body.map((c) => c.name);
      expect(names).toContain('Priya Verma');
      expect(names).toContain('Karan Verma');
      expect(names).not.toContain('Rahul Singh');
    });

    it('blocks teacher from guardian student list with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/guardian/children')
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });
});
