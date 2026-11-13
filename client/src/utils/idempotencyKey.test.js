import { describe, it, expect, vi } from 'vitest';
import { shouldRegenerateIdempotencyKey, IdempotencyKeyLifecycle } from './idempotencyKey.js';

describe('Idempotency-Key Lifecycle Rules', () => {
  it('preserves the key on network errors (status 0 or undefined)', () => {
    expect(shouldRegenerateIdempotencyKey(0)).toBe(false);
    expect(shouldRegenerateIdempotencyKey(undefined)).toBe(false);
    expect(shouldRegenerateIdempotencyKey(null)).toBe(false);
  });

  it('preserves the key on 5xx and 503 server errors to allow safe retry', () => {
    expect(shouldRegenerateIdempotencyKey(500)).toBe(false);
    expect(shouldRegenerateIdempotencyKey(502)).toBe(false);
    expect(shouldRegenerateIdempotencyKey(503)).toBe(false);
    expect(shouldRegenerateIdempotencyKey(504)).toBe(false);
  });

  it('regenerates the key on successful responses (2xx)', () => {
    expect(shouldRegenerateIdempotencyKey(200)).toBe(true);
    expect(shouldRegenerateIdempotencyKey(201)).toBe(true);
    expect(shouldRegenerateIdempotencyKey(204)).toBe(true);
  });

  it('regenerates the key on definite 4xx client errors', () => {
    expect(shouldRegenerateIdempotencyKey(400)).toBe(true);
    expect(shouldRegenerateIdempotencyKey(403)).toBe(true);
    expect(shouldRegenerateIdempotencyKey(404)).toBe(true);
    expect(shouldRegenerateIdempotencyKey(409)).toBe(true);
  });

  it('IdempotencyKeyLifecycle maintains the same key across network/5xx errors and rotates on success/4xx', () => {
    const keys = ['key-uuid-1', 'key-uuid-2', 'key-uuid-3', 'key-uuid-4'];
    let idx = 0;
    const mockGenerator = () => keys[idx++];

    const lifecycle = new IdempotencyKeyLifecycle(mockGenerator);
    const initialKey = lifecycle.getKey();
    expect(initialKey).toBe('key-uuid-1');

    // 1. Network error occurs (status 0) -> keep same key
    const res1 = lifecycle.handleResponseStatus(0);
    expect(res1.regenerated).toBe(false);
    expect(lifecycle.getKey()).toBe('key-uuid-1');

    // 2. 503 Service Unavailable / SQLite busy occurs -> keep same key for safe retry
    const res2 = lifecycle.handleResponseStatus(503);
    expect(res2.regenerated).toBe(false);
    expect(lifecycle.getKey()).toBe('key-uuid-1');

    // 3. 500 Internal Server Error occurs -> keep same key
    const res3 = lifecycle.handleResponseStatus(500);
    expect(res3.regenerated).toBe(false);
    expect(lifecycle.getKey()).toBe('key-uuid-1');

    // 4. Retry succeeds (200 OK) -> rotates to new key
    const res4 = lifecycle.handleResponseStatus(200);
    expect(res4.regenerated).toBe(true);
    expect(lifecycle.getKey()).toBe('key-uuid-2');

    // 5. Next attempt fails with 400 Overpayment -> rotates to new key
    const res5 = lifecycle.handleResponseStatus(400);
    expect(res5.regenerated).toBe(true);
    expect(lifecycle.getKey()).toBe('key-uuid-3');
  });
});
