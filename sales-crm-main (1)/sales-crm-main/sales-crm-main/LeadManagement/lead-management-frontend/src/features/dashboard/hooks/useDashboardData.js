import { useQuery, useQueryClient } from '@tanstack/react-query';
import dashboardService from '../../../services/dashboardService';

/**
 * useDashboardData - CORE FIX
 * Single source of truth for all dashboard metrics.
 * Eliminates service-layer duplication and ensures consistent caching.
 */
export const useDashboardData = (filters) => {
    // 1. Destructure for stable query key tracking
    const { from, to, userId, teamId, managerId } = filters;
    const queryClient = useQueryClient();

    return useQuery({
        // Stable query key ensures request deduplication across different components
        queryKey: ['dashboard', from, to, userId, teamId, managerId],
        
        // Single API source
        queryFn: ({ signal }) => dashboardService.fetchDashboard(filters, signal),
        
        // Performance optimizations
        staleTime: 5 * 60 * 1000, // 5 minutes cache
        gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
        refetchOnWindowFocus: false,
        retry: 1,
        
        // Smooth transitions
        placeholderData: (previousData) => previousData,
        
        // Only fetch if core date range is available
        enabled: !!from && !!to
    });
};
