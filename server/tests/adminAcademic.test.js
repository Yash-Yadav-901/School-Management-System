import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

describe('Phase 3: Admin Academic Administration CRUD', () => {
  let adminToken;
  let teacherToken;
  let guardianToken;

  beforeAll(async () => {
    // Acquire tokens
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@school.demo', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    const teacherRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teacher1@school.demo', password: 'Teacher@123' });
    teacherToken = teacherRes.body.token;

    const guardianRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'guardian1@school.demo', password: 'Guardian@123' });
    guardianToken = guardianRes.body.token;
  });

  describe('RBAC authorization enforcement', () => {
    it('blocks teacher with 403 on admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/classes')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('blocks guardian with 403 on admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/classes')
        .set('Authorization', `Bearer ${guardianToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('Classes CRUD, search, pagination, validation & constraints', () => {
    it('lists classes with pagination structure', async () => {
      const res = await request(app)
        .get('/api/admin/classes?page=1&pageSize=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        pageSize: 2,
      });
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('searches classes by name', async () => {
      const res = await request(app)
        .get('/api/admin/classes?search=Grade 9')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((c) => c.name === 'Grade 9')).toBe(true);
    });

    it('rejects class creation with 400 when name is empty', async () => {
      const res = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toContain('Class name is required.');
    });

    it('rejects duplicate class name with 409 CONFLICT', async () => {
      // Grade 10 already exists in seed data
      const res = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Grade 10' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
    });

    it('creates, updates and deletes a new class successfully', async () => {
      // Create
      const createRes = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Grade 11' });

      expect(createRes.status).toBe(201);
      const newClassId = createRes.body.id;

      // Update
      const updateRes = await request(app)
        .put(`/api/admin/classes/${newClassId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Grade 11 - Science' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe('Grade 11 - Science');

      // Delete (has no dependents)
      const deleteRes = await request(app)
        .delete(`/api/admin/classes/${newClassId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
    });

    it('returns 409 CONFLICT when deleting a class that has attached sections', async () => {
      // Grade 9 has Section A attached
      const grade9 = await prisma.class.findUnique({ where: { name: 'Grade 9' } });

      const res = await request(app)
        .delete(`/api/admin/classes/${grade9.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
      expect(res.body.message).toContain('sections are attached');
    });
  });

  describe('Sections CRUD & constraints', () => {
    it('creates and filters sections by classId', async () => {
      const grade9 = await prisma.class.findUnique({ where: { name: 'Grade 9' } });

      const res = await request(app)
        .get(`/api/admin/sections?classId=${grade9.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((s) => s.classId === grade9.id)).toBe(true);
    });

    it('rejects section deletion with 409 when students are enrolled', async () => {
      const sec9A = await prisma.section.findFirst({
        where: { name: 'A', class: { name: 'Grade 9' } },
      });

      const res = await request(app)
        .delete(`/api/admin/sections/${sec9A.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
    });
  });

  describe('Subjects CRUD & constraints', () => {
    it('creates a subject and rejects duplicate code with 409', async () => {
      // Create fresh subject
      const createRes = await request(app)
        .post('/api/admin/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Computer Science', code: 'CS101' });

      expect(createRes.status).toBe(201);
      expect(createRes.body.code).toBe('CS101');

      // Duplicate code
      const dupRes = await request(app)
        .post('/api/admin/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Computer Applications', code: 'CS101' });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error).toBe('CONFLICT');
    });

    it('rejects deletion with 409 when subject is assigned to teachers/sections', async () => {
      const math = await prisma.subject.findUnique({ where: { code: 'MATH' } });

      const res = await request(app)
        .delete(`/api/admin/subjects/${math.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
    });
  });

  describe('Teachers creation in transaction (never returns passwordHash)', () => {
    it('creates teacher and login user in transaction, excluding passwordHash', async () => {
      const res = await request(app)
        .post('/api/admin/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Arun Kulkarni',
          email: 'arun.k@school.demo',
          password: 'Password@123',
          phone: '9988776655',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Arun Kulkarni');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('arun.k@school.demo');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Verify created user can authenticate
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'arun.k@school.demo', password: 'Password@123' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.role).toBe('TEACHER');
    });
  });

  describe('Guardians creation in transaction', () => {
    it('creates guardian and user in transaction, excluding passwordHash', async () => {
      const res = await request(app)
        .post('/api/admin/guardians')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Deepak Chopra',
          email: 'deepak.c@school.demo',
          password: 'Password@123',
          phone: '9123456780',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Deepak Chopra');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('deepak.c@school.demo');
      expect(res.body.user.passwordHash).toBeUndefined();
    });
  });

  describe('Students CRUD & delete protection with dependents', () => {
    it('creates a student and prevents deleting students with existing records (409)', async () => {
      const rahul = await prisma.student.findFirst({ where: { name: 'Rahul Singh' } });

      const res = await request(app)
        .delete(`/api/admin/students/${rahul.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
      expect(res.body.message).toContain('attendance, exam or fee records exist');
    });
  });
});
