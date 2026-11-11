import { verifyTeacherSectionAccess, verifyGuardianStudentAccess } from '../services/accessControlService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export function requireTeacherSectionOwnership(paramName = 'sectionId') {
  return async (req, res, next) => {
    try {
      const sectionId = req.params[paramName] || req.body[paramName];

      if (!sectionId) {
        return next(new AppError(400, 'BAD_REQUEST', `Missing ${paramName} parameter.`));
      }

      // ADMIN has universal access
      if (req.user.role === 'ADMIN') {
        return next();
      }

      if (req.user.role === 'TEACHER') {
        req.teacher = await verifyTeacherSectionAccess(req.user.id, sectionId);
        return next();
      }

      logger.warn(
        `Authorization denied: user=${req.user.id} role=${req.user.role} resource=section:${sectionId}`
      );
      return next(new AppError(403, 'FORBIDDEN', 'Access restricted to assigned teachers and administrators.'));
    } catch (err) {
      next(err);
    }
  };
}

export function requireGuardianStudentOwnership(paramName = 'studentId') {
  return async (req, res, next) => {
    try {
      const studentId = req.params[paramName] || req.body[paramName];

      if (!studentId) {
        return next(new AppError(400, 'BAD_REQUEST', `Missing ${paramName} parameter.`));
      }

      // ADMIN has universal access
      if (req.user.role === 'ADMIN') {
        return next();
      }

      if (req.user.role === 'GUARDIAN') {
        req.guardian = await verifyGuardianStudentAccess(req.user.id, studentId);
        return next();
      }

      logger.warn(
        `Authorization denied: user=${req.user.id} role=${req.user.role} resource=student:${studentId}`
      );
      // For any non-guardian/non-admin attempting guardian routes, return 403
      return next(new AppError(403, 'FORBIDDEN', 'Access denied.'));
    } catch (err) {
      next(err);
    }
  };
}
