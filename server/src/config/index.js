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
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
};

