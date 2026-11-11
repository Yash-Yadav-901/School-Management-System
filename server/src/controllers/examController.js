import { validateExamInput, validateMarksEntryInput } from '../validators/examValidator.js';
import * as examService from '../services/examService.js';
import { AppError } from '../utils/AppError.js';

export async function createExam(req, res) {
  const errors = validateExamInput(req.body);
  if (errors.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid exam input.', errors);

  const exam = await examService.createExam(req.body);
  res.status(201).json(exam);
}

export async function getExams(req, res) {
  const result = await examService.listExams(req.query, req.user);
  res.json(result);
}

export async function getExam(req, res) {
  const exam = await examService.getExamById(req.params.id);
  res.json(exam);
}

export async function enterMarks(req, res) {
  const errors = validateMarksEntryInput(req.body);
  if (errors.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid marks input.', errors);

  const result = await examService.enterMarks(req.params.id, req.body.entries, req.user);
  res.status(201).json(result);
}

export async function getReportCard(req, res) {
  const reportCard = await examService.getStudentReportCard(req.params.studentId);
  res.json(reportCard);
}
