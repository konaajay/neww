import React, { useState, useEffect, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import { Button, Card, Input, Table } from '../components/common/Components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import associateService from '../services/associateService';
import LeadTable from '../components/LeadTable';
import StatCard from '../components/StatCard';
import LeadForm from '../components/LeadForm';
import {
  Users,
  TrendingUp,
  Zap,
  LogOut,
  Sun,
  Moon,
  Phone,
  CheckCircle,
  MessageSquare,
  IndianRupee,
  Upload,
  FileText,
  ShieldCheck,
  UserPlus,
  Clock,
  AlertCircle,
  RefreshCcw,
  Search,
  ClipboardList
} from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardLayout from '../components/layout/DashboardLayout';
import LeadEditPage from './dashboard/components/LeadEditPage';
import PaymentHistory from '../components/PaymentHistory';
import TaskBoard from '../components/TaskBoard';
import FiltersBar from './dashboard/components/FiltersBar';
import InvoiceModal from './dashboard/components/InvoiceModal';
import paymentService from '../services/paymentService';
import AttendanceDashboard from '../components/pages/AttendanceDashboard';
import CallAnalyticsGrid from './dashboard/components/CallAnalyticsGrid';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import TicketManager from '../components/TicketManager';

import ManagerProfile from './dashboard/components/ManagerProfile';
import authService from '../services/authService';
import LeadModal from './dashboard/components/LeadModal';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { StatSkeleton, ChartSkeleton } from './dashboard/components/DashboardSkeletons';

const LazyRevenueTrendChart = React.lazy(() => import('./dashboard/components/RevenueTrendChart'));

const AssociateDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [manager, setManager] = useState(null);
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const [filters, setFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: user?.id,
    currentUserId: user?.id
  });

  const debouncedFilters = useDebounce(filters, 400);

  // High-performance data synchronization via React Query
  const { stats, trend, loading: dashboardLoading, reload: syncDashboard } = useDashboardData(debouncedFilters, 'ASSOCIATE');

  // Invoice state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [editingLead, setEditingLead] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleSync = () => setRefreshTrigger(prev => prev + 1);

  const fetchData = async () => {
    try {
      const leadsRes = await associateService.fetchMyLeads();
      console.log(">>> [DEBUG] My Leads Hub:", leadsRes.data);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.content || []));
    } catch (err) {
      console.error("Leads Fetch Error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    if (!manager) {
      authService.getProfile().then(res => {
        setManager(res.data?.supervisor || res.data?.manager);
      });
    }
  }, [refreshTrigger]);

  const handleUpdateStatus = async (leadId, status, data) => {
    try {
      const note = typeof data === 'string' ? data : data.note;
      await associateService.updateStatus(leadId, status, note);
      toast.success('Status updated');
      fetchData();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleRecordCallOutcome = async (leadId, data) => {
    try {
      await associateService.recordOutcome(leadId, data);
      toast.success('Call outcome recorded');
      fetchData();
    } catch (err) {
      toast.error('Failed to record outcome');
    }
  };

  const handleSendPaymentLink = async (leadId, paymentData) => {
    try {
      const res = await associateService.sendPaymentLink(leadId, paymentData);
      toast.success('Payment link generated!');
      fetchData();
      setActiveTab('payments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ingestion failed: Manifest mapping error');
    }
  };

  const handleViewInvoice = (lead) => {
    window.open(`/invoice/${lead.id}`, '_blank');
  };

  const handleAddLead = async (leadData) => {
    try {
      console.log(">>> [DEBUG] Transmitting Lead:", leadData);
      const res = await associateService.addLead(leadData);
      console.log(">>> [DEBUG] Backend Response:", res.data);
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
      await associateService.updateLead(id, leadData);
      toast.success('Lead details updated');
      fetchData();
      return true;
    } catch (err) {
      toast.error('Update failed');
      return false;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(id) => {
        if (id === 'ingestion') setIsIngestionModalOpen(true);
        else setActiveTab(id);
      }}
      role="ASSOCIATE"
    >
      <div className="animate-fade-in d-flex flex-column gap-4">
        {/* GLOBAL RANGE FILTER */}
        {activeTab !== 'edit-lead' && activeTab !== 'ingestion' && (
          <FiltersBar
            filters={filters}
            onChange={setFilters}
            onSync={handleSync}
            title={user?.role === 'ASSOCIATE_TEAM_LEAD' ? "SQUAD CONTROL CENTER" : "IDENTITY NODE METRICS"}
            role={user?.role}
            currentUserId={user?.id}
            hideUserFilter={user?.role === 'ASSOCIATE'}
          />
        )}
        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <ManagerProfile manager={manager} />

            <div className="d-flex flex-column gap-3 animate-fade-in mb-4">
              <div className="px-1">
                <h5 className="fw-black text-main mb-1 text-uppercase tracking-widest small">Personal Command Center</h5>
                <p className="text-muted small fw-bold opacity-50 mb-0" style={{ fontSize: '9px' }}>VIEWING INDIVIDUAL OPERATIONAL PERFORMANCE</p>
              </div>

              {/* ROW 1: CRITICAL ACTIONS (3 CARDS) */}
              <div className="row g-3">
                <div className="col-12 col-md-6 col-lg-4">
                  {dashboardLoading ? <StatSkeleton /> : <StatCard
                    title="Task Overdue"
                    value={stats?.pendingFollowups || 0}
                    icon={<AlertCircle size={18} />}
                    color="danger"
                    onClick={() => setActiveTab('tasks')}
                  />}
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  {dashboardLoading ? <StatSkeleton /> : <StatCard
                    title="Payment Overdue"
                    value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.pendingPaymentsAmount || 0)}
                    icon={<IndianRupee size={18} />}
                    color="danger"
                    unit=""
                    onClick={() => setActiveTab('payments')}
                  />}
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  {dashboardLoading ? <StatSkeleton /> : <StatCard
                    title="Today Task"
                    value={stats?.todayFollowups || 0}
                    icon={<ClipboardList size={18} />}
                    color="warning"
                    onClick={() => setActiveTab('tasks')}
                  />}
                </div>
              </div>

              {/* ROW 2: PERFORMANCE TOTALS (3 CARDS) */}
              <div className="row g-3">
                <div className="col-12 col-md-4 col-lg-4">
                  {dashboardLoading ? <StatSkeleton /> : <StatCard
                    title="Total Leads"
                    value={stats?.totalLeads ?? leads.length}
                    icon={<Users size={18} />}
                    color="primary"
                    onClick={() => setActiveTab('leads')}
                  />}
                </div>
                <div className="col-12 col-md-4 col-lg-4">
                  {dashboardLoading ? <StatSkeleton /> : <StatCard
                    title="Total Converted"
                    value={stats?.convertedCount ?? leads.filter(l => ['CONVERTED', 'PAID', 'EMI', 'SUCCESS'].includes(l.status)).length}
                    icon={<CheckCircle size={18} />}
                    color="success"
                    onClick={() => setActiveTab('leads')}
                  />}
                </div>
                <div className="col-12 col-md-4 col-xl-4">
                  {dashboardLoading ? <StatSkeleton /> : <StatCard
                    title="Today Follow up"
                    value={stats?.todayFollowups || 0}
                    icon={<Phone size={18} />}
                    color="pink"
                    onClick={() => setActiveTab('tasks')}
                  />}
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-12">
                <div className="premium-card overflow-hidden shadow-lg border-0 h-100">
                  <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                    <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Conversion Velocity</h6>
                    <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INDIVIDUAL TREND ANALYTICS</p>
                  </div>
                  <div className="card-body p-4" style={{ height: '400px' }}>
                    {dashboardLoading ? <ChartSkeleton /> : (
                      <React.Suspense fallback={<ChartSkeleton />}>
                        <LazyRevenueTrendChart data={trend} theme={isDarkMode ? 'dark' : 'light'} />
                      </React.Suspense>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <div className="premium-card overflow-hidden shadow-lg border-0">
              <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Individual Lead Pool</h5>
                  <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>OPERATIONAL WORKFLOW & CONVERSION PIPELINE</p>
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
                <LeadTable
                  leads={leads}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateLead={handleUpdateLead}
                  onEdit={(lead) => {
                    setEditingLead(lead);
                    setActiveTab('edit-lead');
                  }}
                  onRecordCallOutcome={handleRecordCallOutcome}
                  onSendPaymentLink={handleSendPaymentLink}
                  onViewInvoice={handleViewInvoice}
                  role="ASSOCIATE"
                  showActions={true}
                />
              </div>
            </div>
          </div>
        )}


        {activeTab === 'tasks' && (
          <TaskBoard
            leads={leads}
            theme={isDarkMode ? 'dark' : 'light'}
            onUpdateStatus={handleUpdateStatus}
            onSendPaymentLink={handleSendPaymentLink}
            fetchLeads={fetchData}
            userId={user?.id}
            hideFilters={true}
            startDate={filters.from}
            endDate={filters.to}
            refreshTrigger={refreshTrigger}
          />
        )}
        {activeTab === 'reports' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">

            <div className="row g-4 mb-4">
              {/* Stats moved to Overview */}
            </div>

            <div className="row g-4">
              <div className="col-12">
                <div className="premium-card border-0 shadow-lg overflow-hidden">
                  <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-black mb-0 text-main small tracking-widest text-uppercase">Revenue Analytics Pipeline</h6>
                      <small className="text-muted fw-bold opacity-50" style={{ fontSize: '8px' }}>CORRELATION: LEADS GENERATED VS CONVERSION VALUE</small>
                    </div>
                    <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle shadow-sm border border-primary border-opacity-10">
                      <TrendingUp size={16} />
                    </div>
                  </div>
                  <div className="card-body p-4">
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <LazyRevenueTrendChart data={trend} theme={isDarkMode ? 'dark' : 'light'} />
                    </React.Suspense>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="d-flex flex-column gap-4">
            <div className="px-2">
              <h5 className="fw-black mb-1 text-main text-uppercase tracking-widest small">Financial Transmission Archive</h5>
              <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>VIEW PERSONAL CONVERSION AND REVENUE HISTORY</p>
            </div>
            <PaymentHistory
              role="ASSOCIATE"
              from={filters.from}
              to={filters.to}
              hideFilters={true}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {activeTab === 'attendance' && (
          <AttendanceDashboard
            role="ASSOCIATE"
            startDate={filters.from}
            endDate={filters.to}
            refreshTrigger={refreshTrigger}
            hideFilters={true}
          />
        )}

        {activeTab === 'call-logs' && (
          <div className="animate-fade-in">
            <CallLogDashboard
              hideHeader={true}
              filters={filters}
              onChange={setFilters}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="animate-fade-in">
            <TicketManager role="ASSOCIATE" />
          </div>
        )}


        {activeTab === 'edit-lead' && (
          <LeadEditPage
            lead={editingLead}
            users={[]} // Associates don't manage hierarchy but can see their info
            role={user?.role}
            onCancel={() => {
              setEditingLead(null);
              setActiveTab('leads');
            }}
            onSendPaymentLink={handleSendPaymentLink}
            onSave={async (data) => {
              const success = await handleUpdateLead(editingLead.id, data);
              if (success) {
                setEditingLead(null);
                setActiveTab('leads');
              }
            }}
          />
        )}
      </div>


      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoiceData={selectedInvoiceData}
      />

      <LeadModal
        isOpen={isIngestionModalOpen}
        onClose={() => setIsIngestionModalOpen(false)}
        onAddLead={handleAddLead}
        onSuccess={fetchData}
        associates={[]}
      />
    </DashboardLayout>
  );
};

export default AssociateDashboard;
