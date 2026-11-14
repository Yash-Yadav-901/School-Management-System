import { ApiError } from '../utils/ApiError.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

// Centralized error handling middleware.
// Distinguishes between AppError (domain error with code & details), ApiError (standard API error),
// Prisma database constraints (P2002, P2003, P2025), and concurrency locks.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Domain AppError (guaranteed shape for API consumer and existing test suite)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Standard ApiError instance
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      success: false,
      message: err.message,
      errors: err.errors,
      data: err.data,
      ...(process.env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
    });
  }

  // Prisma unique constraint violation (e.g. duplicate email, duplicate subject code)
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'A record with that value already exists.',
      details: [],
    });
  }

  // Prisma foreign key constraint violation (e.g. deleting parent entity with linked records)
  if (err.code === 'P2003') {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'Cannot delete or modify this record because dependent records exist.',
      details: [],
    });
  }

  // Prisma record to update/delete not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'The requested record does not exist.',
      details: [],
    });
  }

  // SQLite BUSY / LOCKED / P2034 transaction conflict under concurrent writes
  if (
    err.code === 'P2034' ||
    (err.message &&
      (err.message.includes('SQLITE_BUSY') ||
        err.message.includes('SQLITE_LOCKED') ||
        err.message.includes('database is locked')))
  ) {
    return res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Database is busy, please retry the request.',
      details: [],
    });
  }

  // JSON body parser syntax error (malformed request body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Malformed JSON payload in request body.',
      details: [err.message],
    });
  }

  // Generic 500 unhandled internal error
  logger.error(`Unhandled error on ${req.method} ${req.path}`, err);
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    details: [],
    ...(process.env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
  });
}
