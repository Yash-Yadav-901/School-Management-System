import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { requireGuardianStudentOwnership } from '../middleware/authorizeOwnership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as academicService from '../services/academicService.js';

const router = Router();

router.get(
  '/:id',
  authenticateToken,
  requireRoles('ADMIN', 'GUARDIAN'),
  requireGuardianStudentOwnership('id'),
  asyncHandler(async (req, res) => {
    const student = await academicService.getStudentById(req.params.id);
    res.json(student);
  })
);

export default router;

