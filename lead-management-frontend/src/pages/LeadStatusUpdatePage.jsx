import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldCheck, Calendar, MessageSquare, ArrowLeft, Activity,
  Info, Zap, AlertCircle, IndianRupee, Plus, X, Shield, Copy
} from 'lucide-react';
import { toast } from 'react-toastify';
import PortalSelect from '../components/PortalSelect';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Link as LinkIcon, Wallet, Search } from 'lucide-react';
import PaymentOcrUpload from '../components/PaymentOcrUpload';
import { useLookupData } from '../features/users/hooks/useLookupData';

// Clean Architecture Services
import adminService from '../services/adminService';
import leadsApi from '../features/leads/api/leadsApi';
import { useLeadStatusLogic } from '../features/leads/hooks/useLeadStatusLogic';

const LeadStatusUpdatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('newStatus');

  const { isDarkMode } = useTheme();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [note, setNote] = useState('');
  const [paymentSkipped, setPaymentSkipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualPayment, setIsManualPayment] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [feeStructureExists, setFeeStructureExists] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [utr, setUtr] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role?.toUpperCase() || '';
  const canDoManual = ['ADMIN', 'MANAGER', 'ROLE_ADMIN', 'ROLE_MANAGER', 'TEAM_LEADER', 'ROLE_TEAM_LEADER', 'ASSOCIATE', 'BDA'].some(r => userRole.includes(r));

  // Auto-refreshing lookup data
  const { 
    pipelineStages: hookStages, 
    courses: hookCourses 
  } = useLookupData(userRole);

  const pipelineStages = useMemo(() => hookStages || [], [hookStages]);
  const courses = useMemo(() => hookCourses || [], [hookCourses]);

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
    discount, setDiscount,
    discountedTotal,
    totalPaidSoFar, setTotalPaidSoFar,
    initialAmount, setInitialAmount,
    installments, setInstallments,
    paymentType, setPaymentType,
    addInstallment,
    removeInstallment,
    handleInstallmentChange,
    sumOfParts,
    balanceRemaining,
    isMatch
  } = useLeadStatusLogic();

  useEffect(() => {
    if (searchParams.get('manual') === 'true') {
      setIsManualPayment(true);
      const amt = searchParams.get('amount');
      if (amt) setInitialAmount(amt);
    }
  }, [searchParams]);

  const init = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Parallel loading of lead-specific data
      // courses and stages are now handled by useLookupData auto-polling
      const [leadRes, feeRes] = await Promise.allSettled([
        leadsApi.fetchLeadById(id),
        leadsApi.getFeeStructure(id)
      ]);

      // courses and stages are now handled by hook auto-polling

      if (leadRes.status === 'fulfilled') {
        const leadData = leadRes.value.data || leadRes.value;
        setLead(leadData);
        if (!initialStatus) setSelectedStatus(leadData.status);
      } else {
        throw new Error('Lead data fetch failed');
      }

      if (feeRes.status === 'fulfilled' && feeRes.value) {
        const feeData = feeRes.value.data || feeRes.value;
        if (feeData && feeData.totalAmount > 0) {
          setFeeStructureExists(true);
          if (feeData.totalAmount > 0) {
            setTotalAmount(feeData.totalAmount);
          }
          setTotalPaidSoFar(feeData.paidAmount || 0);
          setDiscount(feeData.discount || 0);

          if (feeData.installments) {
            const currentPayId = searchParams.get('installmentId');
            const pending = feeData.installments
              .filter(p => (p.status === 'PENDING' || p.status === 'REJECTED' || p.status === 'OVERDUE') && String(p.id) !== currentPayId)
              .map(p => ({
                amount: p.amount,
                dueDate: p.dueDate ? p.dueDate.substring(0, 16) : ''
              }));
            
            if (installments.length === 0) setInstallments(pending);
          }

          // Course sync is handled by the dedicated useEffect below
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
  }, [id, initialStatus, searchParams, setTotalAmount, setTotalPaidSoFar, setPaymentType, setDiscount, setInstallments, installments.length]);

  // Reactive Sync for Course and Fee Metadata
  useEffect(() => {
    if (lead && courses.length > 0 && !selectedCourse) {
      const courseId = lead.courseId;
      if (courseId) {
        const course = courses.find(c => c.id === Number(courseId));
        if (course) setSelectedCourse(course);
      }
    }
  }, [lead, courses, selectedCourse]);

  useEffect(() => {
    init();
  }, [init]);

  // Sync Follow-up Date with First Installment Date
  useEffect(() => {
    if (paymentType === 'EMI' && installments.length > 0 && installments[0].dueDate) {
      setFollowUpDate(installments[0].dueDate);
    }
  }, [paymentType, installments]);

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c.id === Number(courseId));
    setSelectedCourse(course);
    if (course) {
      setTotalAmount(course.baseFee);
      setInitialAmount(course.minTokenAmount || 500);
    }
  };

  const currentStatusConfig = useMemo(() => {
    return pipelineStages.find(s => s.statusValue === selectedStatus) || {};
  }, [pipelineStages, selectedStatus]);

  const handleOcrData = (data) => {
    if (data.amount) {
      // Strip currency symbols and commas for numeric input
      const numericAmount = data.amount.replace(/[^\d.]/g, '');
      setInitialAmount(numericAmount);
    }
    if (data.utrNumber || data.payerName) {
      setUtr(data.utrNumber || '');
      setNote(prev => {
        const parts = prev.split('|').map(p => p.trim());
        const otherParts = parts.filter(p => !p.toUpperCase().startsWith('UTR:') && !p.toUpperCase().startsWith('PAYER:'));
        
        const newParts = [];
        if (data.utrNumber) newParts.push(`UTR: ${data.utrNumber}`);
        if (data.payerName && data.payerName !== 'NOT FOUND') newParts.push(`PAYER: ${data.payerName}`);
        
        return [...newParts, ...otherParts].join(' | ');
      });
    }
    if (data.paymentApp) {
      const app = data.paymentApp.toUpperCase();
      if (app.includes('PHONEPE')) setPaymentMethod('UPI');
      else if (app.includes('GPAY')) setPaymentMethod('UPI');
      else if (app.includes('PAYTM')) setPaymentMethod('UPI');
    }
    if (data.paymentDate && data.paymentTime) {
       // Optional: Parse date/time into followUpDate format if needed
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!isMatch) {
      toast.error("Accounting Protocol Violation: Amounts must match exactly");
      return null;
    }

    if (paymentType === 'EMI') {
      const invalidInst = installments.find(i => !i.amount || !i.dueDate);
      if (invalidInst) {
        toast.warning("Protocol Incomplete: Every installment requires an amount and a due date.");
        return null;
      }
    }
    
    setIsGeneratingLink(true);
    try {
      await leadsApi.updateStatus(id, selectedStatus, note, {
        paymentType,
        totalAmount: totalAmount || "0",
        paidAmount: paymentType === 'EMI' ? (initialAmount || "0") : (totalAmount || "0"),
        paymentMethod,
        discount: discount || 0,
        installments: paymentType === 'EMI' ? installments.map(i => ({ ...i, amount: i.amount || "0" })) : [],
        dueDate: followUpDate,
        courseId: selectedCourse?.id
      });

      const res = await leadsApi.createCashfreeOrder(
        id, 
        initialAmount || "0", 
        paymentType, 
        paymentType === 'EMI' ? installments : [], 
        totalAmount || null, 
        discount || null
      );
      if (res && res.order_id) {
        const paymentUrl = `${window.location.origin}/payment-instruction/${res.order_id}`;
        setGeneratedLink(paymentUrl);
        return paymentUrl;
      }
      return null;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate payment link");
      return null;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return toast.warning("Please select a status");

    // Strict Enforcement of Pipeline Architecture Rules
    if (currentStatusConfig?.requireNote && !note.trim()) {
        return toast.error(`Strategic Protocol: Note required for ${selectedStatus} status.`);
    }

    if (currentStatusConfig?.requireDate && !followUpDate) {
        return toast.error(`Strategic Protocol: Synchronization date required for ${selectedStatus}.`);
    }

    setIsSubmitting(true);
    try {
      const response = isManualPayment 
        ? await leadsApi.recordManualPayment({
            leadId: id,
            amount: paymentType === 'EMI' ? (initialAmount || "0") : (totalAmount || "0"),
            totalAmount: totalAmount || "0",
            discount: discount || 0,
            paymentMethod,
            note: note || "Manual Payment Recorded",
            paymentType: paymentType === 'EMI' ? 'EMI_INSTALLMENT' : 'FULL',
            utr: utr,
            installments: paymentType === 'EMI' ? installments.map(i => ({ ...i, amount: i.amount || "0" })) : [],
            nextDueDate: paymentType === 'EMI' ? followUpDate : null
          }, receiptFile)
        : await leadsApi.updateStatus(id, selectedStatus, note, {
            paymentType,
            totalAmount: totalAmount || "0",
            paidAmount: paymentSkipped ? "0" : (paymentType === 'EMI' ? (initialAmount || "0") : (totalAmount || "0")),
            paymentMethod,
            discount: discount || 0,
            installments: paymentType === 'EMI' ? installments.map(i => ({ ...i, amount: i.amount || "0" })) : [],
            dueDate: (currentStatusConfig?.requireDate || ['EMI', 'EMI_FOLLOWUP'].includes(selectedStatus?.toUpperCase())) ? followUpDate : null,
            courseId: selectedCourse?.id
          });

      if (response?.status === 'PENDING_APPROVAL') {
        toast.info('Payment recorded and queued for Manager Verification');
      } else {
        toast.success('System Status Propagated Successfully');
      }

      // Invalidate queries to trigger hard refresh of dashboard data
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      navigate(-1);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Update failed: Terminal error';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (lead && !lead.assignedToId) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center gap-4 p-4 text-center" style={{ background: isDarkMode ? '#0a0a0a' : '#f8f9fa' }}>
        <div className="p-4 rounded-circle bg-danger bg-opacity-10 text-danger shadow-glow-sm">
          <Shield size={48} />
        </div>
        <div className="max-w-md">
          <h4 className={`fw-black text-uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Protocol Restricted</h4>
          <p className="text-muted fw-bold small mb-4 px-4">
            Lead <span className="text-primary">{lead.name}</span> is currently in an <span className="text-danger">UNASSIGNED</span> state. 
            Assignment to a Strategic Representative is required before status transitions or financial protocols can be initiated.
          </p>
          <button onClick={() => navigate(-1)} className="ui-btn ui-btn-primary px-5 py-3 rounded-pill shadow-glow fw-black text-uppercase tracking-widest">
            Back to Command Center
          </button>
        </div>
      </div>
    );
  }

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
    <div 
      className={`${isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'} py-4 w-100 custom-scroll`} 
      style={{ 
        height: '100vh', 
        overflowY: 'auto', 
        background: isDarkMode ? '#0a0a0a' : '#f8f9fa' 
      }}
    >
      <div className="container py-1" style={{ maxWidth: '720px' }}>
        <button onClick={() => navigate(-1)} className="btn btn-link text-decoration-none text-muted fw-bold small p-0 mb-2 d-flex align-items-center gap-2">
          <ArrowLeft size={14} /> BACK TO COMMAND CENTER
        </button>

        <div className={`premium-card border-0 shadow-lg rounded-4 animate-fade-in ${isDarkMode ? 'bg-surface' : 'bg-white'}`}>
          <div className={`px-4 py-2 border-bottom border-secondary border-opacity-10 d-flex align-items-center justify-content-between ${isDarkMode ? 'bg-surface bg-opacity-50' : 'bg-white'}`}>
            <div className="d-flex align-items-center gap-2">
              <div className="p-1.5 bg-primary bg-opacity-10 text-primary rounded-3 shadow-glow-sm">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-main text-uppercase tracking-tight" style={{ fontSize: '14px' }}>Lead Status Update</h5>
                <small className="text-muted fw-semibold tracking-wider text-uppercase" style={{ fontSize: '9px', opacity: 0.8 }}>LEAD: {lead?.name}</small>
              </div>
            </div>
          </div>

          <div className="p-3">
            <form onSubmit={handleSubmit}>
              <div className="d-flex flex-column gap-3">
                {/* Integrated Status Command Center */}
                <div className={`p-3 rounded-4 border ${isDarkMode ? 'bg-surface bg-opacity-40 border-white border-opacity-5' : 'bg-light border-secondary border-opacity-10'} animate-fade-in`}>
                  <div className="row g-4 align-items-center">
                    <div className="col-12 col-lg-7">
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle shadow-glow-sm">
                          <Activity size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <label className="text-muted small fw-black text-uppercase tracking-widest mb-0 d-block" style={{ fontSize: '9px' }}>Current Protocol</label>
                          <h4 className="fw-black text-main text-uppercase mb-0 tracking-tight" style={{ fontSize: '24px' }}>
                            {selectedStatus?.replace('_', ' ') || 'Select Protocol'}
                          </h4>
                        </div>
                      </div>
                    </div>

                    {(currentStatusConfig?.requireDate || selectedStatus === 'EMI' || selectedStatus === 'EMI_FOLLOWUP') && selectedStatus !== 'INTERESTED' && (
                      <div className="col-12 col-lg-5">
                        <div className="ps-lg-4 border-start border-white border-opacity-5">
                          <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '9px' }}>Next Synchronization</label>
                          <div
                            className={`d-flex align-items-center gap-2 p-2 rounded-3 border border-secondary border-opacity-10 cursor-pointer transition-all hover-border-primary ${isDarkMode ? 'bg-black bg-opacity-20' : 'bg-white'}`}
                            onClick={(e) => {
                              const input = e.currentTarget.querySelector('input');
                              if (input && input.showPicker) input.showPicker();
                            }}
                          >
                            <Calendar size={14} className="text-primary opacity-50" />
                            <input
                              type="datetime-local"
                              className="bg-transparent border-0 fw-bold text-main flex-grow-1 cursor-pointer"
                              style={{ outline: 'none', fontSize: '11px' }}
                              value={followUpDate}
                              onChange={(e) => setFollowUpDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* Status List (Collapsible if not initial) */}
                {(!initialStatus || showStatusList) && (
                  <div className="animate-fade-in mt-2">
                    <div className="row g-2">
                      {['CONVERTED', 'EMI', 'PAID'].includes(lead?.status?.toUpperCase()) ? (
                        <>
                          <div className="col-12 col-sm-6">
                            <div
                              onClick={() => { 
                                setSelectedStatus('PAID'); 
                                setPaymentSkipped(false);
                                if (!initialStatus) setShowStatusList(false); 
                              }}
                              className={`p-3 rounded-4 border cursor-pointer transition-all d-flex flex-column justify-content-between ${selectedStatus === 'PAID' ? 'bg-success bg-opacity-10 border-success shadow-glow-sm' : isDarkMode ? 'bg-surface bg-opacity-50 border-white border-opacity-10 opacity-60 hover:opacity-100 hover:border-success' : 'bg-white border-secondary border-opacity-10 opacity-60 hover:opacity-100 hover:border-success'}`}
                            >
                              <span className={`fw-black small text-uppercase tracking-wider ${selectedStatus === 'PAID' ? 'text-success' : 'text-muted'}`}>Payment Complete</span>
                              <div className="d-flex gap-2 mt-2">
                                <div className="text-success opacity-50" title="Note Encouraged">
                                  <MessageSquare size={12} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div
                              onClick={() => { 
                                setSelectedStatus('EMI_FOLLOWUP'); 
                                setPaymentSkipped(true);
                                setNote('Payment not complete. Rescheduled for follow-up.');
                                if (!initialStatus) setShowStatusList(false); 
                              }}
                              className={`p-3 rounded-4 border cursor-pointer transition-all d-flex flex-column justify-content-between ${selectedStatus === 'EMI_FOLLOWUP' ? 'bg-danger bg-opacity-10 border-danger shadow-glow-sm' : isDarkMode ? 'bg-surface bg-opacity-50 border-white border-opacity-10 opacity-60 hover:opacity-100 hover:border-danger' : 'bg-white border-secondary border-opacity-10 opacity-60 hover:opacity-100 hover:border-danger'}`}
                            >
                              <span className={`fw-black small text-uppercase tracking-wider ${selectedStatus === 'EMI_FOLLOWUP' ? 'text-danger' : 'text-muted'}`}>Payment Not Complete</span>
                              <div className="d-flex gap-2 mt-2">
                                <div className="text-danger opacity-50" title="Note Required">
                                  <MessageSquare size={12} />
                                </div>
                                <div className="text-danger opacity-50" title="Date Required">
                                  <Calendar size={12} />
                                </div>
                              </div>
                            </div>
                          </div>


                        </>
                      ) : (
                        pipelineStages.filter(s => !['CONVERTED', 'PAID', 'PAYMENT_DEFAULTED'].includes(s.statusValue?.toUpperCase())).map((stage, idx) => (
                          <div key={stage.id || stage.statusValue || `stage-${idx}`} className="col-12 col-sm-6 col-md-4">
                            <div
                              onClick={() => {
                                setSelectedStatus(stage.statusValue);
                                setPaymentSkipped(false);
                                if (!initialStatus) setShowStatusList(false);
                              }}
                              className={`p-3 rounded-4 border cursor-pointer transition-all h-100 d-flex flex-column justify-content-between ${selectedStatus === stage.statusValue ? 'bg-primary bg-opacity-10 border-primary shadow-glow-sm' : isDarkMode ? 'bg-surface bg-opacity-50 border-white border-opacity-10 opacity-60 hover:opacity-100 hover:border-primary' : 'bg-white border-secondary border-opacity-10 opacity-60 hover:opacity-100 hover:border-primary'}`}
                            >
                              <span className={`fw-black small text-uppercase tracking-wider ${selectedStatus === stage.statusValue ? 'text-primary' : 'text-muted'}`}>{stage.label}</span>
                              
                              <div className="d-flex gap-2 mt-2">
                                {stage.requireNote && (
                                  <div className="text-primary opacity-50" title="Note Required">
                                    <MessageSquare size={12} />
                                  </div>
                                )}
                                {stage.requireDate && (
                                  <div className="text-primary opacity-50" title="Date Required">
                                    <Calendar size={12} />
                                  </div>
                                )}
                                {stage.createTask && (
                                  <div className="text-primary opacity-50" title="Auto Task Creation">
                                    <Zap size={12} fill="currentColor" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Fee Structure Form - Now available for INTERESTED, PAID, and CONVERTED */}
                {['INTERESTED', 'PAID', 'CONVERTED'].includes(selectedStatus?.toUpperCase()) && (lead?.status?.toUpperCase() !== 'CONVERTED' || isManualPayment) && (
                  <div className={`p-3 rounded-4 border border-secondary border-opacity-10 animate-fade-in shadow-sm ${isDarkMode ? 'bg-surface bg-opacity-80' : 'bg-white'}`}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <IndianRupee size={16} className="text-primary" />
                        <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-main">Student Fee Structure Form</h6>
                      </div>
                      <div className="text-muted fw-bold text-uppercase" style={{ fontSize: '8px', opacity: 0.6 }}>Enrollment Roadmap Protocol</div>
                    </div>



                    <div className="row g-3 mb-4">
                      <div className="col-12">
                        <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '9px' }}>1. Select Program Protocol</label>
                        <PortalSelect 
                          options={[{ value: "", label: "-- SELECT COURSE --" }, ...courses.map(c => ({ value: c.id.toString(), label: `${c.name.toUpperCase()} (₹${c.baseFee})` }))]}
                          value={selectedCourse?.id?.toString() || ''}
                          onChange={(e) => handleCourseChange(e.target.value)}
                          placeholder="Select Program Protocol"
                        />
                        {feeStructureExists && (
                          <div className="mt-2 p-2 rounded-3 bg-warning bg-opacity-10 border border-warning border-opacity-20 d-flex align-items-center gap-2">
                             <AlertCircle size={14} className="text-warning" />
                             <small className="text-warning fw-bold" style={{ fontSize: '9px' }}>
                               Existing structure detected. Updating this will overwrite all pending installments.
                             </small>
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '9px' }}>2. Base Package</label>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="number"
                            className={`form-control border border-secondary border-opacity-10 rounded-3 fw-bold ${isDarkMode ? 'bg-surface text-white' : 'bg-white text-dark'}`}
                            placeholder="e.g. 50000"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                            readOnly={!isManualPayment}
                            disabled={!isManualPayment}
                          />
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '9px' }}>3. Applying Discount</label>
                        <input
                          type="number"
                          min="0"
                          className={`form-control border border-secondary border-opacity-10 rounded-3 fw-bold ${isDarkMode ? 'bg-surface text-white' : 'bg-white text-dark'}`}
                          placeholder="Amount to deduct"
                          value={discount || ''}
                          onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                        />
                      </div>

                      <div className="col-12">
                        <div className={`p-2 rounded-3 text-center fw-black text-uppercase border ${isDarkMode ? 'bg-slate-900 border-white border-opacity-10' : 'bg-light border-secondary border-opacity-10'}`} style={{ fontSize: '10px', letterSpacing: '1px' }}>
                          Final Settlement: <span className="text-primary">₹{discountedTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="col-12 mt-2">
                        <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '9px' }}>4. Commitment (Min ₹{selectedCourse?.minTokenAmount || 500})</label>
                        <input
                          type="number"
                          min="0"
                          className={`form-control border border-primary border-opacity-20 rounded-3 fw-black text-primary ${isDarkMode ? 'bg-surface' : 'bg-white'}`}
                          placeholder="Amount for link generation"
                          value={initialAmount || ''}
                          onChange={(e) => setInitialAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        />
                        {initialAmount > 0 && initialAmount < (selectedCourse?.minTokenAmount || 500) && (
                          <small className="text-danger fw-bold mt-1 d-block" style={{ fontSize: '9px' }}>Minimum ₹{selectedCourse?.minTokenAmount || 500} required for protocol initiation.</small>
                        )}
                        {Number(initialAmount) > Number(discountedTotal) && (
                          <small className="text-danger fw-bold mt-1 d-block" style={{ fontSize: '9px' }}>Commitment cannot exceed the total settlement amount (₹{discountedTotal}).</small>
                        )}
                      </div>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <button
                          type="button"
                          onClick={() => setPaymentType('FULL')}
                          className={`w-100 py-3 rounded-3 border fw-bold text-uppercase tracking-wider transition-all ${paymentType === 'FULL' ? 'bg-primary text-white border-primary shadow-glow-sm' : isDarkMode ? 'bg-surface bg-opacity-50 text-muted border-transparent' : 'bg-light text-muted border-secondary border-opacity-10'}`}
                          style={{ fontSize: '11px' }}
                        >
                          Full Settlement
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          type="button"
                          onClick={() => setPaymentType('EMI')}
                          className={`w-100 py-3 rounded-3 border fw-bold text-uppercase tracking-wider transition-all ${paymentType === 'EMI' ? 'bg-primary text-white border-primary shadow-glow-sm' : isDarkMode ? 'bg-surface bg-opacity-50 text-muted border-transparent' : 'bg-light text-muted border-secondary border-opacity-10'}`}
                          style={{ fontSize: '11px' }}
                        >
                          EMI Installments
                        </button>
                      </div>
                    </div>

                    {paymentType === 'EMI' && (
                      <div className={`p-3 rounded-4 mb-3 border border-primary border-opacity-10 animate-slide-up ${isDarkMode ? 'bg-surface' : 'bg-white'}`}>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <label className="form-label fw-bold text-uppercase text-muted mb-0" style={{ fontSize: '10px' }}>Plan Future Dues (Max 4)</label>
                          <button 
                            type="button" 
                            disabled={installments.length >= 4}
                            onClick={addInstallment} 
                            className={`btn btn-sm btn-link text-decoration-none fw-bold p-0 ${installments.length >= 4 ? 'text-muted' : 'text-primary'}`} 
                            style={{ fontSize: '11px' }}
                          >
                            {installments.length >= 4 ? 'LIMIT REACHED' : '+ ADD DUE DATE'}
                          </button>
                        </div>
                        <div className="d-flex flex-column gap-2">
                          {installments.map((inst, idx) => (
                            <div key={idx} className="d-flex align-items-center gap-2 animate-fade-in">
                              <input
                                type="number"
                                min="0"
                                className={`form-control border-0 rounded-3 fw-bold ${isDarkMode ? 'bg-surface bg-opacity-50 text-white' : 'bg-light text-dark'}`}
                                style={{ fontSize: '12px' }}
                                placeholder="Amount"
                                value={inst.amount || ''}
                                onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                              />
                              <input
                                type="datetime-local"
                                className={`form-control border border-secondary border-opacity-10 rounded-3 fw-bold cursor-pointer ${isDarkMode ? 'bg-surface text-white' : 'bg-white text-dark'}`}
                                style={{ fontSize: '12px' }}
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
                      </div>
                    )}

                    {((paymentType === 'EMI' && installments.length > 0) || (paymentType === 'FULL')) && (
                      <div className={`mt-2 mb-3 p-3 rounded-4 text-center fw-bold text-uppercase border animate-fade-in ${isMatch ? 'text-success bg-success bg-opacity-10 border-success border-opacity-20' : 'text-danger bg-danger bg-opacity-10 border-danger border-opacity-20'}`} style={{ fontSize: '10px' }}>
                        {isMatch ? (
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <ShieldCheck size={14} /> ACCOUNTING VERIFIED: ₹{sumOfParts.toLocaleString()}
                          </div>
                        ) : (
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <AlertCircle size={14} /> 
                            {paymentType === 'FULL' 
                              ? `MISMATCH: Commitment (₹${initialAmount || 0}) must match Settlement (₹${discountedTotal})`
                              : `MATH MISMATCH: ₹${Math.abs(balanceRemaining).toLocaleString()} ${balanceRemaining > 0 ? 'UNPLANNED' : 'EXCESS'}`
                            }
                          </div>
                        )}
                      </div>
                    )}

                    {!isManualPayment && (
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <button
                            type="button"
                            disabled={isGeneratingLink || !initialAmount || initialAmount < (selectedCourse?.minTokenAmount || 500) || !totalAmount || !isMatch}
                            onClick={async () => {
                              const link = await handleGeneratePaymentLink();
                              if (link) {
                                setShowSuccessModal(true);
                              }
                            }}
                            className="w-100 py-3 ui-btn ui-btn-primary rounded-3 fw-black text-uppercase tracking-widest shadow-glow-sm d-flex align-items-center justify-content-center gap-2"
                            style={{ fontSize: '10px' }}
                          >
                            {isGeneratingLink ? <div className="spinner-border spinner-border-sm"></div> : <LinkIcon size={14} />}
                            GENERATE LINK
                          </button>
                        </div>
                        <div className="col-12 col-md-6">
                          <button
                            type="button"
                            disabled={isGeneratingLink || !initialAmount || initialAmount < (selectedCourse?.minTokenAmount || 500) || !totalAmount || !isMatch}
                            onClick={async () => {
                              const link = await handleGeneratePaymentLink();
                              if (link) {
                                setShowQRModal(true);
                              }
                            }}
                            className="w-100 py-3 ui-btn ui-btn-outline rounded-3 fw-black text-uppercase tracking-widest d-flex align-items-center justify-content-center gap-2"
                            style={{ fontSize: '10px', borderColor: 'rgba(var(--primary-rgb), 0.2)' }}
                          >
                            <QrCode size={14} />
                            GENERATE QR
                          </button>
                        </div>
                        <div className="col-12">
                           <button
                            type="button"
                            onClick={() => setIsManualPayment(true)}
                            className="w-100 py-3 ui-btn ui-btn-secondary bg-opacity-10 text-muted rounded-3 fw-black text-uppercase tracking-widest d-flex align-items-center justify-content-center gap-2"
                            style={{ fontSize: '10px' }}
                          >
                            <Wallet size={14} />
                            MANUAL PAYMENT RECORD
                          </button>
                        </div>
                      </div>
                    )}
                    {!isManualPayment && (
                      <small className="d-block text-center mt-2 text-muted fw-bold" style={{ fontSize: '9px' }}>* AUTOMATICALLY CONVERTS ON SUCCESSFUL PAYMENT</small>
                    )}
                  </div>
                )}

                {/* Manual Payment Section for Initiation/Verification */}
                {(isManualPayment || (canDoManual && ['PAID', 'CONVERTED', 'INTERESTED'].includes(selectedStatus?.toUpperCase()))) && (
                  <div className={`p-3 rounded-4 border border-warning border-opacity-20 animate-fade-in ${isDarkMode ? 'bg-warning bg-opacity-5' : 'bg-warning bg-opacity-10'}`}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <Shield size={16} className="text-warning" />
                        <h6 className="mb-0 fw-bold text-uppercase tracking-wider text-main">Manual Payment Verification</h6>
                      </div>
                      <button type="button" className="btn btn-link text-warning p-0" onClick={() => setIsManualPayment(false)}>
                         <X size={16} />
                      </button>
                    </div>

                    {isManualPayment && (
                      <div className="animate-slide-up">
                        <div className="alert alert-warning bg-warning bg-opacity-10 border-0 rounded-4 p-3 mb-4">
                          <p className="small mb-0 fw-bold text-warning">
                            STRATEGIC OVERRIDE: You are bypassing the secure gateway link. Recording this will mark the lead as PAID immediately.
                          </p>
                        </div>

                        <div className="mb-4">
                          <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '9px' }}>Payment Verification Protocol</label>
                          <PaymentOcrUpload 
                            onDataExtracted={handleOcrData} 
                            currentFile={receiptFile} 
                            setCurrentFile={setReceiptFile} 
                          />
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '9px' }}>Payment Method</label>
                            <PortalSelect 
                              options={[
                                { value: 'CASH', label: 'Cash' },
                                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                                { value: 'UPI', label: 'UPI (Direct)' },
                                { value: 'CARD', label: 'Card Swipe' }
                              ]}
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                          </div>
                          
                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '9px' }}>Verification Note</label>
                            <input 
                              type="text" 
                              className={`form-control rounded-3 ${isDarkMode ? 'bg-surface text-white' : 'bg-white'}`}
                              placeholder="Ref ID, Cash Collector, etc."
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                            />
                          </div>
                          
                          {/* Visible UTR Field for manual editing/confirmation */}
                          {utr && (
                            <div className="col-12 mt-2 animate-fade-in">
                              <div className={`p-2 rounded-3 border border-dashed d-flex align-items-center justify-content-between ${isDarkMode ? 'bg-black bg-opacity-20 border-white border-opacity-10' : 'bg-light border-secondary border-opacity-20'}`}>
                                <div className="d-flex align-items-center gap-2 flex-grow-1">
                                  <Shield size={12} className="text-primary" />
                                  <div className="flex-grow-1">
                                    <label className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '7px' }}>Verified UTR/TXN ID</label>
                                    <input 
                                      type="text"
                                      className="bg-transparent border-0 p-0 text-primary fw-black font-monospace w-100"
                                      style={{ fontSize: '10px', outline: 'none' }}
                                      value={utr}
                                      onChange={(e) => setUtr(e.target.value.toUpperCase())}
                                    />
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => setUtr('')}
                                  className="btn btn-link p-0 text-danger text-decoration-none fw-bold ms-2"
                                  style={{ fontSize: '9px' }}
                                >
                                  REMOVE
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Interaction Notes - Responsive to custom architecture settings */}
                {(currentStatusConfig?.requireNote || selectedStatus === 'EMI') && (
                  <div className="animate-fade-in mt-2">
                    <label className="form-label small fw-bold text-uppercase text-muted tracking-wider mb-2 d-block px-1">Interaction Notes</label>
                    <textarea
                      className={`form-control border border-secondary border-opacity-10 rounded-4 p-4 shadow-sm fw-bold transition-all focus-border-primary ${isDarkMode ? 'bg-surface bg-opacity-50 text-white' : 'bg-white text-dark'}`}
                      rows="3"
                      placeholder="Input interaction context here..."
                      style={{ outline: 'none' }}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    ></textarea>
                  </div>
                )}

                {(selectedStatus?.toUpperCase() !== 'INTERESTED' || isManualPayment) && (
                  <div className="pt-2 text-center">
                    <button
                      type="submit"
                      disabled={isSubmitting || (isManualPayment && !isMatch)}
                      className="w-100 py-3 ui-btn ui-btn-primary rounded-pill fw-black text-uppercase tracking-widest shadow-glow mb-3 transition-all hover-scale"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="spinner-border spinner-border-sm me-2"></div>
                          UPDATING SYSTEM...
                        </>
                      ) : (
                        'Commit Status Update'
                      )}
                    </button>
                    <small className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: '8px', opacity: 0.5 }}>Protocol Security Enforcement Active</small>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {showQRModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade-in" 
          style={{ 
            zIndex: 10000, 
            background: 'rgba(0,0,0,0.7)', 
            backdropFilter: 'blur(8px)' 
          }}
        >
          <div 
            className={`p-4 rounded-4 shadow-2xl animate-scale-in border border-secondary border-opacity-10 text-center`}
            style={{ 
              width: '90%', 
              maxWidth: '400px', 
              background: isDarkMode ? '#1a1c24' : '#ffffff',
            }}
          >
            <h5 className="fw-black text-uppercase tracking-wider mb-4">Scan for Payment</h5>
            <div className="bg-white p-3 rounded-4 d-inline-block mb-4 shadow-sm">
               <QRCodeCanvas value={generatedLink} size={256} />
            </div>
            <div className="d-flex flex-column gap-3">
              <div className={`p-3 rounded-3 small fw-bold break-all ${isDarkMode ? 'bg-black bg-opacity-20 text-primary' : 'bg-light text-primary'}`}>
                {generatedLink}
              </div>
              <button 
                type="button"
                onClick={() => {
                   navigator.clipboard.writeText(generatedLink);
                   toast.success("Link Copied");
                }}
                className="btn btn-link text-decoration-none text-muted fw-bold small"
              >
                <Copy size={14} className="me-2" /> COPY PAYMENT LINK
              </button>
              <button 
                type="button"
                onClick={() => setShowQRModal(false)}
                className="ui-btn ui-btn-primary w-100 rounded-pill py-3 fw-black text-uppercase tracking-widest"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade-in" 
          style={{ 
            zIndex: 10000, 
            background: 'rgba(0,0,0,0.7)', 
            backdropFilter: 'blur(8px)' 
          }}
        >
          <div 
            className={`p-4 rounded-4 shadow-2xl animate-scale-in border border-secondary border-opacity-10`}
            style={{ 
              width: '90%', 
              maxWidth: '450px', 
              background: isDarkMode ? '#1a1c24' : '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="text-center">
              <div 
                className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981'
                }}
              >
                <ShieldCheck size={40} />
              </div>
              
              <h3 className={`fw-black text-uppercase tracking-wider mb-2 ${isDarkMode ? 'text-white' : 'text-dark'}`}>
                Protocol Success
              </h3>
              
              <p className="text-muted fw-bold small mb-4">
                Lead status updated to <span className="text-primary">{selectedStatus}</span>. 
                The secure payment gateway link has been successfully initialized.
              </p>
              
              <div 
                className={`p-3 rounded-4 mb-4 border text-start`}
                style={{ 
                  background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#f8f9fa',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
              >
                <label className="text-primary fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '9px' }}>
                  Shareable Link
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input 
                    readOnly 
                    value={generatedLink} 
                    className="form-control border-0 bg-transparent p-0 fw-bold text-truncate"
                    style={{ 
                      fontSize: '12px', 
                      color: isDarkMode ? '#e2e8f0' : '#475569',
                      boxShadow: 'none'
                    }}
                  />
                  <button 
                    onClick={() => {
                      if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(generatedLink);
                        toast.success("Link copied to clipboard!");
                      } else {
                        // Fallback
                        const textArea = document.createElement("textarea");
                        textArea.value = generatedLink;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-9999px";
                        textArea.style.top = "-9999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          toast.success("Link copied to clipboard! (Fallback)");
                        } catch (err) {
                          toast.error("Failed to copy. Please copy manually.");
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    className="btn btn-primary btn-sm rounded-3 p-2 d-flex align-items-center justify-content-center"
                    style={{ minWidth: '36px', height: '36px' }}
                    title="Copy Link"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => navigate(-1)}
                className="w-100 py-3 ui-btn ui-btn-primary rounded-3 fw-black text-uppercase tracking-widest shadow-glow"
                style={{ fontSize: '11px' }}
              >
                Return to Command Center
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadStatusUpdatePage;
