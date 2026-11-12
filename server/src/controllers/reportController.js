import * as reportService from '../services/reportService.js';

export async function getAttendanceReport(req, res) {
  const result = await reportService.getAttendanceReport(req.query, req.user);
  res.json(result);
}

export async function getAcademicReport(req, res) {
  const result = await reportService.getAcademicReport(req.query, req.user);
  res.json(result);
}

export async function getFeeReport(req, res) {
  const result = await reportService.getFeeReport(req.query, req.user);
  res.json(result);
}

