import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Table } from '../components/common/Components';
import { LayoutDashboard, Users, TrendingUp, Zap, AlertCircle, Clock, LogOut, Sun, Moon, Menu, BarChart3, BarChart2, IndianRupee, Phone, Upload, CheckCircle, FileText, UserPlus } from 'lucide-react';
import tlService from '../services/tlService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import StatCard from '../components/StatCard';
import LeadList from '../components/LeadTable';
import PaymentHistory from '../components/PaymentHistory';
import RevenueTrendChart from './dashboard/components/RevenueTrendChart';
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

const TeamLeaderDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';

  const [stats, setStats] = useState(null);
  const [manager, setManager] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [leads, setLeads] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [callStats, setCallStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('tl_activeTab') || 'overview');

  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleSync = () => setRefreshTrigger(prev => prev + 1);

  // Operational Filters
  const [filters, setFilters] = useState({
    from: new Date().toISOString().split('T')[0] + 'T00:00:00',
    to: new Date().toISOString().split('T')[0] + 'T23:59:59',
    userId: null
  });

  const [editingLead, setEditingLead] = useState(null);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('tl_activeTab', activeTab);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsFilters = { start: filters.from, end: filters.to, userId: filters.userId };
      const trendFilters = { from: filters.from.split('T')[0], to: filters.to.split('T')[0], userId: filters.userId };

      const [leadsRes, statsRes, perfRes, subordinatesRes, trendRes, callStatsRes, summaryRes, profileRes] = await Promise.all([
        tlService.fetchMyLeads(),
        tlService.fetchDashboardStats(statsFilters),
        tlService.fetchMemberPerformance(statsFilters),
        tlService.fetchSubordinates(),
        tlService.fetchTrendData(trendFilters),
        tlService.fetchGlobalCallStats({ date: filters.from.split('T')[0] }),
        tlService.fetchDashboardSummary({ from: filters.from.split('T')[0], to: filters.to.split('T')[0] }),
        authService.getProfile()
      ]);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.content || []));
      setStats(statsRes.data);
      setPerformance(perfRes.data);
      setAssociates(subordinatesRes.data);
      setTrendData(trendRes.data);
      setCallStats(callStatsRes.data?.data || callStatsRes.data);
      setSummary(summaryRes.data);
      setManager(profileRes.data?.supervisor || profileRes.data?.manager);

      // Revenue Sync Overdrive
      try {
        const historyRes = await paymentService.fetchHistory('TEAM_LEADER', {
          startDate: filters.from,
          endDate: filters.to,
          userId: filters.userId
        });
        const payments = historyRes.data || [];
        const calculatedRevenue = payments
          .filter(p => ['PAID', 'SUCCESS', 'APPROVED'].includes(p.status))
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalPayments: Math.max(prev?.totalPayments || 0, calculatedRevenue),
          totalRevenue: Math.max(prev?.totalRevenue || 0, calculatedRevenue)
        }));
        setSummary(prev => ({
          ...prev,
          revenue: {
            ...prev?.revenue,
            monthly: Math.max(prev?.revenue?.monthly || 0, calculatedRevenue)
          }
        }));
      } catch (err) {
        console.warn('TL revenue recalculation failed');
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-scroll to top when focusing on an associate
    if (filters.userId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [filters, refreshTrigger]);

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
              <ManagerProfile manager={manager} />
              <MetricCommandCenter
                stats={{ ...summary, performance: performance.filter(p => p.userId === user.id) }}
                role={user.role}
                filters={{ ...filters, userId: user.id }}
                onNavigate={(tab) => setActiveTab(tab === 'revenue' ? 'payments' : tab)}
              />
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
                  stats={{ ...summary, performance }}
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
                  <div className="row g-3 h-100">
                    <div className="col-12 col-sm-6 col-xl-12">
                      <StatCard title="Team Pipeline" value={stats?.leadStats?.TOTAL || 0} sub="Global Managed Records" icon={<Users />} color="primary" />
                    </div>
                    <div className="col-12 col-sm-6 col-xl-12">
                      <StatCard title="Total Success" value={stats?.convertedToday || 0} sub="Converted Nodes Today" icon={<CheckCircle />} color="success" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-3">
                  <StatCard title="Interested" value={stats?.interestedToday || 0} sub="Hot Opportunities" icon={<Zap />} color="warning" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Lost (Today)" value={stats?.lostToday || 0} sub="Off-Pitch Segments" icon={<Phone />} color="danger" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Revenue (P)" value={stats?.pendingRevenue || 0} sub="₹ Projected Margin" icon={<IndianRupee />} color="info" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Revenue (C)" value={stats?.totalPayments || 0} sub="₹ Confirmed Capital" icon={<IndianRupee />} color="success" />
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
                        data={performance}
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
                    title="Call Back"
                    value={summary?.callbackCount || 0}
                    sub="Awaiting Registry Response"
                    icon={<Phone size={18} />}
                    color="warning"
                  />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard
                    title="Converted"
                    value={summary?.convertedCount || stats?.convertedToday || 0}
                    sub="Successful Transmissions"
                    icon={<CheckCircle size={18} />}
                    color="success"
                  />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard
                    title="Follow-up"
                    value={summary?.todayFollowups || 0}
                    sub="Active Operational Nodes"
                    icon={<Clock size={18} />}
                    color="info"
                  />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard
                    title="Lost"
                    value={stats?.lostToday || summary?.lostCount || 0}
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
              <PaymentHistory role="TEAM_LEADER" />
            </div>
          )}

          {activeTab === 'attendance' && (
            <AttendanceDashboard role="TEAM_LEADER" />
          )}

          {activeTab === 'call-logs' && (
            <div className="d-flex flex-column gap-4">
              <CallLogDashboard />
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
