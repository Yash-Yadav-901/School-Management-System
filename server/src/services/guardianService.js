import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';

export async function getGuardianStudents(userId) {
  const guardian = await prisma.guardian.findUnique({
    where: { userId },
  });
  if (!guardian) throw new AppError(404, 'NOT_FOUND', 'Guardian profile not found.');

  const links = await prisma.guardianStudent.findMany({
    where: { guardianId: guardian.id },
    include: {
      student: {
        include: {
          section: { include: { class: true } },
        },
      },
    },
    orderBy: [{ student: { name: 'asc' } }],
  });

  return links.map((link) => ({
    id: link.student.id,
    name: link.student.name,
    rollNumber: link.student.rollNumber,
    dob: link.student.dob,
    gender: link.student.gender,
    relationship: link.relationship,
    section: link.student.section
      ? {
          id: link.student.section.id,
          name: link.student.section.name,
          class: {
            id: link.student.section.class.id,
            name: link.student.section.class.name,
          },
        }
      : null,
  }));
}
