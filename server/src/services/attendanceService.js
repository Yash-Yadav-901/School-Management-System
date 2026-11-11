import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { parsePagination, formatPaginatedResponse } from '../utils/pagination.js';

export async function recordBulkAttendance(sectionId, date, session, entries, recordedById) {
  const section = await prisma.section.findUnique({ where: { id: Number(sectionId) } });
  if (!section) throw new AppError(404, 'NOT_FOUND', 'Section not found.');

  const sectionStudents = await prisma.student.findMany({
    where: { sectionId: Number(sectionId) },
    select: { id: true },
  });
  const validIds = new Set(sectionStudents.map((s) => s.id));

  const invalidEntries = entries.filter((e) => !validIds.has(Number(e.studentId)));
  if (invalidEntries.length > 0) {
    const ids = invalidEntries.map((e) => e.studentId).join(', ');
    throw new AppError(400, 'VALIDATION_ERROR', `These student IDs do not belong to section ${sectionId}: ${ids}.`);
  }

  // Check for existing records to track updates and store previousStatus in audit log
  const existingRecords = await prisma.attendance.findMany({
    where: {
      date,
      session: session.toUpperCase(),
      studentId: { in: entries.map((e) => Number(e.studentId)) },
    },
    select: { studentId: true, status: true },
  });

  const existingMap = new Map(existingRecords.map((r) => [r.studentId, r.status]));
  const updates = [];
  const creates = [];

  for (const entry of entries) {
    const sId = Number(entry.studentId);
    const newStatus = entry.status.toUpperCase();
    if (existingMap.has(sId)) {
      updates.push({
        studentId: sId,
        previousStatus: existingMap.get(sId),
        newStatus,
      });
    } else {
      creates.push({
        studentId: sId,
        newStatus,
      });
    }
  }

  const upserts = entries.map((entry) =>
    prisma.attendance.upsert({
      where: {
        studentId_date_session: {
          studentId: Number(entry.studentId),
          date,
          session: session.toUpperCase(),
        },
      },
      update: { status: entry.status.toUpperCase(), recordedById },
      create: {
        studentId: Number(entry.studentId),
        date,
        session: session.toUpperCase(),
        status: entry.status.toUpperCase(),
        recordedById,
      },
    })
  );

  const auditEntry = prisma.auditLog.create({
    data: {
      userId: recordedById,
      action: updates.length > 0 ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_RECORDED',
      entityType: 'Section',
      entityId: Number(sectionId),
      meta: JSON.stringify({
        date,
        session: session.toUpperCase(),
        entriesCount: entries.length,
        updates,
        creates,
      }),
    },
  });

  await prisma.$transaction([...upserts, auditEntry]);

  logger.info(
    `Attendance recorded: sectionId=${sectionId} date=${date} session=${session} count=${entries.length} by userId=${recordedById}`
  );

  return { sectionId: Number(sectionId), date, session: session.toUpperCase(), savedCount: entries.length };
}

export async function listAttendance(query, userContext) {
  const { page, pageSize, skip } = parsePagination(query);
  const { sectionId, studentId, date, session, status } = query;

  const where = {};

  if (sectionId) where.student = { sectionId: Number(sectionId) };
  if (studentId) where.studentId = Number(studentId);
  if (date) where.date = date;
  if (session) where.session = session.toUpperCase();
  if (status) where.status = status.toUpperCase();

  // Teachers can only see attendance for their assigned sections.
  if (userContext.role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: userContext.id } });
    if (!teacher) throw new AppError(403, 'FORBIDDEN', 'Teacher profile not found.');
    const assignments = await prisma.classSubject.findMany({
      where: { teacherId: teacher.id },
      select: { sectionId: true },
    });
    const allowedSectionIds = [...new Set(assignments.map((a) => a.sectionId))];
    where.student = { ...(where.student || {}), sectionId: { in: allowedSectionIds } };
  }

  const [total, records] = await prisma.$transaction([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ date: 'desc' }, { session: 'asc' }],
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        recordedBy: { select: { id: true, email: true } },
      },
    }),
  ]);

  return formatPaginatedResponse(records, total, page, pageSize);
}

export async function getSectionAttendanceSummary(sectionId, query) {
  const section = await prisma.section.findUnique({ where: { id: Number(sectionId) } });
  if (!section) throw new AppError(404, 'NOT_FOUND', 'Section not found.');

  const where = { student: { sectionId: Number(sectionId) } };
  if (query.from) where.date = { ...(where.date || {}), gte: query.from };
  if (query.to) where.date = { ...(where.date || {}), lte: query.to };
  if (query.session) where.session = query.session.toUpperCase();

  const groups = await prisma.attendance.groupBy({
    by: ['status'],
    where,
    _count: { status: true },
  });

  return buildSummary({ sectionId: Number(sectionId) }, groups);
}

export async function getStudentAttendanceSummary(studentId, query) {
  const student = await prisma.student.findUnique({ where: { id: Number(studentId) } });
  if (!student) throw new AppError(404, 'NOT_FOUND', 'Student not found.');

  const where = { studentId: Number(studentId) };
  if (query.from) where.date = { ...(where.date || {}), gte: query.from };
  if (query.to) where.date = { ...(where.date || {}), lte: query.to };
  if (query.session) where.session = query.session.toUpperCase();

  const groups = await prisma.attendance.groupBy({
    by: ['status'],
    where,
    _count: { status: true },
  });

  return buildSummary({ studentId: Number(studentId) }, groups);
}

function buildSummary(identifier, groups) {
  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0 };
  for (const g of groups) counts[g.status] = g._count.status;
  const total = counts.PRESENT + counts.ABSENT + counts.LATE;
  const attendanceRate = total === 0 ? '0.00%' : `${(((counts.PRESENT + counts.LATE) / total) * 100).toFixed(2)}%`;
  return { ...identifier, ...counts, total, attendanceRate };
}
