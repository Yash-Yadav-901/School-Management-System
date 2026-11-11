import { validateLoginInput } from '../validators/authValidator.js';
import { loginUser, getUserProfile } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

export async function login(req, res) {
  const errors = validateLoginInput(req.body);
  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', errors);
  }

  const { email, password } = req.body;
  const result = await loginUser(email, password);

  res.status(200).json(result);
}

export async function getMe(req, res) {
  const user = await getUserProfile(req.user.id);
  res.status(200).json({ user });
}
