const VALID_SESSIONS = ['MORNING', 'AFTERNOON'];
const VALID_STATUSES = ['PRESENT', 'ABSENT', 'LATE'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateBulkAttendanceInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];

  if (!Number.isInteger(Number(data.sectionId)) || Number(data.sectionId) < 1) {
    errors.push('Valid sectionId is required.');
  }

  if (!data.date || !DATE_PATTERN.test(String(data.date).trim())) {
    errors.push('Date is required and must be in YYYY-MM-DD format.');
  }

  const session = String(data.session || '').toUpperCase();
  if (!VALID_SESSIONS.includes(session)) {
    errors.push(`session must be one of: ${VALID_SESSIONS.join(', ')}.`);
  }

  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    errors.push('entries must be a non-empty array of { studentId, status }.');
  } else {
    data.entries.forEach((entry, i) => {
      if (!Number.isInteger(Number(entry.studentId)) || Number(entry.studentId) < 1) {
        errors.push(`entries[${i}].studentId must be a valid positive integer.`);
      }
      const status = String(entry.status || '').toUpperCase();
      if (!VALID_STATUSES.includes(status)) {
        errors.push(`entries[${i}].status must be one of: ${VALID_STATUSES.join(', ')}.`);
      }
    });
  }

  return errors;
}
