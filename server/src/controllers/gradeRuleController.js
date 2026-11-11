import { validateGradeRuleInput } from '../validators/gradeRuleValidator.js';
import * as gradeRuleService from '../services/gradeRuleService.js';
import { AppError } from '../utils/AppError.js';

export async function getGradeRules(req, res) {
  const rules = await gradeRuleService.listGradeRules();
  res.json({ data: rules });
}

export async function getGradeRule(req, res) {
  const rule = await gradeRuleService.getGradeRuleById(req.params.id);
  res.json(rule);
}

export async function createGradeRule(req, res) {
  const errors = validateGradeRuleInput(req.body, false);
  if (errors.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid grade rule input.', errors);

  const rule = await gradeRuleService.createGradeRule(req.body);
  res.status(201).json(rule);
}

export async function updateGradeRule(req, res) {
  const errors = validateGradeRuleInput(req.body, true);
  if (errors.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid grade rule input.', errors);

  const rule = await gradeRuleService.updateGradeRule(req.params.id, req.body);
  res.json(rule);
}

export async function deleteGradeRule(req, res) {
  await gradeRuleService.deleteGradeRule(req.params.id);
  res.json({ success: true, message: 'Grade rule deleted successfully.' });
}

