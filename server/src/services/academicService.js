import bcrypt from 'bcrypt';
import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, formatPaginatedResponse } from '../utils/pagination.js';

// ── 1. Classes ─────────────────────────────────────────────────────────────
export async function listClasses(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.search) {
    where.name = { contains: query.search.trim() };
  }

  const [data, total] = await Promise.all([
    prisma.class.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        sections: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.class.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function createClass(data) {
  return prisma.class.create({
    data: { name: data.name.trim() },
  });
}

export async function getClassById(id) {
  const cls = await prisma.class.findUnique({
    where: { id: Number(id) },
    include: {
      sections: {
        include: {
          _count: { select: { students: true, classSubjects: true } },
        },
      },
    },
  });
  if (!cls) throw new AppError(404, 'NOT_FOUND', 'Class not found.');
  return cls;
}

export async function updateClass(id, data) {
  return prisma.class.update({
    where: { id: Number(id) },
    data: { name: data.name.trim() },
  });
}

export async function deleteClass(id) {
  const numId = Number(id);
  const sectionsCount = await prisma.section.count({ where: { classId: numId } });
  if (sectionsCount > 0) {
    throw new AppError(409, 'CONFLICT', 'Cannot delete class because sections are attached to it.');
  }

  return prisma.class.delete({ where: { id: numId } });
}

// ── 2. Sections ────────────────────────────────────────────────────────────
export async function listSections(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.classId) {
    where.classId = Number(query.classId);
  }

  if (query.search) {
    where.name = { contains: query.search.trim() };
  }

  const [data, total] = await Promise.all([
    prisma.section.findMany({
      where,
      skip,
      take,
      orderBy: [{ classId: 'asc' }, { name: 'asc' }],
      include: {
        class: { select: { id: true, name: true } },
        _count: { select: { students: true, classSubjects: true } },
      },
    }),
    prisma.section.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function createSection(data) {
  const classExists = await prisma.class.findUnique({ where: { id: Number(data.classId) } });
  if (!classExists) {
    throw new AppError(404, 'NOT_FOUND', 'Referenced class does not exist.');
  }

  return prisma.section.create({
    data: {
      name: data.name.trim(),
      classId: Number(data.classId),
    },
    include: { class: true },
  });
}

export async function getSectionById(id) {
  const section = await prisma.section.findUnique({
    where: { id: Number(id) },
    include: {
      class: true,
      classSubjects: {
        include: {
          subject: true,
          teacher: true,
        },
      },
      students: {
        select: { id: true, name: true, rollNumber: true },
      },
    },
  });
  if (!section) throw new AppError(404, 'NOT_FOUND', 'Section not found.');
  return section;
}

export async function updateSection(id, data) {
  return prisma.section.update({
    where: { id: Number(id) },
    data: { name: data.name.trim() },
    include: { class: true },
  });
}

export async function deleteSection(id) {
  const numId = Number(id);
  const [studentsCount, subjectsCount, examsCount] = await Promise.all([
    prisma.student.count({ where: { sectionId: numId } }),
    prisma.classSubject.count({ where: { sectionId: numId } }),
    prisma.exam.count({ where: { sectionId: numId } }),
  ]);

  if (studentsCount > 0 || subjectsCount > 0 || examsCount > 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Cannot delete section because students, subject assignments or exams depend on it.'
    );
  }

  return prisma.section.delete({ where: { id: numId } });
}

// ── 3. Subjects ────────────────────────────────────────────────────────────
export async function listSubjects(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search.trim() } },
      { code: { contains: query.search.trim() } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
    }),
    prisma.subject.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function createSubject(data) {
  return prisma.subject.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
    },
  });
}

export async function getSubjectById(id) {
  const subject = await prisma.subject.findUnique({
    where: { id: Number(id) },
  });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found.');
  return subject;
}

export async function updateSubject(id, data) {
  return prisma.subject.update({
    where: { id: Number(id) },
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
    },
  });
}

export async function deleteSubject(id) {
  const numId = Number(id);
  const [assignmentsCount, examsCount] = await Promise.all([
    prisma.classSubject.count({ where: { subjectId: numId } }),
    prisma.exam.count({ where: { subjectId: numId } }),
  ]);

  if (assignmentsCount > 0 || examsCount > 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Cannot delete subject because class assignments or exams depend on it.'
    );
  }

  return prisma.subject.delete({ where: { id: numId } });
}

// ── 4. Teachers ────────────────────────────────────────────────────────────
export async function listTeachers(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s } },
      { phone: { contains: s } },
      { user: { email: { contains: s } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        user: { select: { id: true, email: true, role: true, createdAt: true } },
        classSubjects: {
          include: {
            section: { include: { class: true } },
            subject: true,
          },
        },
      },
    }),
    prisma.teacher.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function createTeacher(data) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  const passwordHash = await bcrypt.hash(data.password, rounds);
  const normalizedEmail = data.email.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: 'TEACHER',
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        phone: data.phone ? data.phone.trim() : null,
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TEACHER_CREATED',
        entityType: 'Teacher',
        entityId: teacher.id,
        meta: JSON.stringify({
          name: teacher.name,
          email: user.email,
          phone: teacher.phone,
        }),
      },
    });

    return teacher;
  });
}

