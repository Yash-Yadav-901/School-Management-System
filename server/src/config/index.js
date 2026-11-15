import fs from 'fs';
import path from 'path';

// Automatically load local .env if present (without crashing if absent in production)
if (typeof process.loadEnvFile === 'function') {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignored if file cannot be read
    }
  }
}

// All environment variables are read and validated once at startup.
// Missing required variables crash the process immediately with a clear message.

function getEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(getEnv('PORT', '4000'), 10),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  jwtSecret: getEnv('JWT_SECRET'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  bcryptRounds: parseInt(getEnv('BCRYPT_ROUNDS', '10'), 10),
  clientOrigin: process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173',
  corsOrigin: process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173',
};

