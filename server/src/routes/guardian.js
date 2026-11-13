import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as guardianController from '../controllers/guardianController.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles('GUARDIAN', 'ADMIN'));

router.get('/children', asyncHandler(guardianController.getMyStudents));

export default router;
