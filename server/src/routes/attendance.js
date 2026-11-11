import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { requireTeacherSectionOwnership } from '../middleware/authorizeOwnership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as attendanceController from '../controllers/attendanceController.js';

const router = Router();

router.post(
  '/',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  requireTeacherSectionOwnership('sectionId'),
  asyncHandler(attendanceController.recordAttendance)
);

router.get(
  '/',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  asyncHandler(attendanceController.getAttendance)
);

router.get(
  '/summary/section/:sectionId',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  requireTeacherSectionOwnership('sectionId'),
  asyncHandler(attendanceController.getSectionSummary)
);

router.get(
  '/summary/student/:studentId',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  asyncHandler(attendanceController.getStudentSummary)
);

export default router;
