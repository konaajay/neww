import { useQuery } from '@tanstack/react-query';
import userApi from '../api/userApi';
import adminService from '../../../services/adminService';

export const useLookupData = (role) => {
  // 1. Generic Users List (Admin only)
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', role],
    queryFn: () => userApi.fetchUsers(),
    select: (data) => {
      return data?.content || data || [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: role === 'ADMIN'
  });

  // 2. Permissions Registry
  const { data: permissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ['permissions', role],
    queryFn: () => userApi.fetchPermissions(role),
    staleTime: 30 * 60 * 1000,
    enabled: role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER'
  });

  // 3. Organizational Team Tree
  const { data: teamTree, isLoading: loadingTeamTree } = useQuery({
    queryKey: ['teamTree'],
    queryFn: () => userApi.fetchTeamTree(),
    staleTime: 5 * 60 * 1000,
    enabled: role === 'ADMIN' || role === 'MANAGER'
  });

  // 4. Team Leaders (for assignment)
  const { data: teamLeaders, isLoading: loadingTLs } = useQuery({
    queryKey: ['teamLeaders', role],
    queryFn: () => userApi.fetchTeamLeaders(role),
    select: (data) => {
      return Array.isArray(data) ? data : (data?.data || []);
    },
    staleTime: 10 * 60 * 1000,
    enabled: role === 'ADMIN' || role === 'MANAGER'
  });

  // 5. Subordinates (for TLs)
  const { data: subordinates, isLoading: loadingSubordinates } = useQuery({
    queryKey: ['subordinates', role],
    queryFn: () => userApi.fetchSubordinates(role),
    select: (data) => Array.isArray(data) ? data : (data?.data || []),
    staleTime: 5 * 60 * 1000,
    enabled: role === 'TEAM_LEADER' || role === 'MANAGER'
  });

  // 6. Role Registry
  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => userApi.fetchRoles(),
    staleTime: 60 * 60 * 1000,
    enabled: role === 'MANAGER' || role === 'ADMIN'
  });

  // 7. Pipeline Stages (Global Config)
  const { data: pipelineStages, isLoading: loadingStages } = useQuery({
    queryKey: ['pipelineStages'],
    queryFn: () => adminService.fetchPipelineStages(),
    select: (res) => {
      const stages = (res.data || []).filter(s => s.active);
      // Deduplicate by statusValue to prevent React key warnings
      const seen = new Set();
      return stages.filter(s => {
        if (seen.has(s.statusValue)) return false;
        seen.add(s.statusValue);
        return true;
      });
    },
    staleTime: 60 * 60 * 1000 // Config rarely changes
  });
  
  // 8. Office Registry
  const { data: offices, isLoading: loadingOffices } = useQuery({
    queryKey: ['offices', role],
    queryFn: () => adminService.fetchOffices(),
    select: (res) => {
      const data = res?.data || res;
      return Array.isArray(data) ? data : (data?.data || []);
    },
    staleTime: 5 * 60 * 1000
  });

  // 9. Shift Registry
  const { data: shifts, isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts', role],
    queryFn: () => adminService.fetchAttendanceShifts(),
    select: (res) => {
      const data = res?.data || res;
      return Array.isArray(data) ? data : (data?.data || []);
    },
    staleTime: 5 * 60 * 1000
  });

  return {
    users: usersData || [],
    permissions: permissions || [],
    teamTree: teamTree || null,
    teamLeaders: teamLeaders || [],
    subordinates: subordinates || [],
    roles: Array.isArray(roles) ? roles : (roles?.data || []),
    pipelineStages: pipelineStages || [],
    offices: offices || [],
    shifts: shifts || [],
    loading: loadingUsers || loadingPermissions || loadingTeamTree || loadingTLs || loadingSubordinates || loadingRoles || loadingStages || loadingOffices || loadingShifts
  };
};
