import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Mail, Phone, BookOpen, MessageSquare,
  CheckCircle, Plus, Calendar, AlertCircle, ShieldCheck, User, Zap, IndianRupee, Copy, MessageCircle,
  Clock
} from 'lucide-react';
import { toast } from 'react-toastify';
import associateService from '../services/associateService';
import adminService from '../services/adminService';
import { useAuth } from '../context/AuthContext';

const CallOutcomeModal = ({ isOpen, onClose, lead, onSubmit, theme, onSendPaymentLink }) => {
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
      setOutcome(lead.status === 'NEW' ? 'CONTACTED' : lead.status);
      setPaymentAmount('');
      setPaymentMethod('UPI');
      // If we are ending a specific call passed via lead object or extra prop
      if (lead.activeCallId) {
        setCallId(lead.activeCallId);
        setShowAddNote(true);
      }
    }
  }, [lead]);

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
        console.log("Calling legacy onSubmit with data:", { outcome, note });
        // Legacy/Direct Status Update Path
        await onSubmit({
          status: outcome,
          note: note,
          amount: parseFloat(paymentAmount) || 0,
          paymentMethod: paymentMethod
        });
      }

      // Payment Link Integration Path: Trigger if PAID or EMI
      if (onSendPaymentLink && (outcome === 'PAID' || outcome === 'EMI')) {
        const payload = {
          totalAmount: targetTotal,
          initialAmount: parseFloat(initialAmount),
          paymentType,
          note: scheduleNote || note,
          installments: installments.map((inst) => ({
            amount: parseFloat(inst.amount),
            dueDate: inst.dueDate ? `${inst.dueDate}T23:59:59` : null,
          })),
        };
        console.log("Triggering onSendPaymentLink from outcome modal:", payload);
        await onSendPaymentLink(lead.id, payload);
      }

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

  const isDarkMode = theme === 'dark';

  // Define pipeline stages
  const pipelineStages = [
    { id: 'NEW', label: 'New', color: 'primary' },
    { id: 'CONTACTED', label: 'Contacted', color: 'info' },
    { id: 'FOLLOW_UP', label: 'Follow up', color: 'secondary' },
    { id: 'INTERESTED', label: 'Interested', color: 'warning' },
    { id: 'PAID', label: 'Converted', color: 'success' },
    { id: 'LOST', label: 'Lost', color: 'danger' }
  ];

  // Map backend status to stepper index
  const getStageIndex = (status) => {
    switch (status) {
      case 'NEW': return 0;
      case 'CONTACTED': return 1;
      case 'FOLLOW_UP': return 2;
      case 'INTERESTED': return 3;
      case 'PAID': return 4;
      case 'LOST': return 5;
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
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10500, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Fullscreen modal with specific background color matching demo */}
      <div className="modal-dialog modal-fullscreen m-0 h-100" style={{ maxWidth: '100vw' }}>
        <div className={`modal-content border-0 rounded-0 h-100`} style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}>

          {/* Top Header - Premium Glassmorphism */}
          <div className="px-4 py-3 border-bottom glass-header d-flex align-items-center justify-content-between sticky-top" style={{ zIndex: 10, borderColor: 'var(--border-color)' }}>
            <div className="d-flex align-items-center gap-3">
              <button
                type="button"
                className={`btn ${isDarkMode ? 'btn-dark' : 'btn-light'} p-2 text-decoration-none rounded-circle transition-all border shadow-soft`}
                onClick={onClose}
              >
                <ArrowLeft size={20} />
              </button>
              <h4 className={`fw-black mb-0 d-flex align-items-center gap-3 tracking-tighter`}>
                {lead.name}
                <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill small fw-black ls-1" style={{ fontSize: '0.6em', padding: '0.4em 1em', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  ALPHA-NODE-{lead.id || '1000'}
                </span>
              </h4>
            </div>

            <div className="d-flex align-items-center gap-4">
              <div className="text-end d-none d-md-block">
                <span className="fw-black small text-primary text-uppercase tracking-widest d-block ls-2">Interaction Portal</span>
                <span className="text-muted small fw-bold opacity-50">Operational Intelligence Module</span>
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="container-fluid p-4 overflow-auto custom-scroll" style={{ flexGrow: 1, minHeight: 0 }}>
            <div className="row g-4" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '2rem' }}>

              {/* LEFT COLUMN: Profile & Quick Actions */}
              <div className="col-12 col-lg-4 d-flex flex-column gap-4">

                {/* Profile Card */}
                <div className={`card shadow-sm border-0 rounded-4 overflow-hidden position-relative ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-white'}`}>
                  {/* Top color bar matching screenshot */}
                  <div className="bg-primary bg-gradient" style={{ height: '4px', width: '100%' }}></div>

                  <div className="card-body p-4">
                    <div className="d-flex flex-column align-items-center text-center mb-4">
                      <div
                        className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center text-primary fw-bold mb-3 shadow-sm border border-primary border-opacity-25"
                        style={{ width: '80px', height: '80px', fontSize: '2rem' }}
                      >
                        {lead.name ? lead.name.charAt(0).toUpperCase() : <User />}
                      </div>
                      <h4 className={`fw-bold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`}>{lead.name}</h4>
                      <div className="d-flex align-items-center justify-content-center gap-1 text-muted small">
                        <User size={12} /> <span className="fw-medium">Assigned Lead</span>
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

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <button type="button" className="btn btn-outline-success w-100 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 py-2" onClick={() => setShowAddNote(true)}>
                        <Phone size={16} /> Call
                      </button>
                    </div>
                    <div className="col-6">
                      <a href={`mailto:${lead.email}`} className="btn btn-outline-primary w-100 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 py-2" onClick={(e) => !lead.email && e.preventDefault()}>
                        <Mail size={16} /> Email
                      </a>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-3">
                    <a
                      href={`https://wa.me/${lead.mobile?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn w-100 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 py-2 text-white shadow-sm border-0"
                      style={{ backgroundColor: '#128c7e' }}
                    >
                      <MessageSquare size={16} /> WhatsApp
                    </a>
                  </div>

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
                <div className={`card shadow-sm border-0 rounded-4 overflow-hidden p-4 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-white'}`}>
                  <h6 className={`fw-bold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Sales Pipeline Stage</h6>

                  <div className="d-flex justify-content-between position-relative align-items-center px-2 mb-4 w-100 overflow-auto py-2 custom-scroll" style={{ whiteSpace: 'nowrap' }}>
                    {/* Connecting background line */}
                    <div className="position-absolute bg-secondary bg-opacity-25" style={{ height: '2px', top: '50%', left: '5%', right: '5%', zIndex: 1 }}></div>

                    {pipelineStages.map((stage, index) => {
                      const isCompleted = currentStageIndex >= index;
                      const isCurrent = currentStageIndex === index;
                      const isSelected = selectedStageIndex === index;

                      let btnClass = isDarkMode ? 'btn-outline-secondary text-white bg-dark' : 'btn-light border bg-white';
                      if (isCompleted || isSelected) {
                        btnClass = `bg-${stage.color} text-white border-0 shadow-sm`;
                      }

                      return (
                        <button
                          key={stage.id}
                          className={`btn rounded-pill d-flex align-items-center gap-2 px-3 py-1 position-relative fw-bold mx-1 transition-smooth`}
                          style={{ zIndex: 2, fontSize: '0.8rem', minWidth: '120px', justifyContent: 'center' }}
                          onClick={() => {
                            const stageIdx = getStageIndex(stage.id);
                            const currIdx = getStageIndex(lead.status);
                            if (stageIdx >= currIdx) {
                              if (currIdx >= getStageIndex('INTERESTED') && !['INTERESTED', 'PAID', 'LOST'].includes(stage.id)) {
                                return;
                              }
                              setOutcome(stage.id);
                            }
                          }}
                          disabled={(() => {
                            const stageIdx = getStageIndex(stage.id);
                            const currIdx = getStageIndex(lead.status);
                            if (stageIdx < currIdx) return true;
                            if (currIdx >= getStageIndex('INTERESTED') && !['INTERESTED', 'PAID', 'LOST'].includes(stage.id)) return true;
                            return false;
                          })()}
                        >
                          {(isCompleted || isSelected) && <CheckCircle size={14} />}
                          {!isCompleted && !isSelected && <div className="rounded-circle bg-secondary bg-opacity-50" style={{ width: '6px', height: '6px' }}></div>}
                          {stage.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="d-flex align-items-center gap-2 text-muted small mt-2">
                    <AlertCircle size={14} />
                    <span>Users can only move leads to the next immediate logical stage. Select a stage to configure update log.</span>
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
                              className={`form-select fw-bold shadow-sm ${isDarkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary border-opacity-50' : 'bg-light text-dark'}`}
                              value={outcome}
                              onChange={(e) => setOutcome(e.target.value)}
                              style={{ cursor: 'pointer' }}
                            >
                              {pipelineStages
                                .filter(s => {
                                  const stageIdx = getStageIndex(s.id);
                                  const currIdx = getStageIndex(lead.status);
                                  // Rule: No regression
                                  if (stageIdx < currIdx) return false;
                                  // Rule: If Interested, only Converted or Lost
                                  if (currIdx >= getStageIndex('INTERESTED')) {
                                    return ['INTERESTED', 'PAID', 'LOST'].includes(s.id);
                                  }
                                  return true;
                                })
                                .map(s => <option key={s.id} value={s.id}>{s.label}</option>)
                              }
                              <option value="EMI">EMI PLAN SCHEDULED</option>
                            </select>
                          </div>

                          {(outcome === 'PAID' || outcome === 'EMI') && (
                            <div className="col-12 mt-3 animate-fade-in">
                              <div className={`p-4 rounded-4 border-2 shadow-sm ${isDarkMode ? 'bg-success bg-opacity-5 border-success border-opacity-20' : 'bg-success bg-opacity-10 border-success border-opacity-10'}`}>
                                <div className="d-flex align-items-center justify-content-between mb-4">
                                  <div className="d-flex align-items-center gap-2">
                                    <div className={`p-2 rounded-circle ${isDarkMode ? 'bg-success bg-opacity-20 text-success' : 'bg-success text-white'}`}>
                                      <IndianRupee size={16} />
                                    </div>
                                    <h6 className="fw-black text-success text-uppercase small tracking-widest mb-0">Financial Transmission Terminal</h6>
                                  </div>
                                  <div className="d-flex gap-2 p-1 bg-dark bg-opacity-10 rounded-pill">
                                    <button type="button" className={`btn btn-sm rounded-pill fw-black px-3 ${paymentType === 'FULL' ? 'btn-success text-white' : 'text-muted'}`} onClick={() => { setPaymentType('FULL'); setInstallments([]); setInitialAmount(totalAmount); }} style={{ fontSize: '9px' }}>FULL</button>
                                    <button type="button" className={`btn btn-sm rounded-pill fw-black px-3 ${paymentType === 'PART' ? 'btn-success text-white' : 'text-muted'}`} onClick={() => setPaymentType('PART')} style={{ fontSize: '9px' }}>EMI</button>
                                  </div>
                                </div>
                                
                                <div className="row g-3 mb-3">
                                  <div className="col-md-6">
                                    <label className="form-label small fw-black text-muted text-uppercase mb-2" style={{ fontSize: '10px' }}>Total Package Amount (₹)</label>
                                    <div className={`d-flex align-items-center rounded-3 px-3 py-1 border ${isDarkMode ? 'bg-dark border-secondary border-opacity-50' : 'bg-white'}`}>
                                      <input 
                                        type="number" 
                                        className={`form-control border-0 bg-transparent shadow-none fw-black py-2 ${isDarkMode ? 'text-white' : 'text-dark'}`}
                                        placeholder="Total"
                                        value={totalAmount}
                                        onChange={(e) => { setTotalAmount(e.target.value); if (paymentType === 'FULL') setInitialAmount(e.target.value); }}
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <label className="form-label small fw-black text-muted text-uppercase mb-2" style={{ fontSize: '10px' }}>Initial Down Payment (₹)</label>
                                    <div className={`d-flex align-items-center rounded-3 px-3 py-1 border ${isDarkMode ? 'bg-dark border-secondary border-opacity-50' : 'bg-white'}`}>
                                      <input 
                                        type="number" 
                                        className={`form-control border-0 bg-transparent shadow-none fw-black py-2 ${isDarkMode ? 'text-white' : 'text-dark'}`}
                                        placeholder="Down Payment"
                                        value={initialAmount}
                                        onChange={(e) => setInitialAmount(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {paymentType === 'PART' && (
                                  <div className="mb-3 animate-fade-in">
                                    <label className="form-label small fw-black text-muted text-uppercase mb-2" style={{ fontSize: '10px' }}>Installment Schedule</label>
                                    {installments.map((inst, i) => (
                                      <div key={i} className="d-flex gap-2 mb-2 align-items-center">
                                        <div className="flex-grow-1 input-group bg-dark bg-opacity-10 rounded-3 border overflow-hidden">
                                           <span className="input-group-text bg-transparent border-0 text-muted pe-1 ps-2 small">₹</span>
                                           <input type="number" placeholder="Amount" className="form-control border-0 bg-transparent py-2 small fw-bold text-main" value={inst.amount} onChange={(e) => handleInstallmentChange(i, 'amount', e.target.value)} />
                                        </div>
                                        <div className="flex-grow-1 input-group bg-dark bg-opacity-10 rounded-3 border overflow-hidden">
                                           <input type="date" className="form-control border-0 bg-transparent py-2 small fw-bold text-main" value={inst.dueDate} onChange={(e) => handleInstallmentChange(i, 'dueDate', e.target.value)} />
                                        </div>
                                        <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeInstallment(i)}>
                                          <Plus size={16} style={{ transform: 'rotate(45deg)' }} />
                                        </button>
                                      </div>
                                    ))}
                                    <button type="button" className="btn btn-sm btn-link text-success fw-bold p-0 d-flex align-items-center gap-1" onClick={addInstallment} style={{ fontSize: '10px' }}>
                                      <Plus size={14} /> ADD INSTALLMENT
                                    </button>
                                    
                                    {!isMatch && (
                                      <div className="mt-2 x-small fw-black text-warning text-uppercase tracking-widest">
                                        Awaiting Balance: ₹{Math.abs(balanceRemaining).toFixed(0)}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="mt-3">
                                  <label className="form-label small fw-black text-muted text-uppercase mb-2" style={{ fontSize: '10px' }}>Schedule Note</label>
                                  <input 
                                    type="text" 
                                    className={`form-control form-control-sm ${isDarkMode ? 'bg-dark border-secondary border-opacity-50 text-white' : 'bg-white'}`}
                                    placeholder="e.g., Student requested end of month for 2nd part"
                                    value={scheduleNote}
                                    onChange={(e) => setScheduleNote(e.target.value)}
                                  />
                                </div>
                                <p className="text-muted mt-3 mb-0" style={{ fontSize: '8px' }}>* INITIALIZING TRANSMISSION LINK: Submission will generate a live payment link for the student.</p>
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

                {/* Audit & Activity Timeline Card */}
                <div className={`card shadow-sm border-0 rounded-4 overflow-hidden p-4 flex-grow-1 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-white'}`}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h6 className={`fw-bold mb-0 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Audit & Activity Timeline</h6>
                    {!showAddNote && (
                      <button
                        className="btn btn-sm btn-outline-primary rounded-pill fw-bold d-flex align-items-center gap-1 px-3"
                        onClick={() => setShowAddNote(true)}
                      >
                        <Plus size={14} /> Add Note
                      </button>
                    )}
                  </div>

                  {/* Timeline Logic */}
                  <div className="position-relative ps-4 py-2 h-100 overflow-auto" style={{ maxHeight: '500px' }}>
                    {/* Vertical Timeline Bar */}
                    <div className="position-absolute bg-primary bg-opacity-25" style={{ width: '2px', top: '10px', bottom: '0', left: '11px' }}></div>

                    {/* Historical Notes Loop */}
                    {(lead.notes || []).length > 0 ? (
                      [...lead.notes].sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                        return dateB - dateA;
                      }).map((note, index) => (
                        <div key={note.id || index} className="position-relative mb-4 animate-fade-in">
                          <div className={`position-absolute rounded-circle shadow-sm ${index === 0 ? 'bg-primary' : 'bg-secondary bg-opacity-50'}`}
                            style={{ width: '10px', height: '10px', left: '-31px', top: '6px' }}></div>
                          <div className={`p-3 rounded-3 shadow-sm border ${isDarkMode ? 'bg-dark border-secondary border-opacity-25' : 'bg-light border-light'}`}
                            style={{ backgroundColor: index === 0 ? (isDarkMode ? '#1a2233' : '#f0f4ff') : (isDarkMode ? '#1a1a1a' : '#ffffff') }}>
                            <h6 className={`small fw-bold ${index === 0 ? 'text-primary' : 'text-muted'} text-uppercase mb-2 d-flex align-items-center gap-2`}>
                              <MessageSquare size={12} /> {note.status} NOTE
                            </h6>
                            <p className={`mb-2 fw-medium ${isDarkMode ? 'text-white' : 'text-dark'}`}>{note.content}</p>
                            <div className="d-flex align-items-center gap-3 text-muted small">
                              <span className="d-flex align-items-center gap-1"><User size={12} /> {note.createdByName || 'System'}</span>
                              <span className="d-flex align-items-center gap-1"><Calendar size={12} /> {formatDate(note.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      /* Fallback for single note if no history yet */
                      lead.note && (
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
                      )
                    )}

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
