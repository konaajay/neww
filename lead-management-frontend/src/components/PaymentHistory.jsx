import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import adminService from '../services/adminService';
import managerService from '../services/managerService';
import tlService from '../services/tlService';
import { toast } from 'react-toastify';
import { IndianRupee, CheckCircle, Scissors, PlusCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import SplitInstallmentModal from './SplitInstallmentModal';
import RecordPaymentModal from './RecordPaymentModal';
import ManualPaymentModal from './ManualPaymentModal';
import InvoiceModal from '../pages/dashboard/components/InvoiceModal';

const PaymentHistory = ({ role, userId: externalUserId, from: externalFrom, to: externalTo, hideHeader = false, hideFilters = false }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [filters, setFilters] = useState({
    startDate: externalFrom || '',
    endDate: externalTo || '',
    tlId: '',
    associateId: '',
    status: ''
  });

  // Sync with external filters
  useEffect(() => {
    if (externalFrom || externalTo || externalUserId) {
      setFilters(prev => ({
        ...prev,
        startDate: externalFrom || prev.startDate,
        endDate: externalTo || prev.endDate
      }));
    }
  }, [externalFrom, externalTo, externalUserId]);

  const [associates, setAssociates] = useState([]);
  const [fetchingAssociates, setFetchingAssociates] = useState(false);
  const [selectedSplitPayment, setSelectedSplitPayment] = useState(null);
  const [selectedClearPayment, setSelectedClearPayment] = useState(null);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');

  const handleViewInvoice = async (payment) => {
    try {
      toast.info('Retrieving official receipt...');
      const res = await paymentService.fetchInvoiceByLead(payment.leadId);
      setSelectedInvoiceData(res.data);
      setIsInvoiceModalOpen(true);
    } catch (err) {
      toast.error('Failed to retrieve invoice. Ensure payment is confirmed.');
    }
  };

  const fetchTeamLeaders = async () => {
    if ((role === 'ADMIN' || role === 'MANAGER') && !externalUserId) {
      try {
        const res = role === 'ADMIN' ? await adminService.fetchUsers() : await managerService.fetchTeamLeaders();
        const users = res.data.content || res.data;
        setTeamLeaders(role === 'ADMIN' ? users.filter(u => u.role === 'TEAM_LEADER' || u.role === 'MANAGER') : users);
      } catch (err) {
        console.error('Failed to fetch team leaders');
      }
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const queryFilters = { ...filters };
      if (externalUserId) queryFilters.userId = externalUserId;
      // Map startDate/endDate to from/to for the API if necessary
      const apiFilters = {
        ...queryFilters,
        from: queryFilters.startDate ? queryFilters.startDate.split('T')[0] : '',
        to: queryFilters.endDate ? queryFilters.endDate.split('T')[0] : ''
      };
      const res = await paymentService.fetchHistory(role, apiFilters);
      setPayments(res.data);
    } catch (err) {
      toast.error('Failed to sync financial history');
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
      setAssociates(res.data);
    } catch (err) {
      console.error('Failed to map associate nodes');
    } finally {
      setFetchingAssociates(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchTeamLeaders();
  }, [role, filters.startDate, filters.endDate, filters.tlId, filters.associateId, filters.status, externalUserId]);

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

  if (loading && payments.length === 0) return (
    <div className="text-center py-5">
      <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
      <p className="text-muted small fw-bold text-uppercase mt-3 tracking-widest" style={{ fontSize: '10px' }}>Synchronizing Ledger...</p>
    </div>
  );

  // Apply client-side filters for student name and due date
  const filteredPayments = payments.filter(payment => {
    if (payment.status === 'CANCELLED') return false;
    if (studentSearch && !(payment.leadName || '').toLowerCase().includes(studentSearch.toLowerCase())) return false;
    const dueDateStr = payment.dueDate ? payment.dueDate.substring(0, 10) : (payment.createdAt ? payment.createdAt.substring(0, 10) : '');
    if (dueFrom && dueDateStr < dueFrom) return false;
    if (dueTo && dueDateStr > dueTo) return false;
    return true;
  });

  return (
    <div className="animate-fade-in mt-2">
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

        {/* Filters Wrapper - Conditionally hide if external filters provided */}
        {!hideFilters && !externalUserId && !externalFrom && (
          <div className="p-4 bg-surface bg-opacity-50 border-bottom border-white border-opacity-5 d-flex flex-wrap gap-4 align-items-end">
            <div className="flex-grow-1" style={{ maxWidth: '180px' }}>
              <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '9px', opacity: 0.6 }}>Operational Status</label>
              <select className="ui-input py-1.5" name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="" className="text-dark">All Statuses</option>
                <option value="PAID" className="text-dark">Cleared (Paid)</option>
                <option value="PENDING" className="text-dark">Upcoming (Pending)</option>
                <option value="FAILED" className="text-dark">Overdue (Failed)</option>
              </select>
            </div>
            {(role === 'ADMIN' || role === 'MANAGER') && !externalUserId && (
               <div className="flex-grow-1" style={{ maxWidth: '180px' }}>
                 <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '9px', opacity: 0.6 }}>Team Leader Focus</label>
                 <select className="ui-input py-1.5" name="tlId" value={filters.tlId} onChange={handleFilterChange}>
                   <option value="" className="text-dark">Universal Access</option>
                   {teamLeaders.map(tl => <option key={tl.id} value={tl.id} className="text-dark">{tl.name}</option>)}
                 </select>
               </div>
            )}
            {(role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER') && filters.tlId && !externalUserId && (
              <div className="flex-grow-1" style={{ maxWidth: '180px' }}>
                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '9px', opacity: 0.6 }}>Associate Node</label>
                <select className="ui-input py-1.5" name="associateId" value={filters.associateId} onChange={handleFilterChange} disabled={fetchingAssociates}>
                   <option value="" className="text-dark">All Sub-Nodes</option>
                   {associates.map(a => <option key={a.id} value={a.id} className="text-dark">{a.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex-grow-1" style={{ minWidth: '160px' }}>
              <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '9px', opacity: 0.6 }}>Student Search</label>
              <input
                type="text"
                className="ui-input py-1.5"
                placeholder="Filter by name..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
              />
            </div>
            <div className="flex-grow-1" style={{ minWidth: '140px' }}>
              <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '9px', opacity: 0.6 }}>Due Date (Floor)</label>
              <input
                type="date"
                className="ui-input py-1.5"
                value={dueFrom}
                onChange={e => setDueFrom(e.target.value)}
              />
            </div>
            <div className="flex-grow-1" style={{ minWidth: '140px' }}>
              <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '9px', opacity: 0.6 }}>Due Date (Ceiling)</label>
              <input
                type="date"
                className="ui-input py-1.5"
                value={dueTo}
                onChange={e => setDueTo(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2">
              <button onClick={fetchHistory} className="ui-btn ui-btn-primary px-4 rounded-pill shadow-glow py-1.5" style={{fontSize: '11px'}}>SYNC</button>
              <button onClick={resetFilters} className="ui-btn ui-btn-secondary px-4 rounded-pill py-1.5" style={{fontSize: '11px'}}>RESET</button>
            </div>
          </div>
        )}

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

        {/* Desktop Table View */}
        <div className="table-responsive d-none d-md-block p-0">
          <table className="table table-hover align-middle mb-0 border-0 bg-transparent text-main">
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
              {filteredPayments.map((payment, index) => {
                const emiId = payment.paymentGatewayId || `E-${(index + 1).toString().padStart(2, '0')}`;
                const isOverdue = payment.status === 'FAILED';
                const isPending = payment.status === 'PENDING';
                const isPaid = payment.status === 'PAID' || payment.status === 'SUCCESS' || payment.status === 'APPROVED';
                
                const now = new Date();
                const targetDate = new Date(payment.dueDate || payment.createdAt);
                const isOverdueByDate = isPending && targetDate < now;
                
                const dueDate = payment.dueDate
                  ? new Date(payment.dueDate).toLocaleDateString('en-CA')
                  : new Date(payment.createdAt).toLocaleDateString('en-CA');

                return (
                  <tr key={payment.id} className="border-bottom border-white border-opacity-5 transition-all">
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
                      <span className={`fw-black small ${isOverdue || isOverdueByDate ? 'text-danger' : 'text-muted opacity-75'}`}>{dueDate}</span>
                    </td>
                    <td className="py-4">
                       {isPaid && (
                         <div className="ui-badge bg-success bg-opacity-10 text-success border border-success border-opacity-20">
                           <CheckCircle size={10} />
                           <span className="fw-black text-uppercase ms-1" style={{ fontSize: '9px' }}>Paid</span>
                         </div>
                       )}
                       {isPending && (
                         <div className={`ui-badge bg-opacity-10 border border-opacity-20 ${isOverdueByDate ? 'bg-danger text-danger border-danger' : 'bg-warning text-warning border-warning'}`}>
                           {isOverdueByDate ? <AlertCircle size={10} /> : <Clock size={10} />}
                           <span className="fw-black text-uppercase ms-1" style={{ fontSize: '9px' }}>
                             {isOverdueByDate ? 'Overdue / Pending' : 'Live / Pending'}
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
                                   onClick={() => setSelectedClearPayment(payment)}
                               className="ui-btn ui-btn-primary btn-sm rounded-pill px-4 fw-black shadow-glow"
                               style={{ fontSize: '10px' }}
                             >
                               APPROVE
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
          
          {payments.length === 0 && !loading && (
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
  );
};

export default PaymentHistory;
