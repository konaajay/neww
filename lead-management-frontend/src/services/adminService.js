import api from '../api/api';

const adminService = {
  fetchDashboardStats: (filters) => api.get('/admin/dashboard/stats', { params: filters }),
  fetchMemberPerformance: (filters) => api.get('/admin/reports/member-performance', { params: filters }),
  fetchTrendData: (filters) => api.get('/reports/trend', { params: filters }),
  fetchDashboardSummary: (filters) => api.get('/stats/summary', { params: filters }),
  fetchUnifiedDashboard: (filters) => api.get('/dashboard/summary', { params: filters }),
  fetchUsers: () => api.get('/admin/users'),
  fetchPermissions: () => api.get('/admin/permissions'),
  fetchShifts: () => api.get('/admin/shifts'),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  fetchAssociatesByTl: (tlId) => api.get(`/admin/associates/${tlId}`),
  fetchTeamLeaders: () => api.get('/admin/team-leaders'),
  fetchManagers: () => api.get('/admin/managers'),
  fetchTeamsByManager: (managerId) => api.get('/admin/teams', { params: { managerId } }),
  fetchAssociates: (teamId, managerId) => api.get('/admin/associates', { params: { teamId, managerId } }),
  fetchLeads: (filters) => api.get('/admin/leads', { params: filters }),
  fetchTeamTree: () => api.get('/admin/team-tree'),
  assignLead: (leadId, tlId) => api.post(`/admin/assign-lead/${leadId}/${tlId}`),
  bulkAssignLeads: (leadIds, tlId) => api.post('/admin/leads/bulk-assign', { leadIds, tlId }),
  addLead: (data) => api.post('/leads', data),
  assignSupervisor: (assocId, supId) => api.post(`/admin/assign-supervisor/${assocId}/${supId}`),
  bulkAssignSupervisor: (associateIds, supervisorId) => api.post('/admin/bulk-assign-supervisor', { associateIds, supervisorId }),
  bulkAssignHierarchy: (emailMap) => api.post('/admin/bulk-assign-hierarchy', emailMap),
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  recordCallOutcome: (leadId, data) => api.post(`/leads/${leadId}/record-outcome`, data),

  // Attendance Management
  fetchOffices: () => api.get('/admin/attendance/offices'),
  createOffice: (data) => api.post('/admin/attendance/offices', data),
  updateOffice: (id, data) => api.put(`/admin/attendance/offices/${id}`, data),
  deleteOffice: (id) => api.delete(`/admin/attendance/offices/${id}`),
  fetchPolicies: () => api.get('/admin/attendance/policies'),
  createPolicy: (data) => api.post('/admin/attendance/policies', data),
  updatePolicy: (id, data) => api.put(`/admin/attendance/policies/${id}`, data),
  deletePolicy: (id) => api.delete(`/admin/attendance/policies/${id}`),
  fetchAttendanceShifts: () => api.get('/admin/attendance/shifts'),
  createShift: (data) => api.post('/admin/attendance/shifts', data),
  updateShift: (id, data) => api.put(`/admin/attendance/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/admin/attendance/shifts/${id}`),
  fetchGlobalTargets: () => api.get('/admin/attendance/global-targets'),
  updateGlobalTargets: (data) => api.post('/admin/attendance/global-targets', data),

  // Call Records Audit
  fetchCallLogsAdmin: (filters) => api.get('/call-records/admin/all', { params: filters }),
   fetchGlobalCallStats: (filters) => api.get('/call-records/admin/stats', { params: filters }),
  bulkUploadCallLogs: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/call-records/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  uploadCallRecord: (payload) => {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.leadId) formData.append('leadId', payload.leadId);
    formData.append('phoneNumber', payload.phoneNumber);
    formData.append('callType', payload.callType || 'OUTGOING');
    formData.append('status', payload.status || 'CONNECTED');
    if (payload.note) formData.append('note', payload.note);
    formData.append('duration', payload.duration || 0);

    return api.post('/call-records/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  setRevenueTarget: (payload) => api.post('/targets/set', payload),
  fetchRevenueTargets: (month, year) => api.get('/targets/all', { params: { month, year } }),

  // Password Reset Logic
  generateResetOtp: (userId) => api.post(`/admin/users/${userId}/reset-password-otp`),
  verifyResetOtp: (userId, otp, newPassword) => api.post(`/admin/users/${userId}/verify-reset-otp`, { otp, newPassword }),
  sendPaymentLink: (leadId, data) => api.post(`/leads/${leadId}/send-payment-link`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`)
};

export default adminService;
