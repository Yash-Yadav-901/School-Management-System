import prisma from '../db/index.js';

/**
 * Looks up GradeRule rows and returns the grade whose minPercent is the
 * highest value still <= the given percentage. Using minPercent as the
 * sole boundary (not a closed [min, max] interval) avoids floating-point
 * edge cases at boundary values like 89.99 or 90.00.
 *
 * Returns null when there are no rules or when percentage is below every
 * rule's minPercent.
 */
export async function resolveGrade(percentage) {
  const rules = await prisma.gradeRule.findMany({
    orderBy: { minPercent: 'desc' },
  });
  return resolveGradeFromRules(percentage, rules);
}

/**
 * Pure function so it can be unit-tested without a database.
 * rules must be sorted by minPercent descending.
 * Each rule: { minPercent, grade, gradePoint }
 */
export function resolveGradeFromRules(percentage, rules) {
  if (!rules || rules.length === 0) return { grade: 'N/A', gradePoint: 0 };
  for (const rule of rules) {
    if (percentage >= rule.minPercent) {
      return { grade: rule.grade, gradePoint: rule.gradePoint };
    }
  }
  // Below every minPercent — use the lowest rule's grade
  return { grade: rules[rules.length - 1].grade, gradePoint: rules[rules.length - 1].gradePoint };
}

/**
 * Calculates percentage from marksObtained / maxMarks * 100.
 * Returns 0 when maxMarks is 0 to prevent NaN.
 */
export function calcPercentage(marksObtained, maxMarks) {
  if (!maxMarks || maxMarks === 0) return 0;
  return (marksObtained / maxMarks) * 100;
}
