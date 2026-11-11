import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

// Every error response has the same shape regardless of where it originated.
// Prisma constraint errors are mapped to 409 CONFLICT so callers never see raw Prisma errors.
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'A record with that value already exists.',
      details: [],
    });
  }

  if (err.code === 'P2003') {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'Cannot delete or modify this record because dependent records exist.',
      details: [],
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'The requested record does not exist.',
      details: [],
    });
  }

  logger.error(`Unhandled error on ${req.method} ${req.path}`, err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    details: [],
  });
}
