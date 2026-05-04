import api, { safeRequest } from '../api/api';

/**
 * managerService - REFACTORED
 * Removed all dashboard/summary logic. Use dashboardService instead.
 */
const managerService = {
    // User Management
    fetchTeamLeaders: () => safeRequest(api.get('/manager/team-leaders')),
    fetchRoles: () => safeRequest(api.get('/manager/roles')),
    fetchPermissions: () => safeRequest(api.get('/manager/permissions')),
    fetchShifts: () => safeRequest(api.get('/manager/shifts')),
    fetchOffices: () => safeRequest(api.get('/manager/offices')),
    
    createUser: (formData) => safeRequest(api.post('/manager/users', formData)),
    updateUser: (id, userData) => safeRequest(api.put(`/manager/users/${id}`, userData)),
    deleteUser: (id) => safeRequest(api.delete(`/manager/users/${id}`)),
    
    // Hierarchy Management
    assignSupervisor: (associateId, supervisorId) => safeRequest(api.post(`/manager/users/${associateId}/assign-supervisor/${supervisorId}`)),
    bulkAssignSupervisor: (associateIds, supervisorId) => safeRequest(api.post('/manager/users/bulk-assign-supervisor', { associateIds, supervisorId })),
    bulkAssignHierarchy: (emailMap) => safeRequest(api.post('/manager/users/bulk-assign-hierarchy', emailMap)),
    
    // Lead Management (Manager-specific)
    fetchLeads: (filters) => safeRequest(api.get('/manager/leads', { params: { userId: filters?.userId, managerId: filters?.managerId } })),
    addLead: (leadData) => safeRequest(api.post('/manager/leads', leadData)),
    assignLead: (leadId, tlId) => safeRequest(api.post(`/manager/assign-lead/${leadId}/${tlId}`)),
    bulkAssignLeads: (leadIds, tlId) => safeRequest(api.post('/manager/leads/bulk-assign', { leadIds, tlId })),
    bulkUploadLeads: (file, assignedToIds) => {
        const formData = new FormData();
        formData.append('file', file);
        if (assignedToIds) formData.append('assignedToIds', assignedToIds);
        return safeRequest(api.post('/manager/leads/bulk-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }));
    },
    
    // Call Logs
    fetchGlobalCallStats: (filters) => safeRequest(api.get('/call-records/admin/stats', { params: filters }))
};

export default managerService;
