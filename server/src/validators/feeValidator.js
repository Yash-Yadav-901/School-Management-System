const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateSingleInvoiceInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];

  if (!Number.isInteger(Number(data.studentId)) || Number(data.studentId) < 1) {
    errors.push('Valid studentId is required.');
  }

  if (!Number.isInteger(Number(data.feeTypeId)) || Number(data.feeTypeId) < 1) {
    errors.push('Valid feeTypeId is required.');
  }

  if (!Number.isInteger(Number(data.amountDue)) || Number(data.amountDue) < 1) {
    errors.push('amountDue must be a positive integer in paise.');
  }

  if (!data.dueDate || !DATE_PATTERN.test(String(data.dueDate).trim())) {
    errors.push('dueDate is required and must be in YYYY-MM-DD format.');
  }

  return errors;
}

export function validateBulkInvoiceInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];

  if (!Number.isInteger(Number(data.sectionId)) || Number(data.sectionId) < 1) {
    errors.push('Valid sectionId is required.');
  }

  if (!Number.isInteger(Number(data.feeTypeId)) || Number(data.feeTypeId) < 1) {
    errors.push('Valid feeTypeId is required.');
  }

  if (!Number.isInteger(Number(data.amountDue)) || Number(data.amountDue) < 1) {
    errors.push('amountDue must be a positive integer in paise.');
  }

  if (!data.dueDate || !DATE_PATTERN.test(String(data.dueDate).trim())) {
    errors.push('dueDate is required and must be in YYYY-MM-DD format.');
  }

  return errors;
}

export function validatePaymentInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Request body must be an object.'];

  if (!Number.isInteger(Number(data.amountPaid)) || Number(data.amountPaid) < 1) {
    errors.push('amountPaid must be a positive integer in paise.');
  }

  return errors;
}
