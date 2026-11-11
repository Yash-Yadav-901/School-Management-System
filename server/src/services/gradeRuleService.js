import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';

export async function listGradeRules() {
  return prisma.gradeRule.findMany({
    orderBy: { minPercent: 'desc' },
  });
}

export async function getGradeRuleById(id) {
  const rule = await prisma.gradeRule.findUnique({
    where: { id: Number(id) },
  });
  if (!rule) throw new AppError(404, 'NOT_FOUND', 'Grade rule not found.');
  return rule;
}

export async function createGradeRule(data) {
  const minPercent = Number(data.minPercent);
  const grade = data.grade.trim();
  const gradePoint = data.gradePoint !== undefined ? Number(data.gradePoint) : 0;

  const existing = await prisma.gradeRule.findFirst({
    where: { minPercent },
  });
  if (existing) {
    throw new AppError(409, 'CONFLICT', `A grade rule with minPercent ${minPercent} already exists.`);
  }

  return prisma.gradeRule.create({
    data: {
      minPercent,
      maxPercent: 100,
      grade,
      gradePoint,
    },
  });
}

export async function updateGradeRule(id, data) {
  const numId = Number(id);
  const rule = await prisma.gradeRule.findUnique({
    where: { id: numId },
  });
  if (!rule) throw new AppError(404, 'NOT_FOUND', 'Grade rule not found.');

  // Guard: a rule with minPercent 0 cannot have its minPercent changed away from 0
  if (rule.minPercent === 0 && data.minPercent !== undefined && Number(data.minPercent) !== 0) {
    throw new AppError(400, 'BAD_REQUEST', 'The base grade rule with minPercent 0 cannot have its minPercent changed away from 0.');
  }

  // If changing minPercent on another rule, ensure it is not already taken
  if (data.minPercent !== undefined && Number(data.minPercent) !== rule.minPercent) {
    const existing = await prisma.gradeRule.findFirst({
      where: { minPercent: Number(data.minPercent) },
    });
    if (existing) {
      throw new AppError(409, 'CONFLICT', `A grade rule with minPercent ${data.minPercent} already exists.`);
    }
  }

  return prisma.gradeRule.update({
    where: { id: numId },
    data: {
      minPercent: data.minPercent !== undefined ? Number(data.minPercent) : undefined,
      grade: data.grade ? data.grade.trim() : undefined,
      gradePoint: data.gradePoint !== undefined ? Number(data.gradePoint) : undefined,
    },
  });
}

export async function deleteGradeRule(id) {
  const numId = Number(id);
  const rule = await prisma.gradeRule.findUnique({
    where: { id: numId },
  });
  if (!rule) throw new AppError(404, 'NOT_FOUND', 'Grade rule not found.');

  // Guard: a rule with minPercent 0 can never be deleted
  if (rule.minPercent === 0) {
    throw new AppError(400, 'BAD_REQUEST', 'The base grade rule with minPercent 0 cannot be deleted.');
  }

  return prisma.gradeRule.delete({
    where: { id: numId },
  });
}

