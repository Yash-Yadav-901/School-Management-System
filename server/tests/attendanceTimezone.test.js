import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateBulkAttendanceInput } from '../src/validators/attendanceValidator.js';
import { getSchoolDate } from '../src/utils/timezone.js';

describe('Attendance Future Date Timezone Boundary', () => {
  const originalEnv = process.env.SCHOOL_TIMEZONE;

  afterEach(() => {
    process.env.SCHOOL_TIMEZONE = originalEnv;
  });

  it('correctly computes local school date across midnight boundary', () => {
    // 20:00 UTC on Nov 13 is 01:30 AM on Nov 14 in Asia/Kolkata (+05:30)
    const boundaryInstant = new Date('2026-11-13T20:00:00.000Z');

    expect(getSchoolDate(boundaryInstant, 'Asia/Kolkata')).toBe('2026-11-14');
    expect(getSchoolDate(boundaryInstant, 'UTC')).toBe('2026-11-13');
    expect(getSchoolDate(boundaryInstant, 'America/New_York')).toBe('2026-11-13');
  });

  it('allows current local date in Asia/Kolkata even when UTC is still previous day', () => {
    process.env.SCHOOL_TIMEZONE = 'Asia/Kolkata';
    const boundaryInstant = new Date('2026-11-13T20:00:00.000Z');

    const validPayload = {
      sectionId: 1,
      date: '2026-11-14', // Today in Kolkata!
      session: 'MORNING',
      entries: [{ studentId: 1, status: 'PRESENT' }],
    };

    const errors = validateBulkAttendanceInput(validPayload, boundaryInstant);
    expect(errors).toEqual([]);
  });

  it('rejects future date beyond current school local date', () => {
    process.env.SCHOOL_TIMEZONE = 'Asia/Kolkata';
    const boundaryInstant = new Date('2026-11-13T20:00:00.000Z');

    const futurePayload = {
      sectionId: 1,
      date: '2026-11-15', // Tomorrow in Kolkata
      session: 'MORNING',
      entries: [{ studentId: 1, status: 'PRESENT' }],
    };

    const errors = validateBulkAttendanceInput(futurePayload, boundaryInstant);
    expect(errors).toContain('Attendance date cannot be in the future.');
  });

  it('rejects next day when school timezone is configured to UTC', () => {
    process.env.SCHOOL_TIMEZONE = 'UTC';
    const boundaryInstant = new Date('2026-11-13T20:00:00.000Z');

    const payload = {
      sectionId: 1,
      date: '2026-11-14', // Tomorrow in UTC
      session: 'MORNING',
      entries: [{ studentId: 1, status: 'PRESENT' }],
    };

    const errors = validateBulkAttendanceInput(payload, boundaryInstant);
    expect(errors).toContain('Attendance date cannot be in the future.');
  });
});
