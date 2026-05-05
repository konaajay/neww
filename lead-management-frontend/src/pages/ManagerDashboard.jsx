import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, Input, Table } from '../components/common/Components';
import {
  Users, UserPlus, IndianRupee, ShieldHalf, BarChart3, TrendingUp, Zap, Phone,
  LayoutDashboard, ClipboardList, GitBranch, Upload, CheckCircle, Clock,
  AlertCircle, ChevronDown, CreditCard, FileText, Search
} from 'lucide-react';
import { toast } from 'react-toastify';

import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { useLeads } from '../features/leads/hooks/useLeads';
import { useLookupData } from '../features/users/hooks/useLookupData';
import userApi from '../features/users/api/userApi';
import leadsApi from '../features/leads/api/leadsApi';
import paymentService from '../services/paymentService';

import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/StatCard';
import LeadTable from '../components/LeadTable';
import LeadForm from '../components/LeadForm';
import TicketManager from '../components/TicketManager';
import TaskBoard from '../components/TaskBoard';
import PaymentHistory from '../components/PaymentHistory';
import TeamTree from './dashboard/components/TeamTree';
import TeamManagement from './dashboard/components/TeamManagement';
import UserEditModal from './dashboard/components/UserEditModal';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import CallAnalyticsGrid from './dashboard/components/CallAnalyticsGrid';
import InvoiceModal from './dashboard/components/InvoiceModal';
import LeadModal from './dashboard/components/LeadModal';
import FiltersBar from './dashboard/components/FiltersBar';
import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import ManagerProfile from './dashboard/components/ManagerProfile';
import LeadEditPage from './dashboard/components/LeadEditPage';
import AttendanceDashboard from './dashboard/components/AttendanceDashboard';
import { StatSkeleton, ChartSkeleton } from './dashboard/components/DashboardSkeletons';

