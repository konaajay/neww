import React, { useState, useMemo, useCallback } from 'react';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Users, UserPlus, Search, ArrowLeft
} from 'lucide-react';
import { Card } from '../components/common/Components';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';

// Centralized Feature Hooks
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { useLeads } from '../features/leads/hooks/useLeads';
import { useLookupData } from '../features/users/hooks/useLookupData';

// Modular Services
import leadsApi from '../features/leads/api/leadsApi';

// UI Components
import DashboardLayout from '../components/layout/DashboardLayout';
import LeadTable from '../components/LeadTable';
import TaskBoard from '../components/TaskBoard';
import PaymentHistory from '../components/PaymentHistory';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import TeamManagement from './dashboard/components/TeamManagement';
import TargetDistributionHub from './dashboard/components/TargetDistributionHub';
import LeadModal from './dashboard/components/LeadModal';
import InvoiceModal from './dashboard/components/InvoiceModal';
import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import paymentService from '../services/paymentService';
import FiltersBar from './dashboard/components/FiltersBar';
import AttendanceDashboard from './dashboard/components/AttendanceDashboard';
import { StatSkeleton, ChartSkeleton } from './dashboard/components/DashboardSkeletons';

const RevenueTrendChart = React.lazy(() => import('./dashboard/components/RevenueTrendChart'));
const LeadStatusPieChart = React.lazy(() => import('./dashboard/components/LeadStatusPieChart'));

const TeamLeaderDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const theme = isDarkMode ? 'dark' : 'light';

  // UI State
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('tl_active_tab') || 'my-stats');
  const [myDashboardSubTab, setMyDashboardSubTab] = useState('dashboard');
  const [taskFilter, setTaskFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [bulkAssignTlId, setBulkAssignTlId] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);

  // 1. STABLE FILTERS (Core fix to prevent API spam)
  const [filters, setFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: null,
    teamId: user?.id
  });

  const stableFilters = useMemo(() => ({
    from: filters.from,
    to: filters.to,
    userId: filters.userId,
    teamId: filters.teamId
  }), [filters.from, filters.to, filters.userId, filters.teamId]);

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
    assignLead,
    recordCallOutcome,
    selectedLeadIds,
    toggleSelection,
    bulkAssignLeads
  } = useLeads(debouncedFilters, 'TEAM_LEADER');

  const {
    subordinates, roles, offices, shifts
  } = useLookupData('TEAM_LEADER');

  // 3. HANDLERS
  const handleSync = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }, [queryClient]);

  const handleTabChange = (tab, extra = {}) => {
    if (tab === 'ingestion') {
      setIsIngestionModalOpen(true);
      return;
    }
    setActiveTab(tab);
    localStorage.setItem('tl_active_tab', tab);
    
    if (tab === 'tasks' && extra.filter) {
      setTaskFilter(extra.filter);
    } else if (tab !== 'tasks') {
      setTaskFilter('ALL');
    }

    if (tab === 'my-stats') {
      setFilters(prev => ({ ...prev, userId: user?.id, teamId: null }));
    } else if (tab === 'overview') {
      setFilters(prev => ({ ...prev, userId: null, teamId: user?.id }));
    } else if (tab === 'users') {
      setFilters(prev => ({ ...prev, userId: null, teamId: user?.id }));
    }
  };

  const handleAddLead = async (leadData) => {
    try {
      await leadsApi.addLead('TEAM_LEADER', leadData);
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
        toast.info('No payment records found for this lead');
      }
    } catch (err) {
      toast.error('Failed to retrieve invoice payload');
    }
  };

  const stats = dashboardData?.stats || {};
  const performance = dashboardData?.performance || [];
  const trend = dashboardData?.trend || [];
  const statusDistribution = dashboardData?.statusDistribution || {};

  // 4. MEMOIZED UI DATA
  const statsWithPerf = useMemo(() => ({ ...stats, performance }), [stats, performance]);
  const membersList = useMemo(() => subordinates || [], [subordinates]);

  const filteredLeads = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return leads.filter(l => {
      const status = l.status?.toUpperCase();
      
      // Status filtering logic
      if (statusFilter) {
        if (statusFilter === 'Converted') {
          return ['CONVERTED', 'PAID', 'SUCCESS', 'EMI', 'PRE_PAYMENT', 'PRE-PAYMENT'].includes(status);
        } else if (statusFilter === 'Follow Up') {
          return !['NEW', 'WORKING', 'CONVERTED', 'PAID', 'SUCCESS', 'EMI', 'PRE_PAYMENT', 'PRE-PAYMENT', 'LOST', 'REJECTED', 'DEAD', 'NOT_INTERESTED'].includes(status);
        } else if (statusFilter === 'New') {
          return ['NEW', 'WORKING'].includes(status);
        } else if (statusFilter === 'Lost') {
          return ['LOST', 'REJECTED', 'DEAD', 'NOT_INTERESTED'].includes(status);
        }
      }

      const termMatch = !term ||
        l.name?.toLowerCase().includes(term) || 
        l.email?.toLowerCase().includes(term) || 
        l.mobile?.includes(term);
      
      const leadDate = new Date(l.createdAt);
      const fromDate = new Date(filters.from);
      const toDate = new Date(filters.to + 'T23:59:59');
      const dateMatch = (leadDate >= fromDate && leadDate <= toDate);
      
      return termMatch && dateMatch;
    });
  }, [leads, searchTerm, filters.from, filters.to, statusFilter]);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} role="TEAM_LEADER">
      <div className="dashboard-content-wrapper w-100 h-100 animate-fade-in d-flex flex-column gap-3">
        {activeTab !== 'ingestion' && (
          <FiltersBar
            filters={filters}
            onChange={setFilters}
            onSync={handleSync}
            role="TEAM_LEADER"
            currentUserId={user?.id}
            hideUserFilter={activeTab === 'my-stats'}
          />
        )}

        {activeTab === 'my-stats' && (
          <div className="d-flex flex-column gap-3 animate-fade-in">
            <div className="d-flex gap-2 p-1 bg-surface bg-opacity-10 rounded-pill border border-white border-opacity-5 overflow-auto custom-scroll flex-nowrap mb-2 shadow-sm">
              {[
                { id: 'dashboard', label: 'Home', icon: '📊' },
                { id: 'leads', label: 'Individual Leads', icon: '👥' },
                { id: 'tasks', label: 'Pending Tasks', icon: '📋' },
                { id: 'attendance', label: 'Attendance', icon: '🕒' },
                { id: 'revenue', label: 'Revenue Trans.', icon: '💰' },
                { id: 'calls', label: 'Telephony Logs', icon: '📞' },
                { id: 'reports', label: 'Performance', icon: '📈' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMyDashboardSubTab(tab.id)}
                  className={`flex-grow-1 px-4 py-2 rounded-pill border-0 white-space-nowrap transition-all d-flex align-items-center gap-2 ${myDashboardSubTab === tab.id ? 'bg-primary text-white shadow-glow fw-black' : 'bg-transparent text-muted fw-bold'}`}
                  style={{ fontSize: '10px' }}
                >
                  <span>{tab.icon}</span>
                  <span className="text-uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>

            {myDashboardSubTab === 'dashboard' && (
              <>
                {dashboardLoading ? <StatSkeleton /> : (
                  <MetricCommandCenter
                    stats={statsWithPerf}
                    role={filters.userId ? 'ASSOCIATE' : 'TEAM_LEADER'}
                    filters={debouncedFilters}
                    onNavigate={handleTabChange}
                    leads={leads}
                    hideUsers={true}
                  />
                )}
              </>
            )}

            {myDashboardSubTab === 'leads' && (
              <div className="premium-card overflow-hidden shadow-lg border-0">
                <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                  <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Personal Pipeline</h5>
                  <div className="d-flex align-items-center gap-2">
                    <div className="position-relative">
                      <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                      <input
                        placeholder="Search my leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control bg-surface border-white border-opacity-10 py-2 ps-5 rounded-pill"
                        style={{ fontSize: '11px', width: '200px' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  <LeadTable
                    leads={leads.filter(l => l.assignedToId === user?.id || (!l.assignedToId && l.createdById === user?.id))}
                    onUpdateLead={(id, data) => updateLead({ id, data })}
                    handleAssignLead={(leadId, targetId) => assignLead({ leadId, targetId })}
                    onRecordCallOutcome={(leadId, data) => recordCallOutcome({ leadId, data })}
                    onViewInvoice={handleViewInvoice}
                    role="TEAM_LEADER"
                    loading={leadsLoading}
                    teamLeaders={membersList}
                  />
                </div>
              </div>
            )}

            {myDashboardSubTab === 'tasks' && (
              <TaskBoard 
                leads={leads.filter(l => l.assignedToId === user?.id)} 
                theme={theme} 
                onUpdateStatus={handleSync} 
                userId={user?.id} 
                startDate={filters.from} 
                endDate={filters.to} 
                initialFilter={taskFilter}
              />
            )}

            {myDashboardSubTab === 'revenue' && <PaymentHistory role="TEAM_LEADER" userId={filters.userId || user?.id} from={filters.from} to={filters.to} hideHeader={true} />}
            {myDashboardSubTab === 'calls' && <CallLogDashboard userId={user?.id} hideHeader={true} filters={debouncedFilters} />}
            {myDashboardSubTab === 'attendance' && <AttendanceDashboard filters={filters} role="ASSOCIATE" currentUserId={user?.id} hideHeader={true} />}
            {myDashboardSubTab === 'reports' && <CallLogDashboard userId={user?.id} filters={debouncedFilters} hideHeader={true} />}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            {dashboardLoading ? <StatSkeleton /> : (
              <MetricCommandCenter stats={stats} role={filters.userId ? 'ASSOCIATE' : 'TEAM_LEADER'} filters={debouncedFilters} onNavigate={handleTabChange} leads={leads} />
            )}
            <div className="row g-4 animate-fade-in">
              <div className="col-12 col-xl-8">
                <Card title="Team Performance Trend">
                  <div className="py-3" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <RevenueTrendChart data={trend} theme={theme} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
              <div className="col-12 col-xl-4">
                <Card title="Team Lead Distribution">
                  <div className="py-2" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <LeadStatusPieChart distribution={statusDistribution} leads={leads} isDarkMode={theme === 'dark'} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && <AttendanceDashboard filters={debouncedFilters} role="TEAM_LEADER" />}

        {activeTab === 'leads' && (
          <div className="d-flex flex-column gap-3">
            <div className="row g-3 mb-2 animate-fade-in">
               {[
                { label: 'New', value: ((statusDistribution.NEW || 0) + (statusDistribution.WORKING || 0)), color: 'primary', icon: '✨' },
                { label: 'Follow Up', value: (Object.entries(statusDistribution || {}).reduce((acc, [k, v]) => {
                  if (!['NEW', 'WORKING', 'CONVERTED', 'PAID', 'SUCCESS', 'EMI', 'PRE_PAYMENT', 'PRE-PAYMENT', 'LOST', 'REJECTED', 'DEAD', 'NOT_INTERESTED'].includes(k.toUpperCase())) return acc + v;
                  return acc;
                }, 0)), color: 'info', icon: '⏳' },
                { label: 'Converted', value: ((statusDistribution.CONVERTED || 0) + (statusDistribution.PAID || 0) + (statusDistribution.SUCCESS || 0) + (statusDistribution.EMI || 0) + (statusDistribution.PRE_PAYMENT || 0) + (statusDistribution['PRE-PAYMENT'] || 0)), color: 'success', icon: '✅' },
                { label: 'Lost', value: ((statusDistribution.LOST || 0) + (statusDistribution.REJECTED || 0) + (statusDistribution.DEAD || 0) + (statusDistribution.NOT_INTERESTED || 0)), color: 'danger', icon: '❌' }
              ].map((card, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div 
                    className={`premium-card p-3 border shadow-sm d-flex flex-column gap-1 transition-smooth ${statusFilter === card.label ? 'border-primary bg-primary bg-opacity-10' : 'border-main border-opacity-10'}`} 
                    style={{ 
                      borderRadius: '20px', 
                      background: statusFilter === card.label ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-card)',
                      backdropFilter: 'var(--glass-blur)',
                      cursor: 'pointer'
                    }}
                    onClick={() => setStatusFilter(statusFilter === card.label ? null : card.label)}
                  >
                    <h4 className="mb-0 fw-black text-main" style={{ fontSize: '24px', lineHeight: 1 }}>{card.value}</h4>
                    <small className="text-muted fw-black text-uppercase tracking-widest opacity-60" style={{ fontSize: '8px' }}>{card.label}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="premium-card overflow-hidden shadow-lg border-0">
              <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Team Registry Pool</h5>
                <div className="d-flex align-items-center gap-2">
                  <div className="position-relative">
                    <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                    <input
                      placeholder="Search team leads..."
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
                    handleAssignLead={(leadId, assocId) => assignLead({ leadId, targetId: assocId })}
                    onRecordCallOutcome={(leadId, data) => recordCallOutcome({ leadId, data })}
                    onViewInvoice={handleViewInvoice}
                    teamLeaders={membersList}
                    role="TEAM_LEADER"
                    loading={leadsLoading}
                    selectedLeadIds={selectedLeadIds}
                    toggleSelection={toggleSelection}
                    bulkAssignTlId={bulkAssignTlId}
                    setBulkAssignTlId={setBulkAssignTlId}
                    handleBulkAssign={(targetId) => bulkAssignLeads({ leadIds: selectedLeadIds, targetId })}
                    currentUserId={user?.id}
                  />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <TaskBoard 
            leads={leads} 
            theme={theme} 
            onUpdateStatus={handleSync} 
            userId={filters.userId} 
            teamId={user?.id}
            startDate={filters.from} 
            endDate={filters.to} 
            initialFilter={taskFilter}
          />
        )}
        {activeTab === 'payments' && <PaymentHistory role="TEAM_LEADER" teamId={filters.userId ? null : user?.id} userId={filters.userId || null} from={filters.from} to={filters.to} hideHeader={true} />}
        {activeTab === 'calls' && <CallLogDashboard userId={user?.id} filters={debouncedFilters} hideHeader={true} />}
        {activeTab === 'reports' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <div className="row g-4">
              <div className="col-12 col-xl-8">
                <Card title="Team Performance Trend">
                  <div className="py-3" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <RevenueTrendChart data={trend} theme={theme} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
              <div className="col-12 col-xl-4">
                <Card title="Team Pipeline Map">
                  <div className="py-2" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <LeadStatusPieChart distribution={statusDistribution} leads={leads} isDarkMode={theme === 'dark'} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'strategy' && (
          <TargetDistributionHub 
            subordinates={subordinates} 
            onSync={handleSync} 
          />
        )}
        
        {activeTab === 'users' && (
          <TeamManagement
            teamLeaders={subordinates}
            roles={roles}
            offices={offices}
            shifts={shifts}
            permissions={[]}
            handleCreateUser={() => {}}
            handleDeleteUser={() => {}}
            handleUpdateUser={() => {}}
            handleEditUser={() => {}}
            handleAssignSupervisor={() => {}}
            handleSync={handleSync}
            canAdd={false}
          />
        )}
        
        <LeadModal isOpen={isIngestionModalOpen} onClose={() => setIsIngestionModalOpen(false)} onAddLead={handleAddLead} onSuccess={handleSync} associates={membersList} />
        <InvoiceModal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} invoiceData={selectedInvoice} />
      </div>
    </DashboardLayout>
  );
};

export default TeamLeaderDashboard;
