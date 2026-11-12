import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as teacherController from '../controllers/teacherController.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles('TEACHER', 'ADMIN'));

router.get('/sections', asyncHandler(teacherController.getMySections));
router.get('/my-sections', asyncHandler(teacherController.getMySections));
router.get('/sections/:sectionId/students', asyncHandler(teacherController.getSectionStudents));

export default router;
