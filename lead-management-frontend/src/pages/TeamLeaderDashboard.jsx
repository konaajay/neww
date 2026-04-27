import React, { useState, useEffect, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import { Button, Card, Input, Table } from '../components/common/Components';
import { LayoutDashboard, Users, TrendingUp, Zap, AlertCircle, Clock, LogOut, Sun, Moon, Menu, BarChart3, BarChart2, IndianRupee, Phone, Upload, CheckCircle, FileText, UserPlus, ShieldHalf, ChevronDown, ListTodo, CalendarCheck, Search, ClipboardList } from 'lucide-react';
import tlService from '../services/tlService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import StatCard from '../components/StatCard';
import LeadList from '../components/LeadTable';
import PaymentHistory from '../components/PaymentHistory';
import DashboardLayout from '../components/layout/DashboardLayout';
import TaskBoard from '../components/TaskBoard';
import LeadEditPage from './dashboard/components/LeadEditPage';
import FiltersBar from './dashboard/components/FiltersBar';
import LeadForm from '../components/LeadForm';
import AttendanceDashboard from '../components/pages/AttendanceDashboard';
import CallAnalyticsGrid from './dashboard/components/CallAnalyticsGrid';
import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import TicketManager from '../components/TicketManager';
import CallLogDashboard from './dashboard/components/CallLogDashboard';

import ManagerProfile from './dashboard/components/ManagerProfile';
import authService from '../services/authService';
import LeadModal from './dashboard/components/LeadModal';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { StatSkeleton, ChartSkeleton } from './dashboard/components/DashboardSkeletons';

const RevenueTrendChart = React.lazy(() => import('./dashboard/components/RevenueTrendChart'));
const LeadStatusPieChart = React.lazy(() => import('./dashboard/components/LeadStatusPieChart'));

const TeamLeaderDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';

  const [manager, setManager] = useState(null);
  const [associates, setAssociates] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('tl_activeTab') || 'overview');
  const [myDashboardSubTab, setMyDashboardSubTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleSync = () => setRefreshTrigger(prev => prev + 1);

  // Operational Filters
  const [filters, setFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: null,
    teamId: user.id,
    currentUserId: user?.id
  });

  const debouncedFilters = useDebounce(filters, 400);

  // High-performance data synchronization via React Query
  const {
    stats,
    performance,
    trend: trendData,
    loading: dashboardLoading,
    reload: syncDashboard
  } = useDashboardData(debouncedFilters, 'TEAM_LEADER');

  const [editingLead, setEditingLead] = useState(null);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState('ALL');

  const handleTabChange = (tab, extra = {}) => {
    if (tab === 'ingestion') {
      setIsIngestionModalOpen(true);
      return;
    }
    setActiveTab(tab);
    localStorage.setItem('tl_activeTab', tab);

    if (tab === 'tasks') {
      setTaskFilter(extra.filter || 'ALL');
    }

    // Tab-based data scoping: 
    // 'My Stats' forces personal scoping. Team tabs reset to team view.
    if (tab === 'my-stats') {
      setFilters(prev => ({ ...prev, userId: user?.id }));
    } else {
      setFilters(prev => ({ ...prev, userId: null }));
    }
  };

  const fetchLookupData = async () => {
    try {
      if (associates.length === 0) {
        const [subRes, profileRes] = await Promise.all([
          tlService.fetchSubordinates(),
          authService.getProfile()
        ]);
        setAssociates(subRes.data || []);
        setManager(profileRes.data?.supervisor || profileRes.data?.manager);
      }

      const queryParams = {
        from: debouncedFilters.from,
        to: debouncedFilters.to
      };
      if (debouncedFilters.userId) {
        queryParams.userId = debouncedFilters.userId;
      }
      const leadsRes = await tlService.fetchTeamLeads(queryParams);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.content || []));
    } catch (err) {
      console.error("Lookup Sync Error:", err);
    }
  };

  const fetchData = async () => {
    await fetchLookupData();
    await syncDashboard();
  };

  useEffect(() => {
    fetchLookupData();
  }, [debouncedFilters, refreshTrigger]);

  const handleAddLead = async (leadData) => {
    try {
      await tlService.addLead(leadData);
      toast.success('Lead added! Tracking link sent.');
      fetchData();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to add lead');
      return false;
    }
  };

  const handleUpdateLead = async (id, leadData) => {
    try {
      await tlService.updateLead(id, leadData);
      toast.success('Lead details updated');
      fetchData();
      return true;
    } catch (err) {
      toast.error('Update failed');
      return false;
    }
  };

  const handleUpdateStatus = async (leadId, status, note) => {
    try {
      await tlService.updateLeadStatus(leadId, status, note);
      toast.success('Status updated');
      fetchData();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleRecordCallOutcome = async (leadId, data) => {
    console.log('TL recording outcome:', { leadId, data });
    try {
      const response = await tlService.recordCallOutcome(leadId, data);
      console.log('Outcome record success:', response);
      toast.success('Call outcome recorded');
      fetchData();
    } catch (err) {
      console.error('Outcome record failure:', err);
      toast.error('Failed to record outcome: ' + (err?.response?.data?.message || 'Unknown error'));
    }
  };

  const handleSendPaymentLink = async (leadId, paymentData) => {
    try {
      const res = await tlService.sendPaymentLink(leadId, paymentData);
      toast.success('Payment link generated!');

      const lead = res.data.lead;
      if (!lead.email) {
        toast.info('No email found. Please use the WhatsApp button to share the link.', { autoClose: 6000 });
      } else {
        toast.success('Link sent to lead email!');
      }
      fetchData();
      setActiveTab('payments');
    } catch (err) {
      toast.error('Failed to generate link');
    }
  };

  const handleAssignLead = async (leadId, associateId) => {
    try {
      toast.info('Assigning lead to associate...');
      await tlService.assignLead(leadId, associateId);
      toast.success('Assignment confirmed');
      fetchData();
    } catch (err) {
      toast.error('Assignment synchronization failed');
    }
  };


  const navbarExtras = null;

  return (
    <DashboardLayout
      title="Team leader console"
      subtitle="Performance tracking"
      activeTab={activeTab}
      onTabChange={handleTabChange}
      role="TEAM_LEADER"
      navbarExtras={navbarExtras}
    >
      <>
        <div className="animate-fade-in d-flex flex-column gap-3">
          {/* PERSONAL HORIZONTAL NAVBAR - TOP PRIORITY */}
          {activeTab === 'my-stats' && (
            <div className="premium-card p-1 d-flex flex-wrap gap-1 border-white border-opacity-5 overflow-auto custom-scroll flex-nowrap mb-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {[
                { id: 'dashboard', label: 'Home', icon: '📊' },
                { id: 'leads', label: 'Individual Leads', icon: '👥' },
                { id: 'tasks', label: 'Pending Tasks', icon: '📋' },
                { id: 'attendance', label: 'Attendance Logs', icon: '📆' },
                { id: 'revenue', label: 'My Revenue.', icon: '💰' },
                { id: 'calls', label: 'My call Logs', icon: '📞' },
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
              users={associates}
              role="TEAM_LEADER"
              hideUserFilter={activeTab === 'my-stats'}
            />
          )}
          {activeTab === 'my-stats' && (
            <div className="d-flex flex-column gap-3 animate-fade-in">
              <div className="px-1 mb-2">
                <h5 className="fw-black text-main mb-1 text-uppercase tracking-widest small">Personal Command Center</h5>
                <p className="text-muted small fw-bold opacity-50 mb-0" style={{ fontSize: '9px' }}>VIEWING INDIVIDUAL OPERATIONAL PERFORMANCE</p>
              </div>

              <ManagerProfile manager={manager} />

              {myDashboardSubTab === 'dashboard' && (
                <>
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
                              <RevenueTrendChart data={trendData} theme={isDarkMode ? 'dark' : 'light'} />
                            </React.Suspense>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {myDashboardSubTab === 'leads' && (
                <div className="premium-card border-0 shadow-lg overflow-hidden animate-fade-in">
                  <div className="card-header bg-transparent p-4 border-bottom border-white border-opacity-5">
                    <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Personal Leads</h6>
                    <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INDIVIDUAL PIPELINE MANAGEMENT</p>
                  </div>
                  <LeadList
                    leads={leads.filter(l => l.assignedToId === user.id)}
                    role={user.role}
                    teamLeaders={[user, ...associates.filter(a => a.id !== user?.id)].filter(Boolean)}
                    onUpdateStatus={handleUpdateStatus}
                    onRecordCallOutcome={handleRecordCallOutcome}
                    onSendPaymentLink={handleSendPaymentLink}
                    onViewInvoice={() => { }}
                    onUpdateLead={handleUpdateLead}
                    onEdit={(lead) => {
                      setEditingLead(lead);
                      setActiveTab('edit-lead');
                    }}
                  />
                </div>
              )}

              {myDashboardSubTab === 'tasks' && (
                <div className="animate-fade-in">
                  <TaskBoard
                    leads={leads.filter(l => l.assignedToId === user.id)}
                    theme={theme}
                    onUpdateStatus={handleUpdateStatus}
                    onSendPaymentLink={handleSendPaymentLink}
                    fetchLeads={fetchData}
                    userId={user.id}
                    hideFilters={true}
                    startDate={filters.from}
                    endDate={filters.to}
                  />
                </div>
              )}

              {myDashboardSubTab === 'attendance' && (
                <div className="animate-fade-in">
                  <AttendanceDashboard
                    role="TEAM_LEADER"
                    userId={user.id}
                    startDate={filters.from}
                    endDate={filters.to}
                    hideFilters={true}
                  />
                </div>
              )}

              {myDashboardSubTab === 'revenue' && (
                <div className="animate-fade-in">
                  <PaymentHistory role="TEAM_LEADER" userId={user.id} from={filters.from} to={filters.to} hideHeader={true} />
                </div>
              )}

              {myDashboardSubTab === 'calls' && (
                <div className="animate-fade-in">
                  <CallLogDashboard userId={user.id} hideHeader={true} filters={filters} onChange={setFilters} />
                </div>
              )}

              {myDashboardSubTab === 'reports' && (
                <div className="animate-fade-in d-flex flex-column gap-4">
                  <div className="premium-card overflow-hidden shadow-lg border-0 h-100">
                    <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                      <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Performance Analytics</h6>
                      <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INDIVIDUAL CONVERSION TRENDS</p>
                    </div>
                    <div className="card-body p-4" style={{ height: '400px' }}>
                      <React.Suspense fallback={<ChartSkeleton />}>
                        <RevenueTrendChart data={trendData} theme={theme} />
                      </React.Suspense>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Operational Scope Filters handled globally */}

          {activeTab === 'overview' && (
            <div className="d-flex flex-column gap-4">
              <div className="mb-2">
                <MetricCommandCenter
                  stats={{ ...stats, performance }}
                  role="TEAM_LEADER"
                  filters={filters}
                  theme={theme}
                  onNavigate={handleTabChange}
                  leads={leads}
                />
              </div>


              <div className="row g-4 animate-fade-in">
                <div className="col-12 col-xl-8">
                  <div className="premium-card p-0 overflow-hidden shadow-lg border-0 h-100">
                    <div className="card-header bg-transparent p-4 border-0 d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="fw-black mb-0 text-main small tracking-widest text-uppercase">Engagement Velocity</h6>
                        <small className="text-muted fw-bold opacity-50" style={{ fontSize: '8px' }}>TEAM PERFORMANCE TRENDS</small>
                      </div>
                      <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle">
                        <TrendingUp size={16} />
                      </div>
                    </div>
                    <div className="card-body p-0">
                      <React.Suspense fallback={<ChartSkeleton />}>
                        <RevenueTrendChart data={trendData} theme={theme} />
                      </React.Suspense>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-xl-4">
                  <div className="premium-card p-0 overflow-hidden shadow-lg border-0 h-100">
                    <div className="card-header bg-transparent p-4 border-0 d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="fw-black mb-0 text-main small tracking-widest text-uppercase">Squad Pipeline Distribution</h6>
                        <small className="text-muted fw-bold opacity-50" style={{ fontSize: '8px' }}>STATUS SEGMENTATION</small>
                      </div>
                      <div className="p-2 bg-success bg-opacity-10 text-success rounded-circle">
                        <TrendingUp size={16} />
                      </div>
                    </div>
                    <div className="card-body p-0" style={{ height: '350px' }}>
                      <React.Suspense fallback={<ChartSkeleton />}>
                        <LeadStatusPieChart distribution={stats?.statusDistribution || []} leads={leads} isDarkMode={isDarkMode} />
                      </React.Suspense>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4"></div>


            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="animate-fade-in d-flex flex-column gap-3">
              {(() => {
                const dateScopedLeads = (leads || []).filter(l => {
                  const matchesDate = new Date(l.createdAt) >= new Date(filters.from) &&
                                     new Date(l.createdAt) <= new Date(filters.to + 'T23:59:59');
                  const matchesSearch = !searchTerm || 
                    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    l.mobile?.includes(searchTerm);
                  return matchesDate && matchesSearch;
                });
                return (
                  <>
                    <div className="row g-3">
                      <div className="col-12 col-md-3">
                        <StatCard
                          title="Converted"
                          value={dateScopedLeads.filter(l => ['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(l.status)).length}
                          sub="Successful Transmissions"
                          icon={<CheckCircle size={18} />}
                          color="success"
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <StatCard
                          title="Interested"
                          value={dateScopedLeads.filter(l => l.status === 'INTERESTED' || l.status === 'UNDER_REVIEW').length}
                          sub="Hot Opportunities"
                          icon={<Zap size={18} />}
                          color="warning"
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <StatCard
                          title="Follow-up"
                          value={dateScopedLeads.filter(l => l.status === 'FOLLOW_UP').length}
                          sub="Active Operational Nodes"
                          icon={<Clock size={18} />}
                          color="info"
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <StatCard
                          title="Lost"
                          value={dateScopedLeads.filter(l => ['LOST', 'NOT_INTERESTED', 'PAYMENT_FAILED'].includes(l.status)).length}
                          sub="Off-Pitch Terminations"
                          icon={<AlertCircle size={18} />}
                          color="danger"
                        />
                      </div>
                    </div>

                    <div className="premium-card overflow-hidden shadow-lg border-0 mb-0">
                      <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Lead Pipeline Terminal</h5>
                          <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>STRATEGIC DATA MANAGEMENT & ASSIGNMENT</p>
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
                        <button
                          className="ui-btn ui-btn-primary px-4 py-2 rounded-pill shadow-glow animate-fade-in"
                          onClick={() => setIsIngestionModalOpen(true)}
                        >
                          <UserPlus size={16} className="me-2" />
                          Add Lead
                        </button>
                      </div>
                      <div className="card-body p-0">
                        <LeadList
                          leads={dateScopedLeads}
                          onUpdateStatus={handleUpdateStatus}
                          onUpdateLead={handleUpdateLead}
                          onEdit={(lead) => {
                            setEditingLead(lead);
                            setActiveTab('edit-lead');
                          }}
                          onSendPaymentLink={handleSendPaymentLink}
                          onAssignLead={handleAssignLead}
                          onRecordCallOutcome={handleRecordCallOutcome}
                          teamLeaders={[user, ...associates.filter(a => a.id !== user?.id)].filter(Boolean)}
                          role="TEAM_LEADER"
                          currentUser={user}
                          fetchLeads={fetchData}
                        />
                      </div>
                    </div>
                  </>
                )

              })()}
            </div>
          )}

          {activeTab === 'tasks' && (
            <TaskBoard
              leads={(leads || []).filter(l =>
                new Date(l.createdAt) >= new Date(filters.from) &&
                new Date(l.createdAt) <= new Date(filters.to + 'T23:59:59')
              )}
              theme={theme}
              onUpdateStatus={handleUpdateStatus}
              onSendPaymentLink={handleSendPaymentLink}
              fetchLeads={fetchData}
              userId={filters.userId}
              hideFilters={true}
              startDate={filters.from}
              endDate={filters.to}
              initialFilter={taskFilter}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeTab === 'reports' && (
            <div className="d-flex flex-column gap-4">


              <Card title="Associate Performance Snapshot" subtitle="Current Operational Node Status">
                <Table
                  headers={[
                    'S.NO',
                    'Staff Member',
                    'Designation',
                    <div className="text-center">Leads</div>,
                    <div className="text-center">Success</div>,
                    <div className="text-center">Lost</div>,
                    'Sync Rate'
                  ]}
                  data={performance || []}
                  renderRow={(p, index) => (
                    <>
                      <td className="ps-4 text-muted fw-bold small" style={{ fontSize: '10px' }}>
                        {index + 1}
                      </td>
                      <td onClick={() => setFilters({ ...filters, userId: p.userId })} className="ps-4 cursor-pointer fw-bold text-primary">
                        <div className="d-flex align-items-center gap-3">
                          <div className="bg-primary bg-opacity-10 text-primary rounded-pill p-1 fw-black small" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                            {p.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="small">{p.username}</span>
                        </div>
                      </td>
                      <td><span className="ui-badge bg-surface text-muted small" style={{ fontSize: '9px' }}>{p.role || 'ASSOCIATE'}</span></td>
                      <td className="text-center fw-bold">{p.totalLeads}</td>
                      <td className="text-center text-success fw-bold">{p.convertedCount || 0}</td>
                      <td className="text-center text-danger fw-bold">{p.lostCount || 0}</td>
                      <td className="pe-4 text-end text-primary fw-black">
                        {p.totalLeads > 0 ? (((p.convertedCount || 0) / p.totalLeads) * 100).toFixed(1) : 0}%
                      </td>
                    </>
                  )}
                />
              </Card>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="d-flex flex-column gap-4">
              <PaymentHistory
                role="TEAM_LEADER"
                from={filters.from}
                to={filters.to}
                userId={filters.userId || filters.teamId}
                hideFilters={true}
              />
            </div>
          )}

          {activeTab === 'attendance' && (
            <AttendanceDashboard
              role="TEAM_LEADER"
              userId={filters.userId}
              startDate={filters.from}
              endDate={filters.to}
              hideFilters={true}
            />
          )}

          {activeTab === 'call-logs' && (
            <div className="d-flex flex-column gap-4">
              <CallLogDashboard
                filters={filters}
                onChange={setFilters}
                hideHeader={true}
              />
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="animate-fade-in">
              <TicketManager role="TEAM_LEADER" />
            </div>
          )}

          {activeTab === 'edit-lead' && (
            <LeadEditPage
              lead={editingLead}
              users={associates.concat(user)}
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

        <LeadModal
          isOpen={isIngestionModalOpen}
          onClose={() => setIsIngestionModalOpen(false)}
          onAddLead={handleAddLead}
          onSuccess={fetchData}
          associates={associates.concat(user)}
        />
      </>
    </DashboardLayout>
  );
};

export default TeamLeaderDashboard;
