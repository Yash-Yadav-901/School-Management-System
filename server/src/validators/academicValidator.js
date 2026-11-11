function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function isValidEmail(val) {
  if (!isNonEmptyString(val)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function isPositiveInt(val) {
  const num = Number(val);
  return Number.isInteger(num) && num > 0;
}

function isValidDateString(val) {
  if (!isNonEmptyString(val)) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
}

export function validateClassInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];
  if (!isNonEmptyString(data.name)) errors.push('Class name is required.');
  return errors;
}

export function validateSectionInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];
  if (!isNonEmptyString(data.name)) errors.push('Section name is required (e.g. "A").');
  if (!isPositiveInt(data.classId)) errors.push('A valid positive classId is required.');
  return errors;
}

export function validateSubjectInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];
  if (!isNonEmptyString(data.name)) errors.push('Subject name is required.');
  if (!isNonEmptyString(data.code)) errors.push('Subject code is required.');
  return errors;
}

export function validateTeacherInput(data, isUpdate = false) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];
  if (!isNonEmptyString(data.name)) errors.push('Teacher name is required.');

  if (!isUpdate) {
    if (!isValidEmail(data.email)) errors.push('A valid email address is required.');
    if (!isNonEmptyString(data.password) || data.password.length < 6) {
      errors.push('Password must be at least 6 characters.');
    }
  }

  return errors;
}

export function validateGuardianInput(data, isUpdate = false) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];
  if (!isNonEmptyString(data.name)) errors.push('Guardian name is required.');

  if (!isUpdate) {
    if (!isValidEmail(data.email)) errors.push('A valid email address is required.');
    if (!isNonEmptyString(data.password) || data.password.length < 6) {
      errors.push('Password must be at least 6 characters.');
    }
  }

  return errors;
}

export function validateStudentInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];
  if (!isNonEmptyString(data.name)) errors.push('Student name is required.');

  if (data.dob !== undefined && data.dob !== null && data.dob !== '') {
    if (!isValidDateString(data.dob)) {
      errors.push('Date of birth must be in YYYY-MM-DD format.');
    }
  }

  if (data.gender !== undefined && data.gender !== null && data.gender !== '') {
    const validGenders = ['MALE', 'FEMALE', 'OTHER'];
    if (!validGenders.includes(String(data.gender).toUpperCase())) {
      errors.push('Gender must be one of: MALE, FEMALE, OTHER.');
    }
  }

  if (data.sectionId !== undefined && data.sectionId !== null && data.sectionId !== '') {
    if (!isPositiveInt(data.sectionId)) {
      errors.push('sectionId must be a positive integer.');
    }
  }

  return errors;
}

export function validateClassSubjectInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];
  if (!isPositiveInt(data.sectionId)) errors.push('Valid sectionId is required.');
  if (!isPositiveInt(data.subjectId)) errors.push('Valid subjectId is required.');
  if (!isPositiveInt(data.teacherId)) errors.push('Valid teacherId is required.');
  return errors;
}

export function validateGuardianStudentInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];
  if (!isPositiveInt(data.guardianId)) errors.push('Valid guardianId is required.');
  if (!isPositiveInt(data.studentId)) errors.push('Valid studentId is required.');
  return errors;
}

