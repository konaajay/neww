import { useState, useEffect } from 'react';
import managerService from '../../../services/managerService';
import paymentService from '../../../services/paymentService';
import { toast } from 'react-toastify';

export const useDashboardData = (filters) => {
    const [data, setData] = useState({
        stats: null,
        performance: [],
        teamTree: null,
        trend: [],
        callStats: null,
        summary: null
    });
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [statsRes, perfRes, treeRes, trendRes, callRes, summaryRes] = await managerService.fetchDashboardData(filters);
            let stats = statsRes.data;
            let summary = summaryRes.data;

            // Revenue Sync Overdrive: Recalculate from payment ledger
            try {
                const historyRes = await paymentService.fetchHistory('MANAGER', {
                    startDate: filters.from,
                    endDate: filters.to,
                    userId: filters.userId
                });
                const payments = historyRes.data || [];
                const calculatedRevenue = payments
                    .filter(p => ['PAID', 'SUCCESS', 'APPROVED'].includes(p.status))
                    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                if (stats) {
                    stats.totalRevenue = Math.max(stats.totalRevenue || 0, calculatedRevenue);
                    stats.monthlyRevenue = Math.max(stats.monthlyRevenue || 0, calculatedRevenue);
                }
                if (summary?.revenue) {
                    summary.revenue.monthly = Math.max(summary.revenue.monthly || 0, calculatedRevenue);
                }
            } catch (err) {
                console.warn('Hook revenue recalculation failed');
            }

            setData({
                stats,
                performance: perfRes.data,
                teamTree: treeRes.data,
                trend: trendRes.data,
                callStats: callRes.data?.data || callRes.data,
                summary
            });
        } catch (err) {
            toast.error('Dashboard synchronization failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [filters.from, filters.to, filters.userId]);

    return { ...data, loading, reload: load };
};
