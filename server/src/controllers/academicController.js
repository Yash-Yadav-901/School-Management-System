import * as academicService from '../services/academicService.js';
import * as academicValidator from '../validators/academicValidator.js';
import { AppError } from '../utils/AppError.js';

function validateOrThrow(validator, data, isUpdate = false) {
  const errors = validator(data, isUpdate);
  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', errors);
  }
}

// ── Classes ────────────────────────────────────────────────────────────────
export async function getClasses(req, res) {
  const result = await academicService.listClasses(req.query);
  res.status(200).json(result);
}

export async function createClass(req, res) {
  validateOrThrow(academicValidator.validateClassInput, req.body);
  const result = await academicService.createClass(req.body);
  res.status(201).json(result);
}

export async function getClass(req, res) {
  const result = await academicService.getClassById(req.params.id);
  res.status(200).json(result);
}

export async function updateClass(req, res) {
  validateOrThrow(academicValidator.validateClassInput, req.body, true);
  const result = await academicService.updateClass(req.params.id, req.body);
  res.status(200).json(result);
}

export async function deleteClass(req, res) {
  await academicService.deleteClass(req.params.id);
  res.status(200).json({ success: true, message: 'Class deleted successfully.' });
}

// ── Sections ───────────────────────────────────────────────────────────────
export async function getSections(req, res) {
  const result = await academicService.listSections(req.query);
  res.status(200).json(result);
}

export async function createSection(req, res) {
  validateOrThrow(academicValidator.validateSectionInput, req.body);
  const result = await academicService.createSection(req.body);
  res.status(201).json(result);
}

export async function getSection(req, res) {
  const result = await academicService.getSectionById(req.params.id);
  res.status(200).json(result);
}

export async function updateSection(req, res) {
  if (!req.body.name || typeof req.body.name !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', ['Section name is required.']);
  }
  const result = await academicService.updateSection(req.params.id, req.body);
  res.status(200).json(result);
}

export async function deleteSection(req, res) {
  await academicService.deleteSection(req.params.id);
  res.status(200).json({ success: true, message: 'Section deleted successfully.' });
}

// ── Subjects ───────────────────────────────────────────────────────────────
export async function getSubjects(req, res) {
  const result = await academicService.listSubjects(req.query);
  res.status(200).json(result);
}

export async function createSubject(req, res) {
  validateOrThrow(academicValidator.validateSubjectInput, req.body);
  const result = await academicService.createSubject(req.body);
  res.status(201).json(result);
}

export async function getSubject(req, res) {
  const result = await academicService.getSubjectById(req.params.id);
  res.status(200).json(result);
}

export async function updateSubject(req, res) {
  validateOrThrow(academicValidator.validateSubjectInput, req.body, true);
  const result = await academicService.updateSubject(req.params.id, req.body);
  res.status(200).json(result);
}

export async function deleteSubject(req, res) {
  await academicService.deleteSubject(req.params.id);
  res.status(200).json({ success: true, message: 'Subject deleted successfully.' });
}

// ── Teachers ───────────────────────────────────────────────────────────────
export async function getTeachers(req, res) {
  const result = await academicService.listTeachers(req.query);
  res.status(200).json(result);
}

export async function createTeacher(req, res) {
  validateOrThrow(academicValidator.validateTeacherInput, req.body);
  const result = await academicService.createTeacher(req.body);
  res.status(201).json(result);
}

export async function getTeacher(req, res) {
  const result = await academicService.getTeacherById(req.params.id);
  res.status(200).json(result);
}

export async function updateTeacher(req, res) {
  validateOrThrow(academicValidator.validateTeacherInput, req.body, true);
  const result = await academicService.updateTeacher(req.params.id, req.body);
  res.status(200).json(result);
}

export async function deleteTeacher(req, res) {
  const result = await academicService.deleteTeacher(req.params.id);
  res.status(200).json(result);
}

// ── Guardians ──────────────────────────────────────────────────────────────
export async function getGuardians(req, res) {
  const result = await academicService.listGuardians(req.query);
  res.status(200).json(result);
}

export async function createGuardian(req, res) {
  validateOrThrow(academicValidator.validateGuardianInput, req.body);
  const result = await academicService.createGuardian(req.body);
  res.status(201).json(result);
}

export async function getGuardian(req, res) {
  const result = await academicService.getGuardianById(req.params.id);
  res.status(200).json(result);
}

export async function updateGuardian(req, res) {
  validateOrThrow(academicValidator.validateGuardianInput, req.body, true);
  const result = await academicService.updateGuardian(req.params.id, req.body);
  res.status(200).json(result);
}

export async function deleteGuardian(req, res) {
  const result = await academicService.deleteGuardian(req.params.id);
  res.status(200).json(result);
}

// ── Students ───────────────────────────────────────────────────────────────
export async function getStudents(req, res) {
  const result = await academicService.listStudents(req.query);
  res.status(200).json(result);
}

export async function createStudent(req, res) {
  validateOrThrow(academicValidator.validateStudentInput, req.body);
  const result = await academicService.createStudent(req.body);
  res.status(201).json(result);
}

export async function getStudent(req, res) {
  const result = await academicService.getStudentById(req.params.id);
  res.status(200).json(result);
}

export async function updateStudent(req, res) {
  validateOrThrow(academicValidator.validateStudentInput, req.body);
  const result = await academicService.updateStudent(req.params.id, req.body);
  res.status(200).json(result);
}

export async function deleteStudent(req, res) {
  await academicService.deleteStudent(req.params.id);
  res.status(200).json({ success: true, message: 'Student deleted successfully.' });
}

// ── Class-Subject assignments ──────────────────────────────────────────────
export async function getClassSubjects(req, res) {
  const result = await academicService.listClassSubjects(req.query);
  res.status(200).json(result);
}

export async function createClassSubject(req, res) {
  validateOrThrow(academicValidator.validateClassSubjectInput, req.body);
  const result = await academicService.createClassSubject(req.body);
  res.status(201).json(result);
}

export async function deleteClassSubject(req, res) {
  await academicService.deleteClassSubject(req.params.id);
  res.status(200).json({ success: true, message: 'Class-subject assignment removed.' });
}

// ── Guardian-Student links ─────────────────────────────────────────────────
export async function getGuardianStudents(req, res) {
  const result = await academicService.listGuardianStudents(req.query);
  res.status(200).json(result);
}

export async function createGuardianStudent(req, res) {
  validateOrThrow(academicValidator.validateGuardianStudentInput, req.body);
  const result = await academicService.createGuardianStudent(req.body);
  res.status(201).json(result);
}

export async function deleteGuardianStudent(req, res) {
  await academicService.deleteGuardianStudent(req.params.id);
  res.status(200).json({ success: true, message: 'Guardian-student link removed.' });
}

