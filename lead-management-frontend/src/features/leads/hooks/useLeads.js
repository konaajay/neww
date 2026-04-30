import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import leadsApi from '../api/leadsApi';
import { toast } from 'react-toastify';

export const useLeads = (filters, role) => {
  const queryClient = useQueryClient();
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // 1. Normalize filters for stable query keys
  const normalizedFilters = useMemo(() => ({
    from: filters.from || '',
    to: filters.to || '',
    userId: filters.userId || null,
    teamId: filters.teamId || null,
    managerId: filters.managerId || null
  }), [filters.from, filters.to, filters.userId, filters.teamId, filters.managerId]);

  // 2. Fetching Leads
  const { data: leads = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['leads', role, normalizedFilters.from, normalizedFilters.to, normalizedFilters.userId, normalizedFilters.teamId, normalizedFilters.managerId],
    queryFn: ({ signal }) => leadsApi.fetchLeads(role, normalizedFilters, signal),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Extract leads from different response formats (ApiResponse.data, content array, or direct array)
    select: (res) => {
      if (!res) return [];
      if (res.data && Array.isArray(res.data)) return res.data;
      if (Array.isArray(res)) return res;
      return res.content || [];
    },
    placeholderData: (previousData) => previousData
  });

  // 3. Mutations
  const invalidateLeads = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => leadsApi.updateLead(id, data),
    onSuccess: () => {
      toast.success('Lead protocol synchronized');
      invalidateLeads();
    }
  });

  const assignLeadMutation = useMutation({
    mutationFn: ({ leadId, targetId }) => leadsApi.assignLead(role, leadId, targetId),
    onSuccess: () => {
      toast.success('Asset reassigned');
      invalidateLeads();
    }
  });

  const bulkAssignMutation = useMutation({
    mutationFn: ({ leadIds, targetId }) => leadsApi.bulkAssignLeads(role, leadIds, targetId),
    onSuccess: () => {
      toast.success('Bulk redistribution complete');
      setSelectedLeadIds([]);
      invalidateLeads();
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => leadsApi.deleteLead(id),
    onSuccess: () => {
      toast.success('Lead purged from registry');
      invalidateLeads();
    }
  });

  const recordOutcomeMutation = useMutation({
    mutationFn: ({ leadId, data }) => leadsApi.recordCallOutcome(leadId, data),
    onSuccess: () => {
      toast.success('Interaction outcome registered');
      invalidateLeads();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // 4. Selection Helpers
  const toggleSelection = (id) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return {
    leads,
    loading: isLoading,
    refreshing: isRefetching,
    refetch,
    selectedLeadIds,
    setSelectedLeadIds,
    toggleSelection,
    // Operations
    updateLead: updateLeadMutation.mutateAsync,
    assignLead: assignLeadMutation.mutateAsync,
    bulkAssignLeads: bulkAssignMutation.mutateAsync,
    deleteLead: deleteLeadMutation.mutateAsync,
    recordCallOutcome: recordOutcomeMutation.mutateAsync
  };
};
