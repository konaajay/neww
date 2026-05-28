import { useQuery, useQueryClient } from '@tanstack/react-query';
import dashboardService from '../../../services/dashboardService';


export const useDashboardData = (filters) => {
    // 1. Destructure for stable query key tracking
    const { from, to, userId, teamId, managerId } = filters;
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['dashboard', from, to, userId, teamId, managerId],

        // Single API source
        queryFn: ({ signal }) => dashboardService.fetchDashboard(filters, signal),
        staleTime: 30000, // 30 seconds stale time
        gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
        refetchOnWindowFocus: true,
        refetchInterval: 60000,   // Poll every 60 seconds (prev 4s was hammering backend)
        retry: 1,

        // Smooth transitions
        placeholderData: (previousData) => previousData,

        // Only fetch if core date range is available
        enabled: !!from && !!to
    });
};
