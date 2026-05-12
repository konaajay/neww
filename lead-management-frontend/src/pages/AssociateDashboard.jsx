import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Search
} from 'lucide-react';
import { Card } from '../components/common/Components';
import { toast } from 'react-toastify';

// Centralized Feature Hooks
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { useLeads } from '../features/leads/hooks/useLeads';
import { useTasks } from '../features/leads/hooks/useTasks';
import { useLookupData } from '../features/users/hooks/useLookupData';

// Modular Services
import userApi from '../features/users/api/userApi';
import leadsApi from '../features/leads/api/leadsApi';
import paymentService from '../services/paymentService';
import InvoiceModal from './dashboard/components/InvoiceModal';

// UI Components
import DashboardLayout from '../components/layout/DashboardLayout';
import LeadTable from '../components/LeadTable';
import TaskBoard from '../components/TaskBoard';
import PaymentHistory from '../components/PaymentHistory';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import LeadModal from './dashboard/components/LeadModal';
import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import TodayTaskList from './dashboard/components/TodayTaskList';
import FiltersBar from './dashboard/components/FiltersBar';
import ManagerProfile from './dashboard/components/ManagerProfile';
import AttendanceDashboard from './dashboard/components/AttendanceDashboard';
import { StatSkeleton, ChartSkeleton } from './dashboard/components/DashboardSkeletons';

const RevenueTrendChart = React.lazy(() => import('./dashboard/components/RevenueTrendChart'));
const LeadStatusPieChart = React.lazy(() => import('./dashboard/components/LeadStatusPieChart'));

const AssociateDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const theme = isDarkMode ? 'dark' : 'light';

  // UI State
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('associate_active_tab') || 'overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // 1. STABLE FILTERS (Core fix to prevent API spam)
  const [filters, setFilters] = useState(() => {
    const d = new Date();
    const f = new Date(d.getFullYear(), d.getMonth(), 1);
    const l = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const fmt = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    return {
      from: fmt(f),
      to: fmt(l),
      userId: user?.id
    };
  });

  const stableFilters = useMemo(() => ({
    from: filters.from,
    to: filters.to,
    userId: user?.id
  }), [filters.from, filters.to, user?.id]);

  const debouncedFilters = useDebounce(stableFilters, 400);

  // 2. DATA HOOKS (Single source of truth)
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading 
  } = useDashboardData(debouncedFilters);

  const {
    leads, 
    loading: leadsLoading,
    updateLead,
    updateStatus,
    recordCallOutcome
  } = useLeads(debouncedFilters, 'ASSOCIATE');
  
  const { tasks, loading: tasksLoading } = useTasks(debouncedFilters);

  // Profile hook for manager info
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile(),
    staleTime: 10 * 60 * 1000
  });

  const manager = profile?.supervisor || profile?.manager;

  // 3. HANDLERS
  const handleSync = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }, [queryClient]);

  const handleTabChange = (tab, extra = {}) => {
    if (tab === 'ingestion') {
      setIsIngestionModalOpen(true);
      return;
    }
    
    // If we have extra filters (like from/to from a metric card click), apply them
    if (extra && (extra.from || extra.to)) {
      setFilters(prev => ({
        ...prev,
        from: extra.from || prev.from,
        to: extra.to || prev.to
      }));
    }
    
    setActiveTab(tab);
    localStorage.setItem('associate_active_tab', tab);
  };

  const handleAddLead = async (leadData) => {
    try {
      await leadsApi.addLead('ASSOCIATE', leadData);
      toast.success('Lead initialized in registry');
      handleSync();
      return true;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to initialize lead';
      toast.error(errorMessage);
      return false;
    }
  };

  const handleViewInvoice = async (lead) => {
    try {
      const res = await paymentService.fetchInvoiceByLead(lead.id);
      if (res.data) {
        setSelectedInvoice(res.data);
      } else {
        toast.info('No invoice found for this lead');
      }
    } catch (err) {
      toast.error('Could not get invoice');
    }
  };

  // 4. MEMOIZED UI DATA
  const stats = dashboardData?.stats || {};
  const trend = dashboardData?.trend || [];
  const performance = dashboardData?.performance || [];
  const statusDistribution = dashboardData?.statusDistribution || {};
  
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(l => 
      l.name?.toLowerCase().includes(term) || 
      l.email?.toLowerCase().includes(term) || 
      l.mobile?.includes(term)
    );
  }, [leads, searchTerm]);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} role="ASSOCIATE">
      <div className="dashboard-content-wrapper w-100 animate-fade-in d-flex flex-column gap-3">
        {activeTab !== 'ingestion' && (
          <FiltersBar
            filters={filters}
            onChange={setFilters}
            onSync={handleSync}
            role="ASSOCIATE"
            currentUserId={user?.id}
            hideUserFilter={true}
          />
        )}

        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <ManagerProfile manager={manager} />
            {dashboardLoading ? <StatSkeleton /> : (
              <div className="row g-4 align-items-start">
                <div className="col-12 col-xl-6">
                  <MetricCommandCenter
                    stats={stats}
                    role="ASSOCIATE"
                    filters={debouncedFilters}
                    onNavigate={handleTabChange}
                    leads={leads}
                    vertical={true}
                  />
                </div>
                <div className="col-12 col-xl-6">
                  <TodayTaskList 
                    leads={leads} 
                    tasks={tasks}
                    theme={theme} 
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="d-flex flex-column gap-3">
            <div className="row g-3 mb-2 animate-fade-in">
              {[
                { label: 'Call Back', value: ((stats.statusDistribution?.CALL_BACK || 0) + (stats.statusDistribution?.CALLBACK || 0)), color: 'warning', icon: '📞' },
                { label: 'Follow Up', value: ((stats.statusDistribution?.FOLLOW_UP || 0) + (stats.statusDistribution?.FOLLOWUP || 0)), color: 'info', icon: '⏳' },
                { label: 'Converted', value: ((stats.statusDistribution?.CONVERTED || 0) + (stats.statusDistribution?.PAID || 0) + (stats.statusDistribution?.SUCCESS || 0) + (stats.statusDistribution?.EMI || 0)), color: 'success', icon: '✅' },
                { label: 'Lost', value: ((stats.statusDistribution?.LOST || 0) + (stats.statusDistribution?.REJECTED || 0)), color: 'danger', icon: '❌' }
              ].map((card, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div 
                    className="premium-card p-3 border border-main border-opacity-10 shadow-sm d-flex flex-column gap-1 transition-smooth" 
                    style={{ 
                      borderRadius: '20px', 
                      background: 'var(--bg-card)',
                      backdropFilter: 'var(--glass-blur)'
                    }}
                  >
                    <h4 className="mb-0 fw-black text-main" style={{ fontSize: '24px', lineHeight: 1 }}>{card.value}</h4>
                    <small className="text-muted fw-black text-uppercase tracking-widest opacity-60" style={{ fontSize: '8px' }}>{card.label}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="premium-card overflow-hidden shadow-lg border-0">
              <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Individual Lead Pool</h5>
                <div className="d-flex align-items-center gap-2">
                  <div className="position-relative">
                    <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                    <input
                      placeholder="Search leads..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-control bg-surface border-white border-opacity-10 py-2 ps-5 rounded-pill"
                      style={{ fontSize: '11px', width: '200px' }}
                    />
                  </div>
                  <button className="ui-btn ui-btn-primary btn-sm px-4 rounded-pill" onClick={() => setIsIngestionModalOpen(true)}>Add Lead</button>
                </div>
              </div>
              <div className="card-body p-0">
                <LeadTable
                  leads={filteredLeads}
                  onUpdateLead={(id, data) => updateLead({ id, data })}
                  onUpdateStatus={(id, status, note, extra) => updateStatus(id, status, note, extra)}
                  onRecordCallOutcome={(leadId, data) => recordCallOutcome({ leadId, data })}
                  onViewInvoice={handleViewInvoice}
                  role="ASSOCIATE"
                  loading={leadsLoading}
                />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'attendance' && <AttendanceDashboard filters={filters} role="ASSOCIATE" />}
        {activeTab === 'tasks' && <TaskBoard leads={leads} theme={theme} onUpdateStatus={handleSync} userId={user?.id} startDate={filters.from} endDate={filters.to} />}
        {activeTab === 'payments' && <PaymentHistory role="ASSOCIATE" userId={user?.id} from={filters.from} to={filters.to} hideHeader={true} />}
        {activeTab === 'calls' && <CallLogDashboard userId={user?.id} filters={debouncedFilters} hideHeader={true} />}
        
        {activeTab === 'reports' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <div className="row g-4">
              <div className="col-12 col-xl-8">
                <Card title="Individual Performance Trend">
                  <div className="py-3" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <RevenueTrendChart data={trend} theme={theme} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
              <div className="col-12 col-xl-4">
                <Card title="My Pipeline Status">
                  <div className="py-2" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <LeadStatusPieChart distribution={statusDistribution} leads={leads} isDarkMode={isDarkMode} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        <LeadModal isOpen={isIngestionModalOpen} onClose={() => setIsIngestionModalOpen(false)} onAddLead={handleAddLead} />
        <InvoiceModal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} invoiceData={selectedInvoice} />
      </div>
    </DashboardLayout>
  );
};

export default AssociateDashboard;
