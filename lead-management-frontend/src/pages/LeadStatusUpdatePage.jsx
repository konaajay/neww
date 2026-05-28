import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '../utils/logger';
import { 
  ArrowLeft, ShieldCheck, Calendar, Activity, 
  MessageSquare, IndianRupee, AlertCircle, Shield,
  QrCode, Copy, Link as LinkIcon, Wallet, CheckCircle2,
  X, Info, ExternalLink, RefreshCw, Layers
} from 'lucide-react';
import { toast } from 'react-toastify';
import leadsApi from '../features/leads/api/leadsApi';
import associateService from '../services/associateService';
import { useLeadStatusLogic } from '../features/leads/hooks/useLeadStatusLogic';
import { useLookupData } from '../features/users/hooks/useLookupData';
import PortalSelect from '../components/PortalSelect';
import PaymentOcrUpload from '../components/PaymentOcrUpload';
import { QRCodeCanvas } from 'qrcode.react';
import { useTheme } from '../context/ThemeContext';

const LeadStatusUpdatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode } = useTheme();

  const initialStatus = searchParams.get('newStatus');
  const isManualPaymentFromUrl = searchParams.get('manual') === 'true';
  const initialAmountFromUrl = searchParams.get('amount');
  
  const { pipelineStages } = useLookupData('ASSOCIATE');

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || '');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [error, setError] = useState(false);
  const [showStatusList, setShowStatusList] = useState(false);
  const [courses, setCourses] = useState([]);
  const [isManualPayment, setIsManualPayment] = useState(isManualPaymentFromUrl);

  // Fee Structure State
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [initialAmount, setInitialAmount] = useState(initialAmountFromUrl || '');
  const [paymentType, setPaymentType] = useState('FULL');
  const [installments, setInstallments] = useState([]);
  const [nextInstallmentDate, setNextInstallmentDate] = useState('');
  const [feeStructureExists, setFeeStructureExists] = useState(false);
  const [totalPaidSoFar, setTotalPaidSoFar] = useState(0);

  // OCR/Manual Payment State
  const [receiptFile, setReceiptFile] = useState(null);
  const [utr, setUtr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [showQr, setShowQr] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));

  const INVOICERS = {
    gyantrix: {
      businessName: "Gyantrix",
      businessAddress: "Pathrika Nagar, Street No:1, HITEC City, Hyderabad - 500081",
      businessContact: "+91 9247551330",
      businessEmail: "support@gyantrixacademy.com",
      taxId: "GSTIN: 36AAACG1234F1Z5"
    },
    nexus: {
      businessName: "Gyantrix",
      businessAddress: "Pathrika Nagar, Street No:1, HITEC City, Hyderabad - 500081",
      businessContact: "+91 9247551330",
      businessEmail: "support@gyantrixacademy.com",
      taxId: "GSTIN: 36AAACG1234F1Z5"
    }
  };

  const [invoicerKey, setInvoicerKey] = useState('gyantrix');

  // Success States
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const {
    isMatch,
    sumOfParts,
    discountedTotal,
    balanceRemaining,
    addInstallment,
    removeInstallment,
    handleInstallmentChange
  } = useLeadStatusLogic({
    totalAmount,
    setTotalAmount,
    discount,
    setDiscount,
    initialAmount,
    setInitialAmount,
    installments,
    setInstallments,
    paymentType,
    setPaymentType,
    totalPaidSoFar,
    maxInstallments: selectedCourse?.maxInstallments,
    onMaxReached: (max) => toast.warning(`Maximum of ${max} future installments allowed for this course.`)
  });

  const minTokenRequired = selectedCourse ? parseFloat(selectedCourse.minTokenAmount || 500) : 500;
  const isCommitmentTooLow = ['CONVERTED', 'PAID', 'EMI'].includes(selectedStatus?.toUpperCase()) && 
                             selectedCourse && 
                             parseFloat(initialAmount || 0) < minTokenRequired;

  const init = useCallback(async () => {
    try {
      setLoading(true);
      const [leadRes, coursesRes, feeRes] = await Promise.allSettled([
        leadsApi.fetchLeadById(id),
        leadsApi.getCourses(),
        leadsApi.getFeeStructure(id)
      ]);

      if (leadRes.status === 'fulfilled') {
        const leadData = leadRes.value.data || leadRes.value;
        setLead(leadData);
        if (!initialStatus) setSelectedStatus(leadData.status);
      }

      if (coursesRes.status === 'fulfilled') {
        setCourses(coursesRes.value.data || coursesRes.value);
      }

      if (feeRes.status === 'fulfilled' && feeRes.value) {
        const feeData = feeRes.value.data || feeRes.value;

        // Correctly handle the nested structure from LeadPaymentService.getStudentFeeStructure
        const feeObj = feeData.fee || feeData;
        
        const packageAmt = feeObj.totalAmount || feeObj.total_amount || feeObj.totalPackageAmount;
        const paidAmt = feeObj.paidAmount || feeObj.paid_amount || feeObj.paidAmountSoFar || 0;
        const discountAmt = feeObj.discount || feeObj.discountAmount || 0;

        if (packageAmt && packageAmt > 0) {
          setFeeStructureExists(true);
          // Ensure we store pure numbers for calculations
          setTotalAmount(parseFloat(packageAmt) || 0);
          setTotalPaidSoFar(parseFloat(paidAmt) || 0);
          setDiscount(parseFloat(discountAmt) || 0);

          if (feeData.installments && Array.isArray(feeData.installments)) {
            const currentPayId = searchParams.get('installmentId');
            const pending = feeData.installments
              .filter(p => (p.status === 'PENDING' || p.status === 'REJECTED' || p.status === 'OVERDUE') && String(p.id) !== currentPayId)
              .map(p => ({
                amount: p.amount,
                dueDate: p.dueDate ? p.dueDate.substring(0, 16) : ''
              }));
            
            setInstallments(pending);
            setPaymentType('EMI');
          }
        } else {
          setFeeStructureExists(false);
        }
      }
    } catch (err) {
      console.error("Init Error:", err);
      toast.error("Protocol Sync Failure");
    } finally {
      setLoading(false);
    }
  }, [id, initialStatus, searchParams]);

  useEffect(() => {
    init();
  }, [init]);

  // Sync course when fee data loads
  useEffect(() => {
    if (lead?.courseId && courses.length > 0 && !selectedCourse) {
      const course = courses.find(c => String(c.id) === String(lead.courseId));
      if (course) setSelectedCourse(course);
    }
  }, [lead, courses, selectedCourse]);

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c.id.toString() === courseId);
    setSelectedCourse(course);
    if (course) {
      setTotalAmount(course.baseFee);
      setDiscount('');
      setInitialAmount(course.minTokenAmount || 500);
    }
  };



  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      toast.success('Payment Link Copied!');
    } else {
      // Fallback for non-HTTPS environments
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
        toast.success('Payment Link Copied! (Fallback)');
      } catch (err) {
        console.error('Fallback copy failed', err);
        toast.error('Failed to copy. Please copy manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleOcrData = (data) => {
    if (data.success) {
      if (data.amount) setInitialAmount(data.amount.replace(/[^0-9.]/g, ''));
      if (data.utrNumber) setUtr(data.utrNumber);
      toast.success("Payment Protocol Deciphered");
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (isCommitmentTooLow) {
      return toast.error(`Commitment cannot be less than the minimum token amount (₹${minTokenRequired.toLocaleString()}) configured for this course.`);
    }

    // 1. Accounting Validation Check
    if (!isMatch && !(feeStructureExists && sumOfParts <= (Number(discountedTotal) - Number(totalPaidSoFar)) + 1)) {
      return toast.error("Accounting Mismatch: Resolve settlement balance before generating link.");
    }

    setIsSubmitting(true);
    try {
      const res = await leadsApi.createCashfreeOrder(
        id,
        parseFloat(initialAmount),
        paymentType,
        installments.map(inst => ({
          amount: parseFloat(inst.amount),
          dueDate: inst.dueDate
        })),
        parseFloat(totalAmount),
        discount ? parseFloat(discount) : 0,
        searchParams.get('installmentId'),
        selectedCourse?.id
      );
      
      // Success check - handle various backend response formats
      const link = res?.payment_url || res?.paymentUrl || res?.link;
      
      if (link) {
        setGeneratedLink(link);
        toast.success("Payment Link Generated successfully!");
      } else {
        throw new Error("No link returned from gateway");
      }
    } catch (err) {
      console.error("Link Generation Error:", err);
      toast.error(err.response?.data?.message || err.message || "Gateway Initiation Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return toast.error("Select Status Protocol");

    if (['CONVERTED', 'PAID', 'EMI'].includes(selectedStatus?.toUpperCase()) && isCommitmentTooLow) {
      return toast.error(`Commitment cannot be less than the minimum token amount (₹${minTokenRequired.toLocaleString()}) configured for this course.`);
    }

    // Normalization helper to match status variants (e.g., FOLLOW_UP vs FOLLOW-UP)
    const normalize = (s) => s?.toUpperCase().replace(/[-_ ]/g, '') || '';
    const normSelected = normalize(selectedStatus);
    
    // Dynamic Validation based on Pipeline Architecture
    const currentStage = pipelineStages.find(s => normalize(s.statusValue) === normSelected);
    if (currentStage) {
      if (currentStage.requireNote && (!note || note.trim().length < 3)) {
        return toast.error(`Strategic Note is mandatory for ${currentStage.label} protocol.`);
      }
      // EXEMPT CONVERTED: We use EMI dates or it's a full closure, so manual follow-up is not needed
      if (currentStage.requireDate && !followUpDate && normSelected !== 'CONVERTED') {
        return toast.error(`Follow-up schedule is required for ${currentStage.label} status.`);
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Update Core Lead Status & Fee Structure
      const payload = {
        status: selectedStatus,
        note,
        followUpDate: followUpDate || null,
        isManual: isManualPayment,
        businessName: INVOICERS[invoicerKey].businessName,
        businessAddress: INVOICERS[invoicerKey].businessAddress,
        businessContact: INVOICERS[invoicerKey].businessContact,
        businessEmail: INVOICERS[invoicerKey].businessEmail,
        taxId: INVOICERS[invoicerKey].taxId,
        feeStructure: {
          courseId: selectedCourse?.id,
          totalAmount: parseFloat(totalAmount),
          discount: parseFloat(discount),
          initialAmount: parseFloat(initialAmount),
          paymentType,
          installments: installments.map(inst => {
            const custom = INVOICERS[inst.invoicerKey] || INVOICERS[invoicerKey] || INVOICERS.gyantrix;
            return {
              amount: parseFloat(inst.amount),
              dueDate: inst.dueDate,
              businessName: custom.businessName,
              businessAddress: custom.businessAddress,
              businessContact: custom.businessContact,
              businessEmail: custom.businessEmail,
              taxId: custom.taxId
            };
          })
        },
        manualPayment: isManualPayment ? {
          leadId: id,
          amount: parseFloat(initialAmount),
          utr,
          method: paymentMethod,
          paymentDate: paymentDate,
          note: `UTR: ${utr} | ${note}`,
          installmentId: searchParams.get('installmentId'),
          businessName: INVOICERS[invoicerKey].businessName,
          businessAddress: INVOICERS[invoicerKey].businessAddress,
          businessContact: INVOICERS[invoicerKey].businessContact,
          businessEmail: INVOICERS[invoicerKey].businessEmail,
          taxId: INVOICERS[invoicerKey].taxId
        } : null
      };

      // STRATEGIC ROUTING: If manual conversion or installment payment verification, use the specialized payment endpoint
      if (isManualPayment && (normSelected === 'CONVERTED' || searchParams.get('installmentId'))) {
        
        const formData = new FormData();
        
        // Flatten fee structure into the metadata to ensure backend captures all fields
        const metadata = {
          leadId: id,
          amount: parseFloat(initialAmount),
          utr,
          method: paymentMethod,
          paymentDate,
          note: `UTR: ${utr} | ${note}`,
          installmentId: searchParams.get('installmentId'),
          nextDueDate: nextInstallmentDate || null,
          // Fee Structure Fields (Flattened)
          courseId: selectedCourse?.id,
          totalAmount: parseFloat(totalAmount),
          discount: parseFloat(discount),
          paymentType,
          businessName: INVOICERS[invoicerKey].businessName,
          businessAddress: INVOICERS[invoicerKey].businessAddress,
          businessContact: INVOICERS[invoicerKey].businessContact,
          businessEmail: INVOICERS[invoicerKey].businessEmail,
          taxId: INVOICERS[invoicerKey].taxId,
          installments: searchParams.get('installmentId') ? null : installments.map(inst => {
            const custom = INVOICERS[inst.invoicerKey] || INVOICERS[invoicerKey] || INVOICERS.gyantrix;
            return {
              amount: parseFloat(inst.amount),
              dueDate: inst.dueDate,
              businessName: custom.businessName,
              businessAddress: custom.businessAddress,
              businessContact: custom.businessContact,
              businessEmail: custom.businessEmail,
              taxId: custom.taxId
            };
          })
        };

        formData.append('data', JSON.stringify(metadata));
        
        if (receiptFile) {
          formData.append('receipt', receiptFile);
        }

        await associateService.recordManualPayment(formData);

        // AUTO-COMPLETE: Complete the oldest pending EMI_COLLECTION task for this lead
        try {
          const tasksRes = await associateService.fetchLeadTasks(id);
          const allTasks = tasksRes?.data || tasksRes || [];

          // Find all open EMI collection tasks, sort by due date (oldest first)
          const pendingEmiTasks = allTasks
            .filter(t => t.taskType === 'EMI_COLLECTION' && t.status !== 'COMPLETED')
            .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

          if (pendingEmiTasks.length > 0) {
            await associateService.updateTaskStatus(pendingEmiTasks[0].id, 'COMPLETED');
            toast.success(`✅ EMI Collection Task auto-completed!`);
          }
        } catch (taskErr) {
          console.warn('Auto-complete task failed (non-critical):', taskErr);
        }
      } else {
        await leadsApi.updateStatus(id, selectedStatus, note, payload);
      }

      // 2. Automate Strategic Tasks based on EMI Schedule
      // LOGIC FIX: Only automate tasks if we are creating a NEW fee structure. 
      // If it exists, tasks are already managed by the backend or previous sessions.
      if (!feeStructureExists && paymentType === 'EMI' && installments.length > 0) {
        for (const inst of installments) {
          if (inst.dueDate && inst.amount) {
            try {
              await associateService.addLeadTask(id, {
                title: `EMI COLLECTION: ₹${inst.amount}`,
                taskType: 'EMI_COLLECTION',
                dueDate: inst.dueDate,
                description: `Automated collection task for ${lead?.name || 'Lead'}. Expected Amount: ₹${inst.amount}`
              });
            } catch (taskErr) {
              console.error("Installment Task Creation Failed:", taskErr);
            }
          }
        }
      } else if (followUpDate) {
        // Standard single follow-up task
        try {
          await associateService.addLeadTask(id, {
            title: `FOLLOW-UP: ${selectedStatus}`,
            taskType: 'FOLLOW_UP',
            dueDate: followUpDate,
            description: note || `Scheduled follow-up for ${lead?.name || 'Lead'}`
          });
        } catch (taskErr) {
          console.error("Follow-up Task Creation Failed:", taskErr);
        }
      }

      sessionStorage.setItem('pendingHardRefresh', 'true');
      toast.success("Protocol Updated & Tasks Scheduled");
      navigate(`/leads/${id}/details`, { state: { activeTab: 'FEE_STRUCTURE' }, replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "System Update Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // FORCE SCROLL: Targeting both standalone and Modal-trapped views
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';

    // NUCLEAR MODAL FIX: If we are inside a bootstrap modal, force it to scroll
    const style = document.createElement('style');
    style.innerHTML = `
      .modal { overflow-y: auto !important; }
      .modal-open { overflow: auto !important; }
      body.modal-open { overflow: auto !important; padding-right: 0 !important; }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);

  if (loading) {
    return (
      <div className={`min-vh-100 d-flex flex-column align-items-center justify-content-center ${isDarkMode ? 'bg-black' : 'bg-light'}`}>
        <RefreshCw size={48} className="text-primary animate-spin mb-4" />
        <h5 className="fw-black text-uppercase tracking-widest text-muted opacity-50">Synchronizing Command Center...</h5>
      </div>
    );
  }

  return (
    <div className={`p-2 p-md-3 custom-scroll ${isDarkMode ? 'bg-black text-white' : 'bg-light text-dark'}`} style={{ height: '100vh', overflowY: 'auto', display: 'block', position: 'relative' }}>
      <div className="mx-auto" style={{ maxWidth: '600px', paddingBottom: '150px' }}>
        <button 
          onClick={() => navigate(-1)}
          className="btn btn-link text-decoration-none text-muted fw-bold small mb-4 p-0 d-flex align-items-center gap-2 hover-primary transition-all"
        >
          <ArrowLeft size={14} /> BACK TO COMMAND CENTER
        </button>

        <div className={`premium-card border-0 shadow-lg rounded-4 animate-fade-in ${isDarkMode ? 'bg-surface' : 'bg-white'}`}>
          <div className="px-4 py-3 border-bottom border-secondary border-opacity-10 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              <div>
                <h5 className="mb-0 fw-bold text-main text-uppercase tracking-tight">Lead Status Update</h5>
                <small className="text-muted fw-semibold text-uppercase" style={{ fontSize: '10px' }}>LEAD: {lead?.name}</small>
              </div>
            </div>
          </div>

          <div className="p-3">
            <form onSubmit={handleSubmit}>
              <div className="d-flex flex-column gap-3">
                {searchParams.get('installmentId') ? (
                  <>
                    <div className={`p-4 rounded-4 border border-primary border-opacity-20 shadow-sm ${isDarkMode ? 'bg-surface' : 'bg-white'}`}>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <IndianRupee size={20} className="text-primary" />
                        <h5 className="mb-0 fw-black text-uppercase tracking-tight text-main">Installment Payment Verification</h5>
                      </div>
                      <div className="p-3 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-20 mb-3 d-flex justify-content-between align-items-center">
                        <span className="small fw-bold text-primary text-uppercase tracking-wider">Installment Commitment Amount</span>
                        <h3 className="mb-0 fw-black text-primary">₹{Number(searchParams.get('amount') || 0).toLocaleString()}</h3>
                      </div>

                      <div className="p-3 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-20 mb-4 d-flex justify-content-between align-items-center">
                        <span className="small fw-bold text-success text-uppercase tracking-wider">Actual Paid Amount (Deciphered / Entered)</span>
                        <div className="input-group" style={{ width: '220px' }}>
                          <span className="input-group-text bg-white border-success border-opacity-50 text-success fw-bold">₹</span>
                          <input 
                            type="number" 
                            className="form-control fw-black text-success border-success border-opacity-50 text-end fs-5" 
                            value={initialAmount} 
                            onChange={e => setInitialAmount(e.target.value)} 
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {parseFloat(initialAmount || 0) < parseFloat(searchParams.get('amount') || 0) && (
                        <div className="p-3 rounded-3 bg-warning bg-opacity-10 border border-warning border-opacity-20 mb-4 animate-fade-in">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="small fw-bold text-warning text-uppercase tracking-wider d-flex align-items-center gap-1" style={{ color: '#d97706' }}>
                              <AlertCircle size={16} /> Partial Payment Detected: Remainder Installment Schedule
                            </span>
                            <span className="badge bg-warning text-dark fw-bold">
                              Remainder: ₹{(parseFloat(searchParams.get('amount') || 0) - parseFloat(initialAmount || 0)).toLocaleString()}
                            </span>
                          </div>
                          <p className="small text-muted mb-2">Please select the due date for the remaining balance. A new installment and automated collection task will be generated for this date.</p>
                          <div className="row g-2 align-items-center">
                            <div className="col-md-6">
                              <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '10px' }}>Next Installment Due Date</label>
                              <input 
                                type="datetime-local" 
                                className="form-control rounded-3 fw-bold border-warning border-opacity-50" 
                                value={nextInstallmentDate} 
                                onChange={e => setNextInstallmentDate(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <h6 className="fw-black text-uppercase tracking-wider mb-4 d-flex align-items-center gap-2">
                        <Shield size={18} className="text-primary" /> MANUAL PAYMENT UPLOAD & DETAILS
                      </h6>
                      <PaymentOcrUpload 
                        onDataExtracted={handleOcrData} 
                        currentFile={receiptFile}
                        setCurrentFile={setReceiptFile}
                      />
                      <div className="row g-3 mt-3">
                        <div className="col-md-4">
                           <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>Payment Date</label>
                           <input 
                             type="datetime-local" 
                             className="form-control rounded-3 fw-bold" 
                             value={paymentDate} 
                             onChange={e => setPaymentDate(e.target.value)} 
                             style={{ minWidth: '160px' }}
                           />
                        </div>
                        <div className="col-md-4">
                           <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>Verified UTR/TXN ID</label>
                           <input type="text" className="form-control rounded-3 fw-bold" value={utr} onChange={e => setUtr(e.target.value.toUpperCase())} />
                        </div>
                        <div className="col-md-4">
                           <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>Payment Method</label>
                           <PortalSelect options={[{value: 'UPI', label: 'UPI'}, {value: 'BANK', label: 'Bank Transfer'}, {value: 'CASH', label: 'Cash'}]} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div>
                       <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>Interaction Notes</label>
                       <textarea className="form-control rounded-4 p-3" rows="3" value={note} onChange={e => setNote(e.target.value)} placeholder="Recording context..."></textarea>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting || !utr || utr.trim().length < 4} 
                      className={`w-100 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-glow border-0 transition-all ${isSubmitting || !utr || utr.trim().length < 4 ? 'bg-secondary opacity-50' : 'ui-btn-primary'}`}
                      style={{ minHeight: '56px' }}
                    >
                      {isSubmitting ? (
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <RefreshCw size={18} className="animate-spin" />
                          <span>SYNCHRONIZING PAYMENT...</span>
                        </div>
                      ) : (
                        `Commit Installment Payment`
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Header Row: Protocol & Strategic Scheduling */}
                    <div className="row g-3">
                      <div className={(() => {
                        const normalize = (s) => s?.toUpperCase().replace(/[-_ ]/g, '') || '';
                        const stage = pipelineStages.find(s => normalize(s.statusValue) === normalize(selectedStatus));
                        const isConverted = normalize(selectedStatus) === 'CONVERTED';
                        return (stage?.requireDate && !isConverted) ? "col-md-6" : "col-12";
                      })()}>
                        <div className={`h-100 p-3 rounded-4 border ${isDarkMode ? 'bg-surface bg-opacity-40 border-white border-opacity-5' : 'bg-light border-secondary border-opacity-10'}`}>
                           <label className="text-muted small fw-black text-uppercase tracking-widest mb-1 d-block" style={{ fontSize: '9px' }}>Protocol Status</label>
                           <PortalSelect 
                             options={[{value: '', label: '-- SELECT PROTOCOL --'}, ...(pipelineStages || []).map(s => ({ value: s.statusValue, label: s.label }))]}
                             value={selectedStatus || ''}
                             onChange={e => setSelectedStatus(e.target.value)}
                           />
                        </div>
                      </div>

                      {(() => {
                        const normalize = (s) => s?.toUpperCase().replace(/[-_ ]/g, '') || '';
                        const stage = pipelineStages.find(s => normalize(s.statusValue) === normalize(selectedStatus));
                        const isConverted = normalize(selectedStatus) === 'CONVERTED';
                        return stage?.requireDate && !isConverted;
                      })() && (
                        <div className="col-md-6 animate-fade-in">
                          <div className={`h-100 p-3 rounded-4 border ${isDarkMode ? 'bg-surface bg-opacity-40 border-white border-opacity-5' : 'bg-light border-primary border-opacity-10 shadow-sm'}`}>
                            <label className="form-label small fw-bold text-muted text-uppercase d-flex align-items-center gap-2 mb-1" style={{ fontSize: '10px' }}>
                              <Calendar size={14} className="text-primary" /> Action Schedule
                            </label>
                            <input 
                              type="datetime-local" 
                              className="form-control form-control-sm rounded-3 fw-bold mt-1" 
                              value={followUpDate} 
                              onChange={e => setFollowUpDate(e.target.value)} 
                              style={{ fontSize: '13px', minWidth: '150px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fee Structure / Summary */}
                    {['CONVERTED', 'PAID', 'EMI'].includes(selectedStatus?.toUpperCase()) && (
                      <div className={`p-3 rounded-4 border border-secondary border-opacity-10 shadow-sm ${isDarkMode ? 'bg-surface' : 'bg-white'}`}>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <IndianRupee size={16} className="text-primary" />
                            <h6 className="mb-0 fw-bold text-uppercase tracking-wider" style={{ fontSize: '12px' }}>
                              {feeStructureExists ? 'Financial Protocol Summary' : 'Student Fee Structure Form'}
                            </h6>
                          </div>
                        </div>

                        {feeStructureExists ? (
                          <div className="row g-2 mb-3">
                            <div className="col-4 text-center">
                              <div className={`p-2 rounded-3 border ${isDarkMode ? 'bg-black bg-opacity-20 border-white border-opacity-5' : 'bg-light border-secondary border-opacity-10'}`}>
                                <div className="text-muted mb-1" style={{ fontSize: '8px' }}>PACKAGE</div>
                                <div className="fw-black text-primary" style={{ fontSize: '11px' }}>₹{Number(totalAmount || 0).toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="col-4 text-center">
                              <div className={`p-2 rounded-3 border ${isDarkMode ? 'bg-black bg-opacity-20 border-white border-opacity-5' : 'bg-light border-secondary border-opacity-10'}`}>
                                <div className="text-muted mb-1" style={{ fontSize: '8px' }}>DISCOUNT</div>
                                <div className="fw-black text-success" style={{ fontSize: '11px' }}>₹{Number(discount || 0).toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="col-4 text-center">
                              <div className={`p-2 rounded-3 border ${isDarkMode ? 'bg-black bg-opacity-20 border-white border-opacity-5' : 'bg-light border-secondary border-opacity-10'}`}>
                                <div className="text-muted mb-1" style={{ fontSize: '8px' }}>PAID</div>
                                <div className="fw-black text-main" style={{ fontSize: '11px' }}>₹{Number(totalPaidSoFar || 0).toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className={`p-2 rounded-3 text-center fw-black text-uppercase border ${isDarkMode ? 'bg-black bg-opacity-30 border-white border-opacity-10' : 'bg-white border-secondary border-opacity-20'}`} style={{ fontSize: '10px' }}>
                                 Net Settlement: <span className="text-primary">₹{(parseFloat(discountedTotal) || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="row g-3 mb-4">
                            <div className="col-12">
                              <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '10px' }}>1. Select Program Protocol</label>
                              <PortalSelect 
                                searchable={true}
                                options={[{ value: "", label: "-- SELECT COURSE --" }, ...courses.map(c => ({ value: c.id.toString(), label: `${c.name.toUpperCase()} (₹${c.baseFee})` }))]}
                                value={selectedCourse?.id?.toString() || ''}
                                onChange={(e) => handleCourseChange(e.target.value)}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '10px' }}>2. Base Package</label>
                              <input 
                                type="number" 
                                className="form-control rounded-3 bg-light text-muted" 
                                value={totalAmount} 
                                readOnly
                                disabled
                                style={{ cursor: 'not-allowed', fontWeight: 'bold' }}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '10px' }}>3. Discount</label>
                              <input 
                                type="number" 
                                min="0" 
                                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault(); }}
                                onInput={(e) => { if (parseFloat(e.target.value) < 0) e.target.value = 0; }}
                                className="form-control rounded-3" 
                                value={discount} 
                                onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} 
                              />
                            </div>
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="form-label small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '10px' }}>
                            {feeStructureExists ? 'Current Installment Commitment' : '4. Commitment'}
                          </label>
                          <input 
                            type="number" 
                            min="0"
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault(); }}
                            onInput={(e) => { if (parseFloat(e.target.value) < 0) e.target.value = 0; }}
                            className="form-control rounded-3 fw-black text-primary border-primary border-opacity-25" 
                            value={initialAmount} 
                            onChange={e => setInitialAmount(Math.max(0, parseFloat(e.target.value) || 0))} 
                          />
                          {Number(initialAmount) > Number(discountedTotal) && (
                            <small className="text-danger fw-bold mt-2 d-block">Commitment cannot exceed total settlement amount.</small>
                          )}
                          {isCommitmentTooLow && (
                            <small className="text-danger fw-bold mt-2 d-block">
                              Commitment cannot be less than the minimum token amount (₹{minTokenRequired.toLocaleString()}) configured for this course.
                            </small>
                          )}
                        </div>

                        {!searchParams.get('installmentId') && (
                          <div className="row g-2 mb-4">
                            <div className="col-6">
                              <button type="button" onClick={() => { setPaymentType('FULL'); setInstallments([]); }} className={`btn w-100 py-3 fw-bold rounded-3 ${paymentType === 'FULL' ? 'btn-primary' : 'btn-outline-secondary opacity-50'}`}>FULL SETTLEMENT</button>
                            </div>
                            <div className="col-6">
                              <button type="button" onClick={() => setPaymentType('EMI')} className={`btn w-100 py-3 fw-bold rounded-3 ${paymentType === 'EMI' ? 'btn-primary' : 'btn-outline-secondary opacity-50'}`}>EMI INSTALLMENTS</button>
                            </div>
                          </div>
                        )}

                        {paymentType === 'EMI' && !searchParams.get('installmentId') && (
                          <div className={`p-3 rounded-4 border border-primary border-opacity-10 mb-4 ${isDarkMode ? 'bg-black bg-opacity-25' : 'bg-light bg-opacity-50'}`}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span className="small fw-bold text-muted">PLAN FUTURE DUES (MAX {selectedCourse?.maxInstallments || 4})</span>
                              <button type="button" onClick={addInstallment} className="btn btn-link btn-sm text-decoration-none">+ ADD DUE DATE</button>
                            </div>
                            {installments.map((inst, idx) => (
                              <div key={idx} className="p-3 rounded-3 mb-3 border border-secondary border-opacity-15 bg-black bg-opacity-10">
                                <div className="d-flex gap-2 align-items-center mb-0">
                                   <input type="number" className="form-control form-control-sm rounded-3" placeholder="Amount" value={inst.amount} onChange={e => handleInstallmentChange(idx, 'amount', e.target.value)} />
                                   <input type="datetime-local" className="form-control form-control-sm rounded-3" value={inst.dueDate} onChange={e => handleInstallmentChange(idx, 'dueDate', e.target.value)} style={{ minWidth: '160px' }} />
                                   <button type="button" onClick={() => removeInstallment(idx)} className="btn btn-sm text-danger"><X size={14} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={`p-3 rounded-4 text-center fw-black text-uppercase border mb-3 shadow-sm transition-all ${(isMatch || (feeStructureExists && sumOfParts <= (Number(discountedTotal) - Number(totalPaidSoFar)) + 1)) ? 'text-success border-success bg-success bg-opacity-10' : 'text-danger border-danger bg-danger bg-opacity-10'}`} style={{ fontSize: '11px', letterSpacing: '1px' }}>
                           {(isMatch || (feeStructureExists && sumOfParts <= (Number(discountedTotal) - Number(totalPaidSoFar)) + 1)) ? (
                             <div className="d-flex align-items-center justify-content-center gap-2">
                               <CheckCircle2 size={14} />
                               <span>ACCOUNTING VERIFIED: ₹{Number(sumOfParts).toLocaleString()}</span>
                             </div>
                           ) : (
                             <div className="d-flex align-items-center justify-content-center gap-2">
                               <AlertCircle size={14} />
                               <span>MISMATCH: Commitment must match Settlement (₹{Number(Math.abs(balanceRemaining)).toLocaleString()} Mismatched)</span>
                             </div>
                           )}
                        </div>

                        {/* Payment Orchestration - 3 Buttons */}
                        {['CONVERTED', 'PAID', 'EMI'].includes(selectedStatus?.toUpperCase()) && (
                          <div className="animate-fade-in mb-4">
                            <label className="text-muted small fw-black text-uppercase tracking-widest mb-3 d-block text-center" style={{ fontSize: '10px' }}>Finalize Payment Commitment</label>
                            <div className="row g-2">
                              <div className="col-4">
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setIsManualPayment(false);
                                    setShowQr(false);
                                    handleGeneratePaymentLink();
                                  }}
                                  className="btn btn-outline-primary w-100 py-3 rounded-4 d-flex flex-column align-items-center gap-2 transition-all hover-scale"
                                >
                                  <LinkIcon size={18} />
                                  <span className="fw-black" style={{ fontSize: '9px' }}>GENERATE LINK</span>
                                </button>
                              </div>
                              <div className="col-4">
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setIsManualPayment(false);
                                    setShowQr(!showQr);
                                  }}
                                  className={`btn ${showQr ? 'btn-primary' : 'btn-outline-primary'} w-100 py-3 rounded-4 d-flex flex-column align-items-center gap-2 transition-all hover-scale`}
                                >
                                  <QrCode size={18} />
                                  <span className="fw-black" style={{ fontSize: '9px' }}>GENERATE QR</span>
                                </button>
                              </div>
                              <div className="col-4">
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setIsManualPayment(!isManualPayment);
                                    setShowQr(false);
                                  }}
                                  className={`btn ${isManualPayment ? 'btn-primary' : 'btn-outline-primary'} w-100 py-3 rounded-4 d-flex flex-column align-items-center gap-2 transition-all hover-scale`}
                                >
                                  <ShieldCheck size={18} />
                                  <span className="fw-black" style={{ fontSize: '9px' }}>MANUAL / UTR</span>
                                </button>
                              </div>
                            </div>

                            {/* Copyable Payment Link Card */}
                            {generatedLink && (
                              <div className="mt-4 p-4 rounded-4 border border-success border-opacity-20 bg-success bg-opacity-5 animate-scale-in text-center">
                                <h6 className="fw-black text-success text-uppercase mb-2" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>SECURE GATEWAY PAYMENT LINK</h6>
                                <div className="d-flex align-items-center justify-content-between mb-3 bg-black bg-opacity-20 p-3 rounded-3 border border-secondary border-opacity-10">
                                  <span className="text-truncate small text-muted text-start pe-2" style={{ maxWidth: '80%' }}>{generatedLink}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      copyToClipboard(generatedLink);
                                    }}
                                    className="btn btn-sm btn-link p-0 text-success text-decoration-none d-flex align-items-center gap-1 fw-bold"
                                  >
                                    <Copy size={14} />
                                    <span>COPY</span>
                                  </button>
                                </div>
                                <div className="d-flex gap-2">
                                  <a 
                                    href={generatedLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-success flex-fill py-2 rounded-3 fw-bold small d-flex align-items-center justify-content-center gap-2"
                                  >
                                    <ExternalLink size={14} />
                                    <span>OPEN SECURE LINK</span>
                                  </a>
                                  <a 
                                    href={`https://api.whatsapp.com/send?phone=${lead?.mobile ? lead.mobile.replace(/[^0-9]/g, '') : ''}&text=${encodeURIComponent(`Hello ${lead?.name || 'Student'},\n\nPlease complete your enrollment payment using this secure link: ${generatedLink}`)}`}
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-outline-success flex-fill py-2 rounded-3 fw-bold small d-flex align-items-center justify-content-center gap-2"
                                  >
                                    <MessageSquare size={14} />
                                    <span>SHARE ON WHATSAPP</span>
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Dynamic QR Display */}
                            {showQr && (
                              <div className={`mt-4 p-4 rounded-4 border border-primary border-opacity-10 text-center animate-scale-in ${isDarkMode ? 'bg-black bg-opacity-25' : 'bg-white'}`}>
                                {isCommitmentTooLow ? (
                                  <div className="text-danger fw-bold py-3">
                                    <AlertCircle size={32} className="mx-auto mb-2 d-block" />
                                    <span>Commitment too low. Enforce minimum token amount (₹{minTokenRequired.toLocaleString()}) to generate QR.</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="d-flex justify-content-center mb-3">
                                      <QRCodeCanvas 
                                        value={`upi://pay?pa=gyantrix@upi&pn=Gyantrix&am=${initialAmount}&cu=INR`} 
                                        size={180}
                                        level="H"
                                        includeMargin={true}
                                      />
                                    </div>
                                    <h6 className="fw-black text-primary text-uppercase mb-1" style={{ fontSize: '12px' }}>Scan to Pay ₹{Number(initialAmount).toLocaleString()}</h6>
                                    <div className="d-flex align-items-center justify-content-center gap-1 text-muted extra-small mb-0 fw-bold">
                                      <span>UPI ID:</span>
                                      <span className="text-primary">gyantrix@upi</span>
                                    </div>
                                    <p className="text-muted small mb-0 mt-1 opacity-50" style={{ fontSize: '8px' }}>Commitment Protocol: {lead?.name}</p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manual Payment Section */}
                    {isManualPayment && (
                      <div className={`p-4 rounded-4 border border-secondary border-opacity-10 shadow-sm ${isDarkMode ? 'bg-surface' : 'bg-white'}`}>
                        <h6 className="fw-black text-uppercase tracking-wider mb-4 d-flex align-items-center gap-2">
                          <Shield size={18} className="text-primary" /> MANUAL PAYMENT VERIFICATION
                        </h6>
                        <PaymentOcrUpload 
                          onDataExtracted={handleOcrData} 
                          currentFile={receiptFile}
                          setCurrentFile={setReceiptFile}
                        />
                        <div className="row g-3 mt-3">
                          <div className="col-md-4">
                             <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>Payment Date</label>
                             <input 
                               type="datetime-local" 
                               className="form-control rounded-3 fw-bold" 
                               value={paymentDate} 
                               onChange={e => setPaymentDate(e.target.value)} 
                               style={{ minWidth: '160px' }}
                             />
                          </div>
                          <div className="col-md-4">
                             <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>Verified UTR/TXN ID</label>
                             <input type="text" className="form-control rounded-3 fw-bold" value={utr} onChange={e => setUtr(e.target.value.toUpperCase())} />
                          </div>
                          <div className="col-md-4">
                             <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>Payment Method</label>
                             <PortalSelect options={[{value: 'UPI', label: 'UPI'}, {value: 'BANK', label: 'Bank Transfer'}, {value: 'CASH', label: 'Cash'}]} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    )}



                    {/* Action Notes */}
                    <div>
                       <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>Interaction Notes</label>
                       <textarea className="form-control rounded-4 p-3" rows="3" value={note} onChange={e => setNote(e.target.value)} placeholder="Recording context..."></textarea>
                    </div>

                    {generatedLink ? (
                      <button 
                        type="button" 
                        onClick={() => {
                          sessionStorage.setItem('openLeadHistoryId', lead?.id || id);
                          navigate(`/leads/${id}/details`, { state: { activeTab: 'FEE_STRUCTURE' } });
                        }}
                        className="w-100 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-glow border-0 bg-success text-white transition-all d-flex align-items-center justify-content-center gap-2"
                        style={{ minHeight: '56px' }}
                      >
                        <CheckCircle2 size={20} />
                        <span>LINK SHARED - CLOSE & VIEW LEAD AUDIT HISTORY</span>
                      </button>
                    ) : (
                      <button 
                        type="submit" 
                        disabled={isSubmitting || (['CONVERTED', 'PAID', 'EMI'].includes(selectedStatus?.toUpperCase()) && !isMatch) || isCommitmentTooLow} 
                        className={`w-100 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-glow border-0 transition-all ${isSubmitting ? 'bg-secondary opacity-50' : ((['CONVERTED', 'PAID', 'EMI'].includes(selectedStatus?.toUpperCase()) && (!isMatch || isCommitmentTooLow)) ? 'bg-danger bg-opacity-25 text-muted' : 'ui-btn-primary')}`}
                        style={{ minHeight: '56px' }}
                      >
                        {isSubmitting ? (
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <RefreshCw size={18} className="animate-spin" />
                            <span>SYNCHRONIZING PROTOCOL...</span>
                          </div>
                        ) : (
                          `Commit ${selectedStatus || 'Status'} Update`
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadStatusUpdatePage;
