import * as teacherService from '../services/teacherService.js';

export async function getMySections(req, res) {
  const sections = await teacherService.getTeacherSections(req.user.id);
  res.json(sections);
}

export async function getSectionStudents(req, res) {
  const result = await teacherService.getSectionStudents(req.params.sectionId, req.user);
  res.json(result);
}
