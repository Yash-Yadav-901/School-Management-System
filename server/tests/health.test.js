import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('serves Swagger UI API documentation at /api-docs', async () => {
    const res = await request(app).get('/api-docs/');
    // Swagger UI returns 200 with HTML or 301 redirect from /api-docs to /api-docs/
    expect([200, 301]).toContain(res.status);
    if (res.status === 200) {
      expect(res.text).toContain('swagger-ui');
    }
  });
});

