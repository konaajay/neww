import React, { useState, useEffect, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import { Button, Card, Input, Table } from '../components/common/Components';
import { LayoutDashboard, Users, TrendingUp, Zap, AlertCircle, Clock, LogOut, Sun, Moon, Menu, BarChart3, BarChart2, IndianRupee, Phone, Upload, CheckCircle, FileText, UserPlus, ShieldHalf, ChevronDown, ListTodo, CalendarCheck } from 'lucide-react';
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
import BulkUploadModal from './dashboard/components/BulkUploadModal';
import AttendanceDashboard from '../components/pages/AttendanceDashboard';
import CallAnalyticsGrid from './dashboard/components/CallAnalyticsGrid';
import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import TicketManager from '../components/TicketManager';
import CallLogDashboard from './dashboard/components/CallLogDashboard';

import ManagerProfile from './dashboard/components/ManagerProfile';
import authService from '../services/authService';
import LeadIngestionModal from './dashboard/components/LeadIngestionModal';
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

  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleSync = () => setRefreshTrigger(prev => prev + 1);

  // Operational Filters
  const [filters, setFilters] = useState({
    from: new Date().toISOString().split('T')[0],
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

  useEffect(() => {
    localStorage.setItem('tl_activeTab', activeTab);
  }, [activeTab]);

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

      const leadsRes = await tlService.fetchTeamLeads({ 
        startDate: debouncedFilters.from, 
        endDate: debouncedFilters.to, 
        userId: debouncedFilters.userId || debouncedFilters.teamId
      });
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


  return (
    <DashboardLayout
      title="Team leader console"
      subtitle="Performance tracking"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      role="TEAM_LEADER"
    >
      <>
        <div className="animate-fade-in d-flex flex-column gap-3">
          {activeTab === 'my-stats' && (
            <div className="d-flex flex-column gap-3 animate-fade-in">
              <div className="px-1">
                <h5 className="fw-black text-main mb-1 text-uppercase tracking-widest small">Personal Command Center</h5>
                <p className="text-muted small fw-bold opacity-50 mb-0" style={{ fontSize: '9px' }}>VIEWING INDIVIDUAL OPERATIONAL PERFORMANCE</p>
              </div>

              {/* Personal Command Selector (Dropdown) */}
              <div className="d-flex align-items-center gap-3 mb-2 px-1">
                <div className="position-relative">
                   <select 
                      className="form-select bg-surface border border-white border-opacity-10 text-main fw-black text-uppercase tracking-widest rounded-pill px-4 py-2 shadow-sm appearance-none"
                      style={{ fontSize: '9px', minWidth: '220px', cursor: 'pointer', outline: 'none' }}
                      value={myDashboardSubTab}
                      onChange={(e) => setMyDashboardSubTab(e.target.value)}
                   >
                      <option value="dashboard">📊 PERSONAL OVERVIEW</option>
                      <option value="leads">👥 MY INDIVIDUAL LEADS</option>
                      <option value="tasks">📋 MY PENDING TASKS</option>
                      <option value="attendance">📆 MY ATTENDANCE LOGS</option>
                      <option value="revenue">💰 MY REVENUE TRANSACTION</option>
                      <option value="calls">📞 MY TELEPHONY LOGS</option>
                      <option value="reports">📈 MY PERFORMANCE TRENDS</option>
                   </select>
                   <div className="position-absolute end-0 top-50 translate-middle-y me-3 pointer-events-none opacity-50">
                      <ChevronDown size={12} />
                   </div>
                </div>
                
                <div className="d-flex align-items-center bg-surface border border-white border-opacity-10 rounded-pill shadow-sm px-3 py-1.5 gap-2 ms-auto">
                    <Clock size={12} className="text-primary opacity-50" />
                    <input 
                        type="date" 
                        className="bg-transparent border-0 shadow-none text-main fw-black p-0" 
                        value={filters.from} 
                        onChange={e => setFilters({...filters, from: e.target.value})}
                        style={{ fontSize: '10px', outline: 'none' }}
                    />
                    <span className="text-muted fw-bold small opacity-25">TO</span>
                    <input 
                        type="date" 
                        className="bg-transparent border-0 shadow-none text-main fw-black p-0" 
                        value={filters.to} 
                        onChange={e => setFilters({...filters, to: e.target.value})}
                        style={{ fontSize: '10px', outline: 'none' }}
                    />
                </div>
              </div>

              <ManagerProfile manager={manager} />
              
              {myDashboardSubTab === 'dashboard' && (
                <>
                  {/* ROW 1: CRITICAL ACTIONS (4 CARDS) */}
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6 col-xl-3">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard 
                        title="Today's Schedule" 
                        value={stats?.todayFollowups || 0} 
                        icon={<Clock size={18} />} 
                        color="secondary" 
                        onClick={() => setMyDashboardSubTab('tasks')} 
                      />}
                    </div>
                    <div className="col-12 col-md-6 col-xl-3">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard 
                        title="Payment Overdue" 
                        value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.pendingPaymentsAmount || 0)} 
                        icon={<IndianRupee size={18} />} 
                        color="danger" 
                        unit="" 
                        onClick={() => setMyDashboardSubTab('revenue')} 
                      />}
                    </div>
                    <div className="col-12 col-md-6 col-xl-3">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard 
                        title="Follow-up Overdue" 
                        value={stats?.pendingFollowups || 0} 
                        icon={<AlertCircle size={18} />} 
                        color="warning" 
                        onClick={() => setMyDashboardSubTab('leads')} 
                      />}
                    </div>
                    <div className="col-12 col-md-6 col-xl-3">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard 
                        title="30-Day Revenue Forecast" 
                        value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.forecastRevenue || 0)} 
                        icon={<TrendingUp size={18} />} 
                        color="info" 
                        unit="" 
                        onClick={() => setMyDashboardSubTab('revenue')} 
                      />}
                    </div>
                  </div>

                  {/* ROW 2: PERFORMANCE TOTALS (3 CARDS) */}
                  <div className="row g-3 mb-4 justify-content-center">
                    <div className="col-12 col-md-4 col-xl-4">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard 
                        title="Total Leads" 
                        value={stats?.total || 0} 
                        icon={<Users size={18} />} 
                        color="primary" 
                        onClick={() => setMyDashboardSubTab('leads')} 
                      />}
                    </div>
                    <div className="col-12 col-md-4 col-xl-4">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard 
                        title="Total Converted" 
                        value={stats?.convertedCount || 0} 
                        icon={<CheckCircle size={18} />} 
                        color="success" 
                        onClick={() => setMyDashboardSubTab('leads')} 
                      />}
                    </div>
                    <div className="col-12 col-md-4 col-xl-4">
                      {dashboardLoading ? <StatSkeleton /> : <StatCard 
                        title="Total Revenue" 
                        value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.monthlyRevenue || 0)} 
                        icon={<Zap size={18} />} 
                        color="pink" 
                        unit="" 
                        onClick={() => setMyDashboardSubTab('reports')} 
                      />}
                    </div>
                  </div>

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
                    onUpdateStatus={handleUpdateStatus}
                    onRecordCallOutcome={handleRecordCallOutcome}
                    onSendPaymentLink={handleSendPaymentLink}
                    onViewInvoice={() => {}} 
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
                  />
                </div>
              )}

              {myDashboardSubTab === 'attendance' && (
                <div className="animate-fade-in">
                  <AttendanceDashboard role="TEAM_LEADER" userId={user.id} />
                </div>
              )}

              {myDashboardSubTab === 'revenue' && (
                <div className="animate-fade-in">
                   <PaymentHistory role="TEAM_LEADER" userId={user.id} from={filters.from} to={filters.to} hideHeader={true} />
                </div>
              )}

              {myDashboardSubTab === 'calls' && (
                <div className="animate-fade-in">
                   <CallLogDashboard userId={user.id} hideHeader={true} />
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
                          <RevenueTrendChart data={personalTrendData} theme={theme} />
                      </div>
                    </div>
                </div>
              )}
            </div>
          )}
          {/* Operational Scope Filters */}
          {activeTab === 'overview' && (
            <FiltersBar
              filters={filters}
              onChange={setFilters}
              onSync={handleSync}
              users={associates}
              role="TEAM_LEADER"
            />
          )}

          {filters.userId && (
            <div className="d-flex align-items-center justify-content-between p-3 bg-primary bg-opacity-10 border border-primary border-opacity-20 rounded-4 animate-slide-in mb-1 shadow-glow">
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 bg-primary bg-opacity-20 rounded-circle text-primary border border-primary border-opacity-30">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h4 className="fw-black mb-0 text-main text-uppercase tracking-widest">Squad Drill-Down</h4>
                  <p className="text-muted small mb-0 fw-bold opacity-75">Viewing operational metrics for {associates.find(a => a.id === filters.userId)?.name || 'selected node'}</p>
                </div>
              </div>
              <button
                className="ui-btn ui-btn-outline btn-sm px-4 rounded-pill border-primary border-opacity-30 fw-black text-uppercase tracking-wider shadow-none"
                onClick={() => setFilters({ ...filters, userId: null })}
                style={{ fontSize: '11px' }}
              >
                ← RESET VIEW
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="d-flex flex-column gap-4">
              <div className="mb-2">
                <MetricCommandCenter
                  stats={{ ...stats, performance }}
                  role="TEAM_LEADER"
                  filters={filters}
                  theme={theme}
                  onNavigate={(tab) => setActiveTab(tab === 'revenue' ? 'payments' : tab)}
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
                      <RevenueTrendChart data={trendData} theme={theme} />
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
                      <LeadStatusPieChart distribution={stats?.statusDistribution || []} leads={leads} isDarkMode={isDarkMode} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-4 animate-fade-in">
                <div className="col-12 col-md-3">
                  <StatCard title="Interested" value={stats?.interestedCount || 0} sub="Hot Opportunities" icon={<Zap />} color="warning" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Total Lead Lost" value={stats?.totalLostCount || 0} sub="Historical Attrition" icon={<Phone />} color="danger" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Team Nodes" value={stats?.totalUsers || 0} sub="Active Squad Size" icon={<Users />} color="info" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Revenue (C)" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats?.totalRevenue || 0)} sub="₹ Confirmed Capital" icon={<IndianRupee />} color="success" unit="" />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12">
                  <Card title="Team Efficiency Matrix" subtitle="Associate Pipeline & Sync Status">
                    <div className="card-body p-0">
                      <Table
                        headers={[
                          'S.NO',
                          'Staff Member',
                          'Identity Role',
                          <div className="text-center">Active Load</div>,
                          <div className="text-center">Success</div>,
                          <div className="text-center">Risk</div>,
                          <div className="text-end">Sync Rate</div>
                        ]}
                        data={performance || []}
                        renderRow={(p, index) => (
                          <>
                            <td className="ps-4 text-muted fw-bold small" style={{ fontSize: '10px' }}>
                              {index + 1}
                            </td>
                            <td
                              onClick={() => {
                                setFilters({ ...filters, userId: p.userId });
                                toast.info(`Aggregating data for associate: ${p.username}`);
                              }}
                              className="ps-4 cursor-pointer hover-scale transition-all"
                            >
                              <div className="d-flex align-items-center gap-3">
                                <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 fw-black small border border-primary border-opacity-10 hover-shadow shadow-glow" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {p.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="d-flex flex-column">
                                  <span className="fw-bold text-main small">{p.username}</span>
                                  <span className="text-muted small opacity-50" style={{ fontSize: '9px' }}>VIEW MEMBER PROFILE</span>
                                </div>
                              </div>
                            </td>
                            <td><span className="ui-badge bg-surface text-muted small border-white border-opacity-10">{p.role || 'ASSOCIATE'}</span></td>
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

          {activeTab === 'pipeline' && (
            <div className="animate-fade-in d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-12 col-md-3">
                  <StatCard
                    title="Converted"
                    value={leads.filter(l => ['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(l.status)).length}
                    sub="Successful Transmissions"
                    icon={<CheckCircle size={18} />}
                    color="success"
                  />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard
                    title="Interested"
                    value={leads.filter(l => l.status === 'INTERESTED' || l.status === 'UNDER_REVIEW').length}
                    sub="Hot Opportunities"
                    icon={<Zap size={18} />}
                    color="warning"
                  />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard
                    title="Follow-up"
                    value={leads.filter(l => l.status === 'FOLLOW_UP').length}
                    sub="Active Operational Nodes"
                    icon={<Clock size={18} />}
                    color="info"
                  />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard
                    title="Lost"
                    value={leads.filter(l => ['LOST', 'NOT_INTERESTED', 'PAYMENT_FAILED'].includes(l.status)).length}
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
                  <button
                    className="ui-btn ui-btn-primary px-4 py-2 rounded-pill shadow-glow animate-fade-in"
                    onClick={() => setActiveTab('ingestion')}
                  >
                    <UserPlus size={16} className="me-2" />
                    Add Lead
                  </button>
                </div>
                <div className="card-body p-0">
                  <LeadList
                    leads={leads}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateLead={handleUpdateLead}
                    onEdit={(lead) => {
                      setEditingLead(lead);
                      setActiveTab('edit-lead');
                    }}
                    onSendPaymentLink={handleSendPaymentLink}
                    onAssignLead={handleAssignLead}
                    onRecordCallOutcome={handleRecordCallOutcome}
                    associates={associates}
                    role="TEAM_LEADER"
                    currentUser={user}
                    fetchLeads={fetchData}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <TaskBoard
              leads={leads}
              theme={theme}
              onUpdateStatus={handleUpdateStatus}
              onSendPaymentLink={handleSendPaymentLink}
              fetchLeads={fetchData}
            />
          )}

          {activeTab === 'reports' && (
            <div className="d-flex flex-column gap-4">
              {/* Squad Efficiency Snapshot */}
              {(() => {
                const squadStats = performance.reduce((acc, p) => ({
                  leads: acc.leads + (p.totalLeads || 0),
                  converted: acc.converted + (p.convertedLeads || 0),
                  lost: acc.lost + (p.lostLeads || 0),
                  revenue: acc.revenue + (p.revenue || 0)
                }), { leads: 0, converted: 0, lost: 0, revenue: 0 });

                const squadConversion = squadStats.leads > 0
                  ? ((squadStats.converted / squadStats.leads) * 100).toFixed(1)
                  : "0.0";

                return (
                  <div className="row g-3 animate-fade-in">
                    <div className="col-12 col-md-3">
                      <div className="premium-card p-4 border border-white border-opacity-5 relative overflow-hidden h-100 shadow-glow">
                        <div className="position-absolute top-0 end-0 p-3 opacity-10">
                          <BarChart2 size={40} className="text-primary" />
                        </div>
                        <p className="text-muted small fw-bold text-uppercase tracking-widest mb-1" style={{ fontSize: '10px' }}>Squad Conversion</p>
                        <h3 className="fw-black mb-0 text-main">{squadConversion}%</h3>
                        <div className="progress mt-2 bg-secondary bg-opacity-10" style={{ height: '3px' }}>
                          <div className="progress-bar bg-primary shadow-glow" style={{ width: `${squadConversion}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="premium-card p-4 border border-white border-opacity-5 relative overflow-hidden h-100">
                        <p className="text-muted small fw-bold text-uppercase tracking-widest mb-1" style={{ fontSize: '10px' }}>Active Pipeline</p>
                        <h3 className="fw-black mb-0 text-main">{squadStats.leads}</h3>
                        <small className="text-muted fw-bold opacity-50" style={{ fontSize: '9px' }}>TOTAL RANGE LEADS</small>
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="premium-card p-4 border border-white border-opacity-5 relative overflow-hidden h-100">
                        <p className="text-muted small fw-bold text-uppercase tracking-widest mb-1" style={{ fontSize: '10px' }}>Success Nodes</p>
                        <h3 className="fw-black mb-0 text-success">{squadStats.converted}</h3>
                        <small className="text-muted fw-bold opacity-50" style={{ fontSize: '9px' }}>COMPLETED TARGETS</small>
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="premium-card p-4 border border-white border-opacity-5 relative overflow-hidden h-100">
                        <p className="text-muted small fw-bold text-uppercase tracking-widest mb-1" style={{ fontSize: '10px' }}>Lost Assets</p>
                        <h3 className="fw-black mb-0 text-danger">{squadStats.lost}</h3>
                        <small className="text-muted fw-bold opacity-50" style={{ fontSize: '9px' }}>OFF-PITCH TERMINATIONS</small>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  data={performance}
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
                      <td className="text-center text-success fw-bold">{p.convertedLeads}</td>
                      <td className="text-center text-danger fw-bold">{p.lostLeads}</td>
                      <td className="pe-4 text-end text-primary fw-black">
                        {p.totalLeads > 0 ? ((p.convertedLeads / p.totalLeads) * 100).toFixed(1) : 0}%
                      </td>
                    </>
                  )}
                />
              </Card>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="d-flex flex-column gap-4">
              <PaymentHistory role="TEAM_LEADER" from={filters.from} to={filters.to} />
            </div>
          )}

          {activeTab === 'attendance' && (
            <AttendanceDashboard role="TEAM_LEADER" />
          )}

          {activeTab === 'call-logs' && (
            <div className="d-flex flex-column gap-4">
              <CallLogDashboard 
                userId={filters.userId} 
                from={filters.from} 
                to={filters.to}
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
                associates={associates.concat(user)}
                onClose={() => setActiveTab('pipeline')}
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

        <LeadIngestionModal
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
