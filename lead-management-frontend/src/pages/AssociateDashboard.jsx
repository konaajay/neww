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
  UserPlus
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
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.content || []));
      setTrendData(trendRes.data);
      setCallStats(callStatsRes.data?.data || callStatsRes.data);
      setManager(profileRes.data?.supervisor || profileRes.data?.manager);

      // Revenue Calculation Overdrive: If backend stats miss 'SUCCESS' or 'APPROVED' status,
      // we recalculate from the payment ledger to ensure correctness.
      try {
        const historyRes = await paymentService.fetchHistory('ASSOCIATE', {
          startDate: filters.from,
          endDate: filters.to
        });
        const payments = historyRes.data || [];
        const calculatedRevenue = payments
          .filter(p => ['PAID', 'SUCCESS', 'APPROVED'].includes(p.status))
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        // Update stats with the more accurate calculated revenue if it's higher than the backend's reported value
        // or if the backend value is potentially stale.
        setStats(prev => ({
          ...prev,
          totalRevenue: Math.max(prev?.totalRevenue || 0, calculatedRevenue)
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
             <ManagerProfile manager={manager} />
             <div className="row g-4">
                <div className="col-12 col-md-3">
                  <StatCard title="Total Leads" value={stats?.total || 0} sub="Active Workspace" icon={<Users size={18} />} color="primary" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Conversions" value={stats?.convertedCount || 0} sub="Successful Cycles" icon={<CheckCircle size={18} />} color="success" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Lost Nodes" value={stats?.lostCount || 0} sub="Closed Files" icon={<Zap size={18} />} color="danger" />
                </div>
                <div className="col-12 col-md-3">
                  <StatCard title="Your Revenue" value={`₹ ${stats?.totalRevenue?.toLocaleString() || 0}`} sub="Current Month" icon={<IndianRupee size={18} />} color="info" unit="INR" />
                </div>
             </div>
                          <div className="row g-4 mb-4">
                <div className="col-12 col-xl-8">
                   <div className="premium-card overflow-hidden shadow-lg border-0 h-100">
                      <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                         <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Conversion Velocity</h6>
                         <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INDIVIDUAL TREND ANALYTICS</p>
                      </div>
                      <div className="card-body p-4" style={{ height: '350px' }}>
                         <RevenueTrendChart data={trendData} theme={isDarkMode ? 'dark' : 'light'} />
                      </div>
                   </div>
                </div>
                
                <div className="col-12 col-xl-4">
                   <div className="d-flex flex-column gap-4 h-100">
                      {/* Priority Hub */}
                      <div className="premium-card p-4 border-0 shadow-lg bg-surface bg-opacity-20 d-flex flex-column gap-3">
                         <div>
                            <h6 className="fw-black mb-3 text-main small tracking-widest text-uppercase">Priority Hub</h6>
                            <div className="d-flex flex-column gap-3">
                               <div className="p-3 bg-dark bg-opacity-50 rounded-4 border border-white border-opacity-5 d-flex align-items-center gap-3">
                                  <div className="p-2 bg-success bg-opacity-10 text-success rounded-3">
                                     <TrendingUp size={18} />
                                  </div>
                                  <div>
                                     <p className="mb-0 fw-black text-main small">Efficiency Matrix</p>
                                     <p className="mb-0 text-muted" style={{fontSize: '9px'}}>TOP PERFORMANCE TRACKED</p>
                                  </div>
                               </div>
                               <div className="p-3 bg-dark bg-opacity-50 rounded-4 border border-white border-opacity-5 d-flex align-items-center gap-3">
                                  <div className="p-2 bg-warning bg-opacity-10 text-warning rounded-3">
                                     <Phone size={18} />
                                  </div>
                                  <div className="flex-grow-1">
                                     <p className="mb-0 fw-black text-main small">{leads?.length || 0} Active Leads</p>
                                     <p className="mb-0 text-muted" style={{fontSize: '9px'}}>REQUIRES TRANSMISSION SCAN</p>
                                  </div>
                               </div>
                            </div>
                         </div>

                         {/* Recent Followups Section */}
                         <div className="mt-1 pt-3 border-top border-white border-opacity-5">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                               <h6 className="fw-black text-primary text-uppercase tracking-widest mb-0" style={{ fontSize: '9px' }}>Recent Followups</h6>
                               <div className="px-2 py-0.5 bg-primary bg-opacity-10 text-primary rounded-pill fw-black" style={{ fontSize: '8px' }}>REAL-TIME</div>
                            </div>
                            <div className="d-flex flex-column gap-2">
                               {leads
                                 ?.filter(l => l.nextFollowUpDate && new Date(l.nextFollowUpDate) >= new Date().setHours(0,0,0,0))
                                 ?.sort((a, b) => new Date(a.nextFollowUpDate) - new Date(b.nextFollowUpDate))
                                 ?.slice(0, 4)
                                 ?.map((lead, i) => (
                                   <div key={lead.id} className="p-2.5 bg-surface bg-opacity-30 rounded-3 d-flex justify-content-between align-items-center border border-white border-opacity-5 animate-slide-up" style={{ animationDelay: `${0.1 * (i+1)}s` }}>
                                      <div className="overflow-hidden">
                                         <p className="mb-0 fw-black text-main x-small text-truncate" style={{ fontSize: '11px' }}>{lead.name}</p>
                                         <p className="mb-0 text-muted opacity-50 fw-bold" style={{ fontSize: '8px' }}>{lead.status}</p>
                                      </div>
                                      <div className="text-end flex-shrink-0 ms-2">
                                         <div className="text-primary fw-black tabular-nums" style={{ fontSize: '10px' }}>{new Date(lead.nextFollowUpDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                                      </div>
                                   </div>
                                 ))
                               }
                               {(leads?.filter(l => l.nextFollowUpDate).length === 0) && (
                                 <div className="text-center py-2 opacity-25">
                                    <p className="mb-0 small fw-bold tracking-tighter" style={{ fontSize: '8px' }}>NO PENDING TRANSMISSIONS</p>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>

                      {/* Dynamic Resource Card */}
                      <div className="premium-card p-4 border-0 shadow-lg flex-grow-1 position-relative overflow-hidden" 
                           style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), transparent)' }}>
                         <div className="position-absolute top-0 end-0 p-4 opacity-5">
                            <ShieldCheck size={120} />
                         </div>
                         <h6 className="fw-black mb-2 text-main small tracking-widest text-uppercase">System Health</h6>
                         <p className="text-muted small mb-4 opacity-75">Your operational node is fully synchronized.</p>
                         <button className="ui-btn ui-btn-primary w-100 py-3 rounded-pill" onClick={() => setActiveTab('leads')}>
                            Lead Terminal
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'leads' && (
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
            <PaymentHistory role="ASSOCIATE" />
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
