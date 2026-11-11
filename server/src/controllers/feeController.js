import {
  validateSingleInvoiceInput,
  validateBulkInvoiceInput,
  validatePaymentInput,
} from '../validators/feeValidator.js';
import * as feeService from '../services/feeService.js';
import { AppError } from '../utils/AppError.js';

export async function createSingleInvoice(req, res) {
  const errors = validateSingleInvoiceInput(req.body);
  if (errors.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice input.', errors);

  const invoice = await feeService.createSingleInvoice(req.body, req.user.id);
  res.status(201).json(invoice);
}

export async function createBulkInvoices(req, res) {
  const errors = validateBulkInvoiceInput(req.body);
  if (errors.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid bulk invoice input.', errors);

  const result = await feeService.createBulkInvoices(req.body, req.user.id);
  res.status(201).json(result);
}

export async function getInvoices(req, res) {
  const result = await feeService.listInvoices(req.query, req.user);
  res.json(result);
}

export async function getInvoice(req, res) {
  const invoice = await feeService.getInvoiceById(req.params.id, req.user);
  res.json(invoice);
}

export async function payInvoice(req, res) {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    throw new AppError(400, 'BAD_REQUEST', 'Idempotency-Key header is required.');
  }

  const errors = validatePaymentInput(req.body);
  if (errors.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid payment input.', errors);

  const result = await feeService.recordPayment(
    req.params.id,
    req.body.amountPaid,
    idempotencyKey,
    req.user
  );

  res.status(200).json(result);
}

export async function voidInvoice(req, res) {
  const invoice = await feeService.voidInvoice(req.params.id, req.user.id);
  res.json(invoice);
}

export async function getStudentFeeSummary(req, res) {
  const summary = await feeService.getStudentFeeSummary(req.params.studentId);
  res.json(summary);
}

export async function getAdminFeeReport(req, res) {
  const report = await feeService.getAdminFeeReport();
  res.json(report);
}
