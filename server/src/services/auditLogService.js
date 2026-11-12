import prisma from '../db/index.js';
import { parsePagination, formatPaginatedResponse } from '../utils/pagination.js';

const SENSITIVE_KEY_PATTERN = /(password|token|hash|secret|authorization)/i;

/**
 * Recursively strips sensitive fields (passwords, tokens, hashes) from metadata objects.
 */
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

  if (Array.isArray(value)) {
    return value.map(sanitizeMeta);
  }

  if (typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        continue; // drop sensitive key entirely
      }
      clean[k] = sanitizeMeta(v);
    }
    return clean;
  }

  return value;
}

export async function getAuditLogs(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.userId) {
    where.userId = Number(query.userId);
  }

  if (query.entityType) {
    where.entityType = query.entityType.trim();
  }

  if (query.entityId) {
    where.entityId = Number(query.entityId);
  }

  if (query.action) {
    where.action = query.action.trim();
  }

  const fromDate = query.from || query.startDate;
  const toDate = query.to || query.endDate;

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      where.createdAt.gte = new Date(fromDate);
    }
    if (toDate) {
      // Include the entire end date
      const end = new Date(toDate);
      if (toDate.length === 10) {
        end.setUTCHours(23, 59, 59, 999);
      }
      where.createdAt.lte = end;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const sanitizedLogs = logs.map((log) => ({
    ...log,
    meta: sanitizeMeta(log.meta),
  }));

  return formatPaginatedResponse(sanitizedLogs, total, page, pageSize);
}
