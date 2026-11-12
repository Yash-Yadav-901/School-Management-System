import * as auditLogService from '../services/auditLogService.js';

export async function getAuditLogs(req, res) {
  const result = await auditLogService.getAuditLogs(req.query);
  res.json(result);
}
