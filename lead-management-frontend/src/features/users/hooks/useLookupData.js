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
    staleTime: 0,
    enabled: role === 'ADMIN',
    refetchOnWindowFocus: true,
    refetchInterval: 10000
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
    staleTime: 0,
    enabled: role === 'ADMIN' || role === 'MANAGER',
    refetchInterval: 10000
  });

  // 4. Team Leaders (for assignment)
  const { data: teamLeaders, isLoading: loadingTLs } = useQuery({
    queryKey: ['teamLeaders', role],
    queryFn: () => userApi.fetchTeamLeaders(role),
    select: (data) => {
      return Array.isArray(data) ? data : (data?.data || []);
    },
    staleTime: 0,
    enabled: role === 'ADMIN' || role === 'MANAGER',
    refetchInterval: 10000
  });

  // 5. Subordinates (for TLs)
  const { data: subordinates, isLoading: loadingSubordinates } = useQuery({
    queryKey: ['subordinates', role],
    queryFn: () => userApi.fetchSubordinates(role),
    select: (data) => Array.isArray(data) ? data : (data?.data || []),
    staleTime: 0,
    enabled: role === 'TEAM_LEADER' || role === 'MANAGER',
    refetchInterval: 10000
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
      const backendStages = (res.data || []).filter(s => s.active).map(s => ({
        ...s,
        requireNote: s.requireNote ?? s.require_note,
        requireDate: s.requireDate ?? s.require_date,
        createTask: s.createTask ?? s.create_task
      }));
      
      // Standard Hardcoded Stages (Strict Order and Config from Pipeline Architecture screenshot)
      const standardStages = [
        { label: 'Open', statusValue: 'OPEN', requireNote: false, requireDate: false, createTask: false, orderIndex: 1, color: 'primary' },
        { label: 'Switch Off', statusValue: 'SWITCH_OFF', requireNote: false, requireDate: false, createTask: false, orderIndex: 2, color: 'warning' },
        { label: 'Out of Coverage', statusValue: 'OUT_OF_COVERAGE', requireNote: false, requireDate: false, createTask: false, orderIndex: 3, color: 'warning' },
        { label: 'Wrong Number', statusValue: 'WRONG_NUMBER', requireNote: false, requireDate: false, createTask: false, orderIndex: 4, color: 'warning' },
        { label: 'Not Responding', statusValue: 'NOT_RESPONDING', requireNote: false, requireDate: false, createTask: false, orderIndex: 5, color: 'warning' },
        { label: 'Follow-up', statusValue: 'FOLLOW_UP', requireNote: true, requireDate: true, createTask: true, orderIndex: 6, color: 'warning' },
        { label: 'Follow-up 1', statusValue: 'FOLLOW_UP_1', requireNote: true, requireDate: true, createTask: true, orderIndex: 7, color: 'warning' },
        { label: 'Interested', statusValue: 'INTERESTED', requireNote: false, requireDate: true, createTask: true, orderIndex: 8, color: 'primary' },
        { label: 'Converted', statusValue: 'CONVERTED', requireNote: false, requireDate: true, createTask: true, orderIndex: 9, color: 'success' },
        { label: 'Lost', statusValue: 'LOST', requireNote: false, requireDate: false, createTask: false, orderIndex: 10, color: 'danger' },
        
        // Mandatory Operational Stages (Already Hard Logic - Hidden from main dropdown)
        { label: 'EMI', statusValue: 'EMI', requireNote: true, requireDate: true, createTask: true, orderIndex: 11, color: 'info', hideInDropdown: true },
        { label: 'Paid', statusValue: 'PAID', requireNote: true, requireDate: false, createTask: false, orderIndex: 12, color: 'success', hideInDropdown: true },
        { label: 'Pre-Payment', statusValue: 'PRE_PAYMENT', requireNote: false, requireDate: true, createTask: true, orderIndex: 13, color: 'primary', hideInDropdown: true },
        { label: 'EMI Follow-up', statusValue: 'EMI_FOLLOWUP', requireNote: true, requireDate: true, createTask: true, orderIndex: 14, color: 'danger', hideInDropdown: true }
      ];

      // Normalize comparison to prevent duplicates (e.g., "FOLLOW_UP" vs "FOLLOW-UP")
      const normalize = (s) => s?.toUpperCase().replace(/[-_ ]/g, '') || '';
      
      // 1. Start with Standard Funnel Architecture
      const merged = standardStages.map(ss => {
        const normSs = normalize(ss.statusValue);
        // Find matching backend configuration
        const backendMatch = backendStages.find(bs => normalize(bs.statusValue) === normSs);
        
        if (backendMatch) {
          // USER OVERRIDE: If user edited the stage in dashboard, use their flags
          return {
            ...ss,
            requireNote: backendMatch.requireNote ?? ss.requireNote,
            requireDate: backendMatch.requireDate ?? ss.requireDate,
            createTask: backendMatch.createTask ?? ss.createTask,
            label: backendMatch.label || ss.label // Allow label polish but keep statusValue constant
          };
        }
        return ss;
      });

      // 2. Add any custom stages from backend that aren't in standard
      const standardNormalized = standardStages.map(s => normalize(s.statusValue));
      backendStages.forEach(bs => {
        const normBs = normalize(bs.statusValue);
        if (!standardNormalized.includes(normBs)) {
          merged.push(bs);
        }
      });

      return merged.sort((a, b) => (a.orderIndex || 99) - (b.orderIndex || 99));
    },
    staleTime: 0, // Real-time immediate stale
    refetchInterval: 5000 // Poll every 5 seconds for global config changes
  });

  // 7a. Program/Course Protocols (Global Config)
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => adminService.fetchCourses(),
    select: (res) => res.data || res || [],
    staleTime: 0, // Real-time immediate stale
    refetchInterval: 5000 // Poll every 5 seconds for courses
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
    courses: courses || [],
    offices: offices || [],
    shifts: shifts || [],
    loading: loadingUsers || loadingPermissions || loadingTeamTree || loadingTLs || loadingSubordinates || loadingRoles || loadingStages || loadingOffices || loadingShifts || loadingCourses
  };
};
