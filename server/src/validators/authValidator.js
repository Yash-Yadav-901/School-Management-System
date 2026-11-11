export function validateLoginInput(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['Request body must be a JSON object.'];
  }

  const { email, password } = data;

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('A valid email address is required.');
    }
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  return errors;
}
