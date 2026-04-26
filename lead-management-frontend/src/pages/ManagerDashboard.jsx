import React, { useState, useEffect, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import { Button, Card, Input, Table } from '../components/common/Components';
import {
  Users,
  UserPlus,
  IndianRupee,
  ShieldHalf,
  BarChart3,
  TrendingUp,
  Zap,
  Phone,
  LayoutDashboard,
  ClipboardList,
  GitBranch,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  CreditCard,
  FileText,
  Search
} from 'lucide-react';
import { toast } from 'react-toastify';

// Internal Hooks & Services
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { useLeads } from './dashboard/hooks/useLeads';
import managerService from '../services/managerService';

// Modular Components
import ManagerDashboardFilterHub from './dashboard/components/ManagerDashboardFilterHub';
import LeadTable from '../components/LeadTable';
import TeamTree from './dashboard/components/TeamTree';
import TeamManagement from './dashboard/components/TeamManagement';
import UserEditModal from './dashboard/components/UserEditModal';
import PaymentHistory from '../components/PaymentHistory';
import StatCard from '../components/StatCard';
import DashboardLayout from '../components/layout/DashboardLayout';
import AttendanceDashboard from '../components/pages/AttendanceDashboard';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import CallAnalyticsGrid from './dashboard/components/CallAnalyticsGrid';
import InvoiceModal from './dashboard/components/InvoiceModal';
import paymentService from '../services/paymentService';
import TaskBoard from '../components/TaskBoard';
import LeadForm from '../components/LeadForm';
import LeadModal from './dashboard/components/LeadModal';
import FiltersBar from './dashboard/components/FiltersBar';

import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import TicketManager from '../components/TicketManager';
import ManagerProfile from './dashboard/components/ManagerProfile';
import LeadEditPage from './dashboard/components/LeadEditPage';
import authService from '../services/authService';
import { StatSkeleton, ChartSkeleton } from './dashboard/components/DashboardSkeletons';

const RevenueTrendChart = React.lazy(() => import('./dashboard/components/RevenueTrendChart'));
const LeadStatusPieChart = React.lazy(() => import('./dashboard/components/LeadStatusPieChart'));

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';
  const [activeTab, setActiveTab] = useState(localStorage.getItem('mgr_activeTab') || 'overview');
  const [myDashboardSubTab, setMyDashboardSubTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [bulkAssignTlId, setBulkAssignTlId] = useState('');
  const [personalStats, setPersonalStats] = useState(null);
  const [callStats, setCallStats] = useState(null);
  const [manager, setManager] = useState(null);
  const [overviewDataType, setOverviewDataType] = useState('Leads');

  const overviewModes = [
    { id: 'Leads', label: 'Leads' },
    { id: 'Calls', label: 'Calls' },
    { id: 'Payments', label: 'Payments' },
    { id: 'Follow Ups', label: 'Follow Ups' },
    { id: 'Raised Tickets', label: 'Raised Tickets' }
  ];


  // Invoice state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);

  const [filters, setFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: null,
    teamId: user?.id,
    currentUserId: user?.id
  });

  const debouncedFilters = useDebounce(filters, 400);

  // High-performance data synchronization via React Query
  const {
    stats,
    performance,
    teamTree,
    trend,
    loading: dashboardLoading,
    reload: syncDashboard
  } = useDashboardData(debouncedFilters, 'MANAGER');
  const {
    leads,
    loadLeads,
    selectedLeadIds,
    setSelectedLeadIds,
    toggleSelection,
    handleAssignLead,
    handleBulkAssign,
    handleUpdateLead
  } = useLeads();

  // Secondary Data
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [availableOffices, setAvailableOffices] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState('ALL');

  const handleSync = () => {
    setRefreshTrigger(prev => prev + 1);
    syncDashboard();
    loadLeads();
  };

  const fetchLookupData = async () => {
    try {
      const [tlRes, rolesRes, permRes, shiftRes, profileRes, officesRes] = await Promise.all([
        managerService.fetchTeamLeaders(),
        managerService.fetchRoles(),
        managerService.fetchPermissions(),
        managerService.fetchShifts(),
        authService.getProfile(),
        managerService.fetchOffices()
      ]);
      const tlData = Array.isArray(tlRes.data) ? tlRes.data : (tlRes.data?.data || []);
      // Add current manager for self-assignment capability, ensuring no duplicates
      const selfManager = { id: user.id, name: `${user.name} (Self)`, role: user.role };
      const filteredTlData = tlData.filter(u => u.id !== user.id);
      setTeamLeaders([selfManager, ...filteredTlData]);

      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : (rolesRes.data?.data || []));
      setPermissions(Array.isArray(permRes.data) ? permRes.data : (permRes.data?.data || []));
      setShifts(Array.isArray(shiftRes.data) ? shiftRes.data : (shiftRes.data?.data || []));
      setAvailableOffices(Array.isArray(officesRes.data) ? officesRes.data : (officesRes.data?.data || []));
      setManager(profileRes.data?.supervisor || profileRes.data?.manager);

      // Fetch Call Stats
      const callRes = await managerService.fetchGlobalCallStats({
        from: debouncedFilters.from,
        to: debouncedFilters.to,
        userId: debouncedFilters.userId
      });
      setCallStats(callRes.data);
    } catch (err) {
      toast.error('Lookup data sync failed');
    }
  };


  // Recursive function to extract all users from the team tree hierarchy
  const flattenTeamTree = (data, userList = new Map()) => {
    if (!data) return Array.from(userList.values());

    // Handle case where data is an array (API returns [managerNode])
    if (Array.isArray(data)) {
      data.forEach(item => flattenTeamTree(item, userList));
      return Array.from(userList.values());
    }

    const node = data;

    // Add current node if it's a valid user (and not Admin)
    if (node.id && node.role !== 'ADMIN') {
      userList.set(node.id, {
        id: node.id,
        name: node.name,
        role: node.role,
        email: node.email,
        mobile: node.mobile
      });
    }

    // Process subordinates recursively
    if (Array.isArray(node.subordinates)) {
      node.subordinates.forEach(child => flattenTeamTree(child, userList));
    }

    return Array.from(userList.values());
  };

  // Synchronize the assignees list (teamLeaders state) with the full hierarchy tree
  useEffect(() => {
    if (teamTree) {
      console.log('>>> Syncing assignees from Team Tree...');
      const allUsers = flattenTeamTree(teamTree);

      // Ensure self (manager) is always present at the top
      const selfManager = { id: user.id, name: `${user.name} (Self)`, role: user.role };
      const others = allUsers.filter(u => u.id !== user.id);

      setTeamLeaders([selfManager, ...others]);
      console.log(`>>> Successfully synchronized ${allUsers.length} total squad members.`);
    }
  }, [teamTree, user?.id, user?.name, user?.role]);

  useEffect(() => {
    fetchLookupData();
  }, []);

  useEffect(() => {
    // Auto-scroll to top when drilling into a specific user's data
    if (filters.userId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [filters.userId]);
  const handleTabChange = (tab, extra = {}) => {
    if (tab === 'ingestion') {
      setIsIngestionModalOpen(true);
      return;
    }
    setActiveTab(tab);
    localStorage.setItem('mgr_activeTab', tab);

    if (tab === 'tasks') {
      setTaskFilter(extra.filter || 'ALL');
    }

    // Tab-based data scoping:
    // 'My Dashboard' forces the filter to show the manager's personal data.
    // Switching to any 'Team' tab (overview) resets this filter to show aggregated team data.
    if (tab === 'my-stats') {
      setFilters(prev => ({ ...prev, userId: user?.id, teamId: null }));
    } else if (tab === 'overview') {
      setFilters(prev => ({ ...prev, userId: null, teamId: user?.id }));
    }
  };

  const handleCreateUser = async (formData) => {
    try {
      await managerService.createUser(formData);
      toast.success('Account created successfully');
      fetchLookupData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Creation failed');
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Delete this account permanently?')) {
      try {
        await managerService.deleteUser(id);
        toast.success('Account deleted');
        fetchLookupData();
      } catch (err) {
        toast.error('Deletion failed');
      }
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await managerService.updateUser(editingUser.id, editingUser);
      toast.success('Profile updated');

      // Close first
      setIsEditModalOpen(false);

      // Delay refresh
      setTimeout(() => {
        fetchLookupData();
      }, 300);
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleAssignSupervisor = async (assocId, supId) => {
    try {
      await managerService.assignSupervisor(assocId, supId);
      toast.success('Relationship updated');
      fetchLookupData();
    } catch (err) {
      toast.error('Assignment failed');
    }
  };

  const handleAddLead = async (leadData) => {
    try {
      await managerService.addLead(leadData);
      toast.success('Lead added to nodal pipeline');
      loadLeads();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lead ingestion failed: Constraint violation');
      return false;
    }
  };

  const handleRecordCallOutcome = async (leadId, data) => {
    console.log('Manager recording outcome:', { leadId, data });
    try {
      const response = await managerService.recordCallOutcome(leadId, data);
      console.log('Outcome record success:', response);
      toast.success('Outcome synchronized');
      loadLeads();
      syncDashboard();
    } catch (err) {
      console.error('Outcome record failure:', err);
      toast.error('Sync failed: ' + (err?.response?.data?.message || 'Unknown error'));
    }
  };

  const handleSendPaymentLink = async (leadId, paymentData) => {
    try {
      const res = await managerService.sendPaymentLink(leadId, paymentData);
      if (res.data?.payment_url) {
        toast.success('Payment protocol initialized');
        loadLeads();
        return true;
      }
      return false;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transmission failed');
      return false;
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('PROTOCOL WARNING: This node will be purged from the registry. Proceed?')) return;
    try {
      await managerService.deleteLead(id);
      toast.success('Node Decommissioned');
      loadLeads();
    } catch (err) {
      toast.error('Purge failure');
    }
  };

  const handleViewInvoice = (lead) => {
    window.open(`/invoice/${lead.id}`, '_blank');
  };


  const allowedTargetIds = useMemo(() => {
    const primaryFilterId = filters.userId || filters.teamId;
    if (!primaryFilterId) return null;
    const targetId = parseInt(primaryFilterId);
    let ids = [targetId];

    const findNodeAndCollect = (nodes) => {
      for (const node of nodes) {
        if (node.id === targetId) {
          const collect = (n) => {
            if (!ids.includes(n.id)) ids.push(n.id);
            if (n.subordinates) n.subordinates.forEach(collect);
          };
          collect(node);
          return true;
        }
        if (node.subordinates && findNodeAndCollect(node.subordinates)) {
          return true;
        }
      }
      return false;
    };

    if (teamTree) {
      findNodeAndCollect(Array.isArray(teamTree) ? teamTree : [teamTree]);
    }
    return ids;
  }, [filters.userId, filters.teamId, teamTree]);

  const filteredLeadsList = leads.filter(l => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (l.name && l.name.toLowerCase().includes(term)) ||
      (l.mobile && l.mobile.includes(searchTerm)) ||
      (l.email && l.email.toLowerCase().includes(term)) ||
      (l.id && l.id.toString().includes(searchTerm));

    const matchesUnassigned = filterUnassigned ? !l.assignedToId : true;

    // Scope by Global Range Filter - Bypassed if searching or viewing unassigned
    const leadDate = new Date(l.createdAt);
    const fromDate = new Date(filters.from);
    const toDate = new Date(filters.to + 'T23:59:59');
    const matchesDate = (searchTerm || filterUnassigned) ? true : (leadDate >= fromDate && leadDate <= toDate);

    // Scope by Specific User (and their team)
    const matchesUser = allowedTargetIds ? (allowedTargetIds.includes(l.assignedToId) || (!l.assignedToId && allowedTargetIds.includes(l.createdById))) : true;

    return matchesSearch && matchesUnassigned && matchesDate && matchesUser;
  });

  const navbarExtras = null;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} role="MANAGER" navbarExtras={navbarExtras}>
      <div className="animate-fade-in d-flex flex-column gap-3">
        {/* PERSONAL HORIZONTAL NAVBAR - TOP PRIORITY */}
        {activeTab === 'my-stats' && (
          <div className="premium-card p-1 d-flex flex-wrap gap-1 border-white border-opacity-5 overflow-auto custom-scroll flex-nowrap shadow-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {[
              { id: 'dashboard', label: 'Home', icon: '📊' },
              { id: 'leads', label: 'Individual Leads', icon: '👥' },
              { id: 'tasks', label: 'Pending Tasks', icon: '📋' },
              { id: 'attendance', label: 'Attendance Logs', icon: '📆' },
              { id: 'revenue', label: 'Revenue Trans.', icon: '💰' },
              { id: 'calls', label: 'Telephony Logs', icon: '📞' },
              { id: 'reports', label: 'Performance', icon: '📈' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMyDashboardSubTab(tab.id)}
                className={`flex-grow-1 px-3 py-2 rounded-pill border-0 transition-all d-flex align-items-center justify-content-center gap-2 white-space-nowrap ${myDashboardSubTab === tab.id
                  ? 'bg-primary text-white shadow-glow fw-black'
                  : 'bg-transparent text-muted hover-bg-surface fw-bold'
                  }`}
                style={{ fontSize: '10px', minWidth: 'fit-content' }}
              >
                <span>{tab.icon}</span>
                <span className="text-uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>
        )}
        {/* GLOBAL RANGE FILTER */}
        {activeTab !== 'edit-lead' && activeTab !== 'ingestion' && activeTab !== 'users' && (
          <FiltersBar
            filters={filters}
            onChange={setFilters}
            onSync={handleSync}
            users={teamLeaders}
            role="MANAGER"
            currentUserId={user?.id}
            hideUserFilter={activeTab === 'my-stats'}
            modes={activeTab === 'overview' ? overviewModes : []}
            activeMode={overviewDataType}
            onModeChange={setOverviewDataType}
          />
        )}
        {activeTab === 'my-stats' && (
          <div className="d-flex flex-column gap-3 animate-fade-in">
            <div className="px-1 d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
              <div>
                <h5 className="fw-black text-main mb-1 text-uppercase tracking-widest small">Personal Command Center</h5>
                <p className="text-muted small fw-bold opacity-50 mb-0" style={{ fontSize: '9px' }}>VIEWING INDIVIDUAL OPERATIONAL PERFORMANCE</p>
              </div>
            </div>
              {myDashboardSubTab === 'dashboard' && (
                <>
                  <ManagerProfile manager={manager} />

                  {/* ROW 1: CRITICAL ACTIONS (3 CARDS) */}
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6 col-xl-4">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard
                        title="Task Overdue"
                        value={stats?.pendingFollowups || 0}
                        icon={<AlertCircle size={18} />}
                        color="danger"
                        onClick={() => setMyDashboardSubTab('tasks')}
                      />}
                    </div>
                    <div className="col-12 col-md-6 col-xl-4">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard
                        title="Payment Overdue"
                        value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.pendingPaymentsAmount || 0)}
                        icon={<IndianRupee size={18} />}
                        color="danger"
                        unit=""
                        onClick={() => setMyDashboardSubTab('revenue')}
                      />}
                    </div>
                    <div className="col-12 col-md-6 col-xl-4">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard
                        title="Today Task"
                        value={stats?.todayFollowups || 0}
                        icon={<ClipboardList size={18} />}
                        color="warning"
                        onClick={() => setMyDashboardSubTab('tasks')}
                      />}
                    </div>
                  </div>

                  <div className="mb-4"></div>

                  {/* CONVERSION VELOCITY TREND (PERSONAL) */}
                  <div className="row g-4 mb-4">
                    <div className="col-12">
                      <div className="premium-card overflow-hidden shadow-lg border-0 h-100">
                        <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                          <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Conversion Velocity</h6>
                          <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INDIVIDUAL TREND ANALYTICS</p>
                        </div>
                        <div className="card-body p-4" style={{ height: '400px' }}>
                          {dashboardLoading ? <ChartSkeleton /> : (
                            <React.Suspense fallback={<ChartSkeleton />}>
                              <RevenueTrendChart data={trend} theme={isDarkMode ? 'dark' : 'light'} />
                            </React.Suspense>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {myDashboardSubTab === 'leads' && (
                <div className="premium-card overflow-hidden shadow-lg animate-fade-in">
                  <LeadTable
                    leads={(leads || []).filter(l =>
                      l && (l.assignedToId === user?.id || (!l.assignedToId && l.createdById === user?.id)) &&
                      new Date(l.createdAt) >= new Date(filters.from) &&
                      new Date(l.createdAt) <= new Date(filters.to + 'T23:59:59')
                    )}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterUnassigned={false}
                    setFilterUnassigned={setFilterUnassigned}
                    selectedLeadIds={[]}
                    toggleSelection={() => { }}
                    toggleSelectAll={() => { }}
                    bulkAssignTlId={''}
                    setBulkAssignTlId={() => { }}
                    handleBulkAssign={() => { }}
                    handleAssignLead={handleAssignLead}
                    onUpdateLead={handleUpdateLead}
                    onRecordCallOutcome={handleRecordCallOutcome}
                    onSendPaymentLink={handleSendPaymentLink}
                    onViewInvoice={handleViewInvoice}
                    teamLeaders={teamLeaders}
                    role={user?.role}
                    hideFilters={true}
                  />
                </div>
              )}

              {myDashboardSubTab === 'attendance' && (
                <div className="animate-fade-in">
                  <AttendanceDashboard
                    role="MANAGER"
                    userId={user.id}
                    teamId={user.id}
                    teamTree={teamTree}
                    startDate={filters.from}
                    endDate={filters.to}
                    refreshTrigger={refreshTrigger}
                    hideFilters={true}
                  />
                </div>
              )}

              {myDashboardSubTab === 'tasks' && (
                <div className="animate-fade-in">
                  <TaskBoard
                    leads={(leads || []).filter(l =>
                      l && (l.assignedToId === user?.id || (!l.assignedToId && l.createdById === user?.id)) &&
                      new Date(l.createdAt) >= new Date(filters.from) &&
                      new Date(l.createdAt) <= new Date(filters.to + 'T23:59:59')
                    )}
                    theme={theme}
                    onUpdateStatus={() => loadLeads()}
                    fetchLeads={loadLeads}
                    userId={user?.id}
                    hideFilters={true}
                    startDate={filters.from}
                    endDate={filters.to}
                    refreshTrigger={refreshTrigger}
                  />
                </div>
              )}

              {myDashboardSubTab === 'revenue' && <PaymentHistory role="MANAGER" userId={user?.id} from={filters.from} to={filters.to} hideHeader={true} refreshTrigger={refreshTrigger} />}
              {myDashboardSubTab === 'calls' && <CallLogDashboard userId={user?.id} hideHeader={true} filters={filters} onChange={setFilters} refreshTrigger={refreshTrigger} />}
              {myDashboardSubTab === 'reports' && (
                <div className="d-flex flex-column gap-4 animate-fade-in pb-5">
                  {/* Personal Analytics Node */}
                  <div className="premium-card overflow-hidden shadow-lg border-0 h-100">
                    <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                      <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Performance Analytics</h6>
                      <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INDIVIDUAL CONVERSION TRENDS</p>
                    </div>
                    <div className="card-body p-4" style={{ height: '400px' }}>
                      <React.Suspense fallback={<ChartSkeleton />}>
                        <RevenueTrendChart data={trend} theme={theme} />
                      </React.Suspense>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-3">
            {overviewDataType === 'Leads' && (
              <>
                {/* Operational Overview (Synchronized with TL Dashboard) */}
                <div className="mb-2">
                  <MetricCommandCenter
                    stats={{
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
                    }}
                    role="MANAGER"
                    filters={filters}
                    onNavigate={setActiveTab}
                    leads={filteredLeadsList}
                  />
                </div>

                <div className="d-flex flex-column gap-3 animate-fade-in">
                  {/* Analytics Growth Row (Trend + Pie Chart) */}
                  <div className="row g-4">
                    <div className="col-12 col-xl-8">
                      <Card title="Strategic Performance Trend" subtitle="Sales Force Multiplier & Conversion Velocity" className="h-100">
                        <div className="py-3" style={{ height: '360px' }}>
                          <React.Suspense fallback={<ChartSkeleton />}>
                            <RevenueTrendChart data={trend} theme={theme} />
                          </React.Suspense>
                        </div>
                      </Card>
                    </div>
                    <div className="col-12 col-xl-4">
                      <Card title="Squad Pipeline Distribution" subtitle="Status Segmentation Analytics" className="h-100">
                        <div className="py-2" style={{ height: '360px' }}>
                          <React.Suspense fallback={<ChartSkeleton />}>
                            <LeadStatusPieChart distribution={stats?.statusDistribution} leads={filteredLeadsList} isDarkMode={isDarkMode} />
                          </React.Suspense>
                        </div>
                      </Card>
                    </div>
                  </div>
                  <div className="mb-4"></div>
                </div>
              </>
            )}

            {overviewDataType === 'Calls' && (
              <div className="animate-fade-in">
                <CallLogDashboard
                  filters={filters}
                  onChange={setFilters}
                  hideHeader={true}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            )}

            {overviewDataType === 'Payments' && (
              <div className="animate-fade-in">
                <PaymentHistory
                  role="MANAGER"
                  userId={filters.userId}
                  teamId={filters.teamId}
                  from={filters.from}
                  to={filters.to}
                  hideHeader={true}
                  hideFilters={true}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            )}

            {overviewDataType === 'Follow Ups' && (
              <div className="animate-fade-in">
                <TaskBoard
                  leads={filteredLeadsList}
                  theme={theme}
                  onUpdateStatus={() => loadLeads()}
                  fetchLeads={loadLeads}
                  userId={filters.userId}
                  hideFilters={true}
                  startDate={filters.from}
                  endDate={filters.to}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            )}

            {overviewDataType === 'Raised Tickets' && (
              <div className="animate-fade-in">
                <TicketManager role="MANAGER" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'hierarchy' && (
          <div className="animate-fade-in row">
            <div className="col-12">
              <TeamTree
                data={teamTree}
                onFocus={(id) => setFilters({ ...filters, userId: id })}
                currentFocusId={filters.userId}
                onAddUser={() => setActiveTab('users')}
              />
            </div>
          </div>
        )}

            {activeTab === 'pipeline' && (
              <div className="animate-fade-in d-flex flex-column gap-3">

                <div className="row g-3 px-1 mt-1">
                  {/* ... status cards ... */}
                  <div className="col-12 col-md-3">
                    <StatCard
                      title="Call Back"
                      value={filteredLeadsList.filter(l => l.status === 'CALL_BACK').length}
                      sub="Awaiting Registry Response"
                      icon={<Phone size={18} />}
                      color="warning"
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <StatCard
                      title="Converted"
                      value={filteredLeadsList.filter(l => ['CONVERTED', 'PAID', 'EMI', 'SUCCESS'].includes(l.status)).length}
                      sub="Successful Transmissions"
                      icon={<CheckCircle size={18} />}
                      color="success"
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <StatCard
                      title="Follow-up"
                      value={filteredLeadsList.filter(l => l.status === 'FOLLOW_UP').length}
                      sub="Active Operational Nodes"
                      icon={<Clock size={18} />}
                      color="info"
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <StatCard
                      title="Lost"
                      value={filteredLeadsList.filter(l => ['LOST', 'NOT_INTERESTED', 'PAYMENT_FAILED'].includes(l.status)).length}
                      sub="Off-Pitch Terminations"
                      icon={<AlertCircle size={18} />}
                      color="danger"
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-12">
                    <div className="premium-card overflow-hidden animate-fade-in shadow-lg h-100 mt-2">
                      <div className="card-header bg-transparent p-4 border-0 d-flex justify-content-between align-items-center border-bottom border-white border-opacity-5">
                        <div>
                          <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Global Pipeline Ledger</h5>
                          <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>IDENTIFICATION & ASSIGNMENT NODE</p>
                        </div>
                        <div className="d-flex align-items-center gap-3 flex-grow-1 justify-content-center px-4">
                          <div className="position-relative w-100" style={{ maxWidth: '400px' }}>
                            <div className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted opacity-50">
                              <Search size={14} />
                            </div>
                            <input
                              placeholder="Search leads..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="form-control bg-surface bg-opacity-50 border border-white border-opacity-10 text-main py-2 ps-5 shadow-none rounded-pill focus:border-primary transition-all"
                              style={{ fontSize: '12px' }}
                            />
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="ui-btn ui-btn-outline btn-sm px-4 rounded-pill border-primary border-opacity-30 fw-black"
                            style={{ fontSize: '10px' }}
                            onClick={() => setIsIngestionModalOpen(true)}
                          >
                            ADD NEW LEAD
                          </button>
                        </div>
                      </div>
                      <LeadTable
                        leads={filteredLeadsList}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filterUnassigned={filterUnassigned}
                        setFilterUnassigned={setFilterUnassigned}
                        selectedLeadIds={selectedLeadIds}
                        toggleSelection={toggleSelection}
                        toggleSelectAll={() => setSelectedLeadIds(selectedLeadIds.length === filteredLeadsList.length ? [] : filteredLeadsList.map(l => l.id))}
                        bulkAssignTlId={bulkAssignTlId}
                        setBulkAssignTlId={setBulkAssignTlId}
                        handleBulkAssign={handleBulkAssign}
                        handleAssignLead={handleAssignLead}
                        onUpdateLead={handleUpdateLead}
                        onEdit={(lead) => {
                          setEditingLead(lead);
                          setActiveTab('edit-lead');
                        }}
                        onRecordCallOutcome={handleRecordCallOutcome}
                        onSendPaymentLink={handleSendPaymentLink}
                        onViewInvoice={handleViewInvoice}
                        teamLeaders={teamLeaders}
                        role={user?.role}
                        hideFilters={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'users' && (
              <div className="animate-fade-in mb-4">
                <TeamManagement
                  teamLeaders={teamLeaders}
                  roles={roles}
                  permissions={permissions}
                  offices={availableOffices}
                  shifts={shifts}
                  handleCreateUser={handleCreateUser}
                  handleDeleteUser={handleDeleteUser}
                  handleEditUser={(u) => {
                    // Deep clone for stability
                    setEditingUser(JSON.parse(JSON.stringify(u)));
                    setIsEditModalOpen(true);
                  }}
                  handleAssignSupervisor={handleAssignSupervisor}
                  setSelectedPerfUserId={(id) => setFilters({ ...filters, userId: id })}
                  setActiveTab={setActiveTab}
                />
              </div>
            )}

            {activeTab === 'attendance-logs' && (
              <div className="animate-fade-in d-flex flex-column gap-3">
                <AttendanceDashboard
                  role="MANAGER"
                  userId={filters.userId}
                  teamId={filters.teamId}
                  teamTree={teamTree}
                  startDate={filters.from.split('T')[0]}
                  endDate={filters.to.split('T')[0]}
                  refreshTrigger={refreshTrigger}
                  hideFilters={true}
                />
              </div>
            )}

            {activeTab === 'call-logs' && (
              <CallLogDashboard
                filters={filters}
                onChange={setFilters}
                hideHeader={true}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'tasks' && (
              <div className="animate-fade-in d-flex flex-column gap-3">
                <TaskBoard
                  leads={leads}
                  theme={theme}
                  onUpdateStatus={() => loadLeads()}
                  fetchLeads={loadLeads}
                  userId={filters.userId}
                  hideFilters={true}
                  startDate={filters.from}
                  endDate={filters.to}
                  initialFilter={taskFilter}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="d-flex flex-column gap-3 animate-fade-in">
                <PaymentHistory
                  role="MANAGER"
                  userId={filters.userId}
                  from={filters.from}
                  to={filters.to}
                  hideHeader={true}
                  hideFilters={true}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="d-flex flex-column gap-4 animate-fade-in pb-5">
                {/* High-Level Performance Matrix */}
                <div>
                  <h5 className="fw-black text-main text-uppercase tracking-widest small mb-4">Branch Performance Matrix</h5>
                  <MetricCommandCenter stats={stats} onNavigate={setActiveTab} leads={filteredLeadsList} />
                </div>

                {/* Conversational Analytics Node */}
                <div className="row g-4">
                  <div className="col-12">
                    <Card title="Market Engagement History" subtitle="Transactional Velocity Analysis">
                      <div className="py-2" style={{ height: '400px' }}>
                        <React.Suspense fallback={<ChartSkeleton />}>
                          <RevenueTrendChart data={trend} theme={theme} />
                        </React.Suspense>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="mt-4 animate-fade-in">
                  <h5 className="fw-black text-main text-uppercase tracking-widest small mb-4 ms-2">Telephony Interaction Grid</h5>
                  <CallAnalyticsGrid stats={callStats} isDarkMode={isDarkMode} />
                </div>

                {/* Operational Summary Grid */}
                {/* Operational Summary Grid Removed */}
              </div>
            )}


            {activeTab === 'tickets' && (
              <div className="animate-fade-in">
                <TicketManager role="MANAGER" />
              </div>
            )}

            {activeTab === 'edit-lead' && (
              <LeadEditPage
                lead={editingLead}
                users={teamLeaders.concat(user)}
                role={user?.role}
                onCancel={() => {
                  setEditingLead(null);
                  setActiveTab('pipeline');
                }}
                onSendPaymentLink={handleSendPaymentLink}
                onSave={async (data) => {
                  const success = await handleUpdateLead(editingLead.id, data);
                  if (success) {
                    setEditingLead(null);
                    setActiveTab('pipeline');
                  }
                }}
              />
            )}
          </div>

      {isEditModalOpen && (
        <UserEditModal
          key={editingUser?.id}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={editingUser}
          setUser={setEditingUser}
          onSubmit={handleUpdateUser}
          roles={roles}
          permissions={permissions}
          teamLeaders={teamLeaders}
          shifts={shifts}
          offices={availableOffices}
        />
      )}

      <InvoiceModal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} invoiceData={selectedInvoiceData} />

      <LeadModal
        isOpen={isIngestionModalOpen}
        onClose={() => setIsIngestionModalOpen(false)}
        onAddLead={handleAddLead}
        onSuccess={loadLeads}
        associates={teamLeaders}
      />
    </DashboardLayout>
  );
};

export default ManagerDashboard;