const RevenueTrendChart = React.lazy(() => import('./dashboard/components/RevenueTrendChart'));
const LeadStatusPieChart = React.lazy(() => import('./dashboard/components/LeadStatusPieChart'));

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('mgr_activeTab') || 'overview';
  });
  const [myDashboardSubTab, setMyDashboardSubTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [overviewDataType, setOverviewDataType] = useState('Leads');
  const [editingUser, setEditingUser] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [bulkAssignTlId, setBulkAssignTlId] = useState('');

  // 1. Stable Filters
  const [filterState, setFilterState] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: null,
    teamId: null,
    managerId: user?.id
  });

  const stableFilters = useMemo(() => ({
    ...filterState,
    currentUserId: user?.id
  }), [filterState, user?.id]);

  const debouncedFilters = useDebounce(stableFilters, 400);

  // 2. Data Hooks
  const { 
    data: dashboardData, isLoading: dashboardLoading, refetch: refreshDashboard
  } = useDashboardData(debouncedFilters);

  const {
    leads, loading: leadsLoading, refetch: refreshLeads,
    updateLead, updateStatus, assignLead, deleteLead, recordCallOutcome,
    selectedLeadIds, toggleSelection, bulkAssignLeads
  } = useLeads(debouncedFilters, 'MANAGER');

  const {
    teamLeaders, subordinates, roles, permissions, teamTree, pipelineStages, loading: lookupLoading
  } = useLookupData('MANAGER');

  // 3. Handlers
  const handleSync = useCallback(() => {
    refreshDashboard();
    refreshLeads();
  }, [refreshDashboard, refreshLeads]);

  // 4. Effects (Lookup is now handled by useLookupData)

  // 5. Memoized Values
  const findInTree = useCallback((nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.subordinates) {
        const found = findInTree(node.subordinates, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const allowedTargetIds = useMemo(() => {
    const primaryFilterId = filterState.userId || filterState.teamId;
    if (!primaryFilterId) return null;
    const targetId = parseInt(primaryFilterId);
    let ids = [targetId];
    
    if (filterState.teamId && !filterState.userId && teamTree) {
      const tl = findInTree(Array.isArray(teamTree) ? teamTree : [teamTree], targetId);
      if (tl && tl.subordinates) {
        const collect = (nodes) => {
          nodes.forEach(n => {
            ids.push(n.id);
            if (n.subordinates) collect(n.subordinates);
          });
        };
        collect(tl.subordinates);
      }
    }
    return ids;
  }, [filterState.userId, filterState.teamId, teamTree, findInTree]);

  const filteredLeads = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (leads || []).filter(l => {
      const matchesSearch = !term ||
        l.name?.toLowerCase().includes(term) ||
        l.mobile?.includes(searchTerm) ||
        l.email?.toLowerCase().includes(term) ||
        l.id?.toString().includes(searchTerm);
      const matchesUnassigned = filterUnassigned ? !l.assignedToId : true;
      const leadDate = new Date(l.createdAt);
      const fromDate = new Date(filterState.from);
      const toDate = new Date(filterState.to + 'T23:59:59');
      const matchesDate = (leadDate >= fromDate && leadDate <= toDate);
      const matchesUser = allowedTargetIds ? (allowedTargetIds.includes(l.assignedToId) || (!l.assignedToId && allowedTargetIds.includes(l.createdById))) : true;
      return matchesSearch && matchesUnassigned && matchesDate && matchesUser;
    });
  }, [leads, searchTerm, filterUnassigned, filterState.from, filterState.to, allowedTargetIds]);

  const stats = dashboardData?.stats || {};
  const trend = dashboardData?.trend || [];
  const performance = dashboardData?.performance || [];
  const statusDistribution = dashboardData?.statusDistribution || {};

  const statsWithPerf = useMemo(() => ({
    ...stats,
    performance,
    presentCount: stats?.presentCount || 0,
    absentCount: stats?.absentCount || 0,
    lateCount: stats?.lateCount || 0,
    monthlyRevenue: stats?.monthlyRevenue || 0,
    monthlyTarget: stats?.monthlyTarget || 0,
    targetAchievement: stats?.targetAchievement || 0,
    todayFollowups: stats?.todayFollowups || 0,
    pendingFollowups: stats?.pendingFollowups || 0
  }), [stats, performance]);

  const personalFilters = useMemo(() => ({ ...filterState, userId: user?.id, teamId: null }), [filterState, user?.id]);
  const personalStats = useMemo(() => ({ ...stats, performance: performance?.filter(p => p.userId === user?.id) || [] }), [stats, performance, user?.id]);

  const handleTabChange = (tab, extra = {}) => {
    if (tab === 'ingestion') {
      setIsIngestionModalOpen(true);
      return;
    }
    setActiveTab(tab);
    localStorage.setItem('mgr_activeTab', tab);
    if (tab === 'tasks') setTaskFilter(extra.filter || 'ALL');
    if (tab === 'my-stats') {
      setFilterState(prev => ({ ...prev, userId: user?.id, teamId: null, managerId: user?.id }));
    } else if (tab === 'overview') {
      setFilterState(prev => ({ ...prev, userId: null, teamId: null, managerId: user?.id }));
    }
  };

  const handleRecordCallOutcome = async (leadId, data) => {
    await recordCallOutcome({ leadId, data });
  };

  const handleSendPaymentLink = async (leadId, paymentData) => {
    try {
      await leadsApi.sendPaymentLink(leadId, paymentData);
      toast.success('Payment protocol initialized');
      refreshLeads();
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('PROTOCOL WARNING: Purge record?')) return;
    await deleteLead(id);
  };

  const handleCreateUser = async (formData) => {
    try {
      await userApi.createUser('MANAGER', formData);
      toast.success('Account provisioned successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Creation failed');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('SECURITY WARNING: Permanently delete this account?')) return;
    try {
      await userApi.deleteUser('MANAGER', id);
      toast.success('User account decommissioned');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deletion protocol failure');
    }
  };

  const handleAssignSupervisor = async (assocId, supId) => {
    try {
      await userApi.assignSupervisor('MANAGER', assocId, supId);
      toast.success('Direct reporting relationship synchronized');
    } catch (err) {
      toast.error('Hierarchy update failed');
    }
  };

  const handleAddLead = async (data) => {
    try {
      await leadsApi.addLead('MANAGER', data);
      toast.success('Lead initialized in registry');
      handleSync();
      return true;
    } catch (err) {
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

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} role="MANAGER">
      <div className="animate-fade-in d-flex flex-column gap-3">
        {activeTab !== 'edit-lead' && activeTab !== 'ingestion' && activeTab !== 'users' && (
          <FiltersBar
            filters={filterState}
            onChange={setFilterState}
            onSync={handleSync}
            users={teamLeaders}
            role="MANAGER"
            currentUserId={user?.id}
            hideUserFilter={activeTab === 'my-stats'}
            activeMode={overviewDataType}
            onModeChange={setOverviewDataType}
          />
        )}
        {activeTab === 'my-stats' && (
          <div className="d-flex flex-column gap-3 animate-fade-in">
            <div className="d-flex gap-2 p-1 bg-surface bg-opacity-10 rounded-pill border border-white border-opacity-5 overflow-auto custom-scroll flex-nowrap mb-2 shadow-sm">
              {[
                { id: 'dashboard', label: 'Home', icon: '📊' },
                { id: 'leads', label: 'Individual Leads', icon: '👥' },
                { id: 'tasks', label: 'Pending Tasks', icon: '📋' },
                { id: 'revenue', label: 'Revenue Trans.', icon: '💰' },
                { id: 'calls', label: 'Telephony Logs', icon: '📞' },
                { id: 'reports', label: 'Performance', icon: '📈' },
                { id: 'attendance', label: 'Attendance', icon: '📅' },
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
                <ManagerProfile manager={null} />
                {dashboardLoading && !stats ? <StatSkeleton /> : (
                  <MetricCommandCenter
                    stats={personalStats}
                    role="MANAGER"
                    filters={personalFilters}
                    onNavigate={handleTabChange}
                    leads={leads}
                  />
                )}
              </>
            )}
            {myDashboardSubTab === 'leads' && (
              <div className="premium-card overflow-hidden shadow-lg border-0">
                <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                  <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Individual Pipeline</h5>
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
                    onUpdateStatus={updateStatus}
                    onRecordCallOutcome={handleRecordCallOutcome}
                    onSendPaymentLink={handleSendPaymentLink}
                    onViewInvoice={handleViewInvoice}
                    teamLeaders={subordinates}
                    role="MANAGER"
                    loadLeads={refreshLeads}
                    loading={leadsLoading}
                    pipelineStages={pipelineStages}
                  />
                </div>
              </div>
            )}
            {myDashboardSubTab === 'tasks' && (
              <TaskBoard 
                leads={leads.filter(l => l.assignedToId === user?.id)} 
                theme={theme} 
                onUpdateStatus={refreshLeads} 
                fetchLeads={refreshLeads} 
                userId={user?.id} 
                startDate={filterState.from} 
                endDate={filterState.to} 
                initialFilter={taskFilter}
              />
            )}
            {myDashboardSubTab === 'revenue' && <PaymentHistory role="MANAGER" userId={user?.id} managerId={null} from={filterState.from} to={filterState.to} hideHeader={true} />}
            {myDashboardSubTab === 'calls' && <CallLogDashboard userId={user?.id} hideHeader={true} filters={filterState} onChange={setFilterState} />}
            {myDashboardSubTab === 'attendance' && <AttendanceDashboard filters={{ ...filterState, userId: user?.id }} role="MANAGER" />}
            {myDashboardSubTab === 'reports' && (
              <div className="row g-4 animate-fade-in">
                <div className="col-12 col-xl-8">
                  <Card title="Individual Performance Trend" className="h-100">
                    <div className="py-3" style={{ height: '360px' }}>
                      <React.Suspense fallback={<ChartSkeleton />}>
                        <RevenueTrendChart data={trend} theme={theme} />
                      </React.Suspense>
                    </div>
                  </Card>
                </div>
                <div className="col-12 col-xl-4">
                  <Card title="Pipeline Distribution" className="h-100">
                    <div className="py-2" style={{ height: '360px' }}>
                      <React.Suspense fallback={<ChartSkeleton />}>
                        <LeadStatusPieChart distribution={stats?.statusDistribution} leads={leads.filter(l => l.assignedToId === user?.id)} isDarkMode={isDarkMode} />
                      </React.Suspense>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-3 animate-fade-in">
            {dashboardLoading && !stats ? <StatSkeleton /> : (
              <MetricCommandCenter
                stats={statsWithPerf}
                role="MANAGER"
                filters={filterState}
                onNavigate={handleTabChange}
                leads={filteredLeads}
              />
            )}
            <div className="row g-4 animate-fade-in">
              <div className="col-12 col-xl-8">
                <Card title="Strategic Performance Trend" className="h-100">
                  <div className="py-3" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <RevenueTrendChart data={trend} theme={theme} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
              <div className="col-12 col-xl-4">
                <Card title="Squad Pipeline Distribution" className="h-100">
                  <div className="py-2" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <LeadStatusPieChart distribution={stats?.statusDistribution} leads={filteredLeads} isDarkMode={isDarkMode} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'leads' && (
          <div className="d-flex flex-column gap-3">
            <div className="row g-3 mb-2 animate-fade-in">
              {[
                { label: 'Call Back', value: (stats.statusDistribution?.CALL_BACK || 0), color: 'warning', icon: '📞' },
                { label: 'Follow Up', value: (stats.statusDistribution?.FOLLOW_UP || 0), color: 'info', icon: '⏳' },
                { label: 'Converted', value: (stats.statusDistribution?.CONVERTED || stats.statusDistribution?.PAID || 0), color: 'success', icon: '✅' },
                { label: 'Lost', value: (stats.statusDistribution?.LOST || 0), color: 'danger', icon: '❌' }
              ].map((card, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="premium-card p-3 border border-white border-opacity-10 shadow-sm d-flex align-items-center gap-3" style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.02)' }}>
                    <div className={`p-2 rounded-3 bg-${card.color} bg-opacity-10 text-${card.color}`}>
                      <span style={{ fontSize: '18px' }}>{card.icon}</span>
                    </div>
                    <div>
                      <h4 className="mb-0 fw-black text-main">{card.value}</h4>
                      <small className="text-muted fw-bold text-uppercase tracking-widest" style={{ fontSize: '8px' }}>{card.label}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="premium-card overflow-hidden shadow-lg border-0">
              <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Squad Lead pool</h5>
                <div className="d-flex align-items-center gap-2">
                  <div className="position-relative">
                    <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                    <input
                      placeholder="Search squad leads..."
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
                  onUpdateStatus={updateStatus}
                  handleAssignLead={(leadId, targetId) => assignLead({ leadId, targetId: targetId || 0 })}
                  onRecordCallOutcome={(leadId, data) => recordCallOutcome({ leadId, data })}
                  onViewInvoice={handleViewInvoice}
                  onEdit={(lead) => navigate(`/leads/${lead.id}/edit`)}
                  loading={leadsLoading}
                  teamLeaders={subordinates}
                  role="MANAGER"
                  pipelineStages={pipelineStages}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'payments' && <PaymentHistory role="MANAGER" managerId={filterState.userId ? null : user?.id} userId={filterState.userId || null} teamId={filterState.teamId || null} from={filterState.from} to={filterState.to} hideHeader={true} />}
        {activeTab === 'calls' && <CallLogDashboard userId={filterState.userId} filters={debouncedFilters} hideHeader={true} />}
        {activeTab === 'attendance' && <AttendanceDashboard filters={debouncedFilters} role="MANAGER" />}
        {activeTab === 'tasks' && (
          <div className="animate-fade-in">
            <TaskBoard 
              leads={leads} 
              theme={theme} 
              onUpdateStatus={handleSync} 
              loadLeads={handleSync}
              managerId={user?.id}
              teamId={filterState.teamId}
              userId={filterState.userId}
              startDate={filterState.from} 
              endDate={filterState.to} 
              initialFilter="ALL"
            />
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <div className="row g-4">
              <div className="col-12 col-xl-8">
                <Card title="Revenue & Pipeline Trend">
                  <div className="py-3" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <RevenueTrendChart data={trend} theme={theme} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
              <div className="col-12 col-xl-4">
                <Card title="Pipeline Status Map">
                  <div className="py-2" style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <LeadStatusPieChart distribution={statusDistribution} leads={filteredLeads} isDarkMode={isDarkMode} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
            </div>
            <CallAnalyticsGrid filters={debouncedFilters} hideHeader={true} isDarkMode={isDarkMode} />
          </div>
        )}
        
        {/* Modals moved inside the main wrapping div */}
        <LeadModal isOpen={isIngestionModalOpen} onClose={() => setIsIngestionModalOpen(false)} onAddLead={handleAddLead} onSuccess={handleSync} associates={teamLeaders} />
        <InvoiceModal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} invoiceData={selectedInvoice} />
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
