import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardLayout from '../components/layout/DashboardLayout';
import LeadEditPage from './dashboard/components/LeadEditPage';
import PaymentHistory from '../components/PaymentHistory';
import TaskBoard from '../components/TaskBoard';
import RevenueTrendChart from './dashboard/components/RevenueTrendChart';
import FiltersBar from './dashboard/components/FiltersBar';
import InvoiceModal from './dashboard/components/InvoiceModal';
import paymentService from '../services/paymentService';
import AttendanceDashboard from '../components/pages/AttendanceDashboard';
import CallAnalyticsGrid from './dashboard/components/CallAnalyticsGrid';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import TicketManager from '../components/TicketManager';

import ManagerProfile from './dashboard/components/ManagerProfile';
import authService from '../services/authService';
import LeadIngestionModal from './dashboard/components/LeadIngestionModal';

const AssociateDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState(null);
  const [manager, setManager] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [trendData, setTrendData] = useState([]);
  const [callStats, setCallStats] = useState(null);
  const [filters, setFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0] + 'T00:00:00',
    to: new Date().toISOString().split('T')[0] + 'T23:59:59'
  });

  // Invoice state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleSync = () => setRefreshTrigger(prev => prev + 1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsFilters = { start: filters.from, end: filters.to };
      const trendFilters = { from: filters.from.split('T')[0], to: filters.to.split('T')[0] };

      const [statsRes, leadsRes, trendRes, callStatsRes, profileRes] = await Promise.all([
        associateService.fetchPerformanceStats(statsFilters),
        associateService.fetchMyLeads(),
        associateService.fetchTrendData(trendFilters),
        associateService.fetchCallStats({ date: filters.from.split('T')[0] }),
        authService.getProfile()
      ]);
      setStats(statsRes.data);
      const fetchedLeads = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.content || []);
      setLeads(fetchedLeads);
      setTrendData(trendRes.data);
      setCallStats(callStatsRes.data?.data || callStatsRes.data);
      setManager(profileRes.data?.supervisor || profileRes.data?.manager);

      // Revenue Calculation Overdrive: Ensuring correctness across backend gaps.
      try {
        // 1. Calculate from Payment Ledger (most accurate for tracked payments)
        const historyRes = await paymentService.fetchHistory('ASSOCIATE', {
          startDate: filters.from,
          endDate: filters.to
        });
        const payments = historyRes.data || [];
        const paymentRevenue = payments
          .filter(p => ['PAID', 'SUCCESS', 'APPROVED'].includes(p.status))
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        // 2. Calculate from Lead Pipeline (fallback for manual conversions or EMI placeholders)
        // Note: For EMI leads, we count the full amount if no payments are logged, otherwise payments take priority.
        const leadStatusRevenue = fetchedLeads
          .filter(l => ['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(l.status))
          .reduce((sum, l) => sum + (parseFloat(l.totalAmount || l.amount || 499) || 0), 0);
        
        const calculatedRevenue = Math.max(paymentRevenue, leadStatusRevenue);
        
        const convertedCount = fetchedLeads.filter(l => ['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(l.status)).length;
        const totalLeads = fetchedLeads.length;

        setStats(prev => ({
          ...prev,
          total: totalLeads,
          convertedCount,
          totalRevenue: Math.max(prev?.totalRevenue || 0, calculatedRevenue),
          pendingPaymentsAmount: statsRes.data.pendingPaymentsAmount,
          forecastRevenue: statsRes.data.forecastRevenue,
          pendingPayments: statsRes.data.pendingPayments,
          pendingFollowUps: statsRes.data.pendingFollowUps,
          followUpPool: statsRes.data.followUpPool,
          todayFollowUps: statsRes.data.todayFollowUps
        }));
      } catch (err) {
        console.warn('Revenue recalculation failed, falling back to backend stats');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, refreshTrigger]);

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

  const handleViewInvoice = async (lead) => {
    try {
      toast.info('Retrieving official receipt...');
      const res = await paymentService.fetchInvoiceByLead(lead.id);
      setSelectedInvoiceData(res.data);
      setIsInvoiceModalOpen(true);
    } catch (err) {
      toast.error('Failed to retrieve invoice - no confirmed payment found');
    }
  };

  const handleAddLead = async (leadData) => {
    try {
      await associateService.addLead(leadData);
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
      onTabChange={setActiveTab}
      role="ASSOCIATE"
    >
      <div className="animate-fade-in d-flex flex-column gap-4">
        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
             {/* GLOBAL RANGE FILTER */}
             <FiltersBar 
                filters={filters} 
                onChange={setFilters} 
                onSync={handleSync}
                title="Identity Node Metrics"
                role="ASSOCIATE"
             />

             <ManagerProfile manager={manager} />

             {/* ROW 1: CRITICAL ACTIONS (4 CARDS) */}
             <div className="row g-3 mb-3">
                <div className="col-12 col-md-6 col-xl-3">
                  <StatCard title="Today's Schedule" value={stats?.todayFollowUps || 0} icon={<Clock size={18} />} color="secondary" onClick={() => setActiveTab('tasks')} />
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <StatCard title="Payment Overdue" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.pendingPaymentsAmount || 0)} icon={<IndianRupee size={18} />} color="danger" unit="" onClick={() => setActiveTab('payments')} />
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <StatCard title="Follow-up Overdue" value={stats?.pendingFollowUps || 0} icon={<AlertCircle size={18} />} color="warning" onClick={() => setActiveTab('leads')} />
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <StatCard title="30-Day Revenue Forecast" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.forecastRevenue || 0)} icon={<TrendingUp size={18} />} color="info" unit="" onClick={() => setActiveTab('payments')} />
                </div>
             </div>

             {/* ROW 2: PERFORMANCE TOTALS (3 CARDS) */}
             <div className="row g-3 mb-4 justify-content-center">
                <div className="col-12 col-md-4 col-xl-4">
                  <StatCard title="Total Leads" value={stats?.total || 0} icon={<Users size={18} />} color="primary" onClick={() => setActiveTab('leads')} />
                </div>
                <div className="col-12 col-md-4 col-xl-4">
                  <StatCard title="Total Converted" value={stats?.convertedCount || 0} icon={<CheckCircle size={18} />} color="success" onClick={() => setActiveTab('leads')} />
                </div>
                <div className="col-12 col-md-4 col-xl-4">
                  <StatCard title="Total Revenue" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.totalRevenue || 0)} icon={<Zap size={18} />} color="pink" unit="" onClick={() => setActiveTab('reports')} />
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
                         <RevenueTrendChart data={trendData} theme={isDarkMode ? 'dark' : 'light'} />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <FiltersBar 
              filters={filters} 
              onChange={setFilters} 
              onSync={handleSync}
              title="Identity Node Metrics"
              role="ASSOCIATE"
            />
            <div className="premium-card overflow-hidden shadow-lg border-0">
            <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Individual Lead Pool</h5>
                <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>OPERATIONAL WORKFLOW & CONVERSION PIPELINE</p>
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
          />
        )}

        {activeTab === 'reports' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
            <FiltersBar 
              filters={filters} 
              onChange={setFilters} 
              onSync={handleSync}
              title="Identity Node Metrics"
              role="ASSOCIATE"
            />

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
                    <RevenueTrendChart data={trendData} theme={isDarkMode ? 'dark' : 'light'} />
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
            <PaymentHistory role="ASSOCIATE" from={filters.from} to={filters.to} />
          </div>
        )}

        {activeTab === 'attendance' && (
          <AttendanceDashboard role="ASSOCIATE" />
        )}
        
        {activeTab === 'call-logs' && (
          <div className="animate-fade-in">
             <CallLogDashboard />
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

      <LeadIngestionModal 
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
