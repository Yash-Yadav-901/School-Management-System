import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import * as academicController from '../controllers/academicController.js';

const router = express.Router();

// Enforce admin-only access for all routes in this module
router.use(authenticateToken, requireRoles('ADMIN'));

// ── Classes ────────────────────────────────────────────────────────────────
router.get('/classes', asyncHandler(academicController.getClasses));
router.post('/classes', asyncHandler(academicController.createClass));
router.get('/classes/:id', asyncHandler(academicController.getClass));
router.put('/classes/:id', asyncHandler(academicController.updateClass));
router.delete('/classes/:id', asyncHandler(academicController.deleteClass));

// ── Sections ───────────────────────────────────────────────────────────────
router.get('/sections', asyncHandler(academicController.getSections));
router.post('/sections', asyncHandler(academicController.createSection));
router.get('/sections/:id', asyncHandler(academicController.getSection));
router.put('/sections/:id', asyncHandler(academicController.updateSection));
router.delete('/sections/:id', asyncHandler(academicController.deleteSection));

// ── Subjects ───────────────────────────────────────────────────────────────
router.get('/subjects', asyncHandler(academicController.getSubjects));
router.post('/subjects', asyncHandler(academicController.createSubject));
router.get('/subjects/:id', asyncHandler(academicController.getSubject));
router.put('/subjects/:id', asyncHandler(academicController.updateSubject));
router.delete('/subjects/:id', asyncHandler(academicController.deleteSubject));

// ── Teachers ───────────────────────────────────────────────────────────────
router.get('/teachers', asyncHandler(academicController.getTeachers));
router.post('/teachers', asyncHandler(academicController.createTeacher));
router.get('/teachers/:id', asyncHandler(academicController.getTeacher));
router.put('/teachers/:id', asyncHandler(academicController.updateTeacher));
router.delete('/teachers/:id', asyncHandler(academicController.deleteTeacher));

// ── Guardians ──────────────────────────────────────────────────────────────
router.get('/guardians', asyncHandler(academicController.getGuardians));
router.post('/guardians', asyncHandler(academicController.createGuardian));
router.get('/guardians/:id', asyncHandler(academicController.getGuardian));
router.put('/guardians/:id', asyncHandler(academicController.updateGuardian));
router.delete('/guardians/:id', asyncHandler(academicController.deleteGuardian));

// ── Students ───────────────────────────────────────────────────────────────
router.get('/students', asyncHandler(academicController.getStudents));
router.post('/students', asyncHandler(academicController.createStudent));
router.get('/students/:id', asyncHandler(academicController.getStudent));
router.put('/students/:id', asyncHandler(academicController.updateStudent));
router.delete('/students/:id', asyncHandler(academicController.deleteStudent));

// ── Class-Subject assignments ──────────────────────────────────────────────
router.get('/class-subjects', asyncHandler(academicController.getClassSubjects));
router.post('/class-subjects', asyncHandler(academicController.createClassSubject));
router.delete('/class-subjects/:id', asyncHandler(academicController.deleteClassSubject));

// ── Guardian-Student links ─────────────────────────────────────────────────
router.get('/guardian-students', asyncHandler(academicController.getGuardianStudents));
router.post('/guardian-students', asyncHandler(academicController.createGuardianStudent));
router.delete('/guardian-students/:id', asyncHandler(academicController.deleteGuardianStudent));

export default router;

