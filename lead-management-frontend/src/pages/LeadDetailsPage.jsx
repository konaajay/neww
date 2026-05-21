import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Mail, Phone, BookOpen, MessageSquare,
  CheckCircle, Plus, Calendar, AlertCircle, ShieldCheck, User, Zap, IndianRupee, Copy, MessageCircle,
  Clock, X, Activity, FileText, CreditCard, XCircle, Eye, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import associateService from '../services/associateService';
import adminService from '../services/adminService';
import api from '../api/api';
import leadsApi from '../features/leads/api/leadsApi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLookupData } from '../features/users/hooks/useLookupData';
import PortalSelect from '../components/PortalSelect';

const LeadDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const userRole = user?.role?.toUpperCase() || '';

  const {
    pipelineStages = [],
    courses = []
  } = useLookupData(userRole);

  const [lead, setLead] = useState(null);
  const [loadingLead, setLoadingLead] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('TIMELINE'); // TIMELINE, FEE, INVOICE
  const [feeStructure, setFeeStructure] = useState(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [generatingLinkIds, setGeneratingLinkIds] = useState([]);

  const [rejectModalData, setRejectModalData] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isDurationLoading, setIsDurationLoading] = useState(false);

  const isAdminOrManager = React.useMemo(() => {
    if (!user) return false;
    const role = (user.role || '').toUpperCase().replace('ROLE_', '');
    return ['ADMIN', 'MANAGER', 'MGR', 'MANAGEMENT'].includes(role);
  }, [user]);

  const fetchLeadData = async () => {
    setLoadingLead(true);
    try {
      const res = await leadsApi.fetchLeadById(id);
      setLead(res.data || res);
    } catch (err) {
      console.error("Failed to load lead details", err);
      toast.error("Failed to load lead details");
    } finally {
      setLoadingLead(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await api.get(`/leads/${id}/history`);
      setAuditLogs(res.data || []);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchFeeStructure = async () => {
    setIsLoadingFee(true);
    try {
      const res = await api.get(`/payments/lead/${id}/fee-structure`);
      setFeeStructure(res.data);
    } catch (err) {
      console.error("Failed to load fee structure", err);
    } finally {
      setIsLoadingFee(false);
    }
  };

  useEffect(() => {
    fetchLeadData();
    fetchAuditLogs();
    fetchFeeStructure();
  }, [id]);

  const handleFileUpload = async () => {
    if (!selectedFile) return toast.warning('Please select an audio file first.');

    setIsUploading(true);
    try {
      await adminService.uploadCallRecord({
        file: selectedFile,
        leadId: id,
        phoneNumber: lead.mobile,
        callType: 'OUTGOING',
        status: lead.status,
        note: 'Individual manual upload from Lead Details page',
        duration: audioDuration
      });
      toast.success('Call record uploaded successfully!');
      setSelectedFile(null);
      setAudioDuration(0);
      fetchAuditLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResendLink = (type, installment) => {
    const inst = installment || (feeStructure?.installments?.find(i => i.status === 'PENDING' && i.paymentGatewayId));
    if (!inst) {
      if (type === 'whatsapp') {
        window.open(`https://wa.me/${lead?.mobile?.replace(/\D/g, '')}`, '_blank');
      } else {
        window.location.href = `mailto:${lead?.email}`;
      }
      return;
    }

    if (!inst.paymentGatewayId) {
      toast.warning("Payment link not generated for this installment yet. Please click 'Generate Link' in the Fee Structure tab.");
      return;
    }

    const productionUrl = "http://52.87.168.111";
    const paymentLink = `${productionUrl}/payment-instruction/${inst.paymentGatewayId}`;
    const courseName = lead?.courseName || lead?.course?.name || courses?.find(c => c.id === lead?.courseId)?.name || courses?.find(c => c.id === lead?.course_id)?.name || 'the course';
    const message = `Hello ${lead?.name}, your payment of ₹${inst.amount} for ${courseName} is pending. Please complete the payment using this secure link: ${paymentLink}`;

    if (type === 'whatsapp') {
      const whatsappUrl = `https://wa.me/${lead?.mobile?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      const mailtoUrl = `mailto:${lead?.email}?subject=Payment Link for ${courseName !== 'the course' ? courseName : 'Course'}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoUrl;
    }
    toast.info(`Sharing link via ${type.toUpperCase()}...`);
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      toast.success('Payment link copied to clipboard!');
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Payment link copied to clipboard! (Fallback)');
      } catch (err) {
        console.error('Fallback copy failed', err);
        toast.error('Failed to copy. Please copy manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleGenerateLink = async (installment) => {
    if (generatingLinkIds.includes(installment.id)) return;

    setGeneratingLinkIds(prev => [...prev, installment.id]);

    try {
      if (installment.paymentGatewayId) {
        toast.info("Refreshing/Regenerating payment link...");
      } else {
        toast.info("Generating secure payment link...");
      }

      const res = await api.post(`/payments/${installment.id}/link`);
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
      setTimeout(() => {
        setGeneratingLinkIds(prev => prev.filter(id => id !== installment.id));
      }, 2000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'System Time';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
    });
  };

  if (loadingLead) {
    return (
      <div className={`min-vh-100 d-flex flex-column align-items-center justify-content-center ${isDarkMode ? 'bg-black' : 'bg-light'}`}>
        <RefreshCw size={48} className="text-primary animate-spin mb-4" />
        <h5 className="fw-black text-uppercase tracking-widest text-muted opacity-50">Retrieving Lead Audit Command Center...</h5>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className={`min-vh-100 d-flex flex-column align-items-center justify-content-center ${isDarkMode ? 'bg-black' : 'bg-light'}`}>
        <AlertCircle size={48} className="text-danger mb-4" />
        <h5 className="fw-black text-uppercase tracking-widest text-muted mb-4">Lead Record Not Found</h5>
        <button onClick={() => navigate(-1)} className="btn btn-primary rounded-pill px-4 fw-bold">GO BACK</button>
      </div>
    );
  }

  return (
    <div className={`p-3 p-md-4 custom-scroll ${isDarkMode ? 'bg-black text-white' : 'bg-light text-dark'}`} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
      <div className="mx-auto" style={{ maxWidth: '1400px', paddingBottom: '100px' }}>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="btn btn-link text-decoration-none text-muted fw-bold small mb-4 p-0 d-flex align-items-center gap-2 hover-primary transition-all"
        >
          <ArrowLeft size={14} /> BACK TO COMMAND CENTER
        </button>

        {/* Lead Identity Header */}
        <div className="d-flex align-items-center justify-content-between mb-4 bg-surface p-4 rounded-4 border border-secondary border-opacity-10 shadow-lg">
          <div className="d-flex align-items-center gap-3">
            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle border border-primary border-opacity-10">
              <User size={28} />
            </div>
            <div>
              <h3 className="fw-black mb-1 text-main tracking-tight d-flex align-items-center gap-3">
                {lead.name}
                <span className="badge bg-primary text-white rounded-pill fw-bold shadow-sm" style={{ fontSize: '12px' }}>
                  L-{lead.id}
                </span>
              </h3>
              <p className="text-muted small fw-bold text-uppercase mb-0 tracking-wider">
                CURRENT PROTOCOL: <span className="text-primary">{lead.status}</span>
              </p>
            </div>
          </div>

          <button
            className="btn btn-outline-primary rounded-pill px-4 py-2 fw-bold text-uppercase tracking-wider small d-flex align-items-center gap-2"
            onClick={fetchLeadData}
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>

        {/* Main Columns Grid */}
        <div className="row g-4">

          {/* LEFT COLUMN: Profile & Actions */}
          <div className="col-12 col-lg-4 d-flex flex-column gap-4">

            {/* Profile Info */}
            <div className="card border-0 shadow-lg rounded-4 bg-surface overflow-hidden">
              <div className="card-body p-4">
                <h6 className="fw-black text-uppercase mb-3 tracking-widest text-muted opacity-50" style={{ fontSize: '10px' }}>Lead Credentials</h6>

                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center gap-3 bg-surface bg-opacity-40 p-3 rounded-3 border border-main border-opacity-10">
                    <div className="p-2 bg-secondary bg-opacity-10 text-muted rounded-circle"><Mail size={16} /></div>
                    <div className="text-truncate">
                      <div className="text-muted extra-small fw-bold text-uppercase" style={{ fontSize: '8px' }}>Email Address</div>
                      <span className="small fw-black text-main">{lead.email || 'No email registered'}</span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3 bg-surface bg-opacity-40 p-3 rounded-3 border border-main border-opacity-10">
                    <div className="p-2 bg-secondary bg-opacity-10 text-muted rounded-circle"><Phone size={16} /></div>
                    <div>
                      <div className="text-muted extra-small fw-bold text-uppercase" style={{ fontSize: '8px' }}>Mobile Connection</div>
                      <span className="small fw-black text-main">{lead.mobile || 'No contact registered'}</span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3 bg-surface bg-opacity-40 p-3 rounded-3 border border-main border-opacity-10">
                    <div className="p-2 bg-secondary bg-opacity-10 text-muted rounded-circle"><BookOpen size={16} /></div>
                    <div>
                      <div className="text-muted extra-small fw-bold text-uppercase" style={{ fontSize: '8px' }}>Course Inquiry</div>
                      <span className="small fw-black text-primary">
                        {lead.courseName || lead.course?.name || courses?.find(c => c.id === lead.courseId)?.name || courses?.find(c => c.id === lead.course_id)?.name || 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card border-0 shadow-lg rounded-4 bg-surface overflow-hidden p-4">
              <h6 className="fw-black text-uppercase mb-3 tracking-widest text-muted opacity-50" style={{ fontSize: '10px' }}>Communications Gateway</h6>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <a
                    href={`tel:${lead.mobile?.replace(/\s/g, '')}`}
                    className="btn btn-outline-success btn-sm w-100 fw-black rounded-pill py-2 text-uppercase tracking-wider"
                    style={{ fontSize: '10px' }}
                  >
                    Call Lead
                  </a>
                </div>
                <div className="col-6">
                  <button
                    onClick={() => handleResendLink('email')}
                    className="btn btn-outline-primary btn-sm w-100 fw-black rounded-pill py-2 text-uppercase tracking-wider"
                    style={{ fontSize: '10px' }}
                  >
                    Send Email
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleResendLink('whatsapp')}
                className="btn btn-sm btn-success w-100 fw-black rounded-pill py-2 border-0 text-uppercase tracking-wider"
                style={{ backgroundColor: '#25D366', fontSize: '10px' }}
              >
                Send WhatsApp Msg
              </button>

              {/* Upload Call Record */}
              <div className="mt-4 pt-3 border-top border-secondary border-opacity-10">
                <h6 className="fw-black text-uppercase mb-2 tracking-widest text-muted opacity-50" style={{ fontSize: '10px' }}>Sync Call Recording</h6>
                <div className="d-flex flex-column gap-2">
                  <input
                    type="file"
                    accept="audio/*"
                    className={`form-control form-control-sm ${isDarkMode ? 'bg-black text-white border-secondary border-opacity-25' : 'bg-white text-dark border-secondary border-opacity-25'} rounded-3`}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setSelectedFile(file);
                      setIsDurationLoading(true);

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
                        className={`form-control form-control-sm ${isDarkMode ? 'bg-black text-white border-secondary border-opacity-25' : 'bg-white text-dark border-secondary border-opacity-25'} text-center`}
                        style={{ maxWidth: '100px' }}
                        value={audioDuration}
                        onChange={(e) => setAudioDuration(parseInt(e.target.value) || 0)}
                      />
                      <span className="small text-muted fw-bold">seconds</span>
                    </div>
                  )}
                  <button
                    className="btn btn-sm btn-primary w-100 fw-black d-flex align-items-center justify-content-center gap-2 py-2 mt-2 shadow-glow border-0 rounded-pill"
                    disabled={!selectedFile || isUploading || isDurationLoading}
                    onClick={handleFileUpload}
                    style={{ fontSize: '10px' }}
                  >
                    {isUploading || isDurationLoading ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <ShieldCheck size={12} />
                    )}
                    {isDurationLoading ? 'Detecting Length...' : 'Upload Recording File'}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Tabs and Detail Content */}
          <div className="col-12 col-lg-8 d-flex flex-column gap-3">

            {/* Tab Selector */}
            <div className="d-flex align-items-center gap-2 p-1 bg-surface rounded-pill border border-secondary border-opacity-10 shadow-sm" style={{ width: 'fit-content' }}>
              {[
                { id: 'TIMELINE', label: 'TIMELINE', icon: <Activity size={12} /> },
                { id: 'FEE_STRUCTURE', label: 'FEE STRUCTURE', icon: <CreditCard size={12} /> },
                { id: 'INVOICE', label: 'INVOICE', icon: <FileText size={12} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn btn-sm rounded-pill px-4 py-2 d-flex align-items-center gap-2 transition-all border-0 shadow-none ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-muted'}`}
                  style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TIMELINE TAB */}
            {activeTab === 'TIMELINE' && (
              <div className="card shadow-lg border-0 rounded-4 overflow-hidden p-4 bg-surface animate-fade-in flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h6 className="fw-black text-uppercase tracking-wider text-main mb-0">Audit & Activity Timeline</h6>
                </div>

                <div className="position-relative ps-4 py-2 h-100 overflow-auto" style={{ maxHeight: '600px' }}>
                  <div className="position-absolute bg-primary bg-opacity-25" style={{ width: '2px', top: '10px', bottom: '0', left: '11px' }}></div>

                  {(() => {
                    const notes = (lead.notes || []).map(n => ({ ...n, type: 'NOTE' }));
                    const logs = auditLogs.map(l => ({ ...l, type: 'LOG' }));

                    // Merge: attach LOG to its matching NOTE (within 2 min AND newValue matches note status)
                    const usedLogIds = new Set();
                    const mergedItems = notes.map(note => {
                      const noteTime = new Date(note.createdAt || 0).getTime();
                      const noteStatus = (note.status || '').toUpperCase();
                      const matchedLog = logs.find(log => {
                        if (usedLogIds.has(log.id)) return false;
                        const logTime = new Date(log.timestamp || 0).getTime();
                        const withinTime = Math.abs(logTime - noteTime) < 2 * 60 * 1000;
                        const statusMatch = (log.newValue || '').toUpperCase().includes(noteStatus) || noteStatus.includes((log.newValue || '').toUpperCase());
                        return withinTime && statusMatch;
                      });
                      if (matchedLog) usedLogIds.add(matchedLog.id);
                      return { ...note, type: 'NOTE', log: matchedLog || null };
                    });
                    // Add remaining unmatched LOGs
                    const unmatchedLogs = logs.filter(l => !usedLogIds.has(l.id)).map(l => ({ ...l, type: 'LOG', log: null }));

                    const merged = [...mergedItems, ...unmatchedLogs].sort((a, b) => {
                      const dateA = new Date(a.createdAt || a.timestamp || 0);
                      const dateB = new Date(b.createdAt || b.timestamp || 0);
                      return dateB - dateA;
                    });

                    if (merged.length === 0) {
                      return lead.note ? (
                        <div className="position-relative mb-4">
                          <div className="position-absolute bg-primary rounded-circle shadow-sm" style={{ width: '10px', height: '10px', left: '-31px', top: '6px' }}></div>
                          <div className="p-3 rounded-3 shadow-sm border border-main border-opacity-10 bg-surface bg-opacity-40">
                            <h6 className="small fw-bold text-primary text-uppercase mb-2 d-flex align-items-center gap-2">
                              <MessageSquare size={12} /> INTERNAL NOTE
                            </h6>
                            <p className="mb-2 fw-medium text-main">{lead.note}</p>
                            <div className="d-flex align-items-center gap-3 text-muted small">
                              <span className="d-flex align-items-center gap-1"><User size={12} /> {lead.updatedByName || 'System'}</span>
                              <span className="d-flex align-items-center gap-1"><Calendar size={12} /> {formatDate(lead.updatedAt || lead.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-5 text-muted small fw-bold text-uppercase">No activity records recorded yet.</div>
                      );
                    }

                    return merged.map((item, index) => (
                      <div key={`${item.type}-${item.id || index}`} className="position-relative mb-4 animate-fade-in">
                        <div className={`position-absolute rounded-circle shadow-sm ${index === 0 ? 'bg-primary' : 'bg-secondary bg-opacity-50'}`}
                          style={{ width: '10px', height: '10px', left: '-31px', top: '6px' }}></div>

                        {item.type === 'NOTE' ? (
                          <div className="p-3 rounded-3 shadow-sm border border-main border-opacity-10 bg-surface bg-opacity-40">
                            {/* Status change row (if matched log exists) */}
                            {item.log && (
                              <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom border-main border-opacity-10">
                                <Activity size={11} className="text-info" />
                                <span className="text-muted small fw-bold opacity-60">{item.log.oldValue || 'None'}</span>
                                <span className="text-muted opacity-40" style={{ fontSize: '10px' }}>→</span>
                                <span className="text-primary small fw-black">{item.log.newValue}</span>
                              </div>
                            )}
                            <h6 className={`small fw-bold ${index === 0 ? 'text-primary' : 'text-muted'} text-uppercase mb-2 d-flex align-items-center gap-2`}>
                              <MessageSquare size={12} /> {item.status} NOTE
                            </h6>
                            <p className="mb-2 fw-medium text-main">{item.content}</p>
                            <div className="d-flex align-items-center gap-3 text-muted small">
                              <span className="d-flex align-items-center gap-1"><User size={12} /> {item.createdByName || 'System'}</span>
                              <span className="d-flex align-items-center gap-1"><Calendar size={12} /> {formatDate(item.createdAt)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-3 shadow-sm border border-main border-opacity-10 bg-surface bg-opacity-40">
                            <h6 className="small fw-bold text-info text-uppercase mb-2 d-flex align-items-center gap-2">
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

                  {/* Creation Event */}
                  <div className="position-relative">
                    <div className="position-absolute bg-secondary bg-opacity-50 rounded-circle shadow-sm" style={{ width: '10px', height: '10px', left: '-31px', top: '6px' }}></div>
                    <div className="p-3 rounded-3 shadow-sm border border-main border-opacity-10 bg-surface bg-opacity-40">
                      <h6 className="small fw-bold text-primary text-uppercase mb-2 d-flex align-items-center gap-2">
                        <CheckCircle size={12} /> LEAD CREATED
                      </h6>
                      <p className="mb-2 font-monospace small text-muted">Lead L-{lead.id} added to pipeline.</p>
                      <div className="d-flex align-items-center gap-2 text-muted small">
                        <Calendar size={12} /> {formatDate(lead.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FEE STRUCTURE TAB */}
            {activeTab === 'FEE_STRUCTURE' && (
              <div className="card shadow-lg border-0 rounded-4 p-4 bg-surface animate-fade-in">
                <h6 className="fw-black text-uppercase tracking-wider text-main mb-4">Student Fee Road Map</h6>
                {isLoadingFee ? (
                  <div className="text-center py-5"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                ) : !feeStructure?.fee ? (
                  <div className="text-center py-5 text-muted small fw-bold">No fee structure mapped for this student.</div>
                ) : (
                  <div className="d-flex flex-column gap-4">

                    {/* Fee Summary Cards */}
                    <div className="row g-3">
                      <div className="col-6 col-md-3">
                        <div className="p-3 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-10 h-100">
                          <p className="text-primary fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '1px' }}>Total Package</p>
                          <h4 className="fw-black mb-0 text-main">₹{Number(feeStructure.fee.totalAmount || 0).toLocaleString()}</h4>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="p-3 rounded-4 bg-warning bg-opacity-10 border border-warning border-opacity-10 h-100">
                          <p className="text-warning fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '1px', color: '#f59e0b' }}>Discount Granted</p>
                          <h4 className="fw-black mb-0 text-warning">₹{Number(feeStructure.fee.discount || 0).toLocaleString()}</h4>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="p-3 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-10 h-100">
                          <p className="text-success fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '1px' }}>Total Reconciled</p>
                          <h4 className="fw-black mb-0 text-success">₹{Number(feeStructure.fee.paidAmount || 0).toLocaleString()}</h4>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="p-3 rounded-4 bg-danger bg-opacity-10 border border-danger border-opacity-10 h-100">
                          <p className="text-danger fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '1px' }}>Outstanding Dues</p>
                          <h4 className="fw-black mb-0 text-danger">₹{Number(feeStructure.fee.balanceAmount || 0).toLocaleString()}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Installments Table */}
                    <div className="mt-2">
                      <h6 className="small fw-black text-muted text-uppercase tracking-widest mb-3" style={{ fontSize: '10px' }}>Installments Grid</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-borderless align-middle mb-0 text-main">
                          <thead>
                            <tr className="border-bottom border-main border-opacity-10">
                              <th className="text-muted small fw-bold pb-2">Slno</th>
                              <th className="text-muted small fw-bold pb-2">DUES EXPECTED</th>
                              <th className="text-muted small fw-bold pb-2">SCHEDULE DATE</th>
                              <th className="text-muted small fw-bold pb-2">PAID STAMP</th>
                              <th className="text-muted small fw-bold pb-2 text-end">STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {feeStructure.installments?.map((p, idx) => (
                              <tr key={`installment-${p.id || idx}`} className="border-bottom border-main border-opacity-10">
                                <td className="fw-bold small text-muted">{idx + 1}</td>
                                <td className="fw-black small text-main">₹{Number(p.amount || 0).toLocaleString()}</td>
                                <td className="text-muted" style={{ fontSize: '11px' }}>
                                  {p.dueDate ? formatDate(p.dueDate).split(',')[0] : (
                                    p.createdAt ? formatDate(p.createdAt).split(',')[0] : (
                                      feeStructure?.fee?.createdAt ? formatDate(feeStructure.fee.createdAt).split(',')[0] : (
                                        lead?.createdAt ? formatDate(lead.createdAt).split(',')[0] : 'System Time'
                                      )
                                    )
                                  )}
                                </td>
                                <td className="text-muted fw-bold" style={{ fontSize: '11px' }}>
                                  {(p.status === 'PAID' || p.status === 'SUCCESS') && p.updatedAt ? (
                                    <span className="text-success">{formatDate(p.updatedAt).split(',')[0]}</span>
                                  ) : (
                                    <span className="text-muted opacity-50">--</span>
                                  )}
                                </td>
                                <td className="text-end pe-0">
                                  <div className="d-flex align-items-center justify-content-end gap-2 flex-wrap">
                                    <span className={`badge rounded-pill ${p.status === 'PAID' || p.status === 'SUCCESS' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`} style={{ fontSize: '9px' }}>
                                      {p.status}
                                    </span>

                                    {(p.status === 'PAID' || p.status === 'SUCCESS') && (
                                      <button
                                        className="btn btn-link p-0 border-0 ms-1 d-flex align-items-center"
                                        title="View Invoice"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(`/invoice/${id}/${p.id}`, '_blank');
                                        }}
                                      >
                                        <FileText size={14} className="text-primary hover-scale" />
                                      </button>
                                    )}

                                    {(p.receiptUrl || p.receipt_url || p.screenshotUrl || p.proofUrl) && (
                                      <a
                                        href={(p.receiptUrl || p.receipt_url || p.screenshotUrl || p.proofUrl).startsWith('http')
                                          ? (p.receiptUrl || p.receipt_url || p.screenshotUrl || p.proofUrl)
                                          : `${(import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8080' : '')).replace('/api', '')}${(p.receiptUrl || p.receipt_url || p.screenshotUrl || p.proofUrl)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-link p-0 border-0 ms-1 d-flex align-items-center"
                                        title="View Receipt Screenshot"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Eye size={14} className="text-info hover-scale" />
                                      </a>
                                    )}

                                    {p.status === 'PENDING_APPROVAL' && (isAdminOrManager) && (
                                      <button
                                        className="btn btn-link p-0 border-0 ms-1"
                                        title="Approve Manual Payment"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!window.confirm("Approve this manual payment?")) return;
                                          try {
                                            await leadsApi.approvePayment(p.id);
                                            toast.success("Payment Approved!");
                                            localStorage.setItem('pendingHardRefresh', Date.now().toString());
                                            fetchFeeStructure();
                                            fetchLeadData();
                                            fetchAuditLogs();
                                            queryClient.invalidateQueries({ queryKey: ['leads'] });
                                            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                                            queryClient.invalidateQueries({ queryKey: ['tasks'] });
                                            queryClient.invalidateQueries({ queryKey: ['pending-payment-approvals'] });
                                            queryClient.invalidateQueries({ queryKey: ['my-payment-status'] });
                                            setTimeout(() => window.location.reload(), 1000);
                                          } catch (err) {
                                            toast.error("Approval failed");
                                          }
                                        }}
                                      >
                                        <ShieldCheck size={14} className="text-success hover-scale" />
                                      </button>
                                    )}

                                    {p.status === 'PENDING_APPROVAL' && (isAdminOrManager) && (
                                      <button
                                        className="btn btn-link p-0 border-0 ms-1"
                                        title="Reject Manual Payment"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setRejectModalData(p);
                                          setRejectReason('');
                                        }}
                                      >
                                        <XCircle size={14} className="text-danger hover-scale" />
                                      </button>
                                    )}

                                    {(p.status === 'PENDING' || p.status === 'OVERDUE' || p.status === 'REJECTED') && (
                                      <>
                                        {!p.paymentGatewayId ? (
                                          <>
                                            <button
                                              className="btn btn-xs btn-outline-primary px-2 py-1 rounded-pill d-flex align-items-center gap-1"
                                              style={{ fontSize: '9px' }}
                                              disabled={generatingLinkIds.includes(p.id)}
                                              onClick={(e) => { e.stopPropagation(); handleGenerateLink(p); }}
                                            >
                                              {generatingLinkIds.includes(p.id) ? 'Generating...' : 'Link'}
                                            </button>
                                            <button
                                              className="btn btn-xs btn-outline-success px-2 py-1 rounded-pill d-flex align-items-center gap-1 ms-1"
                                              style={{ fontSize: '9px' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`/leads/${id}/status-update?newStatus=${lead.status || 'EMI'}&manual=true&amount=${p.amount}&installmentId=${p.id}`, '_blank')
                                              }}
                                            >
                                              <IndianRupee size={8} /> Manual
                                            </button>
                                          </>
                                        ) : (
                                          <div className="d-flex align-items-center justify-content-end gap-2 flex-wrap">
                                            <button
                                              className="btn btn-xs btn-outline-success px-2 py-1 rounded-pill d-flex align-items-center gap-1"
                                              style={{ fontSize: '9px' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`/leads/${id}/status-update?newStatus=${lead.status || 'EMI'}&manual=true&amount=${p.amount}&installmentId=${p.id}`, '_blank')
                                              }}
                                            >
                                              <IndianRupee size={8} /> Manual
                                            </button>

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
                                                    localStorage.setItem('pendingHardRefresh', Date.now().toString());
                                                    fetchFeeStructure();
                                                    fetchLeadData();
                                                    fetchAuditLogs();
                                                    queryClient.invalidateQueries({ queryKey: ['pending-payment-approvals'] });
                                                    queryClient.invalidateQueries({ queryKey: ['my-payment-status'] });
                                                    setTimeout(() => window.location.reload(), 1000);
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
                                              className="btn btn-xs btn-warning p-1 rounded-circle text-white"
                                              title="Regenerate Link"
                                              disabled={generatingLinkIds.includes(p.id)}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleGenerateLink(p);
                                              }}
                                            >
                                              <Zap size={10} />
                                            </button>
                                            <button
                                              className="btn btn-xs btn-secondary p-1 rounded-circle"
                                              title="Copy Link"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(`${window.location.origin}/payment-instruction/${p.paymentGatewayId}`);
                                              }}
                                            >
                                              <Copy size={10} />
                                            </button>
                                          </div>
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

            {/* INVOICE TAB */}
            {activeTab === 'INVOICE' && (
              <div className="card shadow-lg border-0 rounded-4 p-4 bg-surface animate-fade-in">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h6 className="fw-black text-uppercase tracking-wider text-main mb-0">Official Invoice Ledger</h6>
                  <button className="btn btn-sm btn-primary rounded-pill px-3 fw-bold" style={{ fontSize: '10px' }} onClick={() => window.open(`/invoice/${id}`, '_blank')}>
                    <Zap size={12} className="me-1" /> VIEW LEDGER PDF
                  </button>
                </div>

                {!feeStructure?.fee ? (
                  <div className="text-center py-5 text-muted small fw-bold">No invoicing records exist yet.</div>
                ) : (
                  <div className="p-4 rounded-4 bg-surface bg-opacity-40 border border-main border-opacity-10 d-flex flex-column gap-3 shadow-inner">
                    <div className="d-flex justify-content-between border-bottom border-main border-opacity-10 pb-2">
                      <span className="text-muted small fw-bold">STUDENT REGISTERED NAME</span>
                      <span className="fw-black small text-main">{lead.name.toUpperCase()}</span>
                    </div>
                    <div className="d-flex justify-content-between border-bottom border-main border-opacity-10 pb-2">
                      <span className="text-muted small fw-bold">ACCOUNT LEDGER ID</span>
                      <span className="fw-black small text-primary">L-{lead.id}</span>
                    </div>
                    <div className="d-flex justify-content-between border-bottom border-main border-opacity-10 pb-2">
                      <span className="text-muted small fw-bold">TOTAL PACKAGE RATE</span>
                      <span className="fw-black small text-main">₹{Number(feeStructure.fee.totalAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between border-bottom border-main border-opacity-10 pb-2">
                      <span className="text-muted small fw-bold">TOTAL FUNDS RECEIVED</span>
                      <span className="fw-black small text-success">₹{Number(feeStructure.fee.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between pt-2">
                      <span className="text-muted fw-bold small">BALANCE UNRECONCILED</span>
                      <span className="fw-black text-danger fs-5">₹{Number(feeStructure.fee.balanceAmount || 0).toLocaleString()}</span>
                    </div>

                    <div className="mt-3 p-3 bg-surface bg-opacity-40 rounded-3 border border-primary border-opacity-10 text-center shadow-sm">
                      <p className="text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '8px', letterSpacing: '1px' }}>Next Settlement Window</p>
                      <h5 className="fw-black text-primary mb-0">{feeStructure.fee.nextDueDate ? formatDate(feeStructure.fee.nextDueDate).split(',')[0] : 'ACCOUNT FULLY SETTLED'}</h5>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* REJECTION DIALOG */}
      {rejectModalData && ReactDOM.createPortal(
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              zIndex: 999998,
              backgroundColor: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)'
            }}
          />
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ zIndex: 999999 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 overflow-hidden bg-surface text-white shadow-2xl">
                <div className="modal-header border-0 px-4 pt-4 pb-0">
                  <h5 className="modal-title fw-black d-flex align-items-center gap-2 text-white">
                    <XCircle size={22} className="text-danger" />
                    Reject Manual Payment Verification
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setRejectModalData(null)}
                    style={{ opacity: 0.8 }}
                  ></button>
                </div>
                <div className="modal-body px-4 py-3">
                  <p className="small mb-3 fw-bold text-muted">
                    Specify the validation error or rejection reason for <span className="text-primary fw-black">{lead.name}</span>.
                  </p>
                  <textarea
                    className="form-control rounded-3 bg-black text-white border-secondary border-opacity-20"
                    style={{ boxShadow: 'none', resize: 'none' }}
                    rows="4"
                    placeholder="Provide detailed rejection notes here..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="modal-footer border-0 px-4 pb-4 pt-0 d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-dark border-secondary rounded-pill px-4 fw-bold text-muted"
                    onClick={() => setRejectModalData(null)}
                    disabled={isRejecting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
                    disabled={isRejecting || !rejectReason.trim()}
                    onClick={async () => {
                      setIsRejecting(true);
                      try {
                        await leadsApi.rejectPayment(rejectModalData.id, rejectReason);
                        toast.success("Payment Verification Rejected");
                        localStorage.setItem('pendingHardRefresh', Date.now().toString());
                        setRejectModalData(null);
                        fetchFeeStructure();
                        fetchLeadData();
                        fetchAuditLogs();
                        queryClient.invalidateQueries({ queryKey: ['leads'] });
                        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                        queryClient.invalidateQueries({ queryKey: ['tasks'] });
                        queryClient.invalidateQueries({ queryKey: ['pending-payment-approvals'] });
                        queryClient.invalidateQueries({ queryKey: ['my-payment-status'] });
                        setTimeout(() => window.location.reload(), 1000);
                      } catch (err) {
                        toast.error("Rejection failed");
                      } finally {
                        setIsRejecting(false);
                      }
                    }}
                  >
                    {isRejecting ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : null}
                    {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default LeadDetailsPage;
