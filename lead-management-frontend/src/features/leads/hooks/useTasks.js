import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import taskService from '../../../services/taskService';
import { toast } from 'react-toastify';
import { useMemo } from 'react';

export const useTasks = (filters = {}, options = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const memoizedFilters = useMemo(() => ({
    from: filters.from,
    to: filters.to,
    userId: filters.userId,
    managerId: filters.managerId,
    teamId: filters.teamId
  }), [filters.from, filters.to, filters.userId, filters.managerId, filters.teamId]);

  // 1. Fetch Tasks with stable query key
  const { data: tasks = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['tasks', memoizedFilters],
    queryFn: ({ signal }) => taskService.fetchTasks(memoizedFilters, signal),
    select: (res) => (res?.data || []),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    enabled,
    placeholderData: (previousData) => previousData
  });

  // 2. Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }) => taskService.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to update task status')
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ leadId, data }) => taskService.createTask(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task created successfully');
    },
    onError: () => toast.error('Failed to create task')
  });

  return {
    tasks,
    loading,
    refresh: refetch,
    updateStatus: updateTaskMutation.mutateAsync,
    createTask: createTaskMutation.mutateAsync
  };
};
