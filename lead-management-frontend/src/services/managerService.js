import api from '../api/api';

const managerService = {
    fetchUnifiedDashboard: (filters) => api.get('/dashboard/summary', { params: filters }),
    fetchDashboardData: (filters) => {
        // Redundant - should be replaced with fetchUnifiedDashboard
        const statsParams = {
            start: filters.from,
            end: filters.to,
            userId: filters.userId
        };
        const trendParams = {
            from: filters.from?.split('T')[0],
            to: filters.to?.split('T')[0],
            userId: filters.userId
        };
        return Promise.all([
            api.get('/manager/dashboard/stats', { params: statsParams }),
            api.get('/manager/reports/member-performance', { params: statsParams }),
            api.get('/manager/team-tree'),
            api.get('/reports/trend', { params: trendParams }),
            api.get('/call-records/admin/stats', { params: { date: filters.from?.split('T')[0] } }),
            api.get('/stats/summary', { params: { from: filters.from?.split('T')[0], to: filters.to?.split('T')[0], userId: filters.userId } })
        ]);
    },
    fetchGlobalCallStats: (filters) => api.get('/call-records/admin/stats', { params: filters }),
    fetchPersonalStats: (filters) => api.get('/leads/stats', { params: filters }),
    fetchLeads: (filters) => api.get('/manager/leads', { params: { userId: filters?.userId } }),
    fetchTeamLeaders: () => api.get('/manager/team-leaders'),
    fetchRoles: () => api.get('/manager/roles'),
    fetchPermissions: () => api.get('/manager/permissions'),
    fetchShifts: () => api.get('/manager/shifts'),
    createUser: (formData) => api.post('/manager/users', formData),
    updateUser: (id, userData) => api.put(`/manager/users/${id}`, userData),
    deleteUser: (id) => api.delete(`/manager/users/${id}`),
    assignSupervisor: (associateId, supervisorId) => api.post(`/manager/users/${associateId}/assign-supervisor/${supervisorId}`),
    bulkAssignSupervisor: (associateIds, supervisorId) => api.post('/manager/users/bulk-assign-supervisor', { associateIds, supervisorId }),
    bulkAssignHierarchy: (emailMap) => api.post('/manager/users/bulk-assign-hierarchy', emailMap),
    addLead: (leadData) => api.post('/manager/leads', leadData),
    assignLead: (leadId, tlId) => api.post(`/manager/assign-lead/${leadId}/${tlId}`),
    bulkAssignLeads: (leadIds, tlId) => api.post('/manager/leads/bulk-assign', { leadIds, tlId }),
    recordCallOutcome: (leadId, data) => api.post(`/leads/${leadId}/record-outcome`, data),
    bulkUploadLeads: (file, assignedToIds) => {
        const formData = new FormData();
        formData.append('file', file);
        if (assignedToIds) formData.append('assignedToIds', assignedToIds);
        return api.post('/manager/leads/bulk-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    updateLead: (id, data) => api.put(`/leads/${id}`, data),
    sendPaymentLink: (leadId, data) => api.post(`/leads/${leadId}/send-payment-link`, data),
    deleteLead: (id) => api.delete(`/leads/${id}`),
    fetchOffices: () => api.get('/manager/offices')
};

export default managerService;
