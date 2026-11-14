import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/utils/ApiError.js';
import { ApiResponse } from '../src/utils/ApiResponse.js';
import { AppError } from '../src/utils/AppError.js';

describe('Backend Utility Classes: ApiError & ApiResponse', () => {
  describe('ApiError class', () => {
    it('creates an ApiError with custom values and default stack trace', () => {
      const err = new ApiError(400, 'Invalid input parameters', ['Field x is required']);

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Invalid input parameters');
      expect(err.data).toBeNull();
      expect(err.success).toBe(false);
      expect(err.errors).toEqual(['Field x is required']);
      expect(err.stack).toBeDefined();
    });

    it('creates an ApiError with default parameters', () => {
      const err = new ApiError(500);

      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('something went wrong');
      expect(err.errors).toEqual([]);
      expect(err.success).toBe(false);
      expect(err.data).toBeNull();
    });

    it('accepts a custom stack trace when provided', () => {
      const customStack = 'CustomStack: at test.js:1:1';
      const err = new ApiError(403, 'Forbidden action', [], customStack);

      expect(err.statusCode).toBe(403);
      expect(err.stack).toBe(customStack);
    });

    it('AppError inherits from ApiError and preserves backward compatibility', () => {
      const appErr = new AppError(404, 'NOT_FOUND', 'Item missing', ['id: 123']);

      expect(appErr).toBeInstanceOf(Error);
      expect(appErr).toBeInstanceOf(ApiError);
      expect(appErr).toBeInstanceOf(AppError);
      expect(appErr.statusCode).toBe(404);
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.message).toBe('Item missing');
      expect(appErr.details).toEqual(['id: 123']);
      expect(appErr.errors).toEqual(['id: 123']);
      expect(appErr.success).toBe(false);
      expect(appErr.data).toBeNull();
    });
  });

  describe('ApiResponse class', () => {
    it('creates an ApiResponse with 200 OK and default message', () => {
      const payload = { id: 1, name: 'Grade 9' };
      const response = new ApiResponse(200, payload);

      expect(response.statusCode).toBe(200);
      expect(response.statusCoded).toBe(200);
      expect(response.data).toEqual(payload);
      expect(response.message).toBe('success');
      expect(response.success).toBe(true);
    });

    it('creates an ApiResponse with custom message and status code', () => {
      const response = new ApiResponse(201, { created: true }, 'Resource created successfully');

      expect(response.statusCode).toBe(201);
      expect(response.data).toEqual({ created: true });
      expect(response.message).toBe('Resource created successfully');
      expect(response.success).toBe(true);
    });

    it('marks success as false when statusCode is 400 or above', () => {
      const response = new ApiResponse(400, null, 'Client error');

      expect(response.statusCode).toBe(400);
      expect(response.success).toBe(false);
    });

    it('send(res) helper invokes res.status and res.json with itself', () => {
      const response = new ApiResponse(200, { status: 'healthy' }, 'System up');
      const mockRes = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.payload = payload;
          return this;
        },
      };

      response.send(mockRes);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.payload).toBe(response);
    });
  });
});

