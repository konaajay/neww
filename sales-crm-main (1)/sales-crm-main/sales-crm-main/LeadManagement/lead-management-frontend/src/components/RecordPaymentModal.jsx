import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CreditCard, Layers, User, Search, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../services/adminService';

const RecordPaymentModal = ({ show, onClose, onConfirm }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    leadId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    category: 'Full Payment',
    note: ''
  });

  useEffect(() => {
    if (show) {
      fetchStudents();
    }
  }, [show]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await adminService.fetchLeads(); 
      setStudents(res.data);
    } catch (err) {
      // Quiet fail to avoid intrusive alerts during search
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.leadId) {
      toast.error('Please select a student from the list');
      return;
    }
    
    // Map category to paymentType for the backend
    const paymentType = formData.category === 'Full Payment' ? 'FULL' : 'EMI';
    
    toast.info('Submitting payment record...');
    onConfirm({
      ...formData,
      paymentType
    });
  };



  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="modal show d-block p-1 p-md-3" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)', zIndex: 10600 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden" style={{ background: '#131826', color: '#fff', maxWidth: '600px', margin: 'auto' }}>
          {/* Compact Header */}
          <div className="modal-header border-bottom border-secondary border-opacity-10 bg-dark bg-opacity-50 p-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-success bg-opacity-20 p-2 rounded-3 text-success">
                <DollarSign size={20} />
              </div>
              <div>
                <h6 className="modal-title fw-black text-white mb-0">Manual Clearance</h6>
                <p className="text-secondary fw-bold mb-0" style={{ fontSize: '10px' }}>Entry for <span className="text-success">System Audit</span></p>
              </div>
            </div>
            <button type="button" className="btn btn-dark rounded-circle p-1 shadow-none border-secondary border-opacity-25" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          
          <div className="modal-body p-3">
            <form onSubmit={handleSubmit}>
              {/* Student Search - Full Width */}
              <div className="mb-3">
                <label className="form-label small fw-black text-secondary text-uppercase mb-1 tracking-wider" style={{ fontSize: '10px' }}>Target Student / Lead</label>
                <div className="position-relative">
                  <div className="input-group bg-dark bg-opacity-50 rounded-3 overflow-hidden border border-secondary border-opacity-25 focus-within-primary transition-all">
                    <span className="input-group-text bg-transparent border-0 text-secondary ps-2 pe-1">
                       <Search size={14} />
                    </span>
                    <input 
                      type="text"
                      className="form-control bg-transparent border-0 text-white py-2 shadow-none fw-bold small"
                      placeholder="Search name or email..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        if (!e.target.value) setFormData({ ...formData, leadId: '' });
                      }}
                      onFocus={() => setIsOpen(true)}
                    />
                  </div>
                  
                  {isOpen && searchTerm.length > 0 && (
                    <div className="position-absolute w-100 mt-1 shadow-2xl rounded-3 border border-secondary border-opacity-25 overflow-hidden animate-fade-in" 
                         style={{ zIndex: 1050, background: '#1a1f2e', maxHeight: '180px', overflowY: 'auto' }}>
                      {students.filter(s => 
                        (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      ).length > 0 ? (
                        students.filter(s => 
                          (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                        ).map(s => (
                          <div 
                            key={s.id} 
                            className="d-flex align-items-center gap-2 p-2 hover-bg-primary cursor-pointer border-bottom border-secondary border-opacity-10 transition-all"
                            onClick={() => {
                              setFormData({ ...formData, leadId: s.id });
                              setSearchTerm(s.name || s.email);
                              setIsOpen(false);
                            }}
                          >
                            <div className="bg-primary bg-opacity-20 text-primary fw-bold rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                              {(s.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="mb-0 fw-bold small text-white" style={{ fontSize: '11px' }}>{s.name || 'Unnamed'}</p>
                              <small className="text-secondary d-block" style={{ fontSize: '10px' }}>{s.email || 'No email'}</small>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-muted small">No matches found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2-Column Grid for Fields */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-black text-secondary text-uppercase mb-1 tracking-wider" style={{ fontSize: '10px' }}>Amount (₹)</label>
                  <div className="input-group bg-dark bg-opacity-50 rounded-3 overflow-hidden border border-secondary border-opacity-25">
                    <span className="input-group-text bg-transparent border-0 text-secondary ps-2 pe-1 small">₹</span>
                    <input 
                      type="number" 
                      name="amount"
                      className="form-control bg-transparent border-0 text-white py-2 shadow-none fw-black small" 
                      placeholder="0"
                      value={formData.amount}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-black text-secondary text-uppercase mb-1 tracking-wider" style={{ fontSize: '10px' }}>Date</label>
                  <div className="input-group bg-dark bg-opacity-50 rounded-3 overflow-hidden border border-secondary border-opacity-25">
                    <input 
                      type="date" 
                      name="date"
                      className="form-control bg-transparent border-0 text-white py-2 shadow-none fw-bold small" 
                      value={formData.date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-black text-secondary text-uppercase mb-1 tracking-wider" style={{ fontSize: '10px' }}>Method</label>
                  <select 
                    name="paymentMethod"
                    className="form-select bg-dark border-secondary border-opacity-25 text-white py-2 shadow-none fw-bold small rounded-3"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-black text-secondary text-uppercase mb-1 tracking-wider" style={{ fontSize: '10px' }}>Category</label>
                  <select 
                    name="category"
                    className="form-select bg-dark border-secondary border-opacity-25 text-white py-2 shadow-none fw-bold small rounded-3"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="Full Payment">Full</option>
                    <option value="First Installment">Installment 1</option>
                    <option value="EMI Payment">EMI</option>
                    <option value="Fee Balance">Balance</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <textarea 
                  name="note"
                  className="form-control bg-dark text-white border-secondary border-opacity-25 shadow-none rounded-3 p-2 fw-bold small" 
                  rows="2"
                  placeholder="Note/Ref (Optional)..."
                  value={formData.note}
                  onChange={handleChange}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-success w-100 py-2 rounded-pill fw-black text-uppercase tracking-widest shadow-lg d-flex align-items-center justify-content-center gap-2 hover-scale transition-all small"
              >
                Confirm Clearance
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`
        .fw-black { font-weight: 900; }
        .hover-bg-primary:hover { background-color: rgba(99, 102, 241, 0.1) !important; }
        .focus-within-primary:focus-within { border-color: #6366f1 !important; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .hover-scale:hover { transform: translateY(-1px); filter: brightness(1.1); }
      `}</style>
    </div>
  );
};

export default RecordPaymentModal;
