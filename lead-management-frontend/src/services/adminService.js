import api, { safeRequest } from '../api/api';

/**
 * adminService - REFACTORED
 * Removed all dashboard/summary/stats logic. Use dashboardService instead.
 */
const adminService = {
  // User & Role Management
  fetchUsers: () => safeRequest(api.get('/admin/users')),
  fetchPermissions: () => safeRequest(api.get('/admin/permissions')),
  fetchShifts: () => safeRequest(api.get('/admin/shifts')),
  createUser: (userData) => safeRequest(api.post('/admin/users', userData)),
  updateUser: (id, userData) => safeRequest(api.put(`/admin/users/${id}`, userData)),
  deleteUser: (id) => safeRequest(api.delete(`/admin/users/${id}`)),
  
  // Hierarchy Management
  fetchTeamLeaders: () => safeRequest(api.get('/admin/team-leaders')),
  fetchManagers: () => safeRequest(api.get('/admin/managers')),
  fetchTeamsByManager: (managerId) => safeRequest(api.get('/admin/teams', { params: { managerId } })),
  fetchAssociates: (teamId, managerId) => safeRequest(api.get('/admin/associates', { params: { teamId, managerId } })),
  fetchTeamTree: () => safeRequest(api.get('/admin/team-tree')),
  assignSupervisor: (assocId, supId) => safeRequest(api.post(`/admin/assign-supervisor/${assocId}/${supId}`)),
  bulkAssignSupervisor: (associateIds, supervisorId) => safeRequest(api.post('/admin/bulk-assign-supervisor', { associateIds, supervisorId })),
  bulkAssignHierarchy: (emailMap) => safeRequest(api.post('/admin/bulk-assign-hierarchy', emailMap)),

  // Lead Management (Admin-specific)
  fetchLeads: (filters) => safeRequest(api.get('/admin/leads', { params: filters })),
  assignLead: (leadId, tlId) => safeRequest(api.post(`/admin/assign-lead/${leadId}/${tlId}`)),
  bulkAssignLeads: (leadIds, tlId) => safeRequest(api.post('/admin/leads/bulk-assign', { leadIds, tlId })),

  // Attendance & Office Configuration
  fetchOffices: () => safeRequest(api.get('/admin/attendance/offices')),
  createOffice: (data) => safeRequest(api.post('/admin/attendance/offices', data)),
  updateOffice: (id, data) => safeRequest(api.put(`/admin/attendance/offices/${id}`, data)),
  deleteOffice: (id) => safeRequest(api.delete(`/admin/attendance/offices/${id}`)),
  
  fetchPolicies: () => safeRequest(api.get('/admin/attendance/policies')),
  createPolicy: (data) => safeRequest(api.post('/admin/attendance/policies', data)),
  updatePolicy: (id, data) => safeRequest(api.put(`/admin/attendance/policies/${id}`, data)),
  deletePolicy: (id) => safeRequest(api.delete(`/admin/attendance/policies/${id}`)),
  
  fetchAttendanceShifts: () => safeRequest(api.get('/admin/attendance/shifts')),
  createShift: (data) => safeRequest(api.post('/admin/attendance/shifts', data)),
  updateShift: (id, data) => safeRequest(api.put(`/admin/attendance/shifts/${id}`, data)),
  deleteShift: (id) => safeRequest(api.delete(`/admin/attendance/shifts/${id}`)),
  
  fetchGlobalTargets: () => safeRequest(api.get('/admin/attendance/global-targets')),
  updateGlobalTargets: (data) => safeRequest(api.post('/admin/attendance/global-targets', data)),
  updateAttendanceNote: (userId, date, note) => safeRequest(api.post('/admin/attendance/daily-note', { userId, date, note })),

  // Pipeline Configuration
  fetchPipelineStages: () => safeRequest(api.get('/lookup/pipeline-stages')),
  createPipelineStage: (data) => safeRequest(api.post('/admin/pipeline-stages', data)),
  updatePipelineStage: (id, data) => safeRequest(api.put(`/admin/pipeline-stages/${id}`, data)),
  deletePipelineStage: (id) => safeRequest(api.delete(`/admin/pipeline-stages/${id}`)),
  reorderPipelineStage: (id, direction) => safeRequest(api.patch(`/admin/pipeline-stages/${id}/reorder`, null, { params: { direction } })),

  // Call Records Audit
  fetchCallLogsAdmin: (filters) => safeRequest(api.get('/call-records/admin/all', { params: filters })),
  fetchGlobalCallStats: (filters) => safeRequest(api.get('/call-records/admin/stats', { params: filters })),
  bulkUploadCallLogs: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return safeRequest(api.post('/call-records/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },

  // Revenue Targets
  setRevenueTarget: (payload) => safeRequest(api.post('/targets/set', payload)),
  fetchRevenueTargets: (month, year) => safeRequest(api.get('/targets/all', { params: { month, year } })),

  // Auth/Security
  generateResetOtp: (userId) => safeRequest(api.post(`/admin/users/${userId}/reset-password-otp`)),
  verifyResetOtp: (userId, otp, newPassword) => safeRequest(api.post(`/admin/users/${userId}/verify-reset-otp`, { otp, newPassword })),
  
  // Course Management
  fetchCourses: () => safeRequest(api.get('/leads/program-protocols'))
};

export default adminService;
