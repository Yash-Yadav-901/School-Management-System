import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-only-secret-do-not-use-in-production',
      JWT_EXPIRES_IN: '1h',
      NODE_ENV: 'test',
      LOG_SILENT: 'true',
      PORT: '4001',
      CORS_ORIGIN: 'http://localhost:5173',
      // Low rounds so bcrypt hashing is fast in tests.
      BCRYPT_ROUNDS: '4',
    },
    globalSetup: './tests/globalSetup.js',
    testTimeout: 15000,
  },
});
