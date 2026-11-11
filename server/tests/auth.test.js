import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import prisma from '../src/db/index.js';
import { config } from '../src/config/index.js';

describe('Phase 2: Authentication & Authorization', () => {
  let teacher1Token;
  let teacher2Token;
  let guardian1Token;
  let guardian2Token;

  let sec9A;
  let sec10B;
  let rahulSingh;
  let priyaVerma;

  beforeAll(async () => {
    // Fetch seeded IDs for deterministic tests
    const grade9 = await prisma.class.findUnique({ where: { name: 'Grade 9' } });
    const grade10 = await prisma.class.findUnique({ where: { name: 'Grade 10' } });

    sec9A = await prisma.section.findUnique({
      where: { classId_name: { classId: grade9.id, name: 'A' } },
    });
    sec10B = await prisma.section.findUnique({
      where: { classId_name: { classId: grade10.id, name: 'B' } },
    });

    rahulSingh = await prisma.student.findFirst({ where: { name: 'Rahul Singh' } });
    priyaVerma = await prisma.student.findFirst({ where: { name: 'Priya Verma' } });

    // Login users to acquire tokens
    const t1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teacher1@school.demo', password: 'Teacher@123' });
    teacher1Token = t1Res.body.token;

    const t2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teacher2@school.demo', password: 'Teacher@123' });
    teacher2Token = t2Res.body.token;

    const g1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'guardian1@school.demo', password: 'Guardian@123' });
    guardian1Token = g1Res.body.token;

    const g2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'guardian2@school.demo', password: 'Guardian@123' });
    guardian2Token = g2Res.body.token;
  });

  describe('POST /api/auth/login', () => {
    it('succeeds with valid credentials and returns token and user info', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@school.demo', password: 'Admin@123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({
        email: 'admin@school.demo',
        role: 'ADMIN',
      });
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejects with 401 when password is wrong', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@school.demo', password: 'WrongPassword123' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        details: [],
      });
    });

    it('rejects with 401 and the same error message when email does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@school.demo', password: 'AnyPassword123' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        details: [],
      });
    });

    it('rejects with 400 when email or password is empty or invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toContain('A valid email address is required.');
      expect(res.body.details).toContain('Password is required.');
    });
  });

  describe('JWT authentication middleware', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'UNAUTHORIZED',
        message: 'Authentication token is required.',
        details: [],
      });
    });

    it('returns 401 when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'INVALID_TOKEN',
        message: 'Invalid authentication token.',
        details: [],
      });
    });

    it('returns 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: 1, role: 'ADMIN' },
        config.jwtSecret,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'INVALID_TOKEN',
        message: 'Authentication token has expired.',
        details: [],
      });
    });

    it('returns 200 with current user profile for valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        email: 'teacher1@school.demo',
        role: 'TEACHER',
        teacher: expect.objectContaining({ name: 'Rajan Kumar' }),
      });
    });
  });

  describe('Teacher class/section ownership authorization', () => {
    it('grants 200 access when teacher is assigned to the section', async () => {
      // teacher1 is assigned to Grade 9 Section A
      const res = await request(app)
        .get(`/api/auth/verify-teacher-section/${sec9A.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.sectionId).toBe(sec9A.id);
    });

    it('returns 403 when teacher attempts to access an unassigned section', async () => {
      // teacher1 is NOT assigned to Grade 10 Section B
      const res = await request(app)
        .get(`/api/auth/verify-teacher-section/${sec10B.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this class section.',
        details: [],
      });
    });
  });

  describe('Guardian student ownership and privacy on student routes (403 vs 404 rule)', () => {
    it('grants 200 access when guardian requests their linked student', async () => {
      // guardian1 is linked to Rahul Singh
      const res = await request(app)
        .get(`/api/students/${rahulSingh.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(rahulSingh.id);
      expect(res.body.name).toBe('Rahul Singh');
    });

    it('returns 404 when guardian requests another guardian child to protect privacy', async () => {
      // guardian1 is NOT linked to Priya Verma (guardian2's child)
      // Must return 404 rather than 403 to prevent enumeration/leaking existence
      const res = await request(app)
        .get(`/api/students/${priyaVerma.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: 'NOT_FOUND',
        message: 'Student record not found.',
        details: [],
      });
    });

    it('returns 403 when teacher tries to access guardian student endpoint', async () => {
      const res = await request(app)
        .get(`/api/students/${rahulSingh.id}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });
});
