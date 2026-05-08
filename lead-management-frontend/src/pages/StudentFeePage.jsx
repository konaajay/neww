import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  X, IndianRupee, Calendar, Clock, CheckCircle2, AlertCircle, 
  Wallet, ArrowLeft, ListTodo, ShieldCheck, MapPin, Mail, Phone,
  Info, TrendingUp
} from 'lucide-react';
import associateService from '../services/associateService';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const StudentFeePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ fee: null, payments: [] });
  const [lead, setLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentMethod: 'CASH',
    paymentType: 'INSTALLMENT',
    nextDueDate: '',
    note: ''
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feeRes, leadRes] = await Promise.all([
        associateService.getFeeStructure(id),
        associateService.fetchLeadById(id)
      ]);
      setData(feeRes?.data || { fee: null, payments: [] });
      setLead(leadRes?.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await associateService.recordManualPayment({
        ...newPayment,
        leadId: id
      });
      setShowModal(false);
      setNewPayment({ amount: '', paymentMethod: 'CASH', paymentType: 'INSTALLMENT', nextDueDate: '', note: '' });
      fetchData();
    } catch (err) {
      console.error("Payment failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDashboardPath = () => {
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'MANAGER') return '/manager';
    if (user?.role === 'TEAM_LEADER') return '/tl';
    return '/associate';
  };

  const paidPercent = (data?.fee?.totalAmount > 0 && data?.fee?.paidAmount !== undefined)
    ? Math.min(100, (data.fee.paidAmount / data.fee.totalAmount) * 100) 
    : 0;

  return (
    <DashboardLayout activeTab="pipeline" role={user?.role}>
      <div className="p-4 bg-white min-vh-100 animate-fade-in" style={{ borderRadius: '24px' }}>
        
        {/* Navigation Header */}
        <div className="d-flex align-items-center justify-content-between mb-5">
           <div className="d-flex align-items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="btn btn-light bg-light rounded-circle p-3 shadow-sm hover-scale transition-smooth border-0 rotate-hover"
              >
                <ArrowLeft size={20} className="text-primary" />
              </button>
              <div>
                 <h4 className="fw-black text-dark mb-1 text-uppercase tracking-widest">Financial Ledger</h4>
                 <p className="text-muted small fw-bold mb-0 opacity-50" style={{ fontSize: '9px' }}>
                    STUDENT PROTOCOL
                 </p>
              </div>
           </div>
           
           <div className="d-none d-md-flex gap-3 align-items-center">
              <button 
                onClick={() => setShowModal(true)}
                className="ui-btn ui-btn-primary px-4 py-2 rounded-pill d-flex align-items-center gap-2 shadow-glow fw-black text-uppercase tracking-widest"
                style={{ fontSize: '10px' }}
              >
                <IndianRupee size={14} /> Record Installment
              </button>
              <div className="px-4 py-2 bg-success bg-opacity-10 text-success rounded-pill border border-success border-opacity-10 d-flex align-items-center gap-2">
                 <ShieldCheck size={14} />
                 <span className="fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Official Record Verified</span>
              </div>
           </div>
        </div>

        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '30vh' }}>
             <div className="shimmer rounded-4" style={{ width: '100%', height: '200px', maxWidth: '800px' }}></div>
             <p className="text-muted fw-black small text-uppercase tracking-widest mt-4 opacity-50">Syncing Records...</p>
          </div>
        ) : !data.fee ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center">
             <div className="p-5 bg-light rounded-circle mb-4 text-muted opacity-20">
                <AlertCircle size={80} />
             </div>
             <h3 className="fw-black text-dark mb-2">Registry Entry Missing</h3>
             <p className="text-muted" style={{ maxWidth: '400px' }}>This lead has not been funneled through the financial pipeline. Please initiate a conversion to generate this document.</p>
             <button onClick={() => navigate(-1)} className="ui-btn ui-btn-primary px-5 py-2.5 rounded-pill mt-4">RETURN TO PIPELINE</button>
          </div>
        ) : (
          <div className="row g-5">
            {/* Left Column: Student & Summary */}
            <div className="col-12 col-xl-4 d-flex flex-column gap-4 border-end border-light pr-xl-5">
               
               {/* Student Profile Card */}
               <div className="p-4 rounded-4 bg-white border border-light shadow-sm">
                  <div className="d-flex align-items-center gap-3 mb-4">
                     <div className="bg-light text-primary rounded-circle d-flex align-items-center justify-content-center fw-black" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                        {lead?.name?.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <h5 className="fw-black text-dark mb-0">{lead?.name}</h5>
                        <small className="text-muted fw-bold text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Active Student Lead</small>
                     </div>
                  </div>
                  
                  <div className="d-flex flex-column gap-3">
                     <div className="d-flex align-items-center gap-3">
                        <Mail size={14} className="text-muted opacity-50" />
                        <span className="text-dark small fw-bold">{lead?.email || 'N/A'}</span>
                     </div>
                     <div className="d-flex align-items-center gap-3">
                        <Phone size={14} className="text-muted opacity-50" />
                        <span className="text-dark small fw-bold">{lead?.mobile || 'N/A'}</span>
                     </div>
                     <div className="d-flex align-items-center gap-3">
                        <MapPin size={14} className="text-muted opacity-50" />
                        <span className="text-dark small fw-bold">{lead?.college || 'N/A'}</span>
                     </div>
                  </div>
               </div>

               {/* Metrics List */}
               <div className="d-flex flex-column gap-3">
                   <div className="p-4 rounded-4 border border-light bg-white transition-smooth shadow-sm d-flex flex-column gap-1">
                      <h3 className="fw-black text-dark mb-0" style={{ fontSize: '38px', lineHeight: 1 }}>₹{data.fee?.totalAmount?.toLocaleString() || '0'}</h3>
                      <span className="text-muted fw-black small text-uppercase tracking-widest opacity-60" style={{ fontSize: '10px' }}>Package Total</span>
                   </div>

                   <div className="p-4 rounded-4 border border-light bg-white transition-smooth shadow-sm d-flex flex-column gap-1">
                      <h3 className="fw-black text-success mb-0" style={{ fontSize: '38px', lineHeight: 1 }}>₹{data.fee?.paidAmount?.toLocaleString() || '0'}</h3>
                      <span className="text-muted fw-black small text-uppercase tracking-widest opacity-60" style={{ fontSize: '10px' }}>Settled Capital</span>
                   </div>

                   <div className="p-4 rounded-4 border border-light bg-white transition-smooth shadow-sm d-flex flex-column gap-1">
                      <h3 className="fw-black text-dark mb-0" style={{ fontSize: '38px', lineHeight: 1 }}>₹{data.fee?.balanceAmount?.toLocaleString() || '0'}</h3>
                      <span className="text-muted fw-black small text-uppercase tracking-widest opacity-60" style={{ fontSize: '10px' }}>Outstanding Balance</span>
                   </div>
               </div>

               {/* Collection Progress */}
               <div className="p-4 rounded-4 bg-light bg-opacity-50 border border-light">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                     <div className="d-flex align-items-center gap-2">
                        <TrendingUp size={14} className="text-primary" />
                        <span className="fw-black text-dark small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Collection Status</span>
                     </div>
                     <span className="fw-black text-primary" style={{ fontSize: '11px' }}>{paidPercent.toFixed(1)}%</span>
                  </div>
                  <div className="progress rounded-pill" style={{ height: '10px', backgroundColor: '#e9ecef' }}>
                     <div 
                        className="progress-bar bg-primary shadow-glow animate-progress" 
                        style={{ width: `${paidPercent}%` }}
                     ></div>
                  </div>
                  <small className="text-muted mt-3 mb-0 d-block fw-bold italic" style={{ fontSize: '9px' }}>* Verified against real-time banking records.</small>
               </div>
            </div>

            {/* Right Column: Transaction Timeline */}
            <div className="col-12 col-xl-8">
               <div className="d-flex align-items-center gap-2 mb-4">
                  <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle"><ListTodo size={18} /></div>
                  <h5 className="fw-black text-dark mb-0 text-uppercase tracking-widest small">Transaction Timeline</h5>
               </div>

               <div className="table-responsive rounded-4 border border-light shadow-sm overflow-hidden">
                  <table className="table table-hover mb-0 align-middle">
                     <thead className="bg-light bg-opacity-70">
                        <tr>
                           <th className="border-0 px-4 py-4 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Status Log</th>
                           <th className="border-0 px-4 py-4 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Execution Date</th>
                           <th className="border-0 px-4 py-4 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Transmission Value</th>
                           <th className="border-0 px-4 py-4 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Uplink Channel</th>
                           <th className="border-0 px-4 py-4 text-center small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Note</th>
                        </tr>
                     </thead>
                     <tbody className="border-0">
                        {data.payments.length === 0 ? (
                           <tr>
                              <td colSpan="5" className="text-center py-5 text-muted small fw-bold text-uppercase tracking-widest opacity-50">Zero active transmissions discovered</td>
                           </tr>
                        ) : (
                          data.payments.map((p, idx) => (
                            <tr key={idx} className="transition-all hover-bg-light border-bottom border-light">
                              <td className="px-4 py-4">
                                <span className={`ui-badge rounded-pill px-3 py-1 fw-black border ${
                                  p.status === 'PAID' || p.status === 'SUCCESS' || p.status === 'APPROVED'
                                    ? 'bg-success bg-opacity-10 text-success border-success border-opacity-10' 
                                    : 'bg-warning bg-opacity-10 text-warning border-warning border-opacity-10'
                                }`} style={{ fontSize: '9px' }}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="d-flex align-items-center gap-2">
                                  <Calendar size={13} className="text-muted opacity-50" />
                                  <span className="small fw-black text-dark">
                                    {p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="small fw-black text-dark" style={{ fontSize: '13px' }}>₹{p.amount?.toLocaleString()}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="small text-muted fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>
                                  {p.paymentMethod || 'SYSTEM'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                {p.note ? (
                                    <div className="d-inline-flex p-2 bg-light rounded-circle tooltip-trigger" title={p.note}>
                                        <Info size={14} className="text-muted opacity-50" />
                                    </div>
                                ) : <span className="text-muted opacity-25">—</span>}
                              </td>
                            </tr>
                          ))
                        )}
                     </tbody>
                  </table>
               </div>
               
               <div className="mt-5 p-4 rounded-4 bg-light bg-opacity-30 border border-light border-opacity-50">
                   <div className="d-flex align-items-start gap-3">
                      <div className="p-2 bg-white rounded-circle shadow-sm mt-0.5"><Clock size={16} className="text-primary" /></div>
                      <div>
                         <p className="mb-1 text-dark fw-black small text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Upcoming Collection Protocol</p>
                         <p className="mb-0 text-muted" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                           The next installment is dynamically scheduled for <strong>{data.fee?.nextDueDate ? new Date(data.fee.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'NOT SCHEDULED'}</strong>. 
                           System-generated follow-up tasks have been propagated to assigned associaties.
                         </p>
                      </div>
                   </div>
               </div>
            </div>
          </div>
        )}

        {/* Record Installment Modal */}
        {showModal && (
          <div className="modal-backdrop d-flex align-items-center justify-content-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050, backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-4 shadow-lg animate-slide-up" style={{ width: '100%', maxWidth: '500px', overflow: 'hidden' }}>
              <div className="p-4 bg-primary text-white d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                   <div className="p-2 bg-white bg-opacity-20 rounded-circle"><IndianRupee size={18} /></div>
                   <div>
                      <h5 className="mb-0 fw-black text-uppercase tracking-widest">Record Installment</h5>
                      <small className="opacity-75 fw-bold" style={{ fontSize: '9px' }}>MANUAL TRANSMISSION PROTOCOL</small>
                   </div>
                </div>
                <button onClick={() => setShowModal(false)} className="btn btn-link text-white p-0"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleRecordPayment} className="p-4">
                <div className="mb-4">
                  <label className="form-label small fw-black text-uppercase tracking-widest text-muted" style={{ fontSize: '9px' }}>Installment Value</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-0 fw-black text-primary">₹</span>
                    <input 
                      type="number" 
                      className="form-control bg-light border-0 p-3 fw-black" 
                      placeholder="0.00" 
                      required
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    />
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label small fw-black text-uppercase tracking-widest text-muted" style={{ fontSize: '9px' }}>Channel</label>
                    <select 
                      className="form-select bg-light border-0 p-3 small fw-bold"
                      value={newPayment.paymentMethod}
                      onChange={(e) => setNewPayment({...newPayment, paymentMethod: e.target.value})}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / ONLINE</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                      <option value="CHEQUE">CHEQUE</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-black text-uppercase tracking-widest text-muted" style={{ fontSize: '9px' }}>Next Protocol</label>
                    <input 
                      type="date" 
                      className="form-control bg-light border-0 p-3 small fw-bold"
                      value={newPayment.nextDueDate}
                      onChange={(e) => setNewPayment({...newPayment, nextDueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-black text-uppercase tracking-widest text-muted" style={{ fontSize: '9px' }}>Interaction Note</label>
                  <textarea 
                    className="form-control bg-light border-0 p-3 small fw-bold" 
                    rows="3" 
                    placeholder="Input transaction context..."
                    value={newPayment.note}
                    onChange={(e) => setNewPayment({...newPayment, note: e.target.value})}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary w-100 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center justify-content-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <>
                      <ShieldCheck size={18} /> AUTHORIZE RECORD
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentFeePage;
