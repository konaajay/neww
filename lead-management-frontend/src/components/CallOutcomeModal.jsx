import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Mail, Phone, BookOpen, MessageSquare,
  CheckCircle, Plus, Calendar, AlertCircle, ShieldCheck, User, Zap, IndianRupee, Copy, MessageCircle,
  Clock, X, Activity, FileText, CreditCard
} from 'lucide-react';
import { toast } from 'react-toastify';
import associateService from '../services/associateService';
import adminService from '../services/adminService';
import api from '../api/api';
import leadsApi from '../features/leads/api/leadsApi';
import { useAuth } from '../context/AuthContext';

const CallOutcomeModal = ({ isOpen, onClose, lead, onSubmit, theme, onShowHistory }) => {
  const { clearCall } = useAuth();
  const [outcome, setOutcome] = useState('CONTACTED');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callId, setCallId] = useState(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [taskData, setTaskData] = useState({ title: '', taskType: 'FOLLOW_UP', dueDate: '', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isDurationLoading, setIsDurationLoading] = useState(false);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [allStatuses, setAllStatuses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('TIMELINE'); // TIMELINE, FEE, INVOICE
  const [feeStructure, setFeeStructure] = useState(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [generatingLinkIds, setGeneratingLinkIds] = useState([]);

  // New Payment / Installment State integration
  const [totalAmount, setTotalAmount] = useState('499');
  const [initialAmount, setInitialAmount] = useState('499');
  const [paymentType, setPaymentType] = useState('FULL');
  const [installments, setInstallments] = useState([]);
  const [scheduleNote, setScheduleNote] = useState('');

  const addInstallment = () => {
    setInstallments([...installments, { amount: '', dueDate: '' }]);
    setPaymentType('PART');
  };

  const removeInstallment = (index) => {
    const newInstallments = installments.filter((_, i) => i !== index);
    setInstallments(newInstallments);
    if (newInstallments.length === 0) setPaymentType('FULL');
  };

  const handleInstallmentChange = (index, field, value) => {
    const newInstallments = [...installments];
    newInstallments[index][field] = value;
    setInstallments(newInstallments);
  };

  const sumOfParts = Number(initialAmount || 0) + installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
  const targetTotal = Number(totalAmount || 0);
  const isMatch = paymentType === 'FULL' ? true : Math.abs(sumOfParts - targetTotal) < 1;
  const balanceRemaining = targetTotal - sumOfParts;

  const userRole = localStorage.getItem('role');
  const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(userRole);

  useEffect(() => {
    if (lead) {
      const currIdx = getStageIndex(lead.status);
      const nextStage = pipelineStages.find(s => getStageIndex(s.id) > currIdx);
      
      // Prioritize pendingStatus from dropdown selection
      const initialOutcome = lead.pendingStatus || (nextStage ? nextStage.id : lead.status);
      setOutcome(initialOutcome);
      
      setPaymentAmount('');
      setPaymentMethod('UPI');
      
      // If triggered from dropdown change OR ending a specific call
      if (lead.pendingStatus || lead.activeCallId) {
        setCallId(lead.activeCallId || null);
        setShowAddNote(true);
      } else {
        setShowAddNote(false);
      }
    }
  }, [lead, pipelineStages]);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await adminService.fetchPipelineStages();
        if (res.data) {
          const active = res.data.filter(s => s.active);
          setPipelineStages(active.slice(0, 6)); // First 6 for the stepper
          setAllStatuses(active.map(s => ({
            id: s.statusValue,
            label: s.label.toLowerCase()
          })));
        }
      } catch (err) {
        console.error("Failed to load stages", err);
      }
    };

    const fetchAuditLogs = async () => {
      if (!lead?.id) return;
      setIsLoadingLogs(true);
      try {
        const res = await api.get(`/leads/${lead.id}/history`);
        setAuditLogs(res.data || []);
      } catch (err) {
        console.error("Failed to load audit logs", err);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    if (isOpen) {
      fetchStages();
      fetchAuditLogs();
      fetchFeeStructure();
      fetchCourses();
    }
  }, [isOpen, lead?.id]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/admin/attendance/courses');
      if (res.data?.data) {
        setCourses(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  };

  const fetchFeeStructure = async () => {
    if (!lead?.id) return;
    setIsLoadingFee(true);
    try {
      const res = await api.get(`/payments/lead/${lead.id}/fee-structure`);
      setFeeStructure(res.data);
    } catch (err) {
      console.error("Failed to load fee structure", err);
    } finally {
      setIsLoadingFee(false);
    }
  };

  const nextPendingInstallment = React.useMemo(() => {
    return feeStructure?.installments?.find(i => i.status === 'PENDING' && i.paymentGatewayId);
  }, [feeStructure]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("Submitting interaction logic...", { outcome, note, callId });
    // Strict Validations
    if (!outcome) {
      console.warn("Validation failed: Missing outcome");
      return toast.error('Status is mandatory');
    }
    // Note is now optional. Validation removed.


    setIsSubmitting(true);
    
    try {
      if (callId) {
        // Strict End Call Path
        await associateService.endCall(callId, {
          status: outcome,
          notes: note,
          followUpDate: followUpDate || null
        });
        clearCall();
        toast.success('Interaction Logged Successfully');
      }

      if (followUpDate) {
        try {
          await associateService.addLeadTask(lead.id, {
            title: `Follow-up Required: ${outcome}`,
            taskType: 'FOLLOW_UP',
            dueDate: followUpDate,
            description: note || `Scheduled follow-up for ${lead.name}`
          });
        } catch (taskErr) {
          console.error("Failed to create task:", taskErr);
          toast.warning("Status updated, but failed to schedule the calendar task.");
        }
      }

      // Record outcome / update status via the provided onSubmit handler
      await onSubmit({
        status: outcome,
        note: note,
        // Payment Data
        isPaymentAction: outcome === 'PAID' || outcome === 'EMI' || outcome === 'CONVERTED',
        totalAmount: parseFloat(totalAmount) || 0,
        paidAmount: parseFloat(outcome === 'PAID' ? totalAmount : initialAmount) || 0,
        paymentMethod: paymentMethod,
        paymentType: outcome === 'EMI' ? 'PART' : 'FULL',
        installments: outcome === 'EMI' ? installments : [],
        courseId: selectedCourseId || lead.courseId
      });


      setShowAddNote(false);
      setNote('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed: Constraint Violation');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Online payment generation removed. 
  // Manual payments are now the only supported workflow.


  const handleFileUpload = async () => {
    if (!selectedFile) return toast.warning('Please select an audio file first.');

    setIsUploading(true);
    try {
      await adminService.uploadCallRecord({
        file: selectedFile,
        leadId: lead.id,
        phoneNumber: lead.mobile,
        callType: 'OUTGOING',
        status: outcome,
        note: note || 'Individual manual upload from Lead Details',
        duration: audioDuration
      });
      toast.success('Call record uploaded successfully!');
      setSelectedFile(null);
      setAudioDuration(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResendLink = (type, installment) => {
    const inst = installment || nextPendingInstallment;
    if (!inst) {
      if (type === 'whatsapp') {
        window.open(`https://wa.me/${lead.mobile?.replace(/\D/g, '')}`, '_blank');
      } else {
        window.location.href = `mailto:${lead.email}`;
      }
      return;
    }

    if (!inst.paymentGatewayId) {
      toast.warning("Payment link not generated for this installment yet. Please click 'Generate Link' in the Fee Structure tab.");
      return;
    }
    
    const paymentLink = `${window.location.origin}/payment-instruction/${inst.paymentGatewayId}`;
    const message = `Hello ${lead.name}, your payment of ₹${inst.amount} for ${lead.courseName || 'the course'} is pending. Please complete the payment using this secure link: ${paymentLink}`;
    
    if (type === 'whatsapp') {
      const whatsappUrl = `https://wa.me/${lead.mobile?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      const mailtoUrl = `mailto:${lead.email}?subject=Payment Link for ${lead.courseName || 'Course'}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoUrl;
    }
    toast.info(`Sharing link via ${type.toUpperCase()}...`);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Payment link copied to clipboard!');
  };

  const handleGenerateLink = async (installment) => {
    if (generatingLinkIds.includes(installment.id)) return;
    
    // Immediate lockout
    setGeneratingLinkIds(prev => [...prev, installment.id]);
    
    try {
      toast.info("Generating secure payment link...");
      const res = await leadsApi.createCashfreeOrder(
        lead.id, 
        installment.amount, 
        'EMI_INSTALLMENT', 
        [], 
        installment.amount, 
        0,
        installment.id 
      );
      if (res.data?.order_id || res.data?.paymentGatewayId) {
        toast.success("Link generated successfully!");
        fetchFeeStructure();
      } else {
        toast.warning("Order initialized but link ID missing. Refreshing...");
        fetchFeeStructure();
      }
    } catch (err) {
      toast.error("Failed to generate link");
    } finally {
      // Cooldown period to prevent rapid re-clicks even after completion
      setTimeout(() => {
        setGeneratingLinkIds(prev => prev.filter(id => id !== installment.id));
      }, 2000);
    }
  };

  const isDarkMode = theme === 'dark';

  // Map backend status to stepper index
  const getStageIndex = (status) => {
    switch (status) {
      case 'NEW': return 0;
      case 'CONTACTED': 
      case 'NOT_ANSWERED':
      case 'SWITCHED_OFF':
        return 1;
      case 'FOLLOW_UP':
      case 'CALL_BACK':
      case 'FOLLOWUP_1':
      case 'FOLLOWUP_2':
      case 'FOLLOWUP_3':
        return 2;
      case 'INTERESTED': 
      case 'DEMO':
      case 'PAYMENT_LINK_SENT':
        return 3;
      case 'PAID':
      case 'CONVERTED':
      case 'EMI':
      case 'SUCCESS':
        return 4;
      case 'LOST':
      case 'NOT_INTERESTED':
        return 5;
      default: return 0;
    }
  };


  const currentStageIndex = getStageIndex(lead.status);
  const selectedStageIndex = getStageIndex(outcome);

  // Helper date formatter
  const formatDate = (dateString) => {
    if (!dateString) return 'System Time';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
    });
  };

  const modalContent = (
    <div className="modal show d-block p-0" tabIndex="-1" style={{ backgroundColor: '#f8fafc', zIndex: 10500, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="modal-dialog modal-fullscreen m-0 border-0 h-100">
        <div className={`modal-content border-0 rounded-0 h-100`} style={{ backgroundColor: '#f8fafc', color: '#1e293b', display: 'flex', flexDirection: 'column' }}>

          {/* Top Header - Simple & Clean */}
          <div className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between bg-white sticky-top" style={{ zIndex: 10, borderColor: '#f1f5f9' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle">
                 <User size={20} />
              </div>
              <h5 className={`fw-bold mb-0 d-flex align-items-center gap-2 text-dark`}>
                {lead.name}
                <span className="badge bg-light text-muted rounded-pill fw-bold border" style={{ fontSize: '10px' }}>
                  L-{lead.id || '1000'}
                </span>
              </h5>
            </div>

            <div className="d-flex align-items-center gap-3">
              <button
                className="btn btn-sm btn-outline-info rounded-pill px-3 py-1 fw-bold text-uppercase tracking-wider"
                style={{ fontSize: '9px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onShowHistory();
                }}
              >
                <Clock size={12} /> History
              </button>
              <button
                className="btn btn-sm btn-light border rounded-circle p-2"
                onClick={onClose}
              >
                <X size={16} className="text-muted" />
              </button>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="container-fluid p-4 overflow-auto custom-scroll" style={{ flexGrow: 1, minHeight: 0 }}>
            <div className="row g-4" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '2rem' }}>

              {/* LEFT COLUMN: Profile & Quick Actions */}
              <div className="col-12 col-lg-4 d-flex flex-column gap-4">

                {/* Profile Card */}
                <div className={`card shadow-sm border-0 rounded-4 overflow-hidden bg-light bg-opacity-50`}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center gap-3 mb-4">
                      <div
                        className="rounded-circle bg-white shadow-sm d-flex align-items-center justify-content-center text-primary fw-bold border"
                        style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}
                      >
                        {lead.name ? lead.name.charAt(0).toUpperCase() : <User />}
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0 text-dark">{lead.name}</h6>
                        <small className="text-muted">Lead Profile</small>
                      </div>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-light text-muted rounded-circle"><Mail size={16} /></div>
                        <span className={`small fw-medium ${isDarkMode ? 'text-white text-opacity-75' : 'text-dark text-opacity-75'}`}>{lead.email || 'No email provided'}</span>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-light text-muted rounded-circle"><Phone size={16} /></div>
                        <span className={`small fw-medium ${isDarkMode ? 'text-white text-opacity-75' : 'text-dark text-opacity-75'}`}>{lead.mobile || 'No number provided'}</span>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-light text-muted rounded-circle"><BookOpen size={16} /></div>
                        <span className={`small fw-medium ${isDarkMode ? 'text-white text-opacity-75' : 'text-dark text-opacity-75'}`}>{lead.courseName || 'Lead Inquiry'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Card */}
                <div className={`card shadow-sm border-0 rounded-4 overflow-hidden p-4 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-white'}`}>
                  <h6 className={`fw-bold text-uppercase mb-3 tracking-wider small ${isDarkMode ? 'text-white text-opacity-50' : 'text-muted'}`}>Quick Actions</h6>

                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <a 
                        href={`tel:${lead.mobile?.replace(/\s/g, '')}`} 
                        className="btn btn-outline-success btn-sm w-100 fw-bold rounded-3 py-2" 
                      >
                        Call
                      </a>
                    </div>
                    <div className="col-6">
                      <button 
                        onClick={() => handleResendLink('email')}
                        className="btn btn-outline-primary btn-sm w-100 fw-bold rounded-3 py-2"
                      >
                        Email
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResendLink('whatsapp')}
                    className="btn btn-sm btn-success w-100 fw-bold rounded-3 py-2 border-0"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    WhatsApp
                  </button>

                  <div className="mt-4 border-top border-secondary border-opacity-10 pt-3">
                    <h6 className={`fw-bold text-uppercase mb-2 tracking-wider small ${isDarkMode ? 'text-white text-opacity-50' : 'text-muted'}`}>Upload Call Recording</h6>
                    <div className="d-flex flex-column gap-2">
                      <label className="small text-muted mb-1">MP3 / WAV file</label>
                      <input
                        type="file"
                        accept="audio/*"
                        className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-25' : 'bg-light text-dark'}`}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setSelectedFile(file);
                          setIsDurationLoading(true);

                          // Auto-detect duration from audio metadata
                          const url = URL.createObjectURL(file);
                          const audio = new Audio(url);
                          audio.addEventListener('loadedmetadata', () => {
                            const secs = Math.round(audio.duration) || 0;
                            setAudioDuration(secs);
                            setIsDurationLoading(false);
                            URL.revokeObjectURL(url);
                          });
                          audio.addEventListener('error', () => {
                            setIsDurationLoading(false);
                            toast.error("Could not read audio duration");
                          });
                        }}
                      />
                      {selectedFile && (
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <Clock size={12} className="text-muted" />
                          <input
                            type="number"
                            min="0"
                            className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-25' : 'bg-light text-dark'}`}
                            style={{ maxWidth: '120px' }}
                            value={audioDuration}
                            onChange={(e) => setAudioDuration(parseInt(e.target.value) || 0)}
                          />
                          <span className="small text-muted">seconds</span>
                        </div>
                      )}
                      <button
                        className="btn btn-sm btn-primary w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2 mt-2 shadow-glow border-0"
                        disabled={!selectedFile || isUploading || isDurationLoading}
                        onClick={handleFileUpload}
                      >
                        {isUploading || isDurationLoading ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <ShieldCheck size={14} />
                        )}
                        {isDurationLoading ? 'Detecting Length...' : 'Finalize Record Upload'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Pipeline & Audit Timeline */}
              <div className="col-12 col-lg-8 d-flex flex-column gap-4">

                {/* Sales Pipeline Stage */}
                <div className={`card shadow-sm border-0 rounded-4 p-4 bg-light bg-opacity-50`}>
                  <div className="d-flex justify-content-between position-relative align-items-center mb-0 w-100 overflow-auto py-1 custom-scroll" style={{ whiteSpace: 'nowrap' }}>
                    {pipelineStages
                      .filter((_, index) => index >= currentStageIndex)
                      .map((stage, _index) => {
                        const index = getStageIndex(stage.id);
                        const isCompleted = currentStageIndex >= index;
                        const isSelected = selectedStageIndex === index;

                      let btnClass = 'btn-light border bg-white text-muted';
                      if (isCompleted || isSelected) {
                        btnClass = `bg-${stage.color} text-white border-0`;
                      }

                      return (
                        <button
                          key={stage.id}
                          className={`btn rounded-pill px-3 py-1 fw-bold mx-1 transition-smooth ${btnClass}`}
                          style={{ fontSize: '0.75rem', minWidth: '100px' }}
                          onClick={() => {
                            const stageIdx = getStageIndex(stage.id);
                            const currIdx = getStageIndex(lead.status);
                            if (stageIdx >= currIdx) {
                              setOutcome(stage.id);
                            }
                          }}
                        >
                          {stage.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interaction Log Input - Shown when 'Add Note' is clicked or when changing state */}
                {showAddNote && (
                  <div className={`card shadow border border-primary border-opacity-25 border-2 rounded-4 overflow-hidden animate-fade-in ${isDarkMode ? 'bg-dark' : 'bg-white'}`}>
                    <div className="card-header bg-primary bg-opacity-10 border-0 p-3">
                      <h6 className="fw-bold text-primary mb-0 d-flex align-items-center gap-2">
                        <Plus size={16} /> Append New Interaction
                      </h6>
                    </div>
                    <div className="card-body p-4">
                      <form id="callOutcomeForm" onSubmit={handleSubmit}>
                        <div className="row g-3">
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">Status Override</label>
                               <select
                               className={`form-select fw-bold shadow-sm text-capitalize ${isDarkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary border-opacity-50' : 'bg-light text-dark'}`}
                               value={outcome}
                               onChange={(e) => setOutcome(e.target.value)}
                               style={{ cursor: 'pointer' }}
                             >
                               {allStatuses
                                 .filter(s => {
                                   const stageIdx = getStageIndex(s.id);
                                   const currIdx = getStageIndex(lead.status);
                                   
                                   // Rule 1: No regression (Hide past stages, but allow switching within same stage cluster)
                                   if (stageIdx < currIdx) return false;
                                   
                                   // Rule 2: Interested Bottleneck
                                   if (lead.status === 'INTERESTED') {
                                     return ['CONVERTED', 'EMI', 'LOST', 'NOT_INTERESTED', 'PAYMENT_LINK_SENT', 'DEMO', 'INTERESTED'].includes(s.id);
                                   }
                                   
                                   // If already terminal, don't allow change
                                   if (currIdx >= 4 && stageIdx !== currIdx) return false;
 
                                   return true;
                                 })
                                 .map(s => <option key={s.id} value={s.id}>{s.label}</option>)
                               }
                             </select>
                          </div>

                          <div className="col-12 mt-4">
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                { id: 'CALL_BACK', label: 'Call Back', color: 'warning' },
                                { id: 'FOLLOW_UP', label: 'Follow Up', color: 'info' },
                                { id: 'CONVERTED', label: 'Converted', color: 'success' },
                                { id: 'LOST', label: 'Lost', color: 'danger' }
                              ].map(btn => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  onClick={() => setOutcome(btn.id)}
                                  className={`btn btn-sm rounded-pill px-3 fw-black tracking-widest text-uppercase transition-all ${outcome === btn.id ? `btn-${btn.color} shadow-glow` : (isDarkMode ? 'btn-outline-secondary opacity-50' : 'btn-outline-secondary opacity-50')}`}
                                  style={{ fontSize: '9px', minWidth: '100px' }}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
 
                          {(outcome === 'PAID' || outcome === 'CONVERTED' || outcome === 'EMI') && (
                            <div className="col-12 animate-slide-in">
                              <div className={`p-4 rounded-4 border ${isDarkMode ? 'border-secondary border-opacity-20 bg-secondary bg-opacity-10' : 'border-light bg-white shadow-sm'} mb-3`}>
                                <div className="d-flex align-items-center gap-2 mb-4">
                                  <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle">
                                    <IndianRupee size={16} />
                                  </div>
                                  <h6 className={`fw-black mb-0 text-uppercase tracking-widest small ${isDarkMode ? 'text-primary' : 'text-dark'}`}>
                                    {outcome === 'EMI' ? 'EMI Schedule Management' : 'Full Payment Authentication'}
                                  </h6>
                                </div>
                                 <div className="row g-3">
                                  <div className="col-12">
                                    <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">Course Protocol (Mapping)</label>
                                    <select
                                      className={`form-select fw-bold ${isDarkMode ? 'bg-dark bg-opacity-50 text-white border-secondary border-opacity-50' : 'bg-light text-dark border-light'}`}
                                      value={selectedCourseId || lead.courseId || ''}
                                      onChange={(e) => {
                                        const cid = e.target.value;
                                        setSelectedCourseId(cid);
                                        const course = courses.find(c => String(c.id) === String(cid));
                                        if (course) {
                                          setTotalAmount(course.baseFee?.toString() || '0');
                                          setInitialAmount(course.minTokenAmount?.toString() || '500');
                                        }
                                      }}
                                    >
                                      <option value="">Select Course...</option>
                                      {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name.toUpperCase()} (₹{c.baseFee})</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="col-12 col-md-6">
                                    <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">Course Package Total</label>
                                    <div className="input-group">
                                      <span className={`input-group-text border-end-0 ${isDarkMode ? 'bg-dark border-secondary border-opacity-50 text-muted' : 'bg-light border-light text-muted'}`}>₹</span>
                                      <input
                                        type="number"
                                        className={`form-control fw-black ${isDarkMode ? 'bg-dark bg-opacity-50 text-white border-secondary border-opacity-50' : 'bg-light text-dark border-light'}`}
                                        placeholder="0.00"
                                        value={totalAmount}
                                        onChange={(e) => setTotalAmount(e.target.value)}
                                      />
                                    </div>
                                  </div>
 
                                  <div className="col-12 col-md-6">
                                    <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">
                                      {outcome === 'EMI' ? 'Initial Commitment amount' : 'Actual Paid Amount'}
                                    </label>
                                    <div className="input-group">
                                      <span className={`input-group-text border-end-0 ${isDarkMode ? 'bg-dark border-secondary border-opacity-50 text-muted' : 'bg-light border-light text-muted'}`}>₹</span>
                                      <input
                                        type="number"
                                        className={`form-control fw-black ${isDarkMode ? 'bg-dark bg-opacity-50 text-white border-secondary border-opacity-50' : 'bg-light text-dark border-light'}`}
                                        placeholder="0.00"
                                        value={outcome === 'EMI' ? initialAmount : totalAmount}
                                        onChange={(e) => outcome === 'EMI' ? setInitialAmount(e.target.value) : setTotalAmount(e.target.value)}
                                      />
                                    </div>
                                  </div>
 
                                  <div className="col-12">
                                     <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">Settlement Protocol</label>
                                     <select
                                       className={`form-select fw-bold ${isDarkMode ? 'bg-dark bg-opacity-50 text-white border-secondary border-opacity-50' : 'bg-light text-dark border-light'}`}
                                       value={paymentMethod}
                                       onChange={(e) => setPaymentMethod(e.target.value)}
                                     >
                                       <option value="UPI">UPI TRANSFERS</option>
                                       <option value="CASH">CASH SETTLEMENT</option>
                                       <option value="BANK_TRANSFER">IMPS / NEFT / RTGS</option>
                                       <option value="CARD">POS / ONLINE CARD</option>
                                     </select>
                                  </div>
 
                                  {outcome === 'EMI' && (
                                    <div className="col-12 mt-4 pt-3 border-top">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="fw-black text-muted mb-0 text-uppercase tracking-widest small" style={{ fontSize: '10px' }}>Installment Map</h6>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-primary rounded-pill fw-bold d-flex align-items-center gap-1"
                                          onClick={addInstallment}
                                        >
                                          <Plus size={14} /> Add Installment
                                        </button>
                                      </div>
 
                                      <div className="d-flex flex-column gap-2 mb-3">
                                        {installments.map((inst, idx) => (
                                          <div key={idx} className="row g-2 align-items-center animate-fade-in">
                                            <div className="col">
                                              <input
                                                type="number"
                                                className={`form-control form-control-sm fw-bold ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-50' : 'bg-light text-dark border-light'}`}
                                                placeholder="Amount"
                                                value={inst.amount}
                                                onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                                              />
                                            </div>
                                            <div className="col">
                                              <input
                                                type="date"
                                                className={`form-control form-control-sm fw-bold ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-50' : 'bg-light text-dark border-light'}`}
                                                value={inst.dueDate}
                                                onChange={(e) => handleInstallmentChange(idx, 'dueDate', e.target.value)}
                                              />
                                            </div>
                                            <div className="col-auto">
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger border-0 rounded-circle p-1"
                                                onClick={() => removeInstallment(idx)}
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      <div className={`p-2 rounded-3 text-center small fw-bold ${isMatch ? 'text-success bg-success bg-opacity-10 border border-success border-opacity-10' : 'text-danger bg-danger bg-opacity-10 border border-danger border-opacity-10'}`}>
                                         {isMatch ? 'Plan Balanced: Complete' : `Imbalance: ₹${balanceRemaining.toFixed(2)} remaining`}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}



                         <div className="col-12 mt-3">
                            <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">Historical Note</label>
                            <div className={`rounded-3 overflow-hidden d-flex shadow-sm ${isDarkMode ? 'bg-secondary bg-opacity-25 border border-secondary border-opacity-50' : 'bg-light border'}`}>
                              <span className={`p-3 border-end ${isDarkMode ? 'text-white border-secondary border-opacity-50 text-opacity-50' : 'text-muted border-light'}`}>
                                <MessageSquare size={18} />
                              </span>
                              <textarea
                                className={`form-control border-0 bg-transparent shadow-none py-3 ${isDarkMode ? 'text-white' : 'text-dark'}`}
                                rows="3"
                                placeholder="Enter discussion details, lead requirements, etc (Optional)..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                              ></textarea>
                            </div>
                          </div>

                          {/* Manual Follow-up Selection */}
                          <div className="col-12 mt-3 animate-fade-in">
                            <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">Schedule Next Action (Follow-up)</label>
                            <div className={`rounded-3 overflow-hidden d-flex shadow-sm ${isDarkMode ? 'bg-secondary bg-opacity-25 border border-secondary border-opacity-50' : 'bg-light border'}`}>
                              <span className={`p-3 border-end ${isDarkMode ? 'text-white border-secondary border-opacity-50 text-opacity-50' : 'text-muted border-light'}`}>
                                <Calendar size={18} />
                              </span>
                              <input
                                type="datetime-local"
                                className={`form-control border-0 bg-transparent shadow-none py-3 ${isDarkMode ? 'text-white' : 'text-dark'}`}
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                              />
                            </div>
                            <small className="text-muted mt-2 d-block small" style={{ fontSize: '10px' }}>
                              * Leave blank if no future follow-up lead is required at this stage.
                            </small>
                          </div>
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary border-opacity-10">
                          <button type="button" className={`btn btn-link text-decoration-none fw-bold small ${isDarkMode ? 'text-white text-opacity-50' : 'text-muted'}`} onClick={() => setShowAddNote(false)}>Discard</button>
                          <button
                            type="submit"
                            className="btn btn-primary rounded-pill fw-bold text-uppercase px-4 py-2 shadow-sm d-flex align-items-center gap-2"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <span className="spinner-border spinner-border-sm"></span>
                            ) : (
                              <ShieldCheck size={16} />
                            )}
                            Save Log Entry
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Right Column Content with Tabs */}
                <div className="flex-grow-1 d-flex flex-column gap-3">
                  {/* Tab Selector */}
                  <div className="d-flex align-items-center gap-2 p-1 bg-light rounded-pill border" style={{ width: 'fit-content' }}>
                    {[
                      { id: 'TIMELINE', label: 'TIMELINE', icon: <Activity size={12} /> },
                      { id: 'FEE_STRUCTURE', label: 'FEE STRUCTURE', icon: <CreditCard size={12} /> },
                      { id: 'INVOICE', label: 'INVOICE', icon: <FileText size={12} /> }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-2 transition-all border-0 shadow-none ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-muted'}`}
                        style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'TIMELINE' && (
                    <div className={`card shadow-sm border-0 rounded-4 overflow-hidden p-4 flex-grow-1 animate-fade-in ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-white'}`}>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h6 className={`fw-bold mb-0 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Audit & Activity Timeline</h6>
                      </div>

                  <div className="position-relative ps-4 py-2 h-100 overflow-auto" style={{ maxHeight: '500px' }}>
                    {/* Vertical Timeline Bar */}
                    <div className="position-absolute bg-primary bg-opacity-25" style={{ width: '2px', top: '10px', bottom: '0', left: '11px' }}></div>
                    
                    {/* Merged Timeline Logic */}
                    {(() => {
                      const notes = (lead.notes || []).map(n => ({ ...n, type: 'NOTE' }));
                      const logs = auditLogs.map(l => ({ ...l, type: 'LOG' }));
                      const merged = [...notes, ...logs].sort((a, b) => {
                        const dateA = new Date(a.createdAt || a.timestamp || 0);
                        const dateB = new Date(b.createdAt || b.timestamp || 0);
                        return dateB - dateA;
                      });

                      if (merged.length === 0) {
                        return lead.note ? (
                          <div className="position-relative mb-4">
                            <div className="position-absolute bg-primary rounded-circle shadow-sm" style={{ width: '10px', height: '10px', left: '-31px', top: '6px' }}></div>
                            <div className={`p-3 rounded-3 shadow-sm border ${isDarkMode ? 'bg-dark border-secondary border-opacity-25' : 'bg-light border-light'}`}>
                              <h6 className="small fw-bold text-primary text-uppercase mb-2 d-flex align-items-center gap-2">
                                <MessageSquare size={12} /> INTERNAL NOTE
                              </h6>
                              <p className={`mb-2 fw-medium ${isDarkMode ? 'text-white' : 'text-dark'}`}>{lead.note}</p>
                              <div className="d-flex align-items-center gap-3 text-muted small">
                                <span className="d-flex align-items-center gap-1"><User size={12} /> {lead.updatedByName || 'System'}</span>
                                <span className="d-flex align-items-center gap-1"><Calendar size={12} /> {formatDate(lead.updatedAt || lead.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      }

                      return merged.map((item, index) => (
                        <div key={`${item.type}-${item.id || index}`} className="position-relative mb-4 animate-fade-in">
                          <div className={`position-absolute rounded-circle shadow-sm ${index === 0 ? 'bg-primary' : 'bg-secondary bg-opacity-50'}`}
                            style={{ width: '10px', height: '10px', left: '-31px', top: '6px' }}></div>
                          
                          {item.type === 'NOTE' ? (
                            <div className={`p-3 rounded-3 shadow-sm border ${isDarkMode ? 'bg-dark border-secondary border-opacity-25' : 'bg-light border-light'}`}
                              style={{ backgroundColor: index === 0 ? (isDarkMode ? '#1a2233' : '#f0f4ff') : (isDarkMode ? '#1a1a1a' : '#ffffff') }}>
                              <h6 className={`small fw-bold ${index === 0 ? 'text-primary' : 'text-muted'} text-uppercase mb-2 d-flex align-items-center gap-2`}>
                                <MessageSquare size={12} /> {item.status} NOTE
                              </h6>
                              <p className={`mb-2 fw-medium ${isDarkMode ? 'text-white' : 'text-dark'}`}>{item.content}</p>
                              <div className="d-flex align-items-center gap-3 text-muted small">
                                <span className="d-flex align-items-center gap-1"><User size={12} /> {item.createdByName || 'System'}</span>
                                <span className="d-flex align-items-center gap-1"><Calendar size={12} /> {formatDate(item.createdAt)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className={`p-3 rounded-3 shadow-sm border ${isDarkMode ? 'bg-dark border-secondary border-opacity-25' : 'bg-light border-light'}`}>
                              <h6 className={`small fw-bold text-info text-uppercase mb-2 d-flex align-items-center gap-2`}>
                                <Activity size={12} /> {item.fieldName || 'SYSTEM'} CHANGE
                              </h6>
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="text-muted small fw-bold opacity-50">{item.oldValue || 'None'}</span>
                                <Clock size={10} className="text-muted" />
                                <span className="text-primary small fw-black">{item.newValue}</span>
                              </div>
                              <div className="d-flex align-items-center gap-3 text-muted small">
                                <span className="d-flex align-items-center gap-1"><User size={12} /> {item.changedByName || 'System'}</span>
                                <span className="d-flex align-items-center gap-1"><Calendar size={12} /> {formatDate(item.timestamp)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ));
                    })()}

                    {/* Origination Log */}
                    <div className="position-relative">
                      <div className="position-absolute bg-secondary bg-opacity-50 rounded-circle shadow-sm" style={{ width: '10px', height: '10px', left: '-31px', top: '6px' }}></div>
                      <div className={`p-3 rounded-3 shadow-sm border ${isDarkMode ? 'bg-dark border-secondary border-opacity-25' : 'bg-white border-light'}`}>
                        <h6 className="small fw-bold text-primary text-uppercase mb-2 d-flex align-items-center gap-2">
                          <CheckCircle size={12} /> LEAD CREATED
                        </h6>
                        <p className={`mb-2 font-monospace small ${isDarkMode ? 'text-white text-opacity-75' : 'text-muted'}`}>Lead L-{lead.id} added to pipeline.</p>
                        <div className="d-flex align-items-center gap-2 text-muted small">
                          <Calendar size={12} /> {formatDate(lead.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'FEE_STRUCTURE' && (
                <div className={`card shadow-sm border-0 rounded-4 p-4 animate-fade-in ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-white'}`}>
                  <h6 className="fw-bold mb-4 text-dark">Student Fee Structure</h6>
                  {isLoadingFee ? (
                    <div className="text-center py-5"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                  ) : !feeStructure?.fee ? (
                    <div className="text-center py-5 text-muted small">No fee structure defined for this lead.</div>
                  ) : (
                    <div className="d-flex flex-column gap-4">
                      {/* Fee Summary Cards */}
                      <div className="row g-3">
                        <div className="col-4">
                          <div className="p-3 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-10">
                            <p className="text-primary fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '1px' }}>Total Package</p>
                            <h5 className="fw-black mb-0 text-dark">{feeStructure.fee.totalAmount}</h5>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="p-3 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-10">
                            <p className="text-success fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '1px' }}>Total Paid</p>
                            <h5 className="fw-black mb-0 text-dark">{feeStructure.fee.paidAmount}</h5>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="p-3 rounded-4 bg-danger bg-opacity-10 border border-danger border-opacity-10">
                            <p className="text-danger fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '1px' }}>Balance Due</p>
                            <h5 className="fw-black mb-0 text-dark">{feeStructure.fee.balanceAmount}</h5>
                          </div>
                        </div>
                      </div>

                      {/* Installment Roadmap */}
                      <div className="mt-2">
                        <h6 className="small fw-black text-muted text-uppercase tracking-widest mb-3" style={{ fontSize: '10px' }}>Installment Roadmap</h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-borderless align-middle mb-0">
                            <thead>
                              <tr className="border-bottom border-light">
                                <th className="text-muted small fw-bold pb-2">#</th>
                                <th className="text-muted small fw-bold pb-2">AMOUNT</th>
                                <th className="text-muted small fw-bold pb-2">DUE DATE</th>
                                <th className="text-muted small fw-bold pb-2 text-end">STATUS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {feeStructure.installments?.map((p, idx) => (
                                <tr key={`installment-${p.id || idx}`} className="border-bottom border-light border-opacity-50">
                                  <td className="fw-bold small text-muted">{idx + 1}</td>
                                  <td className="fw-black small text-dark">{p.amount}</td>
                                  <td className="text-muted">{p.dueDate ? formatDate(p.dueDate).split(',')[0] : 'UPFRONT'}</td>
                                  <td className="text-end pe-0">
                                    <div className="d-flex align-items-center justify-content-end gap-2">
                                      <span className={`badge rounded-pill ${p.status === 'PAID' || p.status === 'SUCCESS' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`} style={{ fontSize: '9px' }}>
                                        {p.status}
                                      </span>
                                      {(p.status === 'PENDING') && (
                                        <>
                                          {!p.paymentGatewayId ? (
                                            <button 
                                              className="btn btn-xs btn-outline-primary px-2 py-0 rounded-pill d-flex align-items-center gap-1" 
                                              style={{ fontSize: '8px' }}
                                              disabled={generatingLinkIds.includes(p.id)}
                                              onClick={(e) => { e.stopPropagation(); handleGenerateLink(p); }}
                                            >
                                              {generatingLinkIds.includes(p.id) ? (
                                                <>
                                                  <span className="spinner-border spinner-border-sm" style={{ width: '8px', height: '8px' }}></span>
                                                  Generating...
                                                </>
                                              ) : 'Generate Link'}
                                            </button>
                                          ) : (
                                            <>
                                              <button 
                                                className="btn btn-xs btn-primary p-1 rounded-circle" 
                                                title="Verify with Gateway"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  const btn = e.currentTarget;
                                                  btn.disabled = true;
                                                  try {
                                                    const res = await api.post(`/payments/order/${p.paymentGatewayId}/verify`);
                                                    if (res.data.updated) {
                                                      toast.success("Payment verified and updated!");
                                                      fetchFeeStructure();
                                                    } else {
                                                      toast.info(res.data.message);
                                                    }
                                                  } catch (err) {
                                                    toast.error("Verification failed");
                                                  } finally {
                                                    btn.disabled = false;
                                                  }
                                                }}
                                              >
                                                <ShieldCheck size={10} />
                                              </button>
                                              <button 
                                                className="btn btn-xs btn-secondary p-1 rounded-circle ms-1" 
                                                title="Copy Payment Link"
                                                onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  copyToClipboard(`${window.location.origin}/payment-instruction/${p.paymentGatewayId}`); 
                                                }}
                                              >
                                                <Copy size={10} />
                                              </button>
                                              <button 
                                                className="btn btn-xs btn-success p-1 rounded-circle ms-1" 
                                                title="Resend via WhatsApp"
                                                onClick={(e) => { e.stopPropagation(); handleResendLink('whatsapp', p); }}
                                                style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                                              >
                                                <MessageCircle size={10} className="text-white" />
                                              </button>
                                              <button 
                                                className="btn btn-xs btn-info p-1 rounded-circle ms-1" 
                                                title="Resend via Email"
                                                onClick={(e) => { e.stopPropagation(); handleResendLink('email', p); }}
                                              >
                                                <Mail size={10} className="text-white" />
                                              </button>
                                            </>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'INVOICE' && (
                <div className={`card shadow-sm border-0 rounded-4 p-4 animate-fade-in ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-white'}`}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h6 className="fw-bold mb-0 text-dark">Official Receipt Details</h6>
                    <button className="btn btn-sm btn-primary rounded-pill px-3 fw-bold" style={{ fontSize: '10px' }} onClick={() => window.open(`/api/payments/lead/${lead.id}/invoice`, '_blank')}>
                       <Zap size={12} className="me-1" /> GENERATE PDF
                    </button>
                  </div>
                  
                  {!feeStructure?.fee ? (
                    <div className="text-center py-5 text-muted small">No payment data available for invoicing.</div>
                  ) : (
                    <div className="p-4 rounded-4 bg-light border d-flex flex-column gap-3 shadow-inner">
                       <div className="d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                          <span className="text-muted small fw-bold">STUDENT NAME</span>
                          <span className="fw-black small text-dark">{lead.name.toUpperCase()}</span>
                       </div>
                       <div className="d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                          <span className="text-muted small fw-bold">REFERENCE ID</span>
                          <span className="fw-black small text-primary">L-{lead.id}</span>
                       </div>
                       <div className="d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                          <span className="text-muted small fw-bold">TOTAL PACKAGE</span>
                          <span className="fw-black small text-dark">{feeStructure.fee.totalAmount}</span>
                       </div>
                       <div className="d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                          <span className="text-muted small fw-bold">AMOUNT RECEIVED</span>
                          <span className="fw-black small text-success">{feeStructure.fee.paidAmount}</span>
                       </div>
                       <div className="d-flex justify-content-between pt-2">
                          <span className="text-dark fw-black small">BALANCE OUTSTANDING</span>
                          <span className="fw-black text-danger fs-6">{feeStructure.fee.balanceAmount}</span>
                       </div>
                       
                       <div className="mt-3 p-3 bg-white rounded-3 border border-primary border-opacity-10 text-center shadow-sm">
                          <p className="text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '8px', letterSpacing: '1px' }}>Next Installment Window</p>
                          <h6 className="fw-black text-primary mb-0">{feeStructure.fee.nextDueDate ? formatDate(feeStructure.fee.nextDueDate).split(',')[0] : 'SETTLED'}</h6>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
);

  return ReactDOM.createPortal(modalContent, document.body);
};

export default CallOutcomeModal;
