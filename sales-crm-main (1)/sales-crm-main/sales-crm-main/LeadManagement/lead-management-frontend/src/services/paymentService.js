import api, { safeRequest } from '../api/api';

const paymentService = {
  fetchHistory: (role, filters) => {
    let url = role === 'ADMIN' ? '/admin/payments/history' :
      role === 'MANAGER' ? '/manager/payments/history' :
        '/tl/payments/history';

    const params = new URLSearchParams();
    if (filters.startDate) {
      const dateOnly = filters.startDate.split('T')[0];
      params.append('startDate', `${dateOnly}T00:00:00`);
    }
    if (filters.endDate) {
      const dateOnly = filters.endDate.split('T')[0];
      params.append('endDate', `${dateOnly}T23:59:59`);
    }
    if (filters.managerId) params.append('managerId', filters.managerId);
    if (filters.tlId) params.append('tlId', filters.tlId);
    if (filters.associateId) params.append('associateId', filters.associateId);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.status) params.append('status', filters.status);

    return safeRequest(api.get(`${url}?${params.toString()}`));
  },

  updatePaymentStatus: (id, payload) => {
    return safeRequest(api.put(`/payments/${id}/status`, null, { params: payload }));
  },

  splitPayment: (id, splitRequest) => {
    return safeRequest(api.post(`/payments/${id}/split`, splitRequest));
  },

  recordManualPayment: (data) => {
    return safeRequest(api.post('/payments/manual-record', data));
  },

  fetchInvoiceByLead: (leadId) => {
    return safeRequest(api.get(`/payments/lead/${leadId}/invoice`));
  },
  fetchStudentFee: (leadId) => {
    return safeRequest(api.get(`/payments/lead/${leadId}/fee-structure`));
  }
};

export default paymentService;
