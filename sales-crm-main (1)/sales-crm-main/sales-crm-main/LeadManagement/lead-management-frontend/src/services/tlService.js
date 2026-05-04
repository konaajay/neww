import api, { safeRequest } from '../api/api';

/**
 * tlService - REFACTORED
 * Removed all dashboard/summary/stats logic. Use dashboardService instead.
 */
const tlService = {
  // User/Hierarchy Management
  fetchSubordinates: () => safeRequest(api.get('/tl/subordinates')),
  
  // Lead Management
  fetchMyLeads: () => safeRequest(api.get('/tl/leads/my')),
  fetchTeamLeads: (filters) => safeRequest(api.get('/tl/leads/team', { params: filters })),
  addLead: (leadData) => safeRequest(api.post('/tl/leads', leadData)),
  assignLead: (leadId, associateId) => safeRequest(api.post(`/tl/leads/${leadId}/assign/${associateId}`)),
  updateLead: (id, leadData) => safeRequest(api.put(`/leads/${id}`, leadData)),
  
  bulkUploadLeads: (file, assignedToIds) => {
    const formData = new FormData();
    formData.append('file', file);
    if (assignedToIds) formData.append('assignedToIds', assignedToIds);
    return safeRequest(api.post('/tl/leads/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },

  // Interactions
  recordCallOutcome: (leadId, outcomeData) => safeRequest(api.post(`/leads/${leadId}/record-outcome`, outcomeData)),
  sendPaymentLink: (leadId, paymentData) => safeRequest(api.post(`/leads/${leadId}/send-payment-link`, paymentData)),
  
  // Task Management
  createTask: (taskData) => safeRequest(api.post('/tasks', taskData)),

  // Call Logs
  fetchCallLogs: (filters) => safeRequest(api.get('/call-records/admin/all', { params: filters })),
  fetchGlobalCallStats: (filters) => safeRequest(api.get('/call-records/admin/stats', { params: filters }))
};

export default tlService;
