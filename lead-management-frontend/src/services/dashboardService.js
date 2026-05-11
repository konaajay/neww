import api, { cleanParams, safeRequest } from '../api/api';

const dashboardService = {
  fetchDashboard: (filters, signal) =>
    safeRequest(api.get('/dashboard/summary', { params: cleanParams(filters), signal })),

  fetchTrend: (filters, signal) =>
    safeRequest(api.get('/reports/trend', { params: cleanParams(filters), signal })),

  fetchPerformance: (filters, signal) =>
    safeRequest(api.get('/admin/reports/member-performance', { params: cleanParams(filters), signal })),
};

export default dashboardService;