export async function getTeacherById(id) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: Number(id) },
    include: {
      user: { select: { id: true, email: true, role: true, createdAt: true } },
      classSubjects: {
        include: {
          section: { include: { class: true } },
          subject: true,
        },
      },
    },
  });
  if (!teacher) throw new AppError(404, 'NOT_FOUND', 'Teacher not found.');
  return teacher;
}

export async function updateTeacher(id, data) {
  return prisma.teacher.update({
    where: { id: Number(id) },
    data: {
      name: data.name.trim(),
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
    },
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
  });
}

export async function deleteTeacher(id) {
  const numId = Number(id);
  const teacher = await prisma.teacher.findUnique({ where: { id: numId } });
  if (!teacher) throw new AppError(404, 'NOT_FOUND', 'Teacher not found.');

  const assignmentsCount = await prisma.classSubject.count({ where: { teacherId: numId } });
  if (assignmentsCount > 0) {
    throw new AppError(409, 'CONFLICT', 'Cannot delete teacher because class assignments exist.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.teacher.delete({ where: { id: numId } });
    await tx.user.delete({ where: { id: teacher.userId } });
    return { success: true, message: 'Teacher and associated login deleted.' };
  });
}

// ── 5. Guardians ───────────────────────────────────────────────────────────
export async function listGuardians(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s } },
      { phone: { contains: s } },
      { user: { email: { contains: s } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.guardian.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        user: { select: { id: true, email: true, role: true, createdAt: true } },
        guardianStudents: {
          include: {
            student: { select: { id: true, name: true, rollNumber: true } },
          },
        },
      },
    }),
    prisma.guardian.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function createGuardian(data) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  const passwordHash = await bcrypt.hash(data.password, rounds);
  const normalizedEmail = data.email.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: 'GUARDIAN',
      },
    });

    const guardian = await tx.guardian.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        phone: data.phone ? data.phone.trim() : null,
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });

    return guardian;
  });
}

export async function getGuardianById(id) {
  const guardian = await prisma.guardian.findUnique({
    where: { id: Number(id) },
    include: {
      user: { select: { id: true, email: true, role: true, createdAt: true } },
      guardianStudents: {
        include: {
          student: {
            include: {
              section: { include: { class: true } },
            },
          },
        },
      },
    },
  });
  if (!guardian) throw new AppError(404, 'NOT_FOUND', 'Guardian not found.');
  return guardian;
}

export async function updateGuardian(id, data) {
  return prisma.guardian.update({
    where: { id: Number(id) },
    data: {
      name: data.name.trim(),
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
    },
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
  });
}

export async function deleteGuardian(id) {
  const numId = Number(id);
  const guardian = await prisma.guardian.findUnique({ where: { id: numId } });
  if (!guardian) throw new AppError(404, 'NOT_FOUND', 'Guardian not found.');

  const linksCount = await prisma.guardianStudent.count({ where: { guardianId: numId } });
  if (linksCount > 0) {
    throw new AppError(409, 'CONFLICT', 'Cannot delete guardian because linked students exist.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.guardian.delete({ where: { id: numId } });
    await tx.user.delete({ where: { id: guardian.userId } });
    return { success: true, message: 'Guardian and associated login deleted.' };
  });
}

