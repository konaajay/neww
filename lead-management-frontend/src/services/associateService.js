import api from '../api/api';

const associateService = {
  // Lead Operations (Associate-specific)
  fetchMyLeads: () => api.get('/leads/my'),
  fetchLeadById: (id) => api.get(`/leads/${id}`),
  addLead: (leadData) => api.post('/leads', leadData),
  updateLead: (id, leadData) => api.put(`/leads/${id}`, leadData),
  updateStatus: (leadId, status, note, extraData = {}) => api.put(`/leads/${leadId}/status`, { status, note, ...extraData }),

  // Interactions
  recordOutcome: (leadId, outcomeData) => api.post(`/leads/${leadId}/record-outcome`, outcomeData),
  sendPaymentLink: (leadId, paymentData) => api.post(`/leads/${leadId}/send-payment-link`, paymentData),

  // Tasks
  fetchLeadTasks: (leadId) => api.get(`/tasks/lead/${leadId}`),
  fetchHierarchicalTasks: () => api.get('/tasks'),
  searchLeadTasksByDate: (leadId, date) => api.get('/tasks/search', { params: { date, leadId } }),
  addLeadTask: (leadId, task) => api.post(`/tasks/lead/${leadId}`, task),
  updateTaskStatus: (taskId, status) => api.put(`/tasks/${taskId}/status`, null, { params: { status } }),

  // Call Tracking
  startCall: (data) => api.post('/calls/start', data),
  endCall: (callId, data) => api.post(`/calls/end/${callId}`, data),
  fetchTodayReport: () => api.get('/calls/today'),
  fetchMyLogs: (filters) => api.get('/call-records/my', { params: filters }),
  fetchCallStats: (filters) => api.get('/call-records/stats', { params: filters }),

  // Payments & Fees
  recordManualPayment: (data) => api.post('/payments/manual-record', data),
  getFeeStructure: (leadId) => api.get(`/leads/${leadId}/fee-structure`)
};

export default associateService;
