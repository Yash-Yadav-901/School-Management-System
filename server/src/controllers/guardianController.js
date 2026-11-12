import * as guardianService from '../services/guardianService.js';

export async function getMyStudents(req, res) {
  const students = await guardianService.getGuardianStudents(req.user.id);
  res.json(students);
}
