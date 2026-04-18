import React, { useState, useEffect } from 'react';
import { 
  X, IndianRupee, Calendar, Clock, CheckCircle2, AlertCircle, 
  Wallet, ListTodo
} from 'lucide-react';
import associateService from '../services/associateService';

const StudentFeeModal = ({ isOpen, onClose, lead, theme = 'light' }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ fee: null, payments: [] });
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    if (isOpen && lead?.id) {
      fetchFeeStructure();
    }
  }, [isOpen, lead]);

  const fetchFeeStructure = async () => {
    setLoading(true);
    try {
      const response = await associateService.getFeeStructure(lead.id);
      setData(response);
    } catch (err) {
      console.error("Failed to fetch fee structure", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const { fee, payments } = data;
  const paidPercent = fee?.totalAmount > 0 
    ? Math.min(100, (fee.paidAmount / fee.totalAmount) * 100) 
    : 0;

  return (
    <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className={`modal-content border-0 overflow-hidden shadow-2xl animate-scale-in ${isDarkMode ? 'bg-dark' : 'bg-white'}`} style={{ borderRadius: '24px' }}>
          
          {/* Header */}
          <div className={`p-4 border-bottom d-flex align-items-center justify-content-between ${isDarkMode ? 'border-secondary border-opacity-20' : 'border-light'}`}>
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                <Wallet size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h5 className={`mb-0 fw-black text-uppercase tracking-widest small ${isDarkMode ? 'text-white' : 'text-dark'}`}>Financial Ledger</h5>
                <div className="d-flex align-items-center gap-2">
                  <span className={`p-1 rounded-circle ${fee?.paymentStatus === 'COMPLETED' ? 'bg-success' : 'bg-warning'}`} style={{ width: '6px', height: '6px' }}></span>
                  <small className="text-muted fw-bold opacity-50 text-uppercase tracking-widest" style={{ fontSize: '8px' }}>
                    {lead?.name} • {lead?.serialNumber}
                  </small>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`btn border-0 p-2 rounded-circle transition-all ${isDarkMode ? 'hover-bg-secondary text-white' : 'hover-bg-light text-muted'}`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="py-5 text-center">
                <div className="spinner-border text-primary border-3" role="status"></div>
                <p className="mt-3 text-muted fw-bold small text-uppercase tracking-widest">Calculating Ledger...</p>
              </div>
            ) : !fee ? (
              <div className="py-5 text-center px-4">
                <div className="p-4 bg-light rounded-4 mb-3 d-inline-block">
                  <AlertCircle size={48} className="text-muted opacity-20" />
                </div>
                <h6 className="text-dark fw-bold">No Financial Data Found</h6>
                <p className="text-muted small">This lead hasn't been funneled through the payment pipeline yet.</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-4">
                    <div className="p-3 rounded-4 border border-light bg-light bg-opacity-50 text-center">
                      <small className="text-muted fw-bold text-uppercase tracking-widest mb-1 d-block" style={{ fontSize: '9px' }}>Package Total</small>
                      <h4 className="fw-black mb-0">₹{fee.totalAmount?.toLocaleString()}</h4>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="p-3 rounded-4 border border-success border-opacity-10 bg-success bg-opacity-5 text-center">
                      <small className="text-success fw-bold text-uppercase tracking-widest mb-1 d-block" style={{ fontSize: '9px' }}>Amount Settled</small>
                      <h4 className="fw-black text-success mb-0">₹{fee.paidAmount?.toLocaleString()}</h4>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="p-3 rounded-4 border border-danger border-opacity-10 bg-danger bg-opacity-5 text-center">
                      <small className="text-danger fw-bold text-uppercase tracking-widest mb-1 d-block" style={{ fontSize: '9px' }}>Balance Due</small>
                      <h4 className="fw-black text-danger mb-0">₹{fee.balanceAmount?.toLocaleString()}</h4>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-5 px-1">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted fw-bold text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Payment Velocity</small>
                    <small className="text-primary fw-black" style={{ fontSize: '10px' }}>{paidPercent.toFixed(1)}%</small>
                  </div>
                  <div className="progress rounded-pill bg-light" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-primary shadow-glow animate-progress" 
                      role="progressbar" 
                      style={{ width: `${paidPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Installment History */}
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <ListTodo size={14} className="text-primary" />
                    <h6 className="fw-black text-dark mb-0 text-uppercase tracking-widest small">Installment Log</h6>
                  </div>

                  <div className="table-responsive rounded-4 border border-light overflow-hidden">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th className="border-0 px-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Status</th>
                          <th className="border-0 px-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Due Date</th>
                          <th className="border-0 px-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Amount</th>
                          <th className="border-0 px-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Source</th>
                        </tr>
                      </thead>
                      <tbody className="border-0">
                        {!payments || payments.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center py-4 text-muted small">No transactions found</td>
                          </tr>
                        ) : (
                          payments.map((p, idx) => (
                            <tr key={idx} className="transition-all hover-bg-light">
                              <td className="px-4 py-3">
                                <span className={`ui-badge rounded-pill ${
                                  p.status === 'PAID' || p.status === 'SUCCESS' || p.status === 'APPROVED'
                                    ? 'bg-success bg-opacity-10 text-success' 
                                    : 'bg-warning bg-opacity-10 text-warning'
                                }`} style={{ fontSize: '9px' }}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="d-flex align-items-center gap-2">
                                  <Calendar size={12} className="text-muted" />
                                  <span className="small fw-bold text-dark">
                                    {p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="small fw-black text-dark">₹{p.amount?.toLocaleString()}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="small text-muted text-uppercase tracking-widest" style={{ fontSize: '8px' }}>
                                  {p.paymentMethod || 'SYSTEM'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="p-3 rounded-4 bg-light border border-light d-flex align-items-center gap-3">
                    <Clock size={16} className="text-primary opacity-50" />
                    <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>
                      Next Installment expected by <strong>{fee.nextDueDate ? new Date(fee.nextDueDate).toLocaleDateString() : 'N/A'}</strong>. 
                      Automated follow-up tasks are linked to individual nodes.
                    </p>
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-top text-end">
            <button 
              onClick={onClose}
              className="ui-btn ui-btn-primary px-5 py-2 rounded-pill fw-black tracking-widest"
              style={{ fontSize: '10px' }}
            >
              CLOSE LEDGER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentFeeModal;
