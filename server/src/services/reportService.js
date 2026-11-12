import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { resolveGradeFromRules, calcPercentage } from '../utils/gradeUtils.js';
import {
  verifyTeacherSectionAccess,
  verifyGuardianStudentAccess,
} from './accessControlService.js';

/**
 * Helper to fetch teacher's assigned section IDs.
 */
async function getTeacherAssignedSectionIds(userId) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new AppError(403, 'FORBIDDEN', 'Teacher profile not found.');
  const assignments = await prisma.classSubject.findMany({
    where: { teacherId: teacher.id },
    select: { sectionId: true },
  });
  return [...new Set(assignments.map((a) => a.sectionId))];
}

/**
 * Helper to fetch guardian's linked student IDs.
 */
async function getGuardianLinkedStudentIds(userId) {
  const guardian = await prisma.guardian.findUnique({ where: { userId } });
  if (!guardian) throw new AppError(404, 'NOT_FOUND', 'Guardian profile not found.');
  const links = await prisma.guardianStudent.findMany({
    where: { guardianId: guardian.id },
    select: { studentId: true },
  });
  return links.map((l) => l.studentId);
}

export async function getAttendanceReport(query, userContext) {
  const where = {};
  const { role, id: userId } = userContext;

  // Date filtering
  const fromDate = query.startDate || query.from;
  const toDate = query.endDate || query.to;
  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date.gte = fromDate;
    if (toDate) where.date.lte = toDate;
  }

  // Section & Student filtering based on RBAC
  if (role === 'ADMIN') {
    if (query.sectionId) {
      where.student = { sectionId: Number(query.sectionId) };
    }
    if (query.studentId) {
      where.studentId = Number(query.studentId);
    }
  } else if (role === 'TEACHER') {
    const assignedSectionIds = await getTeacherAssignedSectionIds(userId);
    if (query.sectionId) {
      await verifyTeacherSectionAccess(userId, query.sectionId);
      where.student = { sectionId: Number(query.sectionId) };
    } else {
      where.student = { sectionId: { in: assignedSectionIds } };
    }
    if (query.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: Number(query.studentId) },
        select: { sectionId: true },
      });
      if (!student || !assignedSectionIds.includes(student.sectionId)) {
        throw new AppError(403, 'FORBIDDEN', 'Student not enrolled in your assigned sections.');
      }
      where.studentId = Number(query.studentId);
    }
  } else if (role === 'GUARDIAN') {
    const linkedStudentIds = await getGuardianLinkedStudentIds(userId);
    if (query.studentId) {
      await verifyGuardianStudentAccess(userId, query.studentId);
      where.studentId = Number(query.studentId);
    } else {
      where.studentId = { in: linkedStudentIds };
    }
    if (query.sectionId) {
      // Guardian can only see if linked child is in that section
      const count = await prisma.student.count({
        where: { id: { in: linkedStudentIds }, sectionId: Number(query.sectionId) },
      });
      if (count === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Section not found.');
      }
      where.student = { sectionId: Number(query.sectionId) };
    }
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          rollNumber: true,
          section: {
            select: { id: true, name: true, class: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { session: 'asc' }],
  });

  const totalRecords = records.length;
  let present = 0;
  let absent = 0;
  let late = 0;

  const studentSummaryMap = new Map();

  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'LATE') late++;

    if (!studentSummaryMap.has(r.studentId)) {
      studentSummaryMap.set(r.studentId, {
        studentId: r.student.id,
        name: r.student.name,
        rollNumber: r.student.rollNumber,
        section: r.student.section ? `${r.student.section.class.name}-${r.student.section.name}` : null,
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      });
    }

    const s = studentSummaryMap.get(r.studentId);
    s.total++;
    if (r.status === 'PRESENT') s.present++;
    else if (r.status === 'ABSENT') s.absent++;
    else if (r.status === 'LATE') s.late++;
  }

  const studentSummaries = Array.from(studentSummaryMap.values()).map((s) => ({
    ...s,
    attendanceRate: s.total > 0 ? Number((((s.present + s.late) / s.total) * 100).toFixed(2)) : 0,
  }));

  const overallRate =
    totalRecords > 0 ? Number((((present + late) / totalRecords) * 100).toFixed(2)) : 0;

  return {
    dateRange: { from: fromDate || null, to: toDate || null },
    totalSessions: totalRecords,
    counts: { present, absent, late },
    attendanceRate: overallRate,
    students: studentSummaries,
  };
}