// ── 6. Students ────────────────────────────────────────────────────────────
export async function listStudents(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.sectionId) {
    where.sectionId = Number(query.sectionId);
  }

  if (query.classId) {
    where.section = { classId: Number(query.classId) };
  }

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s } },
      { rollNumber: { contains: s } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        section: {
          include: { class: true },
        },
        guardianStudents: {
          include: {
            guardian: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function createStudent(data) {
  if (data.sectionId) {
    const sec = await prisma.section.findUnique({ where: { id: Number(data.sectionId) } });
    if (!sec) throw new AppError(404, 'NOT_FOUND', 'Referenced section does not exist.');
  }

  return prisma.student.create({
    data: {
      name: data.name.trim(),
      dob: data.dob ? data.dob.trim() : null,
      gender: data.gender ? data.gender.trim().toUpperCase() : null,
      rollNumber: data.rollNumber ? data.rollNumber.trim() : null,
      sectionId: data.sectionId ? Number(data.sectionId) : null,
    },
    include: {
      section: { include: { class: true } },
    },
  });
}

export async function getStudentById(id) {
  const student = await prisma.student.findUnique({
    where: { id: Number(id) },
    include: {
      section: { include: { class: true } },
      guardianStudents: {
        include: {
          guardian: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });
  if (!student) throw new AppError(404, 'NOT_FOUND', 'Student not found.');
  return student;
}

export async function updateStudent(id, data) {
  const numId = Number(id);
  const studentExists = await prisma.student.findUnique({ where: { id: numId } });
  if (!studentExists) throw new AppError(404, 'NOT_FOUND', 'Student not found.');

  if (data.sectionId) {
    const sec = await prisma.section.findUnique({ where: { id: Number(data.sectionId) } });
    if (!sec) throw new AppError(404, 'NOT_FOUND', 'Referenced section does not exist.');
  }

  return prisma.student.update({
    where: { id: numId },
    data: {
      name: data.name ? data.name.trim() : undefined,
      dob: data.dob !== undefined ? (data.dob ? data.dob.trim() : null) : undefined,
      gender: data.gender !== undefined ? (data.gender ? data.gender.trim().toUpperCase() : null) : undefined,
      rollNumber: data.rollNumber !== undefined ? (data.rollNumber ? data.rollNumber.trim() : null) : undefined,
      sectionId: data.sectionId !== undefined ? (data.sectionId ? Number(data.sectionId) : null) : undefined,
    },
    include: {
      section: { include: { class: true } },
    },
  });
}

export async function deleteStudent(id) {
  const numId = Number(id);
  const student = await prisma.student.findUnique({ where: { id: numId } });
  if (!student) throw new AppError(404, 'NOT_FOUND', 'Student not found.');

  const [attendancesCount, examResultsCount, invoicesCount] = await Promise.all([
    prisma.attendance.count({ where: { studentId: numId } }),
    prisma.examResult.count({ where: { studentId: numId } }),
    prisma.feeInvoice.count({ where: { studentId: numId } }),
  ]);

  if (attendancesCount > 0 || examResultsCount > 0 || invoicesCount > 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Cannot delete student because attendance, exam or fee records exist.'
    );
  }

  return prisma.student.delete({ where: { id: numId } });
}

// ── 7. Class-Subject Assignments ───────────────────────────────────────────
export async function listClassSubjects(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.sectionId) where.sectionId = Number(query.sectionId);
  if (query.teacherId) where.teacherId = Number(query.teacherId);
  if (query.subjectId) where.subjectId = Number(query.subjectId);

  const [data, total] = await Promise.all([
    prisma.classSubject.findMany({
      where,
      skip,
      take,
      include: {
        section: { include: { class: true } },
        subject: true,
        teacher: true,
      },
    }),
    prisma.classSubject.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function createClassSubject(data) {
  const [section, subject, teacher] = await Promise.all([
    prisma.section.findUnique({ where: { id: Number(data.sectionId) } }),
    prisma.subject.findUnique({ where: { id: Number(data.subjectId) } }),
    prisma.teacher.findUnique({ where: { id: Number(data.teacherId) } }),
  ]);

  if (!section) throw new AppError(404, 'NOT_FOUND', 'Referenced section does not exist.');
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Referenced subject does not exist.');
  if (!teacher) throw new AppError(404, 'NOT_FOUND', 'Referenced teacher does not exist.');

  return prisma.classSubject.create({
    data: {
      sectionId: section.id,
      subjectId: subject.id,
      teacherId: teacher.id,
    },
    include: {
      section: { include: { class: true } },
      subject: true,
      teacher: true,
    },
  });
}

export async function deleteClassSubject(id) {
  return prisma.classSubject.delete({
    where: { id: Number(id) },
  });
}

// ── 8. Guardian-Student Links ──────────────────────────────────────────────
export async function listGuardianStudents(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.guardianId) where.guardianId = Number(query.guardianId);
  if (query.studentId) where.studentId = Number(query.studentId);

  const [data, total] = await Promise.all([
    prisma.guardianStudent.findMany({
      where,
      skip,
      take,
      include: {
        guardian: true,
        student: { include: { section: { include: { class: true } } } },
      },
    }),
    prisma.guardianStudent.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function createGuardianStudent(data) {
  const [guardian, student] = await Promise.all([
    prisma.guardian.findUnique({ where: { id: Number(data.guardianId) } }),
    prisma.student.findUnique({ where: { id: Number(data.studentId) } }),
  ]);

  if (!guardian) throw new AppError(404, 'NOT_FOUND', 'Referenced guardian does not exist.');
  if (!student) throw new AppError(404, 'NOT_FOUND', 'Referenced student does not exist.');

  return prisma.guardianStudent.create({
    data: {
      guardianId: guardian.id,
      studentId: student.id,
      relationship: data.relationship ? data.relationship.trim() : 'Parent',
    },
    include: {
      guardian: true,
      student: true,
    },
  });
}

export async function deleteGuardianStudent(id) {
  return prisma.guardianStudent.delete({
    where: { id: Number(id) },
  });
}

