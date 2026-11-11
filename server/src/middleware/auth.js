import { verifyToken } from '../utils/token.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token is required.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'INVALID_TOKEN', 'Authentication token has expired.'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid authentication token.'));
  }
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Authorization denied: user=${req.user?.id} role=${req.user?.role} resource=${req.method} ${req.originalUrl}`
      );
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    next();
  };
}
