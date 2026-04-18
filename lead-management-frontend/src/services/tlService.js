import api from '../api/api';

const tlService = {
  fetchMyLeads: () => api.get('/tl/leads/my'),
  fetchTeamLeads: (filters) => api.get('/tl/leads/team', { params: filters }),
  fetchPersonalStats: (filters) => api.get('/leads/stats', { params: filters }),
  fetchDashboardStats: (filters) => api.get('/tl/dashboard/stats', { params: filters }),
  fetchMemberPerformance: (filters) => api.get('/tl/reports/member-performance', { params: filters }),
  fetchSubordinates: () => api.get('/tl/subordinates'),
  fetchTrendData: (filters) => api.get('/reports/trend', { params: filters }),
  fetchDashboardSummary: (filters) => api.get('/stats/summary', { params: filters }),
  addLead: (leadData) => api.post('/tl/leads', leadData),
  updateLeadStatus: (leadId, status, note) => api.put(`/tl/leads/${leadId}/status`, null, { params: { status, note } }),
  recordCallOutcome: (leadId, outcomeData) => api.post(`/leads/${leadId}/record-outcome`, outcomeData),
  sendPaymentLink: (leadId, paymentData) => api.post(`/leads/${leadId}/send-payment-link`, paymentData),
  assignLead: (leadId, associateId) => api.post(`/tl/leads/${leadId}/assign/${associateId}`),
  updateLead: (id, leadData) => api.put(`/leads/${id}`, leadData),
  bulkUploadLeads: (file, assignedToIds) => {
    const formData = new FormData();
    formData.append('file', file);
    if (assignedToIds) formData.append('assignedToIds', assignedToIds);
    return api.post('/tl/leads/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  createTask: (taskData) => api.post('/tasks', taskData),
  fetchCallLogs: (filters) => api.get('/call-records/admin/all', { params: filters }),
  fetchGlobalCallStats: (filters) => api.get('/call-records/admin/stats', { params: filters })
};

export default tlService;
