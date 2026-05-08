import api from '../api/api';

const wfhService = {
    // Request WFH for a specific duration
    requestWfh: (startDate, endDate, reason) => api.post('/attendance/wfh/request', { startDate, endDate, reason }),

    // Get current WFH status for the logged-in user
    getMyWfhStatus: () => api.get('/attendance/wfh/my-status'),

    // [ADMIN/MANAGER ONLY] Get all pending WFH requests
    getRequests: (status = 'PENDING') => api.get(`/attendance/wfh/list?status=${status}`),

    // [ADMIN/MANAGER ONLY] Approve or Reject a WFH request
    handleRequest: (requestId, action, notes) => api.put(`/attendance/wfh/request/${requestId}`, { action, notes }),

    // [ADMIN/MANAGER ONLY] Get count of pending WFH requests for notification badges
    getPendingCount: () => api.get('/attendance/wfh/pending-count')
};

export default wfhService;
