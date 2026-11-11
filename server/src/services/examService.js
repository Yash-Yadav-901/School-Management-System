import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { parsePagination, formatPaginatedResponse } from '../utils/pagination.js';
import { resolveGradeFromRules, calcPercentage } from '../utils/gradeUtils.js';

export async function createExam(data) {
  const [section, subject] = await Promise.all([
    prisma.section.findUnique({ where: { id: Number(data.sectionId) } }),
    prisma.subject.findUnique({ where: { id: Number(data.subjectId) } }),
  ]);

  if (!section) throw new AppError(404, 'NOT_FOUND', 'Referenced section does not exist.');
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Referenced subject does not exist.');

  return prisma.exam.create({
    data: {
      name: data.name.trim(),
      sectionId: section.id,
      subjectId: subject.id,
      maxMarks: Number(data.maxMarks),
      examDate: data.examDate.trim(),
    },
    include: {
      section: { include: { class: true } },
      subject: true,
    },
  });
}

export async function listExams(query, userContext) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.sectionId) where.sectionId = Number(query.sectionId);
  if (query.subjectId) where.subjectId = Number(query.subjectId);
  if (query.search) where.name = { contains: query.search.trim() };

  if (userContext.role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: userContext.id } });
    if (!teacher) throw new AppError(403, 'FORBIDDEN', 'Teacher profile not found.');

    const assignments = await prisma.classSubject.findMany({
      where: { teacherId: teacher.id },
      select: { sectionId: true, subjectId: true },
    });

    if (assignments.length === 0) {
      return formatPaginatedResponse([], 0, page, pageSize);
    }

    where.OR = assignments.map((a) => ({
      sectionId: a.sectionId,
      subjectId: a.subjectId,
    }));
  }

  const [data, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      skip,
      take,
      orderBy: [{ examDate: 'desc' }, { name: 'asc' }],
      include: {
        section: { include: { class: true } },
        subject: true,
        _count: { select: { results: true } },
      },
    }),
    prisma.exam.count({ where }),
  ]);

  return formatPaginatedResponse(data, total, page, pageSize);
}

export async function getExamById(id) {
  const exam = await prisma.exam.findUnique({
    where: { id: Number(id) },
    include: {
      section: { include: { class: true } },
      subject: true,
      results: {
        include: {
          student: { select: { id: true, name: true, rollNumber: true } },
        },
      },
    },
  });

  if (!exam) throw new AppError(404, 'NOT_FOUND', 'Exam not found.');

  // Compute grades dynamically at read time from GradeRule
  const gradeRules = await prisma.gradeRule.findMany({
    orderBy: { minPercent: 'desc' },
  });

  const enrichedResults = exam.results.map((res) => {
    const percentage = calcPercentage(res.marksObtained, exam.maxMarks);
    const { grade, gradePoint } = resolveGradeFromRules(percentage, gradeRules);
    return {
      ...res,
      percentage: Number(percentage.toFixed(2)),
      grade,
      gradePoint,
    };
  });

  return { ...exam, results: enrichedResults };
}

