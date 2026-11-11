import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authController from '../controllers/authController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import {
  requireTeacherSectionOwnership,
  requireGuardianStudentOwnership,
} from '../middleware/authorizeOwnership.js';

const router = express.Router();

router.post('/login', asyncHandler(authController.login));
router.get('/me', authenticateToken, asyncHandler(authController.getMe));

// Ownership verification routes
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

router.get(
  '/verify-guardian-student/:studentId',
  authenticateToken,
  requireRoles('ADMIN', 'GUARDIAN'),
  requireGuardianStudentOwnership('studentId'),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted to student.',
      studentId: Number(req.params.studentId),
    });
  }
);

export default router;
