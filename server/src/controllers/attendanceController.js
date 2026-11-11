import { validateBulkAttendanceInput } from '../validators/attendanceValidator.js';
import * as attendanceService from '../services/attendanceService.js';
import { AppError } from '../utils/AppError.js';

export async function recordAttendance(req, res) {
  const errors = validateBulkAttendanceInput(req.body);
  if (errors.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid attendance input.', errors);

  const { sectionId, date, session, entries } = req.body;
  const result = await attendanceService.recordBulkAttendance(
    sectionId,
    date,
    session,
    entries,
    req.user.id
  );
  res.status(201).json(result);
}

export async function getAttendance(req, res) {
  const result = await attendanceService.listAttendance(req.query, req.user);
  res.json(result);
}

export async function getSectionSummary(req, res) {
  const result = await attendanceService.getSectionAttendanceSummary(req.params.sectionId, req.query);
  res.json(result);
}

export async function getStudentSummary(req, res) {
  const result = await attendanceService.getStudentAttendanceSummary(req.params.studentId, req.query);
  res.json(result);
}

