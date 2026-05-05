import api, { safeRequest } from '../../../api/api';

const userApi = {
  fetchUsers: () => safeRequest(api.get('/admin/users')),
  
  fetchPermissions: (role) => {
    // Standardize to /api/users/permissions for most roles, or /api/admin/permissions for admins
    const endpoint = role === 'ADMIN' ? '/admin/permissions' : '/users/permissions';
    return safeRequest(api.get(endpoint));
  },
  
  fetchTeamTree: () => safeRequest(api.get('/admin/team-tree')),
  
  fetchTeamLeaders: (role) => {
    const endpoint = role === 'ADMIN' ? '/admin/team-leaders' : '/users/team-leaders';
    return safeRequest(api.get(endpoint));
  },
  
  fetchRoles: () => safeRequest(api.get('/users/roles')),
  
  fetchSubordinates: (role) => {
    if (role === 'TEAM_LEADER') return safeRequest(api.get('/tl/subordinates'));
    if (role === 'MANAGER') return safeRequest(api.get('/manager/team-leaders'));
    return safeRequest(api.get('/admin/users')); 
  },
  
  getProfile: () => safeRequest(api.get('/auth/me')),
  
  createUser: (role, userData) => safeRequest(api.post(`/${role.toLowerCase()}/users`, userData)),
  
  updateUser: (role, id, userData) => safeRequest(api.put(`/${role.toLowerCase()}/users/${id}`, userData)),
  
  deleteUser: (role, id) => safeRequest(api.delete(`/${role.toLowerCase()}/users/${id}`)),
  
  assignSupervisor: (role, associateId, supervisorId) => {
    const endpoint = role === 'ADMIN' 
      ? `/admin/assign-supervisor/${associateId}/${supervisorId}`
      : `/${role.toLowerCase()}/users/${associateId}/assign-supervisor/${supervisorId}`;
    return safeRequest(api.post(endpoint));
  }
};

export default userApi;
