import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import paymentService from '../services/paymentService';
import adminService from '../services/adminService';
import managerService from '../services/managerService';
import tlService from '../services/tlService';
import { toast } from 'react-toastify';
import { IndianRupee, CheckCircle, Scissors, PlusCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import SplitInstallmentModal from './SplitInstallmentModal';
import RecordPaymentModal from './RecordPaymentModal';
import ManualPaymentModal from './ManualPaymentModal';
import InvoiceModal from '../pages/dashboard/components/InvoiceModal';
import { TableSkeleton, MetricSkeletonRow } from '../pages/dashboard/components/DashboardSkeletons';
import { SystemStatGrid, SystemStatCard } from './SystemStatCard';

const PaymentHistory = ({ role, userId: externalUserId, managerId: externalManagerId, teamId: externalTeamId, from: externalFrom, to: externalTo, hideHeader = false, hideFilters = false, refreshTrigger, externalStats }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [filters, setFilters] = useState({
    startDate: externalFrom || '',
    endDate: externalTo || '',
    managerId: externalManagerId || '',
    tlId: externalTeamId || '',
    associateId: '',
    userId: externalUserId || '',
    status: ''
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Debounce filters to prevent API spam
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  // Sync with external filters — always respond, including null resets
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      startDate: externalFrom || prev.startDate,
      endDate: externalTo || prev.endDate,
      // Explicitly respect null (e.g. managerId=null for My Dashboard)
      managerId: externalManagerId !== undefined ? (externalManagerId || '') : prev.managerId,
      tlId: externalTeamId !== undefined ? (externalTeamId || '') : prev.tlId,
      userId: externalUserId !== undefined ? (externalUserId || '') : prev.userId,
    }));
  }, [externalFrom, externalTo, externalUserId, externalManagerId, externalTeamId]);

  const [associates, setAssociates] = useState([]);
  const [fetchingAssociates, setFetchingAssociates] = useState(false);
  const [selectedSplitPayment, setSelectedSplitPayment] = useState(null);
  const [selectedClearPayment, setSelectedClearPayment] = useState(null);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');

  const handleViewInvoice = (payment) => {
    window.open(`/invoice/${payment.leadId}`, '_blank');
  };

  const fetchTeamLeaders = async () => {
    if ((role === 'ADMIN' || role === 'MANAGER') && !externalUserId) {
      try {
        const res = role === 'ADMIN' ? await adminService.fetchUsers() : await managerService.fetchTeamLeaders();
        // Handle both direct array and ApiResponse object
        const payload = res.data !== undefined ? res.data : res;
        const users = payload?.content || payload || [];
        
        if (Array.isArray(users)) {
          setTeamLeaders(role === 'ADMIN' ? users.filter(u => u.role === 'TEAM_LEADER' || u.role === 'MANAGER') : users);
        }
      } catch (err) {
        console.error('Failed to fetch team leaders', err);
      }
    }
  };

  const fetchHistory = async (activeFiltersParam) => {
    const activeFiltersSource = activeFiltersParam || debouncedFilters;
    setLoading(true);
    try {
      const queryFilters = { ...activeFiltersSource };
      // externalUserId is a strict self-filter (My Dashboard)
      if (externalUserId) {
        queryFilters.userId = externalUserId;
        queryFilters.managerId = '';  // never send managerId for self view
        queryFilters.associateId = '';
      }
      // Map startDate/endDate to from/to for the API if necessary
      const apiFilters = {
        ...queryFilters,
        startDate: queryFilters.startDate ? (queryFilters.startDate.includes('T') ? queryFilters.startDate : `${queryFilters.startDate}T00:00:00`) : '',
        endDate: queryFilters.endDate ? (queryFilters.endDate.includes('T') ? queryFilters.endDate : `${queryFilters.endDate}T23:59:59`) : ''
      };
      const res = await paymentService.fetchHistory(role, apiFilters);
      const payload = res.data !== undefined ? res.data : res;
      setPayments(Array.isArray(payload) ? payload : (payload?.content || []));
    } catch (err) {
      console.error('Failed to sync financial history', err);
      // Removed setPayments([]) to preserve stale data
    } finally {
      setLoading(false);
    }
  };

  const handleManualClear = async (paymentId, data) => {
    try {
      await paymentService.updatePaymentStatus(paymentId, data);
      toast.success('Payment recorded successfully');
      setSelectedClearPayment(null);
      fetchHistory();
    } catch (err) {
      toast.error('Failed to update transaction state');
    }
  };

  const handleSplitConfirm = async (paymentId, splitData) => {
    try {
      await paymentService.splitPayment(paymentId, splitData);
      toast.success('Invoiced amount distributed into installments');
      setSelectedSplitPayment(null);
      fetchHistory();
    } catch (err) {
      toast.error('Distribution protocol failed');
    }
  };

  const fetchAssociates = async (tlId) => {
    if (!tlId) {
      setAssociates([]);
      return;
    }
    setFetchingAssociates(true);
    try {
      let res;
      if (role === 'ADMIN') {
        res = await adminService.fetchAssociatesByTl(tlId);
      } else if (role === 'TEAM_LEADER') {
        res = await tlService.fetchSubordinates();
      } else {
        res = await managerService.fetchAssociatesByTl ? await managerService.fetchAssociatesByTl(tlId) : { data: [] };
      }
      setAssociates(Array.isArray(res) ? res : (res?.data || res?.content || []));
    } catch (err) {
      console.error('Failed to map associate leads');
    } finally {
      setFetchingAssociates(false);
    }
  };

  useEffect(() => {
    fetchHistory(debouncedFilters);
    fetchTeamLeaders();
  }, [
    role, 
    debouncedFilters.startDate, 
    debouncedFilters.endDate, 
    debouncedFilters.managerId, 
    debouncedFilters.tlId, 
    debouncedFilters.userId, 
    debouncedFilters.status,
    externalUserId, 
    refreshTrigger
  ]);

  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');

  useEffect(() => {
    if (filters.tlId) {
      fetchAssociates(filters.tlId);
      setFilters(prev => ({ ...prev, associateId: '' }));
    } else {
      setAssociates([]);
    }
  }, [filters.tlId]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const resetFilters = () => {
    setFilters({ startDate: externalFrom || '', endDate: externalTo || '', tlId: '', associateId: '', status: '' });
    setStudentSearch('');
    setDueFrom('');
    setDueTo('');
    setAssociates([]);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Apply client-side filters for student name and due date
  const filteredPayments = (payments || []).filter(payment => {
    if (payment.status === 'CANCELLED') return false;
    
    // Status Card Filter
    if (paymentStatusFilter !== 'ALL') {
      const s = payment.status?.toUpperCase();
      const isPaid = ['PAID', 'SUCCESS', 'APPROVED', 'COMPLETED'].includes(s);
      const isPending = ['PENDING', 'INITIATED', 'PARTIAL', 'PARTIAL_PENDING', 'PENDING_APPROVAL', 'UNDER_REVIEW'].includes(s);
      
      const now = new Date();
      const targetDate = new Date(payment.dueDate || payment.createdAt);
      const isOverdueByDate = isPending && targetDate < now;
      const isExplicitOverdue = s === 'FAILED' || s === 'OVERDUE' || s === 'REJECTED';
      const isAnyOverdue = isExplicitOverdue || isOverdueByDate;

      if (paymentStatusFilter === 'PAID' && !isPaid) return false;
      if (paymentStatusFilter === 'PENDING' && !isPending) return false;
      if (paymentStatusFilter === 'OVERDUE' && !isAnyOverdue) return false;
    }

    if (studentSearch && !(payment.leadName || '').toLowerCase().includes(studentSearch.toLowerCase())) return false;
    const dueDateStr = payment.dueDate ? payment.dueDate.substring(0, 10) : (payment.createdAt ? payment.createdAt.substring(0, 10) : '');
    if (dueFrom && dueDateStr < dueFrom) return false;
    if (dueTo && dueDateStr > dueTo) return false;
    return true;
  });

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [studentSearch, dueFrom, dueTo, debouncedFilters]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);

  // Evaluate initial load state without early returning
  const isInitialLoading = loading && (!payments || payments.length === 0);

  const successfulPayments = (payments || []).filter(p => ['PAID', 'SUCCESS', 'APPROVED', 'PARTIAL', 'COMPLETED'].includes(p.status?.toUpperCase()));
  const paymentStats = {
    totalRevenue: externalStats ? (externalStats.monthlyRevenue || externalStats.totalRevenue || externalStats.revenue || 0) : successfulPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    pendingRevenue: externalStats ? (externalStats.pendingRevenueAmount || externalStats.pendingPaymentsAmount || externalStats.pendingRevenue || 0) : (payments || [])
      .filter(p => {
        const s = p.status?.toUpperCase();
        return s === 'PENDING' || s === 'FAILED' || s === 'INITIATED' || s === 'PARTIAL_PENDING' || s === 'PENDING_APPROVAL' || s === 'UNDER_REVIEW';
      })
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    totalInvoiced: (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    overdueCount: (payments || []).filter(p => {
        const status = p.status?.toUpperCase();
        const isOverdue = status === 'FAILED' || status === 'OVERDUE' || status === 'REJECTED';
        const isPending = status === 'PENDING' || status === 'INITIATED' || status === 'PARTIAL' || status === 'PENDING_APPROVAL' || status === 'UNDER_REVIEW';
        const now = new Date();
        const targetDate = new Date(p.dueDate || p.createdAt);
        return isOverdue || (isPending && targetDate < now);
    }).length
  };

  return (
    <>
      <style>{`
        .dashboard-loading-overlay {
          position: absolute;
          top: 0;
          right: 0;
          padding: 8px 16px;
          z-index: 20;
          font-size: 12px;
          font-weight: 600;
          border-radius: 0 0 0 12px;
          background: var(--primary);
          color: white;
        }
      `}</style>
      
      {isInitialLoading ? (
        <div className="animate-fade-in mt-2">
          <MetricSkeletonRow />
          <div className="mt-4">
            <TableSkeleton rows={8} />
          </div>
        </div>
      ) : (
        <div className="animate-fade-in mt-2 pb-5 position-relative">
          {loading && payments.length > 0 && (
            <div className="dashboard-loading-overlay shadow-sm animate-pulse">
              Updating data...
            </div>
          )}
          {/* Financial Analytics Workspace */}
      <SystemStatGrid>
        {[
          { id: 'PAID', label: 'Collected', value: `₹${(paymentStats.totalRevenue || 0).toLocaleString()}`, color: 'text-success' },
          { id: 'PENDING', label: 'Pending', value: `₹${(paymentStats.pendingRevenue || 0).toLocaleString()}`, color: 'text-main' },
          { id: 'OVERDUE', label: 'Overdue', value: (paymentStats.overdueCount || 0), color: 'text-danger' }
        ].map((stat) => (
          <SystemStatCard 
            key={stat.id}
            label={stat.label}
            value={stat.value}
            colorClass={stat.color}
            isActive={paymentStatusFilter === stat.id}
            onClick={() => setPaymentStatusFilter(prev => prev === stat.id ? 'ALL' : stat.id)}
          />
        ))}
      </SystemStatGrid>

      <div className="mt-1"></div>

      <div className="premium-card overflow-hidden shadow-lg border-0 bg-surface bg-opacity-20">
        {!hideHeader && !externalUserId && (
          <div className="card-header bg-transparent border-bottom border-white border-opacity-5 p-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3 border border-primary border-opacity-10 shadow-sm">
                  <Clock size={18} />
              </div>
              <div>
                  <h6 className="fw-bold text-main mb-0 small text-uppercase tracking-wider">Active EMI Schedule</h6>
                  <p className="mb-0 text-muted fw-bold" style={{fontSize: '9px'}}>TOTAL {filteredPayments.length} ENTRIES MAPPED</p>
              </div>
            </div>
          </div>
        )}

        {/* Removed local filter bar as per user request to simplify UI and rely on global filters */}


        {/* Local Search for External Filter Mode */}
        {!hideFilters && (externalUserId || externalFrom) && (
          <div className="p-3 bg-surface bg-opacity-20 d-flex justify-content-between align-items-center border-bottom border-white border-opacity-5">
             <div className="d-flex align-items-center gap-2">
                <FileText size={16} className="text-primary opacity-50" />
                <h6 className="fw-black text-main mb-0 small text-uppercase tracking-widest">Master Financial Ledger</h6>
             </div>
             <div className="d-flex gap-2">
                <input
                  type="text"
                  className="bg-surface bg-opacity-50 border-0 text-main py-1 px-4 rounded-pill"
                  placeholder="Seach Student..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  style={{ fontSize: '11px', outline: 'none', width: '200px' }}
                />
             </div>
          </div>
        )}

        {/* Desktop Table View - Now responsive for all screens */}
        <div className="table-responsive no-scrollbar p-0" style={{ overflowX: 'auto' }}>
          <table className="table table-hover align-middle mb-0 border-0 bg-transparent text-main" style={{ minWidth: '900px' }}>
            <thead>
              <tr className="border-bottom border-white border-opacity-5">
                <th className="ps-4 py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>EMI Identifier</th>
                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Lead Asset</th>
                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Amount (INR)</th>
                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Target Date</th>
                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Sync State</th>
                <th className="pe-4 py-3 text-end text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Operations</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((payment, index) => {
                const globalIndex = indexOfFirstItem + index;
                const emiId = payment.paymentGatewayId || `E-${(globalIndex + 1).toString().padStart(2, '0')}`;
                const isOverdue = payment.status === 'FAILED' || payment.status === 'OVERDUE' || payment.status === 'REJECTED';
                const isPendingApproval = payment.status === 'PENDING_APPROVAL' || payment.status === 'UNDER_REVIEW';
                const isPending = payment.status === 'PENDING' || payment.status === 'INITIATED' || payment.status === 'PARTIAL' || isPendingApproval;
                const isPaid = payment.status === 'PAID' || payment.status === 'SUCCESS' || payment.status === 'APPROVED';
                
                const now = new Date();
                const targetDate = new Date(payment.dueDate || payment.createdAt);
                const isOverdueByDate = !isPaid && !isPendingApproval && targetDate < now;
                
                const dueDateObj = payment.dueDate ? new Date(payment.dueDate) : new Date(payment.createdAt);
                const dueDate = dueDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const dueTime = dueDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={payment.id || `pay-${index}`} className="border-bottom border-white border-opacity-5 transition-all">
                    <td className="ps-4 py-4">
                      <span className="fw-bold text-main small">{emiId}</span>
                    </td>
                    <td className="py-4">
                      <span className="fw-bold text-main small">{payment.leadName || 'System Target'}</span>
                    </td>
                    <td className="py-4">
                      <span className="fw-black text-main">₹{payment.amount.toLocaleString()}</span>
                    </td>
                    <td className="py-4">
                      <div className="d-flex flex-column">
                        <span className={`fw-black small ${isOverdue || isOverdueByDate ? 'text-danger' : 'text-main'}`}>{dueDate}</span>
                        <span className="text-muted fw-bold opacity-60" style={{ fontSize: '10px' }}>{dueTime}</span>
                      </div>
                    </td>
                    <td className="py-4">
                       {isPaid && (
                         <div className="ui-badge bg-success bg-opacity-10 text-success border border-success border-opacity-20">
                           <CheckCircle size={10} />
                           <span className="fw-black text-uppercase ms-1" style={{ fontSize: '9px' }}>Paid</span>
                         </div>
                       )}
                       {isPending && (
                         <div className={`ui-badge bg-opacity-10 border border-opacity-20 ${isPendingApproval ? 'bg-info text-info border-info' : (isOverdueByDate ? 'bg-danger text-danger border-danger' : 'bg-warning text-warning border-warning')}`}>
                           {isPendingApproval ? <FileText size={10} /> : (isOverdueByDate ? <AlertCircle size={10} /> : <Clock size={10} />)}
                           <span className="fw-black text-uppercase ms-1" style={{ fontSize: '9px' }}>
                             {isPendingApproval ? 'Pending Approval' : (isOverdueByDate ? 'Overdue / Pending' : 'Live / Pending')}
                           </span>
                         </div>
                       )}
                       {isOverdue && (
                         <div className="ui-badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20">
                           <span className="fw-black text-uppercase" style={{ fontSize: '9px' }}>Overdue Breach</span>
                         </div>
                       )}
                    </td>
                    <td className="pe-4 py-4 text-end">
                          <div className="d-flex align-items-center justify-content-end gap-3">
                             {(isPending || isOverdue) && (
                               <>
                                 <button 
                                   onClick={() => {
                                     navigate(`/leads/${payment.leadId}/details`, { state: { activeTab: 'FEE_STRUCTURE' } });
                                   }}
                               className={`btn btn-sm rounded-pill px-4 fw-black ${isPendingApproval ? 'ui-btn ui-btn-primary shadow-glow text-white' : 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25'}`}
                               style={{ fontSize: '10px' }}
                             >
                               {isPendingApproval ? 'APPROVE' : 'RECORD'}
                             </button>
                           </>
                         )}
                         {isPaid && (
                           <div className="d-flex flex-column align-items-end gap-1">
                             <button 
                               onClick={() => handleViewInvoice(payment)}
                               className="btn btn-link text-muted p-0 text-decoration-none d-flex align-items-center gap-2 hover-text-primary transition-all opacity-50 hover-opacity-100"
                               style={{ fontSize: '11px', fontWeight: '900' }}
                             >
                               <FileText size={12} /> ARCHIVE
                             </button>
                             <span className="text-success fw-black opacity-25" style={{ fontSize: '8px', textTransform: 'uppercase' }}>Confirmed</span>
                           </div>
                         )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="d-flex justify-content-between align-items-center p-4 border-top border-main border-opacity-10">
              <div className="text-muted small fw-bold">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPayments.length)} of {filteredPayments.length} entries
              </div>
              <div className="d-flex gap-2">
                <button
                  className={`ui-btn btn-sm px-3 rounded-pill ${currentPage === 1 ? 'opacity-25 cursor-not-allowed' : ''}`}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)' }}
                >
                  PREVIOUS
                </button>
                
                <div className="d-flex gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first, last, and pages around current
                    if (
                      pageNum === 1 || 
                      pageNum === totalPages || 
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`ui-btn btn-sm rounded-circle d-flex align-items-center justify-content-center p-0 ${currentPage === pageNum ? 'ui-btn-primary' : ''}`}
                          style={{ 
                            width: '28px', 
                            height: '28px', 
                            fontSize: '10px',
                            background: currentPage === pageNum ? '' : 'rgba(255,255,255,0.05)',
                            color: 'var(--text-main)'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === currentPage - 2 || 
                      pageNum === currentPage + 2
                    ) {
                      return <span key={pageNum} className="text-muted px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  className={`ui-btn btn-sm px-3 rounded-pill ${currentPage === totalPages ? 'opacity-25 cursor-not-allowed' : ''}`}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)' }}
                >
                  NEXT
                </button>
              </div>
            </div>

          
          {filteredPayments.length === 0 && !loading && (
            <div className="text-center py-5 d-flex flex-column align-items-center opacity-20">
                <IndianRupee size={48} className="mb-3 text-muted" />
                <p className="fw-black text-muted text-uppercase mb-0 tracking-widest small">FINANCIAL CLEARANCE NULL</p>
            </div>
          )}
        </div>
      </div>

      <ManualPaymentModal 
        show={!!selectedClearPayment}
        onClose={() => setSelectedClearPayment(null)}
        payment={selectedClearPayment}
        onConfirm={handleManualClear}
      />

      <SplitInstallmentModal 
        show={!!selectedSplitPayment}
        onClose={() => setSelectedSplitPayment(null)}
        payment={selectedSplitPayment}
        onConfirm={handleSplitConfirm}
      />

      <InvoiceModal 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)} 
        invoiceData={selectedInvoiceData} 
      />
        </div>
      )}
    </>
  );
};

export default PaymentHistory;
