import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ShieldCheck, Calendar, MessageSquare, ArrowLeft, Activity, Info, Zap, AlertCircle, IndianRupee, Plus, X, Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import associateService from '../services/associateService';
import adminService from '../services/adminService';
import DashboardLayout from '../components/layout/DashboardLayout';

const LeadStatusUpdatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('newStatus');
  
  const { isDarkMode } = useTheme();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineStages, setPipelineStages] = useState([]);
  
  // Default follow-up: Tomorrow 10 AM (Local Time)
  const getDefaultFollowUp = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    // Format for datetime-local: YYYY-MM-DDTHH:mm (MUST BE LOCAL TIME)
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const hours = String(tomorrow.getHours()).padStart(2, '0');
    const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [selectedStatus, setSelectedStatus] = useState(initialStatus || '');
  const [followUpDate, setFollowUpDate] = useState(getDefaultFollowUp());
  const [paymentType, setPaymentType] = useState('FULL');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('3');
  const [nextInstallmentDate, setNextInstallmentDate] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showStatusList, setShowStatusList] = useState(!initialStatus);
  const [initialAmount, setInitialAmount] = useState('');
  const [installments, setInstallments] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const addInstallment = () => {
    setInstallments([...installments, { amount: '', dueDate: '' }]);
    setPaymentType('EMI');
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

        const [totalPaidSoFar, setTotalPaidSoFar] = useState(0);

        useEffect(() => {
          const init = async () => {
            try {
              const [leadRes, stagesRes, feeRes] = await Promise.all([
                associateService.fetchLeadById(id),
                adminService.fetchPipelineStages(),
                associateService.getFeeStructure(id)
              ]);
              setLead(leadRes.data);
              const activeStages = stagesRes.data.filter(s => s.active);
              setPipelineStages(activeStages);
              
              if (feeRes.data && feeRes.data.totalAmount > 0) {
                setTotalAmount(feeRes.data.totalAmount);
                setTotalPaidSoFar(feeRes.data.paidAmount || 0);
                setInitialAmount(''); // Reset for new update session
                // We keep paidAmount state as empty so they don't double-record the same payment
                if (feeRes.data.nextDueDate) {
                  setNextInstallmentDate(feeRes.data.nextDueDate.split('T')[0]);
                  setPaymentType('EMI');
                }
              }
      
              if (!initialStatus && leadRes.data) {
                setSelectedStatus(leadRes.data.status);
              }
            } catch (err) {
              toast.error("Failed to load environment for status update");
              navigate(-1);
            } finally {
              setLoading(false);
            }
          };
          init();
        }, [id, initialStatus, navigate]);
  
  // Automated Sync: If EMI is selected, sync the main follow-up date with the EMI date
  useEffect(() => {
    if (selectedStatus === 'CONVERTED' && paymentType === 'EMI' && nextInstallmentDate) {
      // Convert YYYY-MM-DD to YYYY-MM-DDTHH:mm for datetime-local
      setFollowUpDate(`${nextInstallmentDate}T10:00`);
    }
  }, [nextInstallmentDate, paymentType, selectedStatus]);

  // Behavior Configuration Discovery
  const currentStatusConfig = useMemo(() => {
    return pipelineStages.find(s => s.statusValue === selectedStatus) || {};
  }, [pipelineStages, selectedStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return toast.warning("Please select a status");
    
    if (currentStatusConfig.requireNote && (!note || note.trim().length < 5)) {
        return toast.error(`Note is mandatory for '${currentStatusConfig.label}' status. Minimum 5 characters.`);
    }
    if (currentStatusConfig.requireDate && !followUpDate) {
        return toast.error(`A follow-up date is mandatory for '${currentStatusConfig.label}' status.`);
    }
    if (selectedStatus === 'CONVERTED' && paymentType === 'EMI' && !isMatch) {
        return toast.error(`EMI Plan Imbalance: ₹${balanceRemaining.toFixed(2)} remaining. Please adjust installments to match the course total.`);
    }

    setIsSubmitting(true);
    try {
      // 1. Update Lead Status
      await associateService.updateStatus(id, selectedStatus, note, { 
        paymentType, 
        totalAmount: totalAmount || 0, 
        paidAmount: paymentType === 'EMI' ? initialAmount : totalAmount,
        paymentMethod,
        installmentCount: installments.length,
        installments: paymentType === 'EMI' ? installments : [],
        nextInstallmentDate: installments.length > 0 ? installments[0].dueDate : null
      });

      // 2. Create Tasks (Sequential for stability)
      if (selectedStatus === 'CONVERTED' && paymentType === 'EMI' && installments.length > 0) {
        for (const [idx, inst] of installments.entries()) {
          await associateService.addLeadTask(id, {
            title: `EMI Collection [Inst ${idx + 1}]: ₹${inst.amount}`,
            taskType: 'EMI_COLLECTION',
            dueDate: inst.dueDate + 'T10:00:00',
            description: `Scheduled EMI collection for installment #${idx + 1}. Amount: ₹${inst.amount}. Method: ${paymentMethod}`
          });
        }
      } else if (followUpDate && selectedStatus !== 'LOST' && selectedStatus !== 'CONVERTED') {
        // Standard single task creation for non-EMI or other statuses
        await associateService.addLeadTask(id, {
          title: `Scheduled Follow-up: ${currentStatusConfig.label || selectedStatus}`,
          taskType: 'FOLLOW_UP',
          dueDate: followUpDate + ':00',
          description: note || `Automated follow-up for lead ${lead?.name || 'N/A'}`
        });
      }

      toast.success(paymentType === 'EMI' ? 'Fee Structure & Status Saved Successfully' : 'System Status Propagated Successfully');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-vh-100 bg-dark d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary"></div>
    </div>
  );

  return (
    <div className={`${isDarkMode ? 'bg-dark' : 'bg-light'} py-4 w-100`} style={{ minHeight: '100vh', display: 'block' }}>
      <div className="container py-2" style={{ maxWidth: '800px', display: 'block' }}>
        <button 
          onClick={() => navigate(-1)}
          className="btn btn-link text-decoration-none text-muted fw-bold small p-0 mb-4 d-flex align-items-center gap-2"
        >
          <ArrowLeft size={16} /> BACK TO COMMAND CENTER
        </button>

        <div className={`premium-card border-0 shadow-lg rounded-4 ${isDarkMode ? 'bg-surface' : 'bg-white'}`} style={{ overflow: 'visible', height: 'auto', display: 'block' }}>
          <div className="p-3 bg-primary bg-opacity-10 border-bottom border-white border-opacity-5 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 bg-primary text-white rounded-circle shadow-glow">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="mb-1 fw-black text-main text-uppercase tracking-tighter">Status Transmission Terminal</h4>
                <div className="d-flex align-items-center gap-2">
                   <div className="p-1 bg-success rounded-circle animate-pulse" style={{width: '6px', height: '6px'}}></div>
                   <small className="text-muted fw-bold opacity-50 tracking-widest text-uppercase" style={{fontSize: '9px'}}>LEAD NODE: {lead?.name}</small>
                </div>
              </div>
            </div>
            
            {/* Behavior Badge Info */}
            <div className="d-flex gap-2">
                {currentStatusConfig.requireNote && (
                    <span className="ui-badge bg-warning bg-opacity-10 text-warning small border-warning border-opacity-10 py-1 px-3 fw-black" style={{fontSize: '8px'}}>NOTE MANDATORY</span>
                )}
                {currentStatusConfig.requireDate && (
                    <span className="ui-badge bg-info bg-opacity-10 text-info small border-info border-opacity-10 py-1 px-3 fw-black" style={{fontSize: '8px'}}>DATE MANDATORY</span>
                )}
            </div>
          </div>

          <div className="p-4">
            <form onSubmit={handleSubmit}>
              <div className="row g-5 justify-content-center">
                {showStatusList && (
                  <div className="col-12 col-md-5">
                    <div className="mb-5">
                      <label className="form-label small fw-black text-uppercase text-muted tracking-widest mb-2 d-flex align-items-center gap-2" style={{ fontSize: '10px' }}>
                        <Activity size={12} className="text-primary" /> TARGET PIPELINE STAGE
                      </label>
                      <div className="d-flex flex-column gap-2 overflow-auto custom-scroll" style={{ maxHeight: '300px' }}>
                        {pipelineStages.map(stage => (
                          <div
                            key={stage.id}
                            onClick={() => {
                              setSelectedStatus(stage.statusValue);
                              setShowStatusList(false); // Collapse after selection for simplicity
                            }}
                            className={`p-3 rounded-4 border cursor-pointer transition-all d-flex align-items-center justify-content-between ${selectedStatus === stage.statusValue
                                ? `bg-${stage.color || 'primary'} bg-opacity-10 border-${stage.color || 'primary'} shadow-glow`
                                : 'bg-white bg-opacity-5 border-white border-opacity-5 opacity-50 hover-opacity-100'
                              }`}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div className={`p-2 rounded-3 bg-${stage.color || 'primary'} bg-opacity-20 text-${stage.color || 'primary'}`}>
                                <Zap size={14} />
                              </div>
                              <span className={`fw-black small text-uppercase tracking-wider ${selectedStatus === stage.statusValue ? 'text-main' : 'text-muted'}`}>
                                {stage.label}
                              </span>
                            </div>
                          </div>
                        ))}

                        <div 
                          onClick={() => {
                            setSelectedStatus(lead?.status);
                            setShowStatusList(false);
                          }}
                          className={`p-3 rounded-4 border cursor-pointer transition-all d-flex align-items-center justify-content-between mt-3 ${
                            selectedStatus === lead?.status && !pipelineStages.find(s => s.statusValue === selectedStatus)
                            ? 'bg-secondary bg-opacity-10 border-secondary shadow-sm' 
                            : 'bg-white bg-opacity-5 border-white border-opacity-5 opacity-50 hover-opacity-100'
                          }`}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <div className="p-2 rounded-3 bg-secondary bg-opacity-20 text-secondary">
                              <Info size={14} />
                            </div>
                            <span className={`fw-black small text-uppercase tracking-wider ${selectedStatus === lead?.status ? 'text-main' : 'text-muted'}`}>
                              DON'T ASK / NO CHANGE
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-link text-primary small fw-bold mt-2 p-0 text-decoration-none"
                        onClick={() => setShowStatusList(false)}
                      >
                        Hide Stages
                      </button>
                    </div>
                  </div>
                )}

                <div className={`col-12 ${showStatusList ? 'col-md-7' : 'col-md-8'}`}>
                  {!showStatusList && (
                    <div className="mb-4 p-3 rounded-4 bg-primary bg-opacity-5 border border-primary border-opacity-10 d-flex align-items-center justify-content-between">
                       <div className="d-flex align-items-center gap-3">
                          <div className={`p-2 rounded-circle bg-${currentStatusConfig.color || 'primary'} text-white shadow-sm`}>
                             <Zap size={16} />
                          </div>
                          <div>
                             <p className="mb-0 text-muted extra-small fw-black text-uppercase tracking-widest" style={{fontSize: '8px'}}>Selected Outcome</p>
                             <h6 className="mb-0 fw-black text-main">{currentStatusConfig.label || selectedStatus}</h6>
                          </div>
                       </div>
                       <button type="button" className="btn btn-sm btn-link text-primary fw-black text-uppercase" style={{fontSize: '9px'}} onClick={() => setShowStatusList(true)}>Change</button>
                    </div>
                  )}

                  {/* Only show scheduling if NOT Lost and NOT Converted */}
                  {selectedStatus !== 'LOST' && selectedStatus !== 'CONVERTED' && (
                    <div className="mb-4">
                      <label className="form-label small fw-black text-uppercase tracking-widest mb-2 d-flex align-items-center justify-content-between" style={{ fontSize: '10px' }}>
                        <span className="d-flex align-items-center gap-2"><Calendar size={12} className="text-primary" /> SCHEDULE NEXT PROTOCOL</span>
                        {currentStatusConfig.requireDate && <small className="text-info fw-black" style={{ fontSize: '8px' }}>REQUIRED</small>}
                      </label>
                      <input
                        type="datetime-local"
                        required={currentStatusConfig.requireDate}
                        className={`form-control border-0 rounded-4 p-3 shadow-sm ${isDarkMode ? 'bg-dark bg-opacity-50 text-white font-monospace' : 'bg-white text-dark'} ${currentStatusConfig.requireDate && !followUpDate ? 'border-start-info' : ''}`}
                        style={{ fontSize: '14px', minHeight: '55px' }}
                        value={followUpDate}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Payment Protocol for Converted Leads */}
                  {selectedStatus === 'CONVERTED' && (
                    <div className="mb-3 animate-fade-in">
                      <label className="form-label small fw-black text-uppercase tracking-widest mb-2 d-flex align-items-center gap-2" style={{ fontSize: '10px' }}>
                        <Zap size={12} className="text-success" /> PAYMENT PROTOCOL
                      </label>
                      <div className="d-flex gap-2">
                        <div 
                          onClick={() => {
                            setPaymentType('FULL');
                            setInitialAmount(totalAmount);
                            setInstallments([]);
                          }}
                          className={`flex-grow-1 p-2 rounded-4 border cursor-pointer transition-all text-center ${paymentType === 'FULL' ? 'bg-success bg-opacity-10 border-success shadow-glow' : 'bg-light border-transparent opacity-50'}`}
                        >
                          <span className="fw-black small text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Full Settlement</span>
                        </div>
                        <div 
                          onClick={() => setPaymentType('EMI')}
                          className={`flex-grow-1 p-2 rounded-4 border cursor-pointer transition-all text-center ${paymentType === 'EMI' ? 'bg-warning bg-opacity-10 border-warning shadow-glow' : 'bg-light border-transparent opacity-50'}`}
                        >
                          <span className="fw-black small text-uppercase tracking-wider" style={{ fontSize: '10px' }}>EMI Installments</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStatus === 'CONVERTED' && (
                    <div className="animate-fade-in mb-4">
                      <div className={`p-4 rounded-4 border ${isDarkMode ? 'border-secondary border-opacity-20 bg-secondary bg-opacity-10' : 'border-light bg-white shadow-sm'} mb-3`}>
                        <div className="d-flex align-items-center gap-2 mb-4">
                          <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle">
                            <IndianRupee size={16} />
                          </div>
                          <h6 className={`fw-black mb-0 text-uppercase tracking-widest small ${isDarkMode ? 'text-primary' : 'text-dark'}`}>
                            {paymentType === 'EMI' ? 'EMI Schedule Management' : 'Full Payment Authentication'}
                          </h6>
                        </div>

                        <div className="row g-3">
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">Course Package Total</label>
                            <div className="input-group">
                              <span className={`input-group-text border-0 ${isDarkMode ? 'bg-dark text-muted' : 'bg-light text-muted'}`}>₹</span>
                              <input
                                type="number"
                                className={`form-control border-0 p-2 fw-black ${isDarkMode ? 'bg-dark bg-opacity-50 text-white' : 'bg-light text-dark'}`}
                                placeholder="0.00"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">
                              {paymentType === 'EMI' ? 'Initial Commitment amount' : 'Actual Paid Amount'}
                            </label>
                            <div className="input-group">
                              <span className={`input-group-text border-0 ${isDarkMode ? 'bg-dark text-muted' : 'bg-light text-muted'}`}>₹</span>
                              <input
                                type="number"
                                className={`form-control border-0 p-2 fw-black ${isDarkMode ? 'bg-dark bg-opacity-50 text-white' : 'bg-light text-dark'}`}
                                placeholder="0.00"
                                value={initialAmount}
                                onChange={(e) => setInitialAmount(e.target.value)}
                              />
                            </div>
                            {totalPaidSoFar > 0 && (
                              <div className="mt-1">
                                <small className="text-success fw-bold text-uppercase tracking-widest" style={{ fontSize: '8px' }}>
                                  Total Paid So Far: ₹{totalPaidSoFar.toLocaleString()}
                                </small>
                              </div>
                            )}
                          </div>

                          <div className="col-12">
                             <label className="form-label small fw-bold text-uppercase text-muted mb-2 tracking-wider">Settlement Protocol</label>
                             <select
                               className={`form-select border-0 p-2 fw-bold ${isDarkMode ? 'bg-dark bg-opacity-50 text-white' : 'bg-light text-dark'}`}
                               value={paymentMethod}
                               onChange={(e) => setPaymentMethod(e.target.value)}
                             >
                               <option value="UPI">UPI TRANSFERS</option>
                               <option value="CASH">CASH SETTLEMENT</option>
                               <option value="BANK_TRANSFER">IMPS / NEFT / RTGS</option>
                               <option value="CARD">POS / ONLINE CARD</option>
                             </select>
                          </div>

                          {paymentType === 'EMI' && (
                            <div className="col-12 mt-4 pt-3 border-top border-white border-opacity-5">
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
                                        className={`form-control form-control-sm border-0 p-2 fw-bold ${isDarkMode ? 'bg-dark text-white' : 'bg-light text-dark'}`}
                                        placeholder="Amount"
                                        value={inst.amount}
                                        onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                                      />
                                    </div>
                                    <div className="col">
                                      <input
                                        type="date"
                                        className={`form-control form-control-sm border-0 p-2 fw-bold ${isDarkMode ? 'bg-dark text-white' : 'bg-light text-dark'}`}
                                        value={inst.dueDate}
                                        onFocus={(e) => e.target.showPicker && e.target.showPicker()}
                                        onChange={(e) => handleInstallmentChange(idx, 'dueDate', e.target.value)}
                                      />
                                    </div>
                                    <div className="col-auto">
                                      <button
                                        type="button"
                                        className="btn btn-sm text-danger p-1"
                                        onClick={() => removeInstallment(idx)}
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <div className={`p-3 rounded-4 text-center small fw-bold ${isMatch ? 'text-success bg-success bg-opacity-10 border border-success border-opacity-10' : 'text-danger bg-danger bg-opacity-10 border border-danger border-opacity-10'}`}>
                                 {isMatch ? 'Plan Balanced: Complete' : `Imbalance: ₹${balanceRemaining.toFixed(2)} remaining`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    {!showNote ? (
                      <button
                        type="button"
                        className="btn btn-outline-primary rounded-pill px-4 py-2 fw-black text-uppercase tracking-widest d-flex align-items-center gap-2"
                        style={{ fontSize: '10px' }}
                        onClick={() => setShowNote(true)}
                      >
                        <MessageSquare size={14} /> Add Note
                      </button>
                    ) : (
                      <>
                        <label className={`form-label small fw-black text-uppercase tracking-widest mb-3 d-flex align-items-center justify-content-between`}>
                          <span className="d-flex align-items-center gap-2"><MessageSquare size={14} className="text-primary" /> INTERACTION CONTEXT</span>
                          {currentStatusConfig.requireNote && <small className="text-warning fw-black" style={{ fontSize: '8px' }}>REQUIRED FIELD</small>}
                        </label>
                        <textarea
                          className={`form-control border-0 rounded-4 p-4 ${isDarkMode ? 'bg-dark bg-opacity-50 text-white' : 'bg-light'} shadow-inner ${currentStatusConfig.requireNote && !note ? 'border-start-warning' : ''}`}
                          rows="4"
                          autoFocus={showNote}
                          placeholder="Input significant findings or requirements identified during node interaction..."
                          value={note}
                          required={currentStatusConfig.requireNote}
                          onChange={(e) => setNote(e.target.value)}
                          style={{ resize: 'none' }}
                        ></textarea>
                      </>
                    )}
                  </div>

                  {currentStatusConfig.createTask && (
                    <div className="p-3 bg-success bg-opacity-10 border border-success border-opacity-10 rounded-4 d-flex align-items-center gap-3 mt-3">
                      <Shield size={18} className="text-success" />
                      <div>
                        <p className="mb-0 fw-black text-success small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Automated Protocol Active</p>
                        <p className="mb-0 text-muted extra-small opacity-75 fw-bold" style={{ fontSize: '8px' }}>A system follow-up task will be auto-generated for tomorrow.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-top border-white border-opacity-5 d-flex justify-content-end gap-3 align-items-center mb-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary px-4 py-2 rounded-pill fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center gap-2"
                  style={{ fontSize: '12px' }}
                >
                  {isSubmitting ? <span className="spinner-border spinner-border-sm"></span> : <ShieldCheck size={16} />}
                  {isSubmitting ? 'PROPAGATING...' : (paymentType === 'EMI' ? 'FINALIZE & SAVE FEE STRUCTURE' : 'AUTHORIZE UPDATE')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <style>{`
          .border-start-warning { border-left: 4px solid var(--warning) !important; }
          .border-start-info { border-left: 4px solid var(--info) !important; }
          .extra-small { font-size: 0.65rem; }
      `}</style>
    </div>
  );
};

export default LeadStatusUpdatePage;
