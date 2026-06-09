import React, { useState, useEffect } from 'react';
import { X, CheckCircle, IndianRupee, Calendar, ShieldCheck, CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';

const ManualPaymentModal = ({ show, onClose, onConfirm, payment }) => {
  const [actualPaidAmount, setActualPaidAmount] = useState(payment?.amount || '');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [nextDueDate, setNextDueDate] = useState('');
  const [note, setNote] = useState('');

  const { isDarkMode } = useTheme();

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!show || !payment) return null;

  const isPartial = parseFloat(actualPaidAmount || 0) < parseFloat(payment?.amount || 0);
  const balance = parseFloat(payment?.amount || 0) - parseFloat(actualPaidAmount || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isPartial && !nextDueDate) {
      toast.error('Select next due date');
      return;
    }
    
    onConfirm(payment.id, {
      status: 'PAID',
      paymentMethod,
      note,
      actualPaidAmount: parseFloat(actualPaidAmount),
      nextDueDate: nextDueDate ? `${nextDueDate}T23:59:59` : null,
      paymentType: isPartial ? 'EMI' : 'FULL'
    });
    onClose();
  };

  return (
    <div className="modal-overlay d-flex align-items-center justify-content-center px-3" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.8)', 
      backdropFilter: 'blur(8px)', zIndex: 1100000 
    }}>
      <div className={`rounded-4 animate-fade-in border ${isDarkMode ? 'bg-dark-card border-white border-opacity-10' : 'bg-white border-dark border-opacity-5'} d-flex flex-column overflow-hidden`} style={{ width: '100%', maxWidth: '440px', maxHeight: '90vh', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
        {/* Header - Simple & Clean */}
        <div className={`modal-header border-bottom p-3 ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-light'}`}>
          <h6 className={`fw-bold mb-0 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Manual Ledger Entry</h6>
          <button type="button" className={`btn btn-link p-1 shadow-none border-0 ${isDarkMode ? 'text-white opacity-50' : 'text-dark opacity-50'}`} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="modal-body p-4 overflow-auto custom-scroll">
          <form onSubmit={handleSubmit}>
            {/* Simple Amount Card */}
            <div className={`p-3 rounded-3 mb-4 text-center border ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-light'}`}>
                <p className="text-muted small mb-1 fw-bold text-uppercase" style={{ fontSize: '10px' }}>Total Receivable</p>
                <h2 className={`fw-bold mb-0 ${isDarkMode ? 'text-white' : 'text-dark'}`}>₹{payment.amount.toLocaleString()}</h2>
                <div className="mt-2">
                   <span className="badge bg-secondary bg-opacity-10 text-muted border border-white border-opacity-5" style={{ fontSize: '10px' }}>{payment.leadName}</span>
                </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-12">
                <label className="form-label small fw-bold text-muted mb-2">Actually Paid (₹)</label>
                <input 
                  type="number" 
                  className={`form-control border shadow-none py-2 ${isDarkMode ? 'bg-dark border-white border-opacity-10 text-white' : 'bg-white text-dark'}`} 
                  value={actualPaidAmount}
                  onChange={(e) => setActualPaidAmount(e.target.value)}
                  max={payment.amount}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label small fw-bold text-muted mb-2">Payment Channel</label>
                <select 
                  className={`form-select border shadow-none py-2 ${isDarkMode ? 'bg-dark border-white border-opacity-10 text-white' : 'bg-white text-dark'}`}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="UPI">UPI / Mobile</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Credit/Debit Card</option>
                </select>
              </div>
            </div>

            {isPartial && (
              <div className={`mb-4 p-3 rounded-3 border animate-fade-in ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-light'}`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                   <div className="d-flex align-items-center gap-2">
                      <Calendar size={14} className={isDarkMode ? 'text-primary' : 'text-muted'} />
                      <span className={`fw-bold small ${isDarkMode ? 'text-white' : 'text-dark'}`}>Next Installment Date</span>
                   </div>
                   <div className="text-primary small fw-black">Balance: ₹{balance.toLocaleString()}</div>
                </div>
                
                <input 
                  type="date" 
                  className={`form-control border shadow-none py-2 ${isDarkMode ? 'bg-dark border-white border-opacity-10 text-white' : 'bg-white text-dark'}`} 
                  value={nextDueDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="form-label small fw-bold text-muted mb-2">Notes</label>
              <textarea 
                className={`form-control border shadow-none py-2 ${isDarkMode ? 'bg-dark border-white border-opacity-10 text-white' : 'bg-white text-dark'}`}
                rows="2"
                placeholder="Transaction details..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100 py-2.5 rounded-3 fw-bold shadow-sm transition-all"
            >
              Confirm Payment
            </button>
          </form>
        </div>
      </div>
      <style>{`
        .bg-dark-card { background-color: #1a1a1a; }
        .text-white { color: #ffffff; }
        .transition-all { transition: all 0.2s ease; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default ManualPaymentModal;
