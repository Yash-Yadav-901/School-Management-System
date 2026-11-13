/**
 * Evaluates whether an Idempotency-Key should be regenerated or preserved.
 *
 * Rule:
 * - Keep the same key on network errors (status 0 / undefined), 5xx server errors, and 503 busy.
 * - Regenerate key only after a success (2xx) or a definite client error (4xx).
 *
 * @param {number|undefined|null} status - HTTP status code
 * @returns {boolean} True if key should be regenerated, false if it should be preserved for retry
 */
export function shouldRegenerateIdempotencyKey(status) {
  if (status === null || status === undefined || status === 0) {
    return false; // Network error: keep key
  }

  // 5xx and 503 responses: keep key for safe retry
  if (status >= 500 && status <= 599) {
    return false;
  }

  // Success (2xx): regenerate key
  if (status >= 200 && status <= 299) {
    return true;
  }

  // Definite 4xx client rejection (e.g. 400 overpayment, 409 conflict): regenerate key
  if (status >= 400 && status <= 499) {
    return true;
  }

  return false;
}

/**
 * Encapsulates the Idempotency-Key lifecycle.
 */
export class IdempotencyKeyLifecycle {
  constructor(generator = () => crypto.randomUUID()) {
    this.generator = generator;
    this.currentKey = this.generator();
  }

  getKey() {
    return this.currentKey;
  }

  /**
   * Updates key state according to response status.
   *
   * @param {number} status
   * @returns {{ regenerated: boolean, key: string }}
   */
  handleResponseStatus(status) {
    if (shouldRegenerateIdempotencyKey(status)) {
      this.currentKey = this.generator();
      return { regenerated: true, key: this.currentKey };
    }
    return { regenerated: false, key: this.currentKey };
  }

  regenerate() {
    this.currentKey = this.generator();
    return this.currentKey;
  }
}
