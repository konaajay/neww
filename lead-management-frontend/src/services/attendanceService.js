import api, { safeRequest } from '../api/api';

const attendanceService = {
  clockIn: (data) => safeRequest(api.post('/attendance/clock-in', data)),
  clockOut: () => safeRequest(api.put('/attendance/clock-out')),
  trackLocation: (data) => safeRequest(api.post('/attendance/track', data)),
  startBreak: (type = 'SHORT') => safeRequest(api.post(`/attendance/break/start?type=${type}`)),
  endBreak: () => safeRequest(api.post('/attendance/break/end')),
  getStatus: () => safeRequest(api.get('/attendance/status')),
  getMyLogs: (params) => safeRequest(api.get('/attendance/my-logs', { params })),

  
  // Admin/Manager operations
  getOffices: () => safeRequest(api.get('/admin/attendance/offices')),
  getShifts: () => safeRequest(api.get('/admin/attendance/shifts')),
  getPolicies: () => safeRequest(api.get('/admin/attendance/policies')),
  getDailySummaries: (params) => safeRequest(api.get('/admin/attendance/summaries', { params })),
  saveManualEntry: (data) => safeRequest(api.post('/attendance/manual', data)),
  previewManualEntry: (data) => safeRequest(api.post('/attendance/preview', data))
};

export default attendanceService;
