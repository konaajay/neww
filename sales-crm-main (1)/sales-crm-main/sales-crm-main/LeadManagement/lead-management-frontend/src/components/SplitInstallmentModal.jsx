import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Scissors, IndianRupee, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

const SplitInstallmentModal = ({ show, onClose, onConfirm, payment }) => {
  const [parts, setParts] = useState([
    { amount: '', dueDate: '', isPaid: false }
  ]);

  useEffect(() => {
    if (payment) {
      // Initialize with half split as suggestion
      const half = Math.floor(payment.amount / 2);
      const today = new Date().toISOString().split('T')[0];
      setParts([
        { amount: half.toString(), dueDate: today, isPaid: false },
        { amount: (payment.amount - half).toString(), dueDate: '', isPaid: false }
      ]);
    }
  }, [payment]);

  if (!show || !payment) return null;

  const totalSplit = parts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const isMatch = Math.abs(totalSplit - payment.amount) < 0.01;
  const balanceRemaining = payment.amount - totalSplit;

  const addPart = () => {
    setParts([...parts, { amount: '', dueDate: '', isPaid: false }]);
  };

  const removePart = (index) => {
    if (parts.length <= 1) return;
    setParts(parts.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const newParts = [...parts];
    newParts[index][field] = value;
    setParts(newParts);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isMatch) return;
    
    // Format dates for backend
    const formattedParts = parts.map(p => ({
      ...p,
      amount: parseFloat(p.amount),
      dueDate: p.dueDate ? `${p.dueDate}T23:59:59` : null
    }));

    onConfirm(payment.id, { installments: formattedParts });
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)', zIndex: 10600 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden" style={{ background: '#131826', color: '#fff' }}>
          {/* Header */}
          <div className="modal-header border-bottom border-secondary border-opacity-10 bg-dark bg-opacity-50 p-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-primary bg-opacity-20 p-3 rounded-4 text-primary shadow-sm">
                <Scissors size={24} />
              </div>
              <div>
                <h5 className="modal-title fw-black text-white mb-0">Split Installment</h5>
                <p className="text-secondary small fw-bold mb-0">Redefining Payment Schedule for <span className="text-primary">UID: {payment.id}</span></p>
              </div>
            </div>
            <button type="button" className="btn btn-dark rounded-circle p-2 shadow-none border-secondary border-opacity-25" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          
          <div className="modal-body p-4 custom-scroll">
            <form onSubmit={handleSubmit}>
              {/* Summary Banner */}
              <div className="bg-dark bg-opacity-50 p-4 rounded-4 border border-secondary border-opacity-10 mb-4 d-flex justify-content-between align-items-center shadow-sm">
                <div>
                   <small className="text-secondary fw-black text-uppercase tracking-widest d-block mb-1">Total to Resolve</small>
                   <h3 className="fw-black text-white mb-0">₹{payment.amount.toLocaleString()}</h3>
                </div>
                <div className="text-end">
                   <small className="text-secondary fw-black text-uppercase tracking-widest d-block mb-1">Status</small>
                   <span className={`badge rounded-pill px-3 py-2 fw-bold ${isMatch ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`}>
                      {isMatch ? 'Balanced' : 'Imbalanced'}
                   </span>
                </div>
              </div>

              <div className="d-flex flex-column gap-3">
                {parts.map((part, index) => (
                  <div key={index} className="bg-dark bg-opacity-25 p-4 rounded-4 border border-secondary border-opacity-10 shadow-sm animate-slide-up">
                    <div className="row g-4 align-items-center">
                      <div className="col-auto">
                        <span className="badge bg-primary bg-opacity-20 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>{index + 1}</span>
                      </div>
                      
                      <div className="col-12 col-md-4">
                        <div className="form-floating bg-secondary bg-opacity-10 rounded-3">
                          <input 
                            type="number" 
                            className="form-control border-0 bg-transparent text-white fw-bold pt-4 pb-2 px-3 shadow-none h-auto" 
                            id={`amt-${index}`}
                            placeholder="Amount"
                            value={part.amount}
                            onChange={(e) => handleChange(index, 'amount', e.target.value)}
                            required
                          />
                          <label htmlFor={`amt-${index}`} className="text-secondary small fw-bold">Part Value (₹)</label>
                        </div>
                      </div>

                      <div className="col-12 col-md-5">
                        <div className="form-floating bg-secondary bg-opacity-10 rounded-3">
                          <input 
                            type="date" 
                            className="form-control border-0 bg-transparent text-white fw-bold pt-4 pb-2 px-3 shadow-none h-auto" 
                            id={`date-${index}`}
                            value={part.dueDate}
                            onChange={(e) => handleChange(index, 'dueDate', e.target.value)}
                            required
                          />
                          <label htmlFor={`date-${index}`} className="text-secondary small fw-bold">Due Date</label>
                        </div>
                      </div>

                      <div className="col-12 col-md-auto ms-md-auto text-end">
                        {parts.length > 1 && (
                          <button 
                            type="button" 
                            className="btn btn-outline-danger border-0 p-2 rounded-circle transition-all hover-bg-danger hover-text-white" 
                            onClick={() => removePart(index)}
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <button 
                  type="button" 
                  className="btn btn-outline-primary border-secondary border-opacity-25 w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest d-flex align-items-center justify-content-center gap-2 hover-bg-primary hover-bg-opacity-10 transition-smooth"
                  onClick={addPart}
                >
                  <Plus size={20} /> Add Part
                </button>
              </div>

              {/* Validation Status Bar */}
              <div className={`mt-5 p-4 rounded-4 d-flex justify-content-between align-items-center transition-all ${isMatch ? 'bg-success bg-opacity-20 text-success' : 'bg-warning bg-opacity-20 text-warning border border-warning border-opacity-25'}`}>
                 <div className="d-flex align-items-center gap-2">
                    {isMatch ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="fw-black text-uppercase small tracking-widest">
                      {isMatch ? 'Ledger Balanced' : `Total sum is ₹${totalSplit.toLocaleString()}`}
                    </span>
                 </div>
                 {!isMatch && (
                   <span className="fw-black text-uppercase small tracking-widest">
                      Delta: ₹{Math.abs(balanceRemaining).toLocaleString()}
                   </span>
                 )}
              </div>

              <div className="mt-4">
                <button 
                  type="submit" 
                  className={`btn w-100 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-lg d-flex align-items-center justify-content-center gap-2 transition-smooth ${!isMatch ? 'btn-outline-secondary opacity-50' : 'btn-primary'}`}
                  disabled={!isMatch}
                >
                  Confirm Split & Update Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style>{`
        .fw-black { font-weight: 900; }
        .transition-smooth { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SplitInstallmentModal;
