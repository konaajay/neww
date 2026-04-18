import { useState, useEffect, useRef } from 'react';
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
    const loadIdRef = useRef(0);

    const load = async () => {
        const currentLoadId = ++loadIdRef.current;
        setLoading(true);
        // Clear data to prevent stale view during transitions
        setData(prev => ({ ...prev, stats: null, trend: [] }));
        try {
            const [statsRes, perfRes, treeRes, trendRes, callRes, summaryRes] = await managerService.fetchDashboardData(filters);
            
            if (currentLoadId !== loadIdRef.current) return;

            let stats = statsRes.data;
            let summary = summaryRes.data;

            // Revenue Sync Overdrive: Recalculate from both payment ledger and lead pipeline
            try {
                // 1. Calculate from Payment Ledger
                const historyRes = await paymentService.fetchHistory('MANAGER', {
                    startDate: filters.from,
                    endDate: filters.to,
                    userId: filters.userId
                });
                const payments = historyRes.data || [];
                const paymentRevenue = payments
                    .filter(p => ['PAID', 'SUCCESS', 'APPROVED'].includes(p.status))
                    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                // 2. Fetch leads once (General or Scoped)
                const leadsRes = await managerService.fetchLeads(filters);
                let allLeads = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.content || []);
                
                // --- UNIVERSAL SCOPING LOGIC ---
                const isPersonalView = filters.userId && filters.userId !== 'null' && filters.userId !== 'all';
                const leads = isPersonalView 
                    ? allLeads.filter(l => (l.assignedToId === filters.userId || l.assignedTo?.id === filters.userId))
                    : allLeads;

                const leadStatusRevenue = leads
                    .filter(l => ['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(l.status))
                    .reduce((sum, l) => sum + (parseFloat(l.totalAmount || l.amount || 499) || 0), 0);

                const calculatedRevenue = Math.max(paymentRevenue, leadStatusRevenue);

                // 3. Recalculate Follow-up metrics in real-time
                const now = new Date();
                const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

                const realTimeTodayFollowUps = leads.filter(l => {
                    if (!l.followUpDate) return false;
                    const d = new Date(l.followUpDate);
                    return d >= now && d < startOfTomorrow;
                }).length;

                const realTimePending = leads.filter(l => {
                    if (['PAID', 'CONVERTED', 'LOST'].includes(l.status)) return false;
                    if (!l.followUpDate) return false;
                    const d = new Date(l.followUpDate);
                    return d < now;
                }).length;

                const realTimeConverted = leads.filter(l => 
                    ['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(l.status)
                ).length;

                // 4. Aggressive Team Aggregation: Extract counts from the Team Tree
                const flattenTeamTree = (node, userList = new Map()) => {
                    if (!node) return [];
                    if (node.id) {
                        userList.set(node.id, {
                            id: node.id,
                            role: node.role || 'ASSOCIATE',
                            name: node.name || 'Staff',
                            attendanceStatus: node.attendanceStatus || 'ABSENT',
                            isPresent: node.attendanceStatus === 'PRESENT' || node.isPresent || false
                        });
                    }
                    if (Array.isArray(node.subordinates)) {
                        node.subordinates.forEach(child => flattenTeamTree(child, userList));
                    }
                    if (Array.isArray(node.managedAssociates)) {
                        node.managedAssociates.forEach(child => flattenTeamTree(child, userList));
                    }
                    return Array.from(userList.values());
                };

                const squad = (Array.isArray(treeRes.data) ? treeRes.data : [treeRes.data])
                    .reduce((acc, root) => {
                        const members = flattenTeamTree(root);
                        members.forEach(m => acc.set(m.id, m));
                        return acc;
                    }, new Map());
                
                const squadList = Array.from(squad.values());
                
                // Calculate Staff based on Scope
                let userBreakdown, totalUsers, presentCount;
                if (isPersonalView) {
                    const targetUser = squadList.find(u => u.id === filters.userId);
                    totalUsers = 1;
                    presentCount = (targetUser?.isPresent || targetUser?.attendanceStatus === 'PRESENT') ? 1 : 0;
                    userBreakdown = {
                        [targetUser?.role || 'ASSOCIATE']: 1
                    };
                } else {
                    userBreakdown = {
                        ADMIN: squadList.filter(u => u.role === 'ADMIN').length,
                        MANAGER: squadList.filter(u => u.role === 'MANAGER').length,
                        TEAM_LEADER: squadList.filter(u => u.role === 'TEAM_LEADER').length,
                        ASSOCIATE: squadList.filter(u => u.role === 'ASSOCIATE' || u.role === 'USER').length
                    };
                    totalUsers = squadList.length;
                    presentCount = squadList.filter(u => u.isPresent || u.attendanceStatus === 'PRESENT').length;
                }

                if (stats) {
                    stats.totalRevenue = Math.max(stats.totalRevenue || 0, calculatedRevenue);
                    stats.monthlyRevenue = Math.max(stats.monthlyRevenue || 0, calculatedRevenue);
                    stats.todayFollowups = realTimeTodayFollowUps;
                    stats.pendingFollowups = realTimePending;
                    stats.convertedCount = Math.max(stats.convertedCount || 0, realTimeConverted);
                    
                    // Inject Context-Aware Matrix
                    stats.totalUsers = totalUsers;
                    stats.userBreakdown = userBreakdown;
                    stats.presentCount = presentCount;
                    stats.absentCount = Math.max(0, totalUsers - presentCount);
                    stats.totalNodes = leads.length;
                }
                if (summary?.revenue) {
                    summary.revenue.monthly = Math.max(summary.revenue.monthly || 0, calculatedRevenue);
                }
            } catch (err) {
                console.warn('Hook revenue recalculation failed');
            }

            if (currentLoadId !== loadIdRef.current) return;

            setData({
                stats,
                performance: perfRes.data,
                teamTree: treeRes.data,
                trend: trendRes.data,
                callStats: callRes.data?.data || callRes.data,
                summary
            });
        } catch (err) {
            if (currentLoadId === loadIdRef.current) {
                toast.error('Dashboard synchronization failed');
            }
        } finally {
            if (currentLoadId === loadIdRef.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        load();
        return () => { loadIdRef.current++; }; // Invalidate on cleanup
    }, [filters.from, filters.to, filters.userId]);

    return { ...data, loading, reload: load };
};