export async function getAcademicReport(query, userContext) {
  const { role, id: userId } = userContext;
  const whereExam = {};
  const whereResults = {};

  if (query.examId) {
    whereExam.id = Number(query.examId);
  }
  if (query.examName) {
    whereExam.name = { contains: query.examName };
  }

  if (role === 'ADMIN') {
    if (query.sectionId) {
      whereExam.sectionId = Number(query.sectionId);
    }
  } else if (role === 'TEACHER') {
    const assignedSectionIds = await getTeacherAssignedSectionIds(userId);
    if (query.sectionId) {
      await verifyTeacherSectionAccess(userId, query.sectionId);
      whereExam.sectionId = Number(query.sectionId);
    } else {
      whereExam.sectionId = { in: assignedSectionIds };
    }
  } else if (role === 'GUARDIAN') {
    const linkedStudentIds = await getGuardianLinkedStudentIds(userId);
    if (query.studentId) {
      await verifyGuardianStudentAccess(userId, query.studentId);
      whereResults.studentId = Number(query.studentId);
    } else {
      whereResults.studentId = { in: linkedStudentIds };
    }
    if (query.sectionId) {
      const count = await prisma.student.count({
        where: { id: { in: linkedStudentIds }, sectionId: Number(query.sectionId) },
      });
      if (count === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Section not found.');
      }
      whereExam.sectionId = Number(query.sectionId);
    }
  }

  const [exams, gradeRules] = await Promise.all([
    prisma.exam.findMany({
      where: whereExam,
      include: {
        section: { include: { class: true } },
        subject: true,
        results: {
          where: whereResults,
          include: {
            student: { select: { id: true, name: true, rollNumber: true } },
          },
        },
      },
      orderBy: [{ examDate: 'desc' }, { name: 'asc' }],
    }),
    prisma.gradeRule.findMany({ orderBy: { minPercent: 'desc' } }),
  ]);

  const reports = exams.map((exam) => {
    const results = exam.results;
    const evaluatedCount = results.length;

    let totalMarks = 0;
    let highest = evaluatedCount > 0 ? results[0].marksObtained : 0;
    let lowest = evaluatedCount > 0 ? results[0].marksObtained : 0;

    const gradeDistribution = {};
    for (const rule of gradeRules) {
      gradeDistribution[rule.grade] = 0;
    }

    for (const r of results) {
      totalMarks += r.marksObtained;
      if (r.marksObtained > highest) highest = r.marksObtained;
      if (r.marksObtained < lowest) lowest = r.marksObtained;

      const pct = calcPercentage(r.marksObtained, exam.maxMarks);
      const { grade } = resolveGradeFromRules(pct, gradeRules);
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }

    const averageMarks = evaluatedCount > 0 ? Number((totalMarks / evaluatedCount).toFixed(2)) : 0;
    const averagePercentage =
      evaluatedCount > 0 ? Number(calcPercentage(averageMarks, exam.maxMarks).toFixed(2)) : 0;

    return {
      examId: exam.id,
      examName: exam.name,
      examDate: exam.examDate,
      maxMarks: exam.maxMarks,
      subject: exam.subject.name,
      section: `${exam.section.class.name}-${exam.section.name}`,
      sectionId: exam.sectionId,
      totalEvaluated: evaluatedCount,
      averageMarks,
      averagePercentage,
      highestMarks: highest,
      lowestMarks: lowest,
      gradeDistribution,
    };
  });

  return { exams: reports };
}

export async function getFeeReport(query, userContext) {
  const { role, id: userId } = userContext;

  if (role === 'TEACHER') {
    throw new AppError(403, 'FORBIDDEN', 'Teachers are not permitted to access fee reports.');
  }

  if (role === 'GUARDIAN') {
    const linkedStudentIds = await getGuardianLinkedStudentIds(userId);
    if (query.studentId) {
      await verifyGuardianStudentAccess(userId, query.studentId);
    }

    const targetStudentIds = query.studentId ? [Number(query.studentId)] : linkedStudentIds;

    const [invoices, ledgerEntries] = await Promise.all([
      prisma.feeInvoice.findMany({
        where: { studentId: { in: targetStudentIds } },
        include: { student: true, feeType: true },
      }),
      prisma.feeLedgerEntry.findMany({
        where: { studentId: { in: targetStudentIds } },
      }),
    ]);

    let totalInvoiced = 0;
    let totalPaid = 0;
    for (const entry of ledgerEntries) {
      if (entry.entryType === 'DEBIT') totalInvoiced += entry.amount;
      if (entry.entryType === 'CREDIT') totalPaid += entry.amount;
    }

    return {
      totals: {
        totalInvoiced,
        totalPaid,
        outstandingBalance: Math.max(0, totalInvoiced - totalPaid),
      },
      invoicesCount: invoices.length,
      invoices,
    };
  }

  // ADMIN report
  const whereInvoice = {};
  if (query.sectionId) {
    whereInvoice.student = { sectionId: Number(query.sectionId) };
  }

  const [sections, allLedgerEntries] = await Promise.all([
    prisma.section.findMany({
      where: query.sectionId ? { id: Number(query.sectionId) } : {},
      include: {
        class: true,
        students: {
          include: {
            feeInvoices: true,
            feeLedgerEntries: true,
          },
        },
      },
      orderBy: [{ classId: 'asc' }, { name: 'asc' }],
    }),
    prisma.feeLedgerEntry.findMany({
      where: query.sectionId ? { student: { sectionId: Number(query.sectionId) } } : {},
    }),
  ]);

  let grandInvoiced = 0;
  let grandPaid = 0;
  for (const e of allLedgerEntries) {
    if (e.entryType === 'DEBIT') grandInvoiced += e.amount;
    if (e.entryType === 'CREDIT') grandPaid += e.amount;
  }

  const sectionReports = sections.map((sec) => {
    let invoiced = 0;
    let paid = 0;
    const statusCounts = { UNPAID: 0, PARTIAL: 0, PAID: 0, VOID: 0 };

    for (const st of sec.students) {
      for (const inv of st.feeInvoices) {
        if (statusCounts[inv.status] !== undefined) {
          statusCounts[inv.status]++;
        }
      }
      for (const entry of st.feeLedgerEntries) {
        if (entry.entryType === 'DEBIT') invoiced += entry.amount;
        if (entry.entryType === 'CREDIT') paid += entry.amount;
      }
    }

    return {
      sectionId: sec.id,
      sectionName: `${sec.class.name}-${sec.name}`,
      studentCount: sec.students.length,
      totalInvoiced: invoiced,
      totalPaid: paid,
      outstandingBalance: Math.max(0, invoiced - paid),
      statusCounts,
    };
  });

  return {
    totals: {
      totalInvoiced: grandInvoiced,
      totalPaid: grandPaid,
      outstandingBalance: Math.max(0, grandInvoiced - grandPaid),
    },
    sections: sectionReports,
  };
}

