import api, { cleanParams, safeRequest } from '../../../api/api';

const leadsApi = {
  fetchLeads: (role, filters, signal) => {
    let endpoint = '/leads';
    switch (role) {
      case 'ADMIN': endpoint = '/admin/leads'; break;
      case 'MANAGER': endpoint = '/manager/leads'; break;
      case 'TEAM_LEADER': endpoint = '/tl/leads/team'; break;
      case 'ASSOCIATE': endpoint = '/leads/my'; break;
      default: endpoint = '/leads';
    }
    return safeRequest(
      api.get(endpoint, { 
        params: cleanParams(filters), 
        signal 
      })
    );
  },

  fetchLeadById: (id) => safeRequest(api.get(`/leads/${id}`)),

  updateStatus: (id, status, note, extraData = {}) => 
    safeRequest(api.put(`/leads/${id}/status`, { status, note, ...extraData })),

  getFeeStructure: (id) => safeRequest(api.get(`/leads/${id}/fee-structure`)),

  addLead: (role, data) => {
    let prefix = '/leads';
    if (role === 'MANAGER') prefix = '/manager/leads';
    else if (role === 'TEAM_LEADER') prefix = '/tl/leads';
    return safeRequest(api.post(prefix, data));
  },

  updateLead: (id, data) => safeRequest(api.put(`/leads/${id}`, data)),

  deleteLead: (id) => safeRequest(api.delete(`/leads/${id}`)),

  assignLead: (role, leadId, userId) => {
    let prefix = '/leads';
    if (role === 'ADMIN') prefix = '/admin';
    else if (role === 'MANAGER') prefix = '/manager';
    else if (role === 'TEAM_LEADER') return safeRequest(api.post(`/tl/leads/${leadId}/assign/${userId}`));
    
    return safeRequest(api.post(`${prefix}/assign-lead/${leadId}/${userId}`));
  },

  bulkAssignLeads: (role, leadIds, userId) => {
    let prefix = '/leads';
    if (role === 'ADMIN') prefix = '/admin';
    else if (role === 'MANAGER') prefix = '/manager';
    else if (role === 'TEAM_LEADER') prefix = '/tl';
    
    return safeRequest(api.post(`${prefix}/leads/bulk-assign`, { leadIds, tlId: userId }));
  },

  recordCallOutcome: (leadId, data) => safeRequest(api.post(`/leads/${leadId}/record-outcome`, data)),

  sendPaymentLink: (leadId, data) => safeRequest(api.post(`/leads/${leadId}/send-payment-link`, data)),
  
  createCashfreeOrder: (leadId, amount, type, installments = [], totalAmount, discount, installmentId) => 
    safeRequest(api.post('/payments/cashfree/create-order', { leadId, amount, type: type || 'FULL', installments, totalAmount, discount, installmentId })),

  recordManualPayment: (data, receiptFile) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (receiptFile) {
      formData.append('receipt', receiptFile);
    }
    // Note: Do NOT set Content-Type header manually for FormData. 
    // The browser will set it automatically with the correct boundary.
    return safeRequest(api.post('/payments/manual-record', formData));
  }
};

export default leadsApi;
