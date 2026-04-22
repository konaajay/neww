import api from '../api/api';

const associateService = {
  fetchMyLeads: () => api.get('/leads/my'),
  fetchPerformanceStats: (filters) => api.get('/leads/stats', { params: filters }),
  updateStatus: (leadId, status, note) => api.put(`/leads/${leadId}/status`, null, { 
    params: { status, note } 
  }),
  recordOutcome: (leadId, outcomeData) => api.post(`/leads/${leadId}/record-outcome`, outcomeData),
  addLead: (leadData) => api.post('/leads', leadData),
  updateLead: (id, leadData) => api.put(`/leads/${id}`, leadData),
  sendPaymentLink: (leadId, paymentData) => api.post(`/leads/${leadId}/send-payment-link`, paymentData),
  fetchCallStats: (filters) => api.get('/call-records/stats', { params: filters }),
  fetchMyLogs: (filters) => api.get('/call-records/my', { params: filters }),
  fetchTrendData: (filters) => api.get('/reports/trend', { params: filters }),
  fetchUnifiedDashboard: (filters) => api.get('/dashboard/summary', { params: filters }),
  
  fetchLeadTasks: (leadId) => api.get(`/tasks/lead/${leadId}`),

  fetchHierarchicalTasks: () => api.get('/tasks'), 
  
  searchLeadTasksByDate: (leadId, date) => api.get('/tasks/search', { params: { date, leadId } }),
  
  addLeadTask: (leadId, task) => api.post(`/tasks/lead/${leadId}`, task),
  
  updateTaskStatus: (taskId, status) => api.put(`/tasks/${taskId}/status`, null, { params: { status } }),

  // Strict Call Tracking
  startCall: (data) => api.post('/calls/start', data),
  endCall: (callId, data) => api.post(`/calls/end/${callId}`, data),
  fetchTodayReport: () => api.get('/calls/today'),
  getFeeStructure: (leadId) => api.get(`/leads/${leadId}/fee-structure`),
  fetchLeadById: (id) => api.get(`/leads/${id}`)
};

export default associateService;
