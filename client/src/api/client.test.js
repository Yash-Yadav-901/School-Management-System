import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiClientError, TOKEN_KEY, USER_KEY, setSession, clearSession } from './client.js';

describe('apiClient', () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  let mockStorage = {};

  const mockLocalStorage = {
    getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
    setItem: (key, val) => {
      mockStorage[key] = String(val);
    },
    removeItem: (key) => {
      delete mockStorage[key];
    },
    clear: () => {
      mockStorage = {};
    },
  };

  beforeEach(() => {
    mockStorage = {};
    global.localStorage = mockLocalStorage;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.window = originalWindow;
  });

  it('throws ApiClientError on unauthenticated 401 without clearing session or redirecting', async () => {
    // No token set in localStorage
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Invalid credentials' }),
    });

    const dispatchSpy = vi.fn();
    global.window = {
      dispatchEvent: dispatchSpy,
      location: { pathname: '/login', href: '/login' },
    };

    let caughtError;
    try {
      await apiClient('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'test@school.demo' }) });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ApiClientError);
    expect(caughtError.status).toBe(401);
    expect(caughtError.message).toBe('Invalid credentials');
    // Global unauthorized event should NOT be dispatched
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(global.window.location.href).toBe('/login');
  });

  it('clears session and triggers redirect on authenticated 401', async () => {
    setSession('active-jwt-token', { id: 1, role: 'TEACHER' });
    expect(localStorage.getItem(TOKEN_KEY)).toBe('active-jwt-token');

    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Token has expired' }),
    });

    const dispatchSpy = vi.fn();
    global.window = {
      dispatchEvent: dispatchSpy,
      location: { pathname: '/teacher/sections', href: '/teacher/sections' },
    };

    let caughtError;
    try {
      await apiClient('/teacher/sections');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ApiClientError);
    expect(caughtError.status).toBe(401);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
    expect(global.window.location.href).toBe('/login?expired=1');
  });

  it('parses successful 200 JSON responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, count: 5 }),
    });

    const data = await apiClient('/health');
    expect(data).toEqual({ success: true, count: 5 });
  });

  it('returns null for 204 No Content responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 204,
      ok: true,
      headers: { get: () => '' },
    });

    const data = await apiClient('/some-endpoint', { method: 'DELETE' });
    expect(data).toBeNull();
  });
});