export async function enterMarks(examId, entries, userContext) {
  const numExamId = Number(examId);
  const exam = await prisma.exam.findUnique({
    where: { id: numExamId },
    include: {
      section: {
        include: {
          students: { select: { id: true } },
        },
      },
    },
  });

  if (!exam) throw new AppError(404, 'NOT_FOUND', 'Exam not found.');

  // Teacher authorization check: teacher must be assigned to this section and subject
  if (userContext.role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: userContext.id } });
    if (!teacher) throw new AppError(403, 'FORBIDDEN', 'Teacher profile not found.');

    const assignment = await prisma.classSubject.findFirst({
      where: {
        teacherId: teacher.id,
        sectionId: exam.sectionId,
        subjectId: exam.subjectId,
      },
    });

    if (!assignment) {
      logger.warn(
        `Authorization denied: teacher=${userContext.id} attempted marks entry for unassigned exam=${numExamId}`
      );
      throw new AppError(403, 'FORBIDDEN', 'You are not assigned to teach this subject in this section.');
    }
  }

  // Validate student enrollment in this section
  const sectionStudentIds = new Set(exam.section.students.map((s) => s.id));
  const invalidStudents = entries.filter((e) => !sectionStudentIds.has(Number(e.studentId)));
  if (invalidStudents.length > 0) {
    const ids = invalidStudents.map((e) => e.studentId).join(', ');
    throw new AppError(400, 'VALIDATION_ERROR', `These student IDs are not in section ${exam.sectionId}: ${ids}.`);
  }

  // Validate marks 0..maxMarks
  for (const entry of entries) {
    const marks = Number(entry.marksObtained);
    if (!Number.isInteger(marks) || marks < 0 || marks > exam.maxMarks) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `Marks for student ${entry.studentId} must be between 0 and maxMarks (${exam.maxMarks}).`
      );
    }
  }

  // Check existing results to track updates vs creates for audit log
  const existingResults = await prisma.examResult.findMany({
    where: {
      examId: numExamId,
      studentId: { in: entries.map((e) => Number(e.studentId)) },
    },
    select: { studentId: true, marksObtained: true },
  });

  const existingMap = new Map(existingResults.map((r) => [r.studentId, r.marksObtained]));
  const updates = [];
  const creates = [];

  for (const entry of entries) {
    const sId = Number(entry.studentId);
    const marks = Number(entry.marksObtained);
    if (existingMap.has(sId)) {
      updates.push({
        studentId: sId,
        previousMarks: existingMap.get(sId),
        newMarks: marks,
      });
    } else {
      creates.push({
        studentId: sId,
        marksObtained: marks,
      });
    }
  }

  // Execute upserts — do NOT store grade or gradePoint statically; leave null
  const upserts = entries.map((entry) =>
    prisma.examResult.upsert({
      where: {
        examId_studentId: {
          examId: numExamId,
          studentId: Number(entry.studentId),
        },
      },
      update: {
        marksObtained: Number(entry.marksObtained),
        grade: null,
        gradePoint: null,
        calculatedAt: new Date(),
      },
      create: {
        examId: numExamId,
        studentId: Number(entry.studentId),
        marksObtained: Number(entry.marksObtained),
        grade: null,
        gradePoint: null,
      },
    })
  );

  const auditEntry = prisma.auditLog.create({
    data: {
      userId: userContext.id,
      action: updates.length > 0 ? 'MARKS_UPDATED' : 'MARKS_RECORDED',
      entityType: 'Exam',
      entityId: numExamId,
      meta: JSON.stringify({
        examName: exam.name,
        subjectId: exam.subjectId,
        count: entries.length,
        updates,
        creates,
      }),
    },
  });

  await prisma.$transaction([...upserts, auditEntry]);

  logger.info(
    `Marks entered: examId=${numExamId} count=${entries.length} updates=${updates.length} by userId=${userContext.id}`
  );

  return {
    examId: numExamId,
    examName: exam.name,
    recordedCount: entries.length,
    updatesCount: updates.length,
    createsCount: creates.length,
  };
}

export async function getStudentReportCard(studentId) {
  const numStudentId = Number(studentId);
  const student = await prisma.student.findUnique({
    where: { id: numStudentId },
    include: {
      section: {
        include: { class: true },
      },
    },
  });

  if (!student) throw new AppError(404, 'NOT_FOUND', 'Student record not found.');

  // Fetch all results for this student with exam and subject info
  const results = await prisma.examResult.findMany({
    where: { studentId: numStudentId },
    include: {
      exam: {
        include: {
          subject: true,
        },
      },
    },
    orderBy: { exam: { examDate: 'desc' } },
  });

  const gradeRules = await prisma.gradeRule.findMany({
    orderBy: { minPercent: 'desc' },
  });

  // Group by (exam.name, exam.examDate) — NEVER sum different exams together!
  const examGroups = new Map();

  for (const r of results) {
    const key = `${r.exam.name}::${r.exam.examDate}`;
    if (!examGroups.has(key)) {
      examGroups.set(key, {
        examName: r.exam.name,
        examDate: r.exam.examDate,
        subjects: [],
        totalMarksObtained: 0,
        totalMaxMarks: 0,
      });
    }

    const group = examGroups.get(key);
    const percentage = calcPercentage(r.marksObtained, r.exam.maxMarks);
    const { grade, gradePoint } = resolveGradeFromRules(percentage, gradeRules);

    group.subjects.push({
      subjectId: r.exam.subject.id,
      subjectName: r.exam.subject.name,
      subjectCode: r.exam.subject.code,
      marksObtained: r.marksObtained,
      maxMarks: r.exam.maxMarks,
      percentage: Number(percentage.toFixed(2)),
      grade,
      gradePoint,
    });

    group.totalMarksObtained += r.marksObtained;
    group.totalMaxMarks += r.exam.maxMarks;
  }

  // Calculate overall totals, percentage, and grade for each individual exam
  const exams = Array.from(examGroups.values()).map((group) => {
    const overallPercentage = calcPercentage(group.totalMarksObtained, group.totalMaxMarks);
    const { grade: overallGrade, gradePoint: overallGradePoint } = resolveGradeFromRules(
      overallPercentage,
      gradeRules
    );

    return {
      examName: group.examName,
      examDate: group.examDate,
      subjects: group.subjects,
      totalMarksObtained: group.totalMarksObtained,
      totalMaxMarks: group.totalMaxMarks,
      percentage: Number(overallPercentage.toFixed(2)),
      overallGrade,
      overallGradePoint,
    };
  });

  return {
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      section: student.section
        ? {
            id: student.section.id,
            name: student.section.name,
            class: student.section.class ? student.section.class.name : null,
          }
        : null,
    },
    exams,
  };
}
