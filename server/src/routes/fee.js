import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { requireGuardianStudentOwnership } from '../middleware/authorizeOwnership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as feeController from '../controllers/feeController.js';

const router = Router();

// All fee routes require authentication. Teachers are strictly blocked with 403.
router.use(authenticateToken);
router.use(requireRoles('ADMIN', 'GUARDIAN'));

// ── Admin-only management endpoints ────────────────────────────────────────
router.post('/invoices', requireRoles('ADMIN'), asyncHandler(feeController.createSingleInvoice));
router.post('/invoices/bulk', requireRoles('ADMIN'), asyncHandler(feeController.createBulkInvoices));
router.post('/invoices/:id/void', requireRoles('ADMIN'), asyncHandler(feeController.voidInvoice));
router.get('/admin-report', requireRoles('ADMIN'), asyncHandler(feeController.getAdminFeeReport));

// ── Shared endpoints (ADMIN & GUARDIAN with privacy checks) ────────────────
router.get('/invoices', asyncHandler(feeController.getInvoices));
router.get('/invoices/:id', asyncHandler(feeController.getInvoice));
router.post('/invoices/:id/pay', asyncHandler(feeController.payInvoice));
router.get(
  '/student-summary/:studentId',
  requireGuardianStudentOwnership('studentId'),
  asyncHandler(feeController.getStudentFeeSummary)
);

export default router;

