/**
 * Minimal structured logger for client-side events.
 * Strictly adheres to privacy constraints: never logs tokens, passwords, or hashes.
 */

export const logger = {
  apiError(status, code, path, message) {
    console.error('[API Error]', {
      timestamp: new Date().toISOString(),
      status,
      code,
      path,
      message,
    });
  },

  authState(action, userContext = {}) {
    const safeContext = {
      id: userContext.id,
      email: userContext.email,
      role: userContext.role,
    };
    console.info('[Auth State]', {
      timestamp: new Date().toISOString(),
      action,
      user: safeContext,
    });
  },
};
