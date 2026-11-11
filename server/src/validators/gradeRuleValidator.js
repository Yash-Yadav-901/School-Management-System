export function validateGradeRuleInput(data, isUpdate = false) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];

  if (!isUpdate || data.minPercent !== undefined) {
    const min = Number(data.minPercent);
    if (data.minPercent === undefined || data.minPercent === null || Number.isNaN(min) || min < 0 || min > 100) {
      errors.push('minPercent is required and must be a number between 0 and 100.');
    }
  }

  if (!isUpdate || data.grade !== undefined) {
    if (!data.grade || typeof data.grade !== 'string' || !data.grade.trim()) {
      errors.push('Grade label is required.');
    }
  }

  if (data.gradePoint !== undefined) {
    const gp = Number(data.gradePoint);
    if (Number.isNaN(gp) || gp < 0) {
      errors.push('gradePoint must be a non-negative number.');
    }
  }

  return errors;
}

