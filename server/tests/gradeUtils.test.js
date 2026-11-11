import { describe, it, expect } from 'vitest';
import { resolveGradeFromRules, calcPercentage } from '../src/utils/gradeUtils.js';

// Seed-compatible grade rules (minPercent descending)
const RULES = [
  { minPercent: 90, grade: 'A+', gradePoint: 10 },
  { minPercent: 80, grade: 'A',  gradePoint: 9  },
  { minPercent: 70, grade: 'B+', gradePoint: 8  },
  { minPercent: 60, grade: 'B',  gradePoint: 7  },
  { minPercent: 50, grade: 'C',  gradePoint: 6  },
  { minPercent: 40, grade: 'D',  gradePoint: 5  },
  { minPercent: 0,  grade: 'F',  gradePoint: 0  },
];

describe('resolveGradeFromRules — pure grade lookup', () => {
  it('100% → A+', () => {
    expect(resolveGradeFromRules(100, RULES)).toEqual({ grade: 'A+', gradePoint: 10 });
  });

  it('90% → A+ (exactly on boundary)', () => {
    expect(resolveGradeFromRules(90, RULES)).toEqual({ grade: 'A+', gradePoint: 10 });
  });

  it('89.99% → A (just below 90 boundary)', () => {
    expect(resolveGradeFromRules(89.99, RULES)).toEqual({ grade: 'A', gradePoint: 9 });
  });

  it('0% → F', () => {
    expect(resolveGradeFromRules(0, RULES)).toEqual({ grade: 'F', gradePoint: 0 });
  });

  it('no rules → returns N/A with gradePoint 0', () => {
    expect(resolveGradeFromRules(75, [])).toEqual({ grade: 'N/A', gradePoint: 0 });
  });

  it('null rules → returns N/A with gradePoint 0', () => {
    expect(resolveGradeFromRules(75, null)).toEqual({ grade: 'N/A', gradePoint: 0 });
  });
});

describe('calcPercentage — NaN prevention', () => {
  it('50/100 → 50', () => {
    expect(calcPercentage(50, 100)).toBe(50);
  });

  it('maxMarks 0 → 0 (no NaN)', () => {
    const result = calcPercentage(10, 0);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it('maxMarks null → 0 (no NaN)', () => {
    const result = calcPercentage(10, null);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it('marks 0, maxMarks 100 → 0', () => {
    expect(calcPercentage(0, 100)).toBe(0);
  });
});

