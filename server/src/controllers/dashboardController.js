import * as dashboardService from '../services/dashboardService.js';

export async function getAdminDashboard(req, res) {
  const result = await dashboardService.getAdminDashboard();
  res.json(result);
}

