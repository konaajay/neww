import { useQuery } from '@tanstack/react-query';
import adminService from '../../../services/adminService';
import tlService from '../../../services/tlService';
import managerService from '../../../services/managerService';
import associateService from '../../../services/associateService';

const getService = (role) => {
    switch (role) {
        case 'ADMIN': return adminService;
        case 'TEAM_LEADER': return tlService;
        case 'MANAGER': return managerService;
        case 'ASSOCIATE':
        case 'ASSOCIATE_TEAM_LEAD': return associateService;
        default: return adminService;
    }
};

export const useDashboardData = (filters, role) => {
    const service = getService(role);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['dashboardSummary', filters],
        queryFn: () => {
            // Sanitize filters to avoid passing 'null' or redundant params
            const sanitizedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
                if (key === 'currentUserId') return acc; // Not expected by backend
                if (value !== null && value !== undefined && value !== '') {
                    acc[key] = value;
                }
                return acc;
            }, {});
            return service.fetchUnifiedDashboard(sanitizedFilters);
        },
        staleTime: 5 * 60 * 1000,
        select: (response) => response.data,
        enabled: !!filters.from && !!filters.to
    });

    return {
        stats: data?.stats,
        trend: data?.trend,
        performance: data?.performance,
        statusDistribution: data?.statusDistribution,
        loading: isLoading,
        error: isError,
        reload: refetch
    };
};
