import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Search
} from 'lucide-react';
import { toast } from 'react-toastify';

// Centralized Feature Hooks
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { useLeads } from '../features/leads/hooks/useLeads';
import { useLookupData } from '../features/users/hooks/useLookupData';

// Modular Services
import userApi from '../features/users/api/userApi';
import leadsApi from '../features/leads/api/leadsApi';

// UI Components
import DashboardLayout from '../components/layout/DashboardLayout';
import LeadTable from '../components/LeadTable';
import TaskBoard from '../components/TaskBoard';
import PaymentHistory from '../components/PaymentHistory';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import LeadModal from './dashboard/components/LeadModal';
import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import FiltersBar from './dashboard/components/FiltersBar';
import ManagerProfile from './dashboard/components/ManagerProfile';
import AttendanceDashboard from './dashboard/components/AttendanceDashboard';
import { StatSkeleton } from './dashboard/components/DashboardSkeletons';

const AssociateDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const theme = isDarkMode ? 'dark' : 'light';

  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);

  // 1. STABLE FILTERS (Core fix to prevent API spam)
  const [filters, setFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: user?.id
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
    recordCallOutcome
  } = useLeads(debouncedFilters, 'ASSOCIATE');

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
  }, [queryClient]);

  const handleTabChange = (tab) => {
    if (tab === 'ingestion') {
      setIsIngestionModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleAddLead = async (leadData) => {
    try {
      await leadsApi.addLead('ASSOCIATE', leadData);
      toast.success('Lead initialized in registry');
      handleSync();
      return true;
    } catch (err) {
      return false;
    }
  };

  // 4. MEMOIZED UI DATA
  const stats = dashboardData?.stats || {};
  const performance = dashboardData?.performance || [];
  
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
      <div className="animate-fade-in d-flex flex-column gap-4">
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
              <MetricCommandCenter
                stats={stats}
                role="ASSOCIATE"
                filters={debouncedFilters}
                onNavigate={handleTabChange}
                leads={leads}
              />
            )}
          </div>
        )}

        {activeTab === 'leads' && (
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
                onRecordCallOutcome={(leadId, data) => recordCallOutcome({ leadId, data })}
                role="ASSOCIATE"
                loading={leadsLoading}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'attendance' && <AttendanceDashboard />}

        {activeTab === 'tasks' && <TaskBoard leads={leads} theme={theme} onUpdateStatus={handleSync} userId={user?.id} />}
        {activeTab === 'payments' && <PaymentHistory role="ASSOCIATE" userId={user?.id} from={filters.from} to={filters.to} hideHeader={true} />}
        {activeTab === 'calls' && <CallLogDashboard userId={user?.id} filters={debouncedFilters} />}
      </div>
      <LeadModal isOpen={isIngestionModalOpen} onClose={() => setIsIngestionModalOpen(false)} onAddLead={handleAddLead} />
    </DashboardLayout>
  );
};

export default AssociateDashboard;
