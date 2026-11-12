import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { requireStudentAccess } from '../middleware/authorizeOwnership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as examController from '../controllers/examController.js';

const router = Router();

// Create exam — ADMIN only
router.post(
  '/',
  authenticateToken,
  requireRoles('ADMIN'),
  asyncHandler(examController.createExam)
);

// List exams — ADMIN and TEACHER
router.get(
  '/',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  asyncHandler(examController.getExams)
);

// Get single exam with marks & computed grades — ADMIN and TEACHER
router.get(
  '/:id',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  asyncHandler(examController.getExam)
);

// Delete exam — ADMIN only (rejects with 409 if results exist)
router.delete(
  '/:id',
  authenticateToken,
  requireRoles('ADMIN'),
  asyncHandler(examController.deleteExam)
);

// Enter / update marks — ADMIN and assigned TEACHER (verified in service)
router.post(
  '/:id/marks',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  asyncHandler(examController.enterMarks)
);

// Alias: /:id/results (GET for results, POST for marks entry)
router.get(
  '/:id/results',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  asyncHandler(examController.getExam)
);
router.post(
  '/:id/results',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER'),
  asyncHandler(examController.enterMarks)
);

// Report card per student — ADMIN, TEACHER (for their section), and GUARDIAN (for linked student only, 404 for others)
router.get(
  '/report-card/:studentId',
  authenticateToken,
  requireRoles('ADMIN', 'TEACHER', 'GUARDIAN'),
  requireStudentAccess('studentId'),
  asyncHandler(examController.getReportCard)
);

export default router;

