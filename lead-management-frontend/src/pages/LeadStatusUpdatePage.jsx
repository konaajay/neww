import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  ShieldCheck, Calendar, MessageSquare, ArrowLeft, Activity, 
  Info, Zap, AlertCircle, IndianRupee, Plus, X, Shield 
} from 'lucide-react';
import { toast } from 'react-toastify';

// Clean Architecture Services
import adminService from '../services/adminService';
import leadsApi from '../features/leads/api/leadsApi';
import { useLeadStatusLogic } from '../features/leads/hooks/useLeadStatusLogic';

const LeadStatusUpdatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('newStatus');
  
  const { isDarkMode } = useTheme();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineStages, setPipelineStages] = useState([]);
  
  const getDefaultFollowUp = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const hours = String(tomorrow.getHours()).padStart(2, '0');
    const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  const [selectedStatus, setSelectedStatus] = useState(initialStatus || '');
  const [followUpDate, setFollowUpDate] = useState(getDefaultFollowUp());
  const [nextInstallmentDate, setNextInstallmentDate] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showStatusList, setShowStatusList] = useState(!initialStatus);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const {
    totalAmount, setTotalAmount,
    totalPaidSoFar, setTotalPaidSoFar,
    initialAmount, setInitialAmount,
    installments, setInstallments,
    paymentType, setPaymentType,
    addInstallment,
    removeInstallment,
    handleInstallmentChange,
    balanceRemaining,
    isMatch
  } = useLeadStatusLogic();

  const init = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Parallel loading of all required data
      const [leadRes, stagesRes, feeRes] = await Promise.allSettled([
        leadsApi.fetchLeadById(id),
        adminService.fetchPipelineStages(),
        leadsApi.getFeeStructure(id)
      ]);

      if (leadRes.status === 'fulfilled') {
        const leadData = leadRes.value.data || leadRes.value;
        setLead(leadData);
        if (!initialStatus) setSelectedStatus(leadData.status);
      } else {
        throw new Error('Lead data fetch failed');
      }

      if (stagesRes.status === 'fulfilled') {
        const stages = stagesRes.value.data || stagesRes.value;
        setPipelineStages(Array.isArray(stages) ? stages.filter(s => s.active) : []);
      }

      if (feeRes.status === 'fulfilled' && feeRes.value) {
        const feeData = feeRes.value.data || feeRes.value;
        if (feeData && feeData.totalAmount > 0) {
          setTotalAmount(feeData.totalAmount);
          setTotalPaidSoFar(feeData.paidAmount || 0);
          if (feeData.nextDueDate) {
            setNextInstallmentDate(feeData.nextDueDate.split('T')[0]);
            setPaymentType('EMI');
          }
        }
      }
    } catch (err) {
      setError(true);
      toast.error("Protocol Sync Failure: Resource link broken");
    } finally {
      setLoading(false);
    }
  }, [id, initialStatus, setTotalAmount, setTotalPaidSoFar, setPaymentType]);

  useEffect(() => {
    init();
  }, [init]);

  const currentStatusConfig = useMemo(() => {
    return pipelineStages.find(s => s.statusValue === selectedStatus) || {};
  }, [pipelineStages, selectedStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return toast.warning("Please select a status");
    
    setIsSubmitting(true);
    try {
      await leadsApi.updateStatus(id, selectedStatus, note, { 
        paymentType, 
        totalAmount, 
        paidAmount: paymentType === 'EMI' ? initialAmount : totalAmount,
        paymentMethod,
        installments: paymentType === 'EMI' ? installments : [],
        dueDate: followUpDate
      });

      toast.success('System Status Propagated Successfully');
      navigate(-1);
    } catch (err) {
      toast.error('Update failed: Terminal error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-vh-100 bg-dark d-flex align-items-center justify-content-center">
      <div className="spinner-border text-primary shadow-glow"></div>
    </div>
  );

  if (error) return (
    <div className="min-vh-100 bg-dark d-flex flex-column align-items-center justify-content-center gap-3 animate-fade-in">
      <AlertCircle size={48} className="text-danger mb-2" />
      <h5 className="text-white fw-black tracking-widest text-uppercase small">Terminal Sync Failure</h5>
      <div className="d-flex gap-2 mt-2">
        <button onClick={init} className="ui-btn ui-btn-primary px-5 rounded-pill shadow-glow">RETRY PROTOCOL</button>
      </div>
    </div>
  );

  return (
    <div className={`${isDarkMode ? 'bg-dark text-white' : 'bg-light text-dark'} py-4 w-100`} style={{ minHeight: '100vh' }}>
      <div className="container py-2" style={{ maxWidth: '800px' }}>
        <button onClick={() => navigate(-1)} className="btn btn-link text-decoration-none text-muted fw-bold small p-0 mb-4 d-flex align-items-center gap-2">
          <ArrowLeft size={16} /> BACK TO COMMAND CENTER
        </button>

        <div className={`premium-card border-0 shadow-lg rounded-4 animate-fade-in ${isDarkMode ? 'bg-surface' : 'bg-white'}`}>
          <div className="p-4 border-bottom border-white border-opacity-5 d-flex align-items-center justify-content-between bg-primary bg-opacity-5">
            <div className="d-flex align-items-center gap-3">
              <ShieldCheck className="text-primary" size={24} />
              <div>
                <h4 className="mb-0 fw-black text-main text-uppercase tracking-tighter">Status Transmission Terminal</h4>
                <small className="text-muted fw-bold opacity-50 tracking-widest text-uppercase" style={{fontSize: '9px'}}>LEAD: {lead?.name}</small>
              </div>
            </div>
          </div>

          <div className="p-4">
            <form onSubmit={handleSubmit}>
              <div className="d-flex flex-column gap-4">
                {/* Simplified Status & Date Row */}
                <div className="row g-4 align-items-center">
                  <div className={['LOST', 'NOT_INTERESTED', 'REJECTED', 'CONVERTED'].includes(selectedStatus?.toUpperCase()) ? "col-12" : "col-12 col-md-6"}>
                    <label className="form-label small fw-black text-uppercase text-muted tracking-widest mb-2 d-block">System Status</label>
                    <div className="d-flex align-items-center gap-3 p-3 rounded-4 bg-primary bg-opacity-10 border border-primary">
                      <Zap size={20} className="text-primary" />
                      <div>
                        <span className="fw-black text-main text-uppercase tracking-wider d-block">{selectedStatus || 'SELECT STATUS'}</span>
                        <small className="text-muted fw-bold opacity-50" style={{ fontSize: '9px' }}>PIPELINE PROPAGATION ACTIVE</small>
                      </div>
                      {!initialStatus && lead?.status?.toUpperCase() !== 'CONVERTED' && (
                        <button type="button" onClick={() => setShowStatusList(!showStatusList)} className="ms-auto btn btn-sm p-0 text-primary fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>
                          {showStatusList ? 'CLOSE' : 'CHANGE'}
                        </button>
                      )}
                    </div>
                  </div>

                  {lead?.status?.toUpperCase() === 'CONVERTED' && (
                    <div className="col-12 mt-2">
                      <div className="p-3 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-20 d-flex align-items-center gap-3 animate-fade-in">
                        <ShieldCheck size={20} className="text-success" />
                        <div>
                          <h6 className="mb-0 fw-black text-uppercase tracking-wider small text-success">Lead Protocol Finalized</h6>
                          <small className="text-success opacity-75 fw-bold" style={{ fontSize: '9px' }}>Status modification is locked for converted profiles.</small>
                        </div>
                      </div>
                    </div>
                  )}

                  {!['LOST', 'NOT_INTERESTED', 'REJECTED', 'CONVERTED'].includes(selectedStatus?.toUpperCase()) && (
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-black text-uppercase text-muted tracking-widest mb-2 d-block">Follow-up Calendar</label>
                      <div 
                        className="d-flex align-items-center gap-3 p-3 rounded-4 bg-light border border-transparent cursor-pointer hover-bg-opacity"
                        onClick={(e) => {
                          const input = e.currentTarget.querySelector('input');
                          if (input && input.showPicker) input.showPicker();
                          else if (input) input.focus();
                        }}
                      >
                        <Calendar size={20} className="text-muted" />
                        <input 
                          type="datetime-local" 
                          className="bg-transparent border-0 fw-black text-main w-100 cursor-pointer"
                          style={{ outline: 'none' }}
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Status List (Collapsible if not initial) */}
                {(!initialStatus || showStatusList) && (
                  <div className="animate-fade-in">
                    <label className="form-label small fw-black text-uppercase text-muted tracking-widest mb-3 d-block">Select Target Stage</label>
                    <div className="row g-2">
                      {pipelineStages.map(stage => (
                        <div key={stage.id} className="col-12 col-sm-6 col-md-4">
                          <div 
                            onClick={() => {
                              setSelectedStatus(stage.statusValue);
                              if (!initialStatus) setShowStatusList(false);
                            }}
                            className={`p-3 rounded-4 border cursor-pointer transition-all ${selectedStatus === stage.statusValue ? 'bg-primary bg-opacity-10 border-primary shadow-glow-sm' : 'bg-light border-transparent opacity-50'}`}
                          >
                            <span className="fw-black small text-uppercase tracking-wider">{stage.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Converted Status - Payment Logic */}
                {selectedStatus?.toUpperCase() === 'CONVERTED' && (
                  <div className="p-3 rounded-4 bg-light border border-transparent animate-fade-in">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <IndianRupee size={16} className="text-muted" />
                      <h6 className="mb-0 fw-black text-uppercase tracking-widest small opacity-75">Payment Protocol</h6>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <button 
                          type="button"
                          onClick={() => setPaymentType('FULL')}
                          className={`w-100 py-2.5 rounded-3 border fw-black text-uppercase tracking-widest small transition-all ${paymentType === 'FULL' ? 'bg-primary text-white border-primary shadow-glow-sm' : 'bg-white text-muted border-transparent opacity-50'}`}
                          style={{ fontSize: '10px' }}
                        >
                          Full Settlement
                        </button>
                      </div>
                      <div className="col-6">
                        <button 
                          type="button"
                          onClick={() => setPaymentType('EMI')}
                          className={`w-100 py-2.5 rounded-3 border fw-black text-uppercase tracking-widest small transition-all ${paymentType === 'EMI' ? 'bg-primary text-white border-primary shadow-glow-sm' : 'bg-white text-muted border-transparent opacity-50'}`}
                          style={{ fontSize: '10px' }}
                        >
                          EMI Installments
                        </button>
                      </div>
                    </div>

                    {paymentType === 'EMI' && (
                      <div className="p-3 rounded-4 bg-white shadow-sm animate-slide-up">
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label small fw-black text-uppercase text-muted opacity-50" style={{ fontSize: '8px' }}>Package Total</label>
                            <input 
                              type="number" 
                              className="form-control form-control-sm border-0 bg-light rounded-2 fw-bold"
                              value={totalAmount}
                              onChange={(e) => setTotalAmount(e.target.value)}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small fw-black text-uppercase text-muted opacity-50" style={{ fontSize: '8px' }}>Commitment</label>
                            <input 
                              type="number" 
                              className="form-control form-control-sm border-0 bg-light rounded-2 fw-bold"
                              value={initialAmount}
                              onChange={(e) => setInitialAmount(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <label className="form-label small fw-black text-uppercase text-muted opacity-50 mb-0" style={{ fontSize: '8px' }}>Installments</label>
                            <button type="button" onClick={addInstallment} className="btn btn-sm btn-link text-primary text-decoration-none fw-black p-0" style={{ fontSize: '9px' }}>+ ADD</button>
                          </div>
                          <div className="d-flex flex-column gap-2">
                            {installments.map((inst, idx) => (
                              <div key={idx} className="d-flex align-items-center gap-2 animate-fade-in">
                                <input 
                                  type="number" 
                                  className="form-control form-control-sm border-0 bg-light rounded-2 fw-bold"
                                  placeholder="Amount"
                                  value={inst.amount}
                                  onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                                />
                                <input 
                                  type="date" 
                                  className="form-control form-control-sm border-0 bg-light rounded-2 fw-bold cursor-pointer"
                                  value={inst.dueDate}
                                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                  onChange={(e) => handleInstallmentChange(idx, 'dueDate', e.target.value)}
                                />
                                <button type="button" onClick={() => removeInstallment(idx)} className="btn btn-sm text-danger p-0">
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <div className={`mt-3 p-2 rounded-3 text-center fw-black text-uppercase tracking-widest ${isMatch ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`} style={{ fontSize: '9px' }}>
                            {isMatch ? 'Balanced' : `Remaining: ₹${balanceRemaining}`}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {paymentType === 'FULL' && (
                      <div className="p-3 rounded-4 bg-white shadow-sm animate-slide-up text-center">
                         <label className="form-label small fw-black text-uppercase text-muted opacity-50 d-block mb-1" style={{ fontSize: '8px' }}>Total Settlement</label>
                         <div className="d-flex align-items-center justify-content-center gap-2">
                            <IndianRupee size={12} className="text-muted" />
                            <input 
                              type="number" 
                              className="form-control form-control-sm border-0 bg-light rounded-2 fw-bold text-center w-50"
                              value={totalAmount}
                              onChange={(e) => setTotalAmount(e.target.value)}
                            />
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Interaction Note */}
                <div>
                  <label className="form-label small fw-black text-uppercase text-muted tracking-widest mb-2 d-block">Interaction Note</label>
                  <textarea
                    className="form-control border-0 rounded-4 p-4 bg-light shadow-inner fw-bold"
                    rows="3"
                    placeholder="Input interaction context here..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  ></textarea>
                </div>

                {/* Submit */}
                <div className="pt-4 border-top border-white border-opacity-5 d-flex justify-content-end">
                  <button type="submit" disabled={isSubmitting} className="ui-btn ui-btn-primary px-5 py-3 rounded-pill shadow-glow fw-black text-uppercase tracking-widest">
                    {isSubmitting ? 'AUTHORIZING...' : 'AUTHORIZE UPDATE'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadStatusUpdatePage;
