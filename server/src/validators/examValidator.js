const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateExamInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Exam name is required.');
  }

  if (!Number.isInteger(Number(data.sectionId)) || Number(data.sectionId) < 1) {
    errors.push('Valid sectionId is required.');
  }

  if (!Number.isInteger(Number(data.subjectId)) || Number(data.subjectId) < 1) {
    errors.push('Valid subjectId is required.');
  }

  if (!Number.isInteger(Number(data.maxMarks)) || Number(data.maxMarks) < 1) {
    errors.push('maxMarks must be a positive integer greater than zero.');
  }

  if (!data.examDate || !DATE_PATTERN.test(String(data.examDate).trim())) {
    errors.push('examDate is required and must be in YYYY-MM-DD format.');
  }

  return errors;
}

export function validateMarksEntryInput(data, maxMarks) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];

  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    errors.push('entries must be a non-empty array of { studentId, marksObtained }.');
    return errors;
  }

  data.entries.forEach((entry, i) => {
    if (!Number.isInteger(Number(entry.studentId)) || Number(entry.studentId) < 1) {
      errors.push(`entries[${i}].studentId must be a valid positive integer.`);
    }

    const marks = Number(entry.marksObtained);
    if (!Number.isInteger(marks) || marks < 0) {
      errors.push(`entries[${i}].marksObtained must be an integer >= 0.`);
    } else if (maxMarks !== undefined && marks > maxMarks) {
      errors.push(`entries[${i}].marksObtained (${marks}) exceeds maxMarks (${maxMarks}).`);
    }
  });

  return errors;
}

