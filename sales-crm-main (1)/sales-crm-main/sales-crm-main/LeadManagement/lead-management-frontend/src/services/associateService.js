import api, { safeRequest } from '../api/api';

const associateService = {
  // Lead Operations (Associate-specific)
  fetchMyLeads: () => safeRequest(api.get('/leads/my')),
  fetchLeadById: (id) => safeRequest(api.get(`/leads/${id}`)),
  addLead: (leadData) => safeRequest(api.post('/leads', leadData)),
  updateLead: (id, leadData) => safeRequest(api.put(`/leads/${id}`, leadData)),
  updateStatus: (leadId, status, note, extraData = {}) => safeRequest(api.put(`/leads/${leadId}/status`, { status, note, ...extraData })),

  // Interactions
  recordOutcome: (leadId, outcomeData) => safeRequest(api.post(`/leads/${leadId}/record-outcome`, outcomeData)),
  sendPaymentLink: (leadId, paymentData) => safeRequest(api.post(`/leads/${leadId}/send-payment-link`, paymentData)),

  // Tasks
  fetchLeadTasks: (leadId) => safeRequest(api.get(`/tasks/lead/${leadId}`)),
  fetchHierarchicalTasks: () => safeRequest(api.get('/tasks')),
  searchLeadTasksByDate: (leadId, date) => safeRequest(api.get('/tasks/search', { params: { date, leadId } })),
  addLeadTask: (leadId, task) => safeRequest(api.post(`/tasks/lead/${leadId}`, task)),
  updateTaskStatus: (taskId, status) => safeRequest(api.put(`/tasks/${taskId}/status`, null, { params: { status } })),

  // Call Tracking
  startCall: (data) => safeRequest(api.post('/calls/start', data)),
  endCall: (callId, data) => safeRequest(api.post(`/calls/end/${callId}`, data)),
  fetchTodayReport: () => safeRequest(api.get('/calls/today')),
  fetchMyLogs: (filters) => safeRequest(api.get('/call-records/my', { params: filters })),
  fetchCallStats: (filters) => safeRequest(api.get('/call-records/stats', { params: filters })),

  // Payments & Fees
  recordManualPayment: (data) => safeRequest(api.post('/payments/manual-record', data)),
  getFeeStructure: (leadId) => safeRequest(api.get(`/leads/${leadId}/fee-structure`))
};

export default associateService;
