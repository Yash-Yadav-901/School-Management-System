import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export async function verifyTeacherSectionAccess(userId, sectionId) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
  });

  if (!teacher) {
    logger.warn(`Authorization denied: user=${userId} role=TEACHER resource=section:${sectionId} (no teacher profile)`);
    throw new AppError(403, 'FORBIDDEN', 'Teacher profile not found for this account.');
  }

  // Check if teacher is assigned to any subject in this section
  const assignment = await prisma.classSubject.findFirst({
    where: {
      teacherId: teacher.id,
      sectionId: Number(sectionId),
    },
  });

  if (!assignment) {
    logger.warn(`Authorization denied: user=${userId} role=TEACHER teacherId=${teacher.id} resource=section:${sectionId}`);
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this class section.');
  }

  return teacher;
}

export async function verifyGuardianStudentAccess(userId, studentId) {
  const guardian = await prisma.guardian.findUnique({
    where: { userId },
  });

  if (!guardian) {
    logger.warn(`Authorization denied: user=${userId} role=GUARDIAN resource=student:${studentId} (no guardian profile)`);
    // Return 404 so existence is never leaked
    throw new AppError(404, 'NOT_FOUND', 'Student record not found.');
  }

  const link = await prisma.guardianStudent.findUnique({
    where: {
      guardianId_studentId: {
        guardianId: guardian.id,
        studentId: Number(studentId),
      },
    },
  });

  if (!link) {
    logger.warn(`Authorization denied: user=${userId} role=GUARDIAN guardianId=${guardian.id} resource=student:${studentId}`);
    // Return 404 to never reveal whether another student exists
    throw new AppError(404, 'NOT_FOUND', 'Student record not found.');
  }

  return guardian;
}
