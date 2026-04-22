import React, { useState, useEffect, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import ManagerProfile from './dashboard/components/ManagerProfile';
import ManagerDashboardFilterHub from './dashboard/components/ManagerDashboardFilterHub';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import adminService from '../services/adminService';
import PaymentHistory from '../components/PaymentHistory';
import StatCard from '../components/StatCard';
import LeadsTable from './dashboard/components/LeadsTable';
import TeamTree from './dashboard/components/TeamTree';
import TeamManagement from './dashboard/components/TeamManagement';
import FiltersBar from './dashboard/components/FiltersBar';
import DashboardLayout from '../components/layout/DashboardLayout';
import UserEditModal from './dashboard/components/UserEditModal';
import AttendanceDashboard from '../components/pages/AttendanceDashboard';
import AttendanceSettings from './dashboard/components/AttendanceSettings';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import CallAnalyticsGrid from './dashboard/components/CallAnalyticsGrid';
import InvoiceModal from './dashboard/components/InvoiceModal';
import paymentService from '../services/paymentService';
import LeadForm from '../components/LeadForm';
import TicketManager from '../components/TicketManager';
import LeadIngestionModal from './dashboard/components/LeadIngestionModal';
import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import LeadEditPage from './dashboard/components/LeadEditPage';
import TaskBoard from '../components/TaskBoard';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { StatSkeleton, ChartSkeleton } from './dashboard/components/DashboardSkeletons';

const RevenueTrendChart = React.lazy(() => import('./dashboard/components/RevenueTrendChart'));
const LeadStatusPieChart = React.lazy(() => import('./dashboard/components/LeadStatusPieChart'));
import { Button, Card, Input, Table } from '../components/common/Components';
import {
  UserPlus,
  Users,
  IndianRupee,
  Phone,
  Layers,
  Edit,
  Trash2,
  CheckCircle,
  TrendingUp,
  Power,
  Zap,
  Clock,
  AlertCircle,
  ShieldHalf,
  LifeBuoy,
  RefreshCw,
  Target,
  Calendar,
  Save
} from 'lucide-react';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [users, setUsers] = useState([]);
  const [loadingLookup, setLoadingLookup] = useState(true);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [availableOffices, setAvailableOffices] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [localSearch, setLocalSearch] = useState("");
  const [activeTab, setActiveTab] = useState('overview');
  const [myDashboardSubTab, setMyDashboardSubTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Tab-based data scoping: 
    // 'My Dashboard' forces personal scoping. Team tabs reset to global view.
    if (tab === 'my-stats') {
      setFilters(prev => ({ ...prev, userId: user?.id }));
    } else {
      setFilters(prev => ({ ...prev, userId: null }));
    }
  };
  const [callStats, setCallStats] = useState(null);
  const [teamTree, setTeamTree] = useState(null);

  // Pipeline state
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [bulkAssignTlId, setBulkAssignTlId] = useState('');

  // Invoice state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: null,
    teamId: null,
    currentUserId: user?.id
  });

  const debouncedFilters = useDebounce(filters, 400);

  // High-performance data synchronization via React Query
  const { 
    stats, 
    trend: trendData, 
    performance, 
    loading: dashboardLoading, 
    reload: syncDashboard 
  } = useDashboardData(debouncedFilters, 'ADMIN');
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [targetPeriod, setTargetPeriod] = useState({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear() 
  });
  const [revenueTargets, setRevenueTargets] = useState([]);
  const handleSync = () => setRefreshTrigger(prev => prev + 1);

  const fetchLookupData = async () => {
    setLoadingLookup(true);
    try {
      const [usersRes, permsRes, shiftsRes, officesRes, treeRes] = await Promise.all([
        adminService.fetchUsers(),
        adminService.fetchPermissions(),
        adminService.fetchShifts(),
        adminService.fetchOffices(),
        adminService.fetchTeamTree()
      ]);
      
      setUsers(usersRes.data?.content || usersRes.data || []);
      setAvailablePermissions(permsRes.data || []);
      setAvailableShifts(shiftsRes.data || []);
      setAvailableOffices(officesRes.data || []);
      setTeamTree(treeRes.data || null);
    } catch (err) {
      console.error("Lookup Sync Error:", err);
    } finally {
      setLoadingLookup(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const leadsRes = await adminService.fetchLeads(debouncedFilters);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.content || []));
      await syncDashboard();
      await fetchLookupData();
    } catch (err) {
      console.error("Global Data Sync Error:", err);
      toast.error("Failed to synchronize dashboard environment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [debouncedFilters, refreshTrigger]);

  useEffect(() => {
    const fetchTargets = async () => {
      const targetsRes = await adminService.fetchRevenueTargets(targetPeriod.month, targetPeriod.year);
      setRevenueTargets(targetsRes.data?.data || targetsRes.data || []);
    };
    fetchTargets();
  }, [refreshTrigger, targetPeriod]);

  const handleDeleteUser = async (id) => {
    if (window.confirm('Terminate this user access permanently?')) {
      try {
        await adminService.deleteUser(id);
        toast.success('User access revoked');
        fetchData();
      } catch (err) {
        toast.error('Deletion failed');
      }
    }
  };

  const handleEditUser = (u) => {
    setEditingUser({ ...u });
    // Deep clone to detach from parent list
    setEditingUser(JSON.parse(JSON.stringify(u)));
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateUser(editingUser.id, editingUser);
      toast.success('User profile updated');

      // Close first
      setIsEditModalOpen(false);

      // Delay refresh to prevent race conditions
      setTimeout(() => {
        fetchData();
      }, 300);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleAddLead = async (leadData) => {
    try {
      await adminService.addLead(leadData);
      toast.success('Lead initialized in global pool');
      fetchData();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lead transmission failed - duplicate entry or system error');
      return false;
    }
  };

  const handleUpdateLead = async (id, leadData) => {
    try {
      await adminService.updateLead(id, leadData);
      toast.success('Lead details updated successfully');
      fetchData();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lead update failed');
      return false;
    }
  };

  const handleCreateUser = async (formData) => {
    try {
      await adminService.createUser(formData);
      toast.success('Account provisioned successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Creation failed');
    }
  };

  const handleAssignLead = async (leadId, tlId) => {
    try {
      toast.info('Assigning lead...');
      await adminService.assignLead(leadId, tlId);
      toast.success('Lead assignment confirmed');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed - logic error');
    }
  };


  const handleAssignSupervisor = async (assocId, supId) => {
    try {
      await adminService.assignSupervisor(assocId, supId);
      toast.success('Direct reporting relationship synchronized');
      fetchData();
    } catch (err) {
      toast.error('Hierarchy update failed');
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignTlId || selectedLeadIds.length === 0) return;
    try {
      toast.info(`Provisioning ${selectedLeadIds.length} lead assignments...`);
      await adminService.bulkAssignLeads(selectedLeadIds, bulkAssignTlId);
      toast.success(`${selectedLeadIds.length} leads assigned successfully`);
      setSelectedLeadIds([]);
      fetchData();
    } catch (err) {
      toast.error('Bulk assignment failed - system error');
    }
  };


  const handleViewInvoice = async (lead) => {
    try {
      toast.info('Generating official invoice document...');
      const res = await paymentService.fetchInvoiceByLead(lead.id);
      setSelectedInvoiceData(res.data);
      setIsInvoiceModalOpen(true);
    } catch (err) {
      toast.error('Failed to retrieve invoice - no confirmed payment found');
    }
  };


  const toggleSelection = (id) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getHierarchyIds = (targetId) => {
    if (!targetId || !teamTree || !Array.isArray(teamTree)) return [];
    const collectIds = (nodes, target, active) => {
      let ids = [];
      for (const node of nodes) {
        const isSelfOrParentFound = active || node.id == target;
        if (isSelfOrParentFound) ids.push(node.id);
        if (node.subordinates && Array.isArray(node.subordinates)) {
          ids = [...ids, ...collectIds(node.subordinates, target, isSelfOrParentFound)];
        }
      }
      return ids;
    };
    return collectIds(teamTree, targetId, false);
  };

  const filteredLeadsList = leads.filter(l => {
    const matchesSearch =
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.mobile?.includes(searchTerm) ||
      l.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnassigned = filterUnassigned ? !l.assignedToId : true;

    // Use teamTree for deterministic hierarchical match
    const hierarchyIds = filters.userId ? getHierarchyIds(filters.userId) : [];
    const matchesUser = filters.userId
      ? (l.assignedToId == filters.userId || hierarchyIds.some(id => id == l.assignedToId))
      : true;

    // Universal Date Scoping
    const matchesDate = 
      new Date(l.createdAt) >= new Date(filters.from) && 
      new Date(l.createdAt) <= new Date(filters.to + 'T23:59:59');

    return matchesSearch && matchesUnassigned && matchesUser && matchesDate;
  });

  const handleRecordCallOutcome = async (leadId, data) => {
    try {
      await adminService.recordCallOutcome(leadId, data);
      toast.success('Sync Successful');
      fetchData();
    } catch (err) {
      toast.error('Sync Protocol Failure');
    }
  };

  const handleSendPaymentLink = async (leadId, paymentData) => {
    try {
      const res = await adminService.sendPaymentLink(leadId, paymentData);
      if (res.data?.payment_url) {
        toast.success('Payment Protocol Initialized');
        fetchData();
        return true;
      }
      return false;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Protocol failure');
      return false;
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('PROTOCOL WARNING: This node will be purged from the registry. Proceed?')) return;
    try {
      await adminService.deleteLead(id);
      toast.success('Node Decommissioned');
      fetchData();
    } catch (err) {
      toast.error('Decommissioning failed');
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      role="ADMIN"
    >
      <div className="animate-fade-in">
        {/* GLOBAL RANGE FILTER */}
        {activeTab !== 'edit-lead' && activeTab !== 'ingestion' && (
          <FiltersBar
            filters={filters}
            onChange={setFilters}
            onSync={handleSync}
            role="ADMIN"
            currentUserId={user?.id}
            hideUserFilter={activeTab === 'my-stats'}
          />
        )}
        {activeTab === 'my-stats' && (
          <div className="d-flex flex-column gap-3 animate-fade-in">
            <div className="px-1 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2.5 bg-primary bg-opacity-10 rounded-circle text-primary shadow-glow-sm">
                  <div className="custom-pulse"></div>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h4 className="fw-black text-main mb-0 text-uppercase tracking-tighter" style={{ fontSize: '20px', letterSpacing: '-0.5px' }}>Strategic Hub</h4>
                  <p className="text-muted small fw-bold opacity-60 mb-0 d-flex align-items-center gap-2" style={{ fontSize: '10px' }}>
                    <span className="dot bg-success"></span>
                    INDIVIDUAL PERFORMANCE ANALYTICS
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-tabs for My Dashboard */}
            <div className="d-flex gap-2 p-2 bg-surface bg-opacity-20 rounded-pill border border-white border-opacity-5 mb-2 overflow-auto" style={{ width: 'fit-content' }}>
              {[
                { id: 'dashboard', label: 'Dashboard', icon: ShieldHalf || Zap },
                { id: 'calls', label: 'My Calllogs', icon: Phone },
                { id: 'reports', label: 'My Reports', icon: TrendingUp },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setMyDashboardSubTab(sub.id)}
                  className={`px-4 py-2 rounded-pill border-0 fw-black text-uppercase tracking-widest transition-all d-flex align-items-center gap-2 ${myDashboardSubTab === sub.id ? 'bg-primary text-white shadow-glow translate-y-n1' : 'bg-transparent text-muted opacity-50 hover:opacity-100'}`}
                  style={{ fontSize: '9px' }}
                >
                  <sub.icon size={12} />
                  {sub.label}
                </button>
              ))}
            </div>

            {myDashboardSubTab === 'dashboard' && (
              <>
                <ManagerProfile manager={null} />
                {dashboardLoading ? <StatSkeleton /> : (
                  <MetricCommandCenter
                    stats={{ ...stats, performance: performance?.filter(p => p.userId === user?.id) || [] }}
                    role="ADMIN"
                    filters={{ ...filters, userId: user?.id }}
                    onNavigate={setActiveTab}
                  />
                )}
              </>
            )}

            {myDashboardSubTab === 'calls' && (
              <CallLogDashboard 
                userId={user?.id} 
                hideHeader={true} 
                filters={filters} 
                onChange={setFilters} 
              />
            )}
            {myDashboardSubTab === 'reports' && (
              <div className="row g-4 animate-fade-in">
                <div className="col-12 col-xl-8">
                  {user?.role !== 'ADMIN' && (
                    <Card title="My Conversion Velocity" subtitle="Individual Performance Analytics" className="h-100">
                      <div className="py-2" style={{ height: '360px' }}>
                        <React.Suspense fallback={<ChartSkeleton />}>
                          <RevenueTrendChart data={trendData} theme={theme} />
                        </React.Suspense>
                      </div>
                    </Card>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Card title="Performance Analytics" subtitle="Administrative Overview" className="h-100">
                      <div className="d-flex align-items-center justify-content-center h-100 text-muted opacity-50">
                        <div className="text-center">
                          <TrendingUp size={48} className="mb-3" />
                          <p className="fw-bold">Individual performance tracking is disabled for Admin accounts.</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
                <div className="col-12 col-xl-4 d-flex flex-column gap-3">
                  {user?.role !== 'ADMIN' && (
                    <>
                      <StatCard title="My Efficiency" value={stats?.totalGlobalLeads > 0 ? ((stats?.convertedToday / stats?.totalGlobalLeads) * 100).toFixed(1) : 0} unit="%" sub="Personal Conversion Ratio" icon={<TrendingUp />} color="primary" />
                      <StatCard title="Revenue Flow" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats?.totalRevenue || 0)} unit="" sub="Monthly Transmissions" icon={<IndianRupee />} color="success" />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-3 p-1">

            <div className="mb-4">
              {dashboardLoading ? (
                <div className="row g-3">
                  <div className="col-12 col-md-3"><StatSkeleton /></div>
                  <div className="col-12 col-md-3"><StatSkeleton /></div>
                  <div className="col-12 col-md-3"><StatSkeleton /></div>
                  <div className="col-12 col-md-3"><StatSkeleton /></div>
                </div>
              ) : (
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
                  role="ADMIN" 
                  filters={filters} 
                  onNavigate={setActiveTab} 
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'team-dashboard' && (
          <div className="animate-fade-in p-1 d-flex flex-column gap-4">

            <ManagerDashboardFilterHub
              teamTree={teamTree}
              stats={stats}
              callStats={callStats}
              leads={filteredLeadsList}
              loadLeads={fetchData}
              filters={filters}
              setFilters={setFilters}
              teamLeaders={users}
              loading={loading}
              onEdit={(lead) => {
                setEditingLead(lead);
                setActiveTab('edit-lead');
              }}
              handleAssignLead={handleAssignLead}
              onUpdateLead={handleUpdateLead}
              onRecordCallOutcome={handleRecordCallOutcome}
              onSendPaymentLink={handleSendPaymentLink}
              onDeleteLead={handleDeleteLead}
              hideFilters={true}
            />

             {/* Operational Overview (Synchronized with TL/Manager Dashboard) */}
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
                 role="ADMIN" 
                 filters={filters} 
                 onNavigate={setActiveTab} 
             />

            {/* Analytics Growth Row (Trend + Pie Chart) */}
            <div className="row g-4 animate-fade-in">
                <div className="col-12 col-xl-8">
                    <div className="premium-card border-0 shadow-lg h-100" style={{ minHeight: '400px' }}>
                      <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                          <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Strategic Performance Trends</h6>
                      </div>
                      <div className="card-body p-4">
                        {dashboardLoading ? <ChartSkeleton /> : (
                          <React.Suspense fallback={<ChartSkeleton />}>
                            <RevenueTrendChart data={trendData} theme={theme} />
                          </React.Suspense>
                        )}
                      </div>
                    </div>
                </div>
                <div className="col-12 col-xl-4">
                    <div className="premium-card border-0 shadow-lg h-100">
                      <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                          <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Squad Pipeline Distribution</h6>
                      </div>
                      <div className="card-body p-4">
                        {dashboardLoading ? <ChartSkeleton /> : (
                          <React.Suspense fallback={<ChartSkeleton />}>
                            <LeadStatusPieChart 
                                distribution={stats?.statusDistribution} 
                                leads={leads} 
                                isDarkMode={theme === 'dark'} 
                            />
                          </React.Suspense>
                        )}
                      </div>
                    </div>
                </div>
            </div>

            {/* Team Efficiency Matrix (Synchronized with Manager/TL views) */}
            <div className="row g-4 mb-4">
                <div className="col-12">
                    <Card title="Team Efficiency Matrix" subtitle="Global Staff Performance & Conversion Sync">
                        <div className="card-body p-0">
                            <Table 
                                headers={[
                                    'S.NO',
                                    'Staff Member',
                                    'Hierarchy Role',
                                    <div className="text-center">Active Load</div>,
                                    <div className="text-center">Success</div>,
                                    <div className="text-center">Risk</div>,
                                    <div className="text-end">Sync Rate</div>
                                ]}
                                data={performance || []}
                                renderRow={(p, index) => (
                                    <>
                                        <td className="ps-4 text-muted fw-bold small" style={{ fontSize: '10px' }}>{index + 1}</td>
                                        <td 
                                            onClick={() => {
                                                setFilters({...filters, userId: p.userId});
                                                toast.info(`Aggregating metrics for: ${p.username}`);
                                            }}
                                            className="ps-4 cursor-pointer hover-scale transition-all"
                                        >
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 fw-black small border border-primary border-opacity-10 shadow-glow-sm" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {p.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-bold text-main small">{p.username}</span>
                                                    <span className="text-muted small opacity-50" style={{ fontSize: '9px' }}>VIEW FULL ANALYTICS</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="ui-badge bg-surface text-muted small border-white border-opacity-10">{p.role || 'USER'}</span></td>
                                        <td className="text-center fw-bold">{p.totalLeads}</td>
                                        <td className="text-center text-success fw-bold">{p.convertedLeads}</td>
                                        <td className="text-center text-danger fw-bold">{p.lostLeads}</td>
                                        <td className="pe-4 text-end text-primary fw-black">
                                            {p.totalLeads > 0 ? ((p.convertedLeads / p.totalLeads) * 100).toFixed(1) : 0}%
                                        </td>
                                    </>
                                )}
                            />
                        </div>
                    </Card>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="animate-fade-in">
            <TeamManagement
              teamLeaders={users}
              roles={[{ id: 1, name: 'ADMIN' }, { id: 2, name: 'MANAGER' }, { id: 3, name: 'TEAM_LEADER' }, { id: 4, name: 'ASSOCIATE' }]}
              permissions={availablePermissions}
              shifts={availableShifts}
              offices={availableOffices}
              handleCreateUser={handleCreateUser}
              handleDeleteUser={handleDeleteUser}
              handleEditUser={handleEditUser}
              handleAssignSupervisor={handleAssignSupervisor}
              setSelectedPerfUserId={(id) => setFilters({ ...filters, userId: id })}
              setActiveTab={setActiveTab}
            />
          </div>
        )}

        {activeTab === 'onboard' && (
          <div className="animate-fade-in">
            <TeamManagement
              teamLeaders={users}
              roles={[{ id: 1, name: 'ADMIN' }, { id: 2, name: 'MANAGER' }, { id: 3, name: 'TEAM_LEADER' }, { id: 4, name: 'ASSOCIATE' }]}
              permissions={availablePermissions}
              shifts={availableShifts}
              offices={availableOffices}
              handleCreateUser={handleCreateUser}
              handleDeleteUser={handleDeleteUser}
              handleEditUser={handleEditUser}
              handleAssignSupervisor={handleAssignSupervisor}
              setSelectedPerfUserId={(id) => setFilters({ ...filters, userId: id })}
              setActiveTab={setActiveTab}
              defaultShowForm={true}
            />
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
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <StatCard 
                  title="Total Nodes" 
                  value={filteredLeadsList?.length || 0} 
                  sub="Global Registry Pool" 
                  icon={<Layers size={18} />} 
                  color="primary" 
                />
              </div>
              <div className="col-12 col-md-3">
                <StatCard 
                  title="Interested" 
                  value={stats?.interestedCount || stats?.leads?.interested || 0} 
                  sub="High-Intent High-Conversion" 
                  icon={<ShieldHalf size={18} />} 
                  color="info" 
                />
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <StatCard 
                  title="Pipeline Efficiency" 
                  value={stats?.convertedCount || stats?.convertedToday || 0} 
                  icon={<Zap size={18} />} 
                  color="success" 
                />
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <StatCard 
                  title="Lead Leakage" 
                  value={stats?.totalLostCount || stats?.lostToday || 0} 
                  icon={<AlertCircle size={18} />} 
                  color="danger" 
                />
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="premium-card overflow-hidden animate-fade-in shadow-lg h-100">
                  <div className="card-header bg-transparent p-4 border-0 d-flex justify-content-between align-items-center border-bottom border-white border-opacity-5">
                    <div>
                      <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Global Pipeline Ledger</h5>
                      <small className="text-muted fw-bold opacity-50 small text-uppercase tracking-wider" style={{ fontSize: '9px' }}>IDENTIFICATION & ASSIGNMENT NODE</small>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="ui-btn ui-btn-primary px-4 py-2 rounded-pill shadow-glow animate-fade-in"
                        onClick={() => setActiveTab('ingestion')}
                      >
                        <UserPlus size={16} className="me-2" />
                        Add Lead
                      </button>
                      <button className="ui-btn ui-btn-outline btn-sm px-4 rounded-pill border-primary border-opacity-30 fw-black" style={{ fontSize: '10px' }} onClick={() => fetchData()}>LIVE SYNC</button>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    {loading ? (
                      <div className="p-5 text-center">
                        <div className="spinner-border text-primary opacity-25"></div>
                        <p className="mt-2 text-muted small fw-bold">SYNCHRONIZING LEDGER...</p>
                      </div>
                    ) : (
                      <LeadsTable
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
                        handleAssignLead={handleAssignLead}
                        onViewInvoice={handleViewInvoice}
                        onUpdateLead={handleUpdateLead}
                        onEdit={(lead) => {
                          setEditingLead(lead);
                          setActiveTab('edit-lead');
                        }}
                        onRecordCallOutcome={async (leadId, data) => {
                          console.log('Admin recording outcome:', { leadId, data });
                          try {
                            const response = await adminService.recordCallOutcome(leadId, data);
                            console.log('Outcome record success:', response);
                            toast.success('Outcome recorded');
                            fetchData();
                          } catch (err) {
                            console.error('Outcome record failure:', err);
                            toast.error('Failed to record outcome: ' + (err?.response?.data?.message || 'Unknown error'));
                          }
                        }}
                        onSendPaymentLink={handleSendPaymentLink}
                        teamLeaders={users.filter(u => u.role === 'TEAM_LEADER' || u.role === 'MANAGER' || u.role === 'ASSOCIATE')}
                        role={user?.role}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance-logs' && (
          <div className="animate-fade-in d-flex flex-column gap-4">
            <AttendanceDashboard 
              role="ADMIN" 
              userId={filters.userId} 
              startDate={filters.from.split('T')[0]} 
              endDate={filters.to.split('T')[0]} 
              refreshTrigger={refreshTrigger}
              hideFilters={true}
            />
          </div>
        )}

        {activeTab === 'attendance-settings' && (
          <div className="animate-fade-in">
            <AttendanceSettings />
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="animate-fade-in d-flex flex-column gap-4">
            <TaskBoard
              leads={(leads || []).filter(l => 
                new Date(l.createdAt) >= new Date(filters.from) && 
                new Date(l.createdAt) <= new Date(filters.to + 'T23:59:59')
              )}
              theme={theme}
              onUpdateStatus={handleUpdateUser} 
              fetchLeads={fetchData}
              userId={filters.userId}
              hideFilters={true}
            />
          </div>
        )}
        {activeTab === 'call-logs' && (
          <div className="animate-fade-in d-flex flex-column gap-4">
            <CallLogDashboard 
              filters={filters} 
              onChange={setFilters} 
              userId={filters.userId} 
              hideHeader={true}
            />
          </div>
        )}
        {activeTab === 'revenue' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <div className="d-flex align-items-center gap-3 mb-1">
              <div className="p-2 bg-primary bg-opacity-10 rounded text-primary border border-primary border-opacity-10">
                <TrendingUp size={18} />
              </div>
              <div>
                <h5 className="fw-black mb-0 text-main text-uppercase small tracking-widest">Financial Transmission Ledger</h5>
                <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>AGGREGATED TRANSACTIONAL ARCHIVE</p>
              </div>
            </div>
            <PaymentHistory 
              role="ADMIN" 
              userId={filters.userId} 
              from={filters.from} 
              to={filters.to} 
              hideHeader={true} 
              hideFilters={true}
            />
          </div>
        )}
        {activeTab === 'ingestion' && (
          <div className="animate-fade-in">
            <LeadIngestionModal
              isOpen={true}
              isInline={true}
              onAddLead={handleAddLead}
              onSuccess={fetchData}
              associates={users.filter(u => u.role === 'TEAM_LEADER' || u.role === 'MANAGER' || u.role === 'ASSOCIATE')}
              onClose={() => setActiveTab('pipeline')}
            />
          </div>
        )}        {activeTab === 'tickets' && (
          <div className="animate-fade-in d-flex flex-column gap-4">
            {loading ? (
              <div className="p-5 text-center">
                <div className="spinner-border text-primary opacity-25"></div>
                <p className="mt-2 text-muted small fw-bold">SYNCHRONIZING SUPPORT SPECTRUM...</p>
              </div>
            ) : (
              <TicketManager 
                role="ADMIN" 
                userId={filters.userId}
                memberIds={Array.isArray(performance) ? performance.map(p => p.userId) : []}
              />
            )}
          </div>
        )}

        {activeTab === 'edit-lead' && (
          <LeadEditPage 
            lead={editingLead}
            users={users}
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

        {activeTab === 'revenue-targets' && (
          <div className="animate-fade-in">
            <RevenueStrategyHub 
              users={users} 
              onSync={fetchData} 
            />
          </div>
        )}

      <LeadIngestionModal
        isOpen={isIngestionModalOpen}
        onClose={() => setIsIngestionModalOpen(false)}
        onAddLead={handleAddLead}
        onSuccess={fetchData}
        associates={users.filter(u => u.role === 'TEAM_LEADER' || u.role === 'MANAGER' || u.role === 'ASSOCIATE')}
      />

      <UserEditModal
        key={editingUser?.id}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={editingUser}
        setUser={setEditingUser}
        onSubmit={handleUpdateUser}
        roles={[{ id: 1, name: 'ADMIN' }, { id: 2, name: 'MANAGER' }, { id: 3, name: 'TEAM_LEADER' }, { id: 4, name: 'ASSOCIATE' }]}
        permissions={availablePermissions}
        teamLeaders={users}
        shifts={availableShifts}
        offices={availableOffices}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoiceData={selectedInvoiceData}
      />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
