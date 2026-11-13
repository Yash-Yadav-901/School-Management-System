import express from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authController from '../controllers/authController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import {
  requireTeacherSectionOwnership,
  requireGuardianStudentOwnership,
} from '../middleware/authorizeOwnership.js';

const router = express.Router();

const windowMinutes = process.env.LOGIN_RATE_LIMIT_WINDOW_MIN
  ? Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MIN)
  : 15;

const defaultMax = process.env.NODE_ENV === 'test' ? 50 : 30;
const maxAttempts = process.env.LOGIN_RATE_LIMIT_MAX
  ? Number(process.env.LOGIN_RATE_LIMIT_MAX)
  : defaultMax;

const loginLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again later.',
      details: [],
    });
  },
});

router.post('/login', loginLimiter, asyncHandler(authController.login));
router.get('/me', authenticateToken, asyncHandler(authController.getMe));

// Ownership verification routes (legacy helper for teacher testing)
router.get(
  '/verify-teacher-section/:sectionId',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  requireTeacherSectionOwnership('sectionId'),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted to section.',
      sectionId: Number(req.params.sectionId),
    });
  }
);

export default router;
