import api from '../../../api/api';

export const fetchDashboardData = (filters) => {
    return Promise.all([
        api.get('/manager/dashboard/stats', { params: filters }),
        api.get('/manager/reports/member-performance', { params: filters }),
        api.get('/manager/team-tree'),
        api.get('/manager/reports/trend', { params: filters })
    ]);
};

export const fetchLeads = () => api.get('/manager/leads');
export const fetchTeamLeaders = () => api.get('/manager/team-leaders');
export const fetchRoles = () => api.get('/manager/roles');
export const fetchPermissions = () => api.get('/manager/permissions');

export const createUser = (formData) => api.post('/manager/users', formData);
export const updateUser = (id, userData) => api.put(`/manager/users/${id}`, userData);
export const deleteUser = (id) => api.delete(`/manager/users/${id}`);
export const assignSupervisor = (associateId, supervisorId) => api.post(`/manager/users/${associateId}/assign-supervisor/${supervisorId}`);

export const addLead = (leadData) => api.post('/manager/leads', leadData);
export const assignLead = (leadId, tlId) => api.post(`/manager/assign-lead/${leadId}/${tlId}`);
export const bulkAssignLeads = (leadIds, tlId) => api.post('/manager/leads/bulk-assign', { leadIds, tlId });
export const recordCallOutcome = (leadId, data) => api.post(`/leads/${leadId}/record-outcome`, data);
