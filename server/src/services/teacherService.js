import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { verifyTeacherSectionAccess } from './accessControlService.js';

export async function getTeacherSections(userId) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
  });
  if (!teacher) throw new AppError(403, 'FORBIDDEN', 'Teacher profile not found.');

  const assignments = await prisma.classSubject.findMany({
    where: { teacherId: teacher.id },
    include: {
      section: { include: { class: true } },
      subject: true,
    },
    orderBy: [{ section: { classId: 'asc' } }, { section: { name: 'asc' } }],
  });

  const sectionMap = new Map();
  for (const a of assignments) {
    if (!sectionMap.has(a.sectionId)) {
      sectionMap.set(a.sectionId, {
        id: a.section.id,
        name: a.section.name,
        class: {
          id: a.section.class.id,
          name: a.section.class.name,
        },
        subjects: [],
      });
    }
    sectionMap.get(a.sectionId).subjects.push({
      id: a.subject.id,
      name: a.subject.name,
      code: a.subject.code,
    });
  }

  return Array.from(sectionMap.values());
}

export async function getSectionStudents(sectionId, userContext) {
  const numSectionId = Number(sectionId);
  const section = await prisma.section.findUnique({
    where: { id: numSectionId },
    include: { class: true },
  });
  if (!section) throw new AppError(404, 'NOT_FOUND', 'Section not found.');

  if (userContext.role === 'TEACHER') {
    await verifyTeacherSectionAccess(userContext.id, numSectionId);
  }

  const students = await prisma.student.findMany({
    where: { sectionId: numSectionId },
    orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
    include: {
      section: { include: { class: true } },
    },
  });

  return {
    section: {
      id: section.id,
      name: section.name,
      class: section.class,
    },
    students,
  };
}
