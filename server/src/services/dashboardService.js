import prisma from '../db/index.js';
import { getSchoolDate } from '../utils/timezone.js';

const SENSITIVE_KEY_PATTERN = /(password|token|hash|secret|authorization)/i;

function sanitizeMeta(value) {
  if (!value) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return sanitizeMeta(parsed);
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(sanitizeMeta);
  if (typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) continue;
      clean[k] = sanitizeMeta(v);
    }
    return clean;
  }
  return value;
}

export async function getAdminDashboard() {
  const todayStr = getSchoolDate();

  const [
    totalStudents,
    totalTeachers,
    todayAttendances,
    ledgerEntries,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.attendance.findMany({
      where: { date: todayStr },
      select: { status: true },
    }),
    prisma.feeLedgerEntry.findMany({
      select: { entryType: true, amount: true },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    }),
  ]);

  // Attendance metrics for today
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const a of todayAttendances) {
    if (a.status === 'PRESENT') present++;
    else if (a.status === 'ABSENT') absent++;
    else if (a.status === 'LATE') late++;
  }
  const totalTodaySessions = todayAttendances.length;
  const todayAttendanceRate =
    totalTodaySessions > 0
      ? Number((((present + late) / totalTodaySessions) * 100).toFixed(2))
      : 0;

  // Fee metrics from ledger
  let totalInvoiced = 0;
  let totalPaid = 0;
  for (const entry of ledgerEntries) {
    if (entry.entryType === 'DEBIT') totalInvoiced += entry.amount;
    if (entry.entryType === 'CREDIT') totalPaid += entry.amount;
  }
  const outstandingFees = Math.max(0, totalInvoiced - totalPaid);

  const sanitizedLogs = recentAuditLogs.map((log) => ({
    ...log,
    meta: sanitizeMeta(log.meta),
  }));

  return {
    totals: {
      students: totalStudents,
      teachers: totalTeachers,
    },
    todayAttendance: {
      date: todayStr,
      totalSessions: totalTodaySessions,
      present,
      absent,
      late,
      attendanceRate: todayAttendanceRate,
    },
    fees: {
      totalInvoiced,
      totalPaid,
      outstandingFees,
    },
    recentAuditLogs: sanitizedLogs,
  };
}

