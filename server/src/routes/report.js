import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();

// All reports require authentication. Individual route handlers enforce RBAC.
router.use(authenticateToken);

router.get('/attendance', asyncHandler(reportController.getAttendanceReport));
router.get('/academic', asyncHandler(reportController.getAcademicReport));
router.get('/fees', asyncHandler(reportController.getFeeReport));

export default router;

