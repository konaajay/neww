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
      await leadsApi.recordCallOutcome(id, {
        status: selectedStatus,
        note,
        paymentType,
        totalAmount: totalAmount || "0",
        paidAmount: paymentType === 'EMI' ? (initialAmount || "0") : (totalAmount || "0"),
        paymentMethod,
        installments: paymentType === 'EMI' ? installments.map(i => ({ ...i, amount: i.amount || "0" })) : [],
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
    <div className={`${isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'} py-4 w-100`} style={{ minHeight: '100vh', background: isDarkMode ? '#0a0a0a' : '#f8f9fa' }}>
      <div className="container py-2" style={{ maxWidth: '720px' }}>
        <button onClick={() => navigate(-1)} className="btn btn-link text-decoration-none text-muted fw-bold small p-0 mb-4 d-flex align-items-center gap-2">
          <ArrowLeft size={16} /> BACK TO COMMAND CENTER
        </button>

        <div className={`premium-card border-0 shadow-lg rounded-4 animate-fade-in ${isDarkMode ? 'bg-surface' : 'bg-white'}`}>
          <div className={`px-4 py-4 border-bottom border-secondary border-opacity-10 d-flex align-items-center justify-content-between ${isDarkMode ? 'bg-surface bg-opacity-50' : 'bg-white'}`}>
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3 shadow-glow-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="mb-0 fw-bold text-main text-uppercase tracking-tight">Lead Status Update</h4>
                <small className="text-muted fw-semibold tracking-wider text-uppercase" style={{ fontSize: '11px', opacity: 0.8 }}>LEAD: {lead?.name}</small>
              </div>
            </div>
          </div>

          <div className="p-4">
            <form onSubmit={handleSubmit}>
              <div className="d-flex flex-column gap-4">
                {/* Simplified Status & Date Row */}
                <div className="row g-4 align-items-center">
                  <div className={['LOST', 'NOT_INTERESTED', 'REJECTED', 'CONVERTED'].includes(selectedStatus?.toUpperCase()) ? "col-12" : "col-12 col-md-6"}>
                    <label className="form-label small fw-bold text-uppercase text-muted tracking-wider mb-2 d-block">System Status</label>
                    <div className={`d-flex align-items-center gap-3 p-3 rounded-4 border border-secondary border-opacity-10 ${isDarkMode ? 'bg-white bg-opacity-5' : 'bg-light'}`}>
                      <Activity size={22} className="text-primary" />
                      <div>
                        <span className="fw-bold text-main text-uppercase tracking-normal d-block fs-5">{selectedStatus || 'SELECT STATUS'}</span>
                        <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '10px' }}>UPDATING LEAD PIPELINE</small>
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
                      <label className="form-label small fw-black text-uppercase text-main tracking-widest mb-2 d-block">Follow-up Calendar</label>
                      <div
                        className={`d-flex align-items-center gap-3 p-3 rounded-4 border border-secondary border-opacity-10 cursor-pointer transition-all hover:border-primary ${isDarkMode ? 'bg-white bg-opacity-5' : 'bg-white'}`}
                        onClick={(e) => {
                          const input = e.currentTarget.querySelector('input');
                          if (input && input.showPicker) input.showPicker();
                          else if (input) input.focus();
                        }}
                      >
                        <Calendar size={18} className="text-primary opacity-50" />
                        <input
                          type="datetime-local"
                          className="bg-transparent border-0 fw-black text-main w-100 cursor-pointer"
                          style={{ outline: 'none', fontSize: '13px' }}
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>


                {/* Status List (Collapsible if not initial) */}
                {(!initialStatus || showStatusList) && (
                  <div className="animate-fade-in mt-2">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <label className="form-label small fw-black text-uppercase text-muted tracking-widest mb-0 d-block">Full Pipeline Map</label>
                      <button type="button" onClick={() => setShowStatusList(false)} className="btn btn-sm p-0 text-muted small fw-bold">CLOSE</button>
                    </div>
                    <div className="row g-2">
                      {pipelineStages.map(stage => (
                        <div key={stage.id} className="col-12 col-sm-6 col-md-4">
                          <div
                            onClick={() => {
                              setSelectedStatus(stage.statusValue);
                              if (!initialStatus) setShowStatusList(false);
                            }}
                            className={`p-3 rounded-4 border cursor-pointer transition-all ${selectedStatus === stage.statusValue ? 'bg-primary bg-opacity-10 border-primary shadow-glow-sm' : isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-10 opacity-60 hover:opacity-100 hover:border-primary' : 'bg-white border-secondary border-opacity-10 opacity-60 hover:opacity-100 hover:border-primary'}`}
                          >
                            <span className={`fw-black small text-uppercase tracking-wider ${selectedStatus === stage.statusValue ? 'text-primary' : 'text-muted'}`}>{stage.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Converted Status - Payment Logic */}
                {selectedStatus?.toUpperCase() === 'CONVERTED' && (
                  <div className={`p-4 rounded-4 border border-secondary border-opacity-10 animate-fade-in shadow-sm ${isDarkMode ? 'bg-white bg-opacity-5' : 'bg-white'}`}>
                    <div className="d-flex align-items-center gap-2 mb-4 px-1">
                      <IndianRupee size={16} className="text-primary" />
                      <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-main">Payment Details</h6>
                    </div>

                  <div className="row g-2 mb-3">
                      <div className="col-6">
                        <button
                          type="button"
                          onClick={() => setPaymentType('FULL')}
                          className={`w-100 py-3 rounded-3 border fw-bold text-uppercase tracking-wider transition-all ${paymentType === 'FULL' ? 'bg-primary text-white border-primary shadow-glow-sm' : isDarkMode ? 'bg-white bg-opacity-10 text-muted border-transparent' : 'bg-light text-muted border-secondary border-opacity-10'}`}
                          style={{ fontSize: '11px' }}
                        >
                          Full Settlement
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          type="button"
                          onClick={() => setPaymentType('EMI')}
                          className={`w-100 py-3 rounded-3 border fw-bold text-uppercase tracking-wider transition-all ${paymentType === 'EMI' ? 'bg-primary text-white border-primary shadow-glow-sm' : isDarkMode ? 'bg-white bg-opacity-10 text-muted border-transparent' : 'bg-light text-muted border-secondary border-opacity-10'}`}
                          style={{ fontSize: '11px' }}
                        >
                          EMI Installments
                        </button>
                      </div>
                  </div>

                  {paymentType === 'EMI' && (
                    <div className="p-3 rounded-4 bg-white shadow-sm animate-slide-up">
                      <div className="row g-2">
                        <div className="col-6">
                          <label className="form-label fw-bold text-uppercase text-muted mb-2" style={{ fontSize: '10px' }}>Package Total</label>
                          <input
                            type="number"
                            className={`form-control form-control-lg border-0 rounded-3 fw-bold ${isDarkMode ? 'bg-white bg-opacity-10 text-white' : 'bg-light text-dark'}`}
                            style={{ fontSize: '14px' }}
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label fw-bold text-uppercase text-muted mb-2" style={{ fontSize: '10px' }}>Commitment</label>
                          <input
                            type="number"
                            className={`form-control form-control-lg border border-secondary border-opacity-10 rounded-3 fw-bold ${isDarkMode ? 'bg-surface text-white' : 'bg-white text-dark'}`}
                            style={{ fontSize: '14px' }}
                            value={initialAmount}
                            onChange={(e) => setInitialAmount(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <label className="form-label fw-bold text-uppercase text-muted mb-0" style={{ fontSize: '10px' }}>Installment Breakdown</label>
                          <button type="button" onClick={addInstallment} className="btn btn-sm btn-link text-primary text-decoration-none fw-bold p-0" style={{ fontSize: '11px' }}>+ ADD NEW</button>
                        </div>
                        <div className="d-flex flex-column gap-2">
                          {installments.map((inst, idx) => (
                            <div key={idx} className="d-flex align-items-center gap-2 animate-fade-in">
                              <input
                                type="number"
                                className={`form-control border-0 rounded-3 fw-bold ${isDarkMode ? 'bg-white bg-opacity-10 text-white' : 'bg-light text-dark'}`}
                                style={{ fontSize: '13px' }}
                                placeholder="Amount"
                                value={inst.amount}
                                onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                              />
                              <input
                                type="date"
                                className={`form-control border border-secondary border-opacity-10 rounded-3 fw-bold cursor-pointer ${isDarkMode ? 'bg-surface text-white' : 'bg-white text-dark'}`}
                                style={{ fontSize: '13px' }}
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

                        <div className={`mt-4 p-3 rounded-3 text-center fw-bold text-uppercase tracking-wider ${isMatch ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`} style={{ fontSize: '11px' }}>
                          {isMatch ? 'Total Balanced' : `Pending Balance: ₹${balanceRemaining}`}
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentType === 'FULL' && (
                    <div className="p-3 rounded-4 bg-white shadow-sm animate-slide-up text-center">
                      <div className="d-flex align-items-center justify-content-center gap-3">
                        <IndianRupee size={20} className="text-primary" />
                        <input
                          type="number"
                          className={`form-control form-control-lg border border-secondary border-opacity-10 rounded-3 fw-bold text-center w-50 ${isDarkMode ? 'bg-surface text-white' : 'bg-white text-dark'}`}
                          style={{ fontSize: '18px' }}
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}


                <div className="mt-2">
                  <label className="form-label small fw-bold text-uppercase text-muted tracking-wider mb-2 d-block px-1">Interaction Notes</label>
                  <textarea
                    className={`form-control border border-secondary border-opacity-10 rounded-4 p-4 shadow-sm fw-bold transition-all focus-border-primary ${isDarkMode ? 'bg-white bg-opacity-5 text-white' : 'bg-white text-dark'}`}
                    rows="3"
                    placeholder="Input interaction context here..."
                    style={{ outline: 'none' }}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  ></textarea>
                </div>

                {/* Submit */}
                <div className="pt-4 border-top border-white border-opacity-5 d-flex justify-content-end">
                  <button type="submit" disabled={isSubmitting} className="ui-btn ui-btn-primary px-5 py-3 rounded-pill shadow-glow fw-black text-uppercase tracking-widest">
                    {isSubmitting ? 'UPDATING...' : 'UPDATE LEAD'}
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
