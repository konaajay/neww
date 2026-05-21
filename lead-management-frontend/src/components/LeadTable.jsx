import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  History, Edit, FileText, Wallet, Zap, ChevronLeft, ChevronRight, 
  Search, Filter, ArrowUpRight, Clock, CheckCircle2, AlertCircle,
  MoreVertical, ChevronDown, IndianRupee, MessageSquare, XCircle, Eye, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LeadEditModal from './LeadEditModal';
import CallOutcomeModal from './CallOutcomeModal';
import LeadHistoryModal from './LeadHistoryModal';
import { useTheme } from '../context/ThemeContext';
import ReactDOM from 'react-dom';
import leadsApi from '../features/leads/api/leadsApi';
import PortalSelect from './PortalSelect';
import { toast } from 'react-toastify';

const StatusDropdown = ({ lead, pipelineStages, onChange, getStatusColorClass }) => {
  const { isDarkMode } = useTheme();

  const currentStage = pipelineStages.find(s => s.statusValue === (lead.status || 'OPEN')) || pipelineStages[0];
  const label = (lead.status === 'CONVERTED' || lead.paymentStatus) 
    ? (lead.paymentStatus?.replace('_', ' ') || 'CONVERTED') 
    : currentStage.label;

  const displayStatus = lead.paymentStatus || lead.status;

  return (
    <PortalSelect 
      options={pipelineStages
        .filter(s => !s.hideInDropdown)
        .map(s => ({
        value: s.statusValue,
        label: s.label.toUpperCase()
      }))}
      value={lead.paymentStatus ? null : lead.status}
      onChange={(e) => onChange(lead, e.target.value)}
      placeholder={label.toUpperCase()}
      style={{ width: '130px' }}
      triggerClassName={`fw-black text-uppercase ${getStatusColorClass(displayStatus)}`}
    />
  );
};

const LeadTable = ({ 
  leads = [], 
  onUpdateLead, 
  onRecordCallOutcome, 
  onUpdateStatus, 
  onEdit,
  onViewInvoice,
  handleAssignLead,
  role = 'ADMIN',
  loading = false,
  teamLeaders = [],
  selectedLeadIds = [],
  toggleSelection,
  bulkAssignTlId,
  setBulkAssignTlId,
  handleBulkAssign,
  pipelineStages: propsPipelineStages = [],
  currentUserId,
  loadLeads,
  onSendPaymentLink
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEditLead, setSelectedEditLead] = useState(null);
  const [selectedOutcomeLead, setSelectedOutcomeLead] = useState(null);
  const [selectedHistoryLead, setSelectedHistoryLead] = useState(null);
  const [errorPopup, setErrorPopup] = useState(null);
  const [rejectModalData, setRejectModalData] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const uniqueTeamLeaders = useMemo(() => {
    const map = new Map();
    (teamLeaders || []).forEach(tl => {
      if (tl && tl.id) map.set(tl.id, tl);
    });
    return Array.from(map.values());
  }, [teamLeaders]);

  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [leads.length, itemsPerPage]);

  useEffect(() => {
    const openHistoryId = sessionStorage.getItem('openLeadHistoryId');
    if (openHistoryId && leads.length > 0) {
      const targetLead = leads.find(l => l.id.toString() === openHistoryId.toString());
      if (targetLead) {
        setSelectedHistoryLead(targetLead);
        sessionStorage.removeItem('openLeadHistoryId');
      }
    }
  }, [leads]);

  useEffect(() => {
    const openOutcomeId = sessionStorage.getItem('openLeadOutcomeId');
    if (openOutcomeId && leads.length > 0) {
      const targetLead = leads.find(l => l.id.toString() === openOutcomeId.toString());
      if (targetLead) {
        setSelectedOutcomeLead(targetLead);
        sessionStorage.removeItem('openLeadOutcomeId');
      }
    }
  }, [leads]);

  useEffect(() => {
    const handleRefresh = () => {
      if (typeof loadLeads === 'function') {
        loadLeads();
      }
    };
    window.addEventListener('paymentStatusUpdated', handleRefresh);
    window.addEventListener('openLeadOutcome', handleRefresh);
    return () => {
      window.removeEventListener('paymentStatusUpdated', handleRefresh);
      window.removeEventListener('openLeadOutcome', handleRefresh);
    };
  }, [loadLeads]);

  useEffect(() => {
    const handleOpenOutcome = (e) => {
      const leadId = e.detail?.leadId;
      if (leadId && leads.length > 0) {
        const targetLead = leads.find(l => l.id.toString() === leadId.toString());
        if (targetLead) {
          setSelectedOutcomeLead(targetLead);
          sessionStorage.removeItem('openLeadOutcomeId');
        }
      }
    };

    window.addEventListener('openLeadOutcome', handleOpenOutcome);
    return () => window.removeEventListener('openLeadOutcome', handleOpenOutcome);
  }, [leads]);

  const pipelineStages = (propsPipelineStages && propsPipelineStages.length > 0) ? propsPipelineStages : [
    { label: 'Open', statusValue: 'OPEN', color: 'primary', isRoot: true },
    { label: 'Switch Off', statusValue: 'SWITCH_OFF', color: 'warning' },
    { label: 'Out of Coverage', statusValue: 'OUT_OF_COVERAGE', color: 'warning' },
    { label: 'Wrong Number', statusValue: 'WRONG_NUMBER', color: 'warning' },
    { label: 'Not Responding', statusValue: 'NOT_RESPONDING', color: 'warning' },
    { label: 'Follow-up', statusValue: 'FOLLOW_UP', color: 'warning' },
    { label: 'Follow-up 1', statusValue: 'FOLLOW_UP_1', color: 'warning' },
    { label: 'Interested', statusValue: 'INTERESTED', color: 'primary' },
    { label: 'Converted', statusValue: 'CONVERTED', color: 'success' },
    { label: 'Lost', statusValue: 'LOST', color: 'danger' },
  ];

  const getStatusColorClass = (status) => {
    const s = status?.toUpperCase() || '';
    if (s.startsWith('REJECTED')) return 'bg-danger text-white px-3 py-1 rounded-pill shadow-danger';
    if (s.includes('PAID_INSTALLMENT') || s === 'FULL_PAID' || s === 'CONVERTED' || s === 'PAID' || s === 'SUCCESS') return 'bg-success text-white px-3 py-1 rounded-pill shadow-success';
    
    switch(s) {
      case 'OPEN': return 'text-primary';
      case 'CONTACTED': return 'text-info';
      case 'FOLLOW_UP': return 'text-warning';
      case 'INTERESTED': return 'text-primary';
      case 'LOST': return 'text-danger';
      case 'EMI': return 'text-info';
      case 'DNP':
      case 'SWITCH_OFF':
      case 'SWITCHED_OFF':
      case 'OUT_OF_COVERAGE':
      case 'OUT_OF_COVERAGE_AREA':
      case 'WRONG_NUMBER':
      case 'NOT_RESPONDING':
        return 'text-warning fw-bold';
      case 'PRE_PAYMENT':
      case 'PRE-PAYMENT':
        return 'text-primary fw-black';
      case 'PENDING_APPROVAL': return 'text-warning blink-slow';
      default: 
        if (s.includes('PENDING')) return 'text-warning blink-slow fw-black';
        if (s.startsWith('POST_PAYMENT')) return 'text-info fw-black';
        return 'text-muted';
    }
  };

  const handleStatusChange = (lead, newStatus) => {
    // SECURITY/WORKFLOW PROTOCOL: Use dedicated status update page 
    // to handle complex requirements like task scheduling and payment maps.
    navigate(`/leads/${lead.id}/status-update?newStatus=${newStatus}`);
  };

  const handleAssignLeadInternal = async (leadId, newUserId) => {
    try {
      const targetId = newUserId ? parseInt(newUserId) : 0;
      if (typeof handleAssignLead === 'function') {
        await handleAssignLead(leadId, targetId);
      } else if (onUpdateLead) {
        await onUpdateLead(leadId, { assignedToId: targetId || null });
      }
    } catch (err) {
      const message = err.response?.data?.message || "Action restricted: Lead transfer limit reached.";
      setErrorPopup(message);
      setTimeout(() => setErrorPopup(null), 3000);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = leads.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(leads.length / itemsPerPage);

  const showActions = true;

  return (
    <div className="lead-table-container">
      {selectedLeadIds.length > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER') && (
        <div className="p-3 mb-3 bg-primary bg-opacity-10 border border-primary border-opacity-20 rounded-4 d-flex align-items-center justify-content-between animate-fade-in shadow-glow-sm">
          <div className="d-flex align-items-center gap-3">
            <span className="fw-black text-primary small text-uppercase tracking-widest">{selectedLeadIds.length} assets selected for redistribution</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <PortalSelect 
              options={[
                { value: "", label: "Select Target..." },
                { value: "0", label: "UNASSIGN ALL" },
                ...uniqueTeamLeaders.filter(u => (role === 'ADMIN' || u.role !== 'ADMIN')).map(u => ({ value: u.id.toString(), label: u.name.toUpperCase() }))
              ]}
              value={bulkAssignTlId}
              onChange={(e) => setBulkAssignTlId(e.target.value)}
              style={{ width: '200px' }}
            />
            <button 
              className="btn btn-primary btn-sm px-4 rounded-pill fw-black text-uppercase tracking-widest shadow-glow"
              style={{ fontSize: '10px', height: '32px' }}
              onClick={() => handleBulkAssign(bulkAssignTlId)}
              disabled={!bulkAssignTlId}
            >
              Redistribute
            </button>
          </div>
        </div>
      )}
      <div className="overflow-auto custom-scroll">
        <table className="table table-hover mb-0 align-middle">
          <thead className="bg-surface bg-opacity-10 border-bottom border-main border-opacity-10">
            <tr>
              <th className="ps-4 py-3 text-muted fw-black small text-uppercase tracking-widest" style={{ width: '50px', fontSize: '9px' }}>S/N</th>
              {role !== 'ASSOCIATE' && (
                <th className="py-3" style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    className="form-check-input bg-dark border-main border-opacity-75 shadow-glow-sm"
                    style={{ cursor: 'pointer', border: '2px solid var(--primary)', width: '18px', height: '18px' }}
                    checked={currentItems.length > 0 && currentItems.filter(l => !l.assignedToId).length > 0 && currentItems.filter(l => !l.assignedToId).every(l => selectedLeadIds.includes(l.id))}
                    onChange={() => {
                      const allUnassignedInPage = currentItems.filter(l => !l.assignedToId).map(l => l.id);
                      if (allUnassignedInPage.length === 0) return;
                      
                      const allSelected = allUnassignedInPage.every(id => selectedLeadIds.includes(id));
                      allUnassignedInPage.forEach(id => {
                        if (allSelected) {
                          if (selectedLeadIds.includes(id)) toggleSelection(id);
                        } else {
                          if (!selectedLeadIds.includes(id)) toggleSelection(id);
                        }
                      });
                    }}
                  />
                </th>
              )}
              <th className="py-3 text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Name</th>
              <th className="py-3 text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Email</th>
              <th className="py-3 text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Phone</th>
              <th className="py-3 text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Source</th>
              {role !== 'ASSOCIATE' && <th className="py-3 text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Assigned To</th>}
              <th className="py-3 text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Status</th>
              <th className="pe-4 py-3 text-end text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Manage</th>
            </tr>
          </thead>
          <tbody className="border-0">
            {loading ? (
              <tr>
                <td colSpan={role === 'ASSOCIATE' ? 8 : 9} className="text-center py-5">
                  <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                  <span className="text-muted fw-bold text-uppercase tracking-widest small">Synchronizing Registry...</span>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={role === 'ASSOCIATE' ? 8 : 9} className="text-center py-5 text-muted fw-bold text-uppercase tracking-widest small opacity-50">Zero records discovered</td>
              </tr>
            ) : (
              currentItems.map((lead, idx) => (
                <tr 
                  key={lead.id} 
                  className="border-bottom border-main border-opacity-10 hover-bg-light cursor-pointer"
                  onClick={() => window.open(`/leads/${lead.id}/details`, '_blank')}
                >
                  <td className="ps-4 py-4 text-muted fw-black small" style={{ fontSize: '10px' }}>
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  {role !== 'ASSOCIATE' && (
                    <td className="py-4" onClick={(e) => e.stopPropagation()}>
                      {!lead.assignedToId && (
                        <input 
                          type="checkbox" 
                          className="form-check-input bg-dark border-main border-opacity-75 shadow-glow-sm"
                          style={{ cursor: 'pointer', border: '2px solid var(--primary)', width: '18px', height: '18px' }}
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleSelection(lead.id)}
                        />
                      )}
                    </td>
                  )}
                  <td className="py-4">
                    <span 
                      className="fw-black text-main hover-underline" 
                      style={{ fontSize: '13px' }}
                    >
                      {lead.name}
                    </span>
                  </td>
                  <td><span className="text-main small fw-black opacity-75" style={{ fontSize: '10px' }}>{lead.email?.toLowerCase() || '—'}</span></td>
                  <td><span className="text-main small fw-black opacity-75" style={{ fontSize: '10px' }}>{lead.mobile}</span></td>
                  <td>
                    <div className="d-flex flex-column">
                      <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '9px', opacity: 0.6 }}>
                        {lead.createdByName ? (lead.createdByName.toUpperCase().includes('SYSTEM') ? 'ADMIN' : lead.createdByName.split(' ')[0]) : 'ADMIN'}
                      </span>
                      <small className="text-main fw-black opacity-40" style={{ fontSize: '7px' }}>ASSIGNED BY</small>
                    </div>
                  </td>
                  {role !== 'ASSOCIATE' && (
                    <td onClick={(e) => e.stopPropagation()}>
                      {(['PAID', 'SUCCESS', 'CONVERTED'].includes(lead.status?.toUpperCase()) && 
                        (uniqueTeamLeaders.find(u => u.id === lead.assignedToId)?.active !== false)) ? (
                        <div className="d-flex flex-column px-1">
                          <span className="fw-black text-success text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>
                            {uniqueTeamLeaders.find(u => u.id === lead.assignedToId)?.name.toUpperCase() || 'UNASSIGNED'}
                          </span>
                          <div className="text-muted fw-bold opacity-30 mt-1" style={{ fontSize: '7px' }}>PROTOCOL LOCKED</div>
                        </div>
                      ) : (
                        <>
                          <PortalSelect 
                            options={[
                              { value: "", label: "UNASSIGNED" },
                              ...uniqueTeamLeaders.filter(u => (u.active || u.id === lead.assignedToId) && u.role !== 'ADMIN').map(u => ({ value: u.id.toString(), label: `${u.name.toUpperCase()} ${u.id === lead.assignedToId ? '✓' : ''}` }))
                            ]}
                            value={lead.assignedToId?.toString() || ''}
                            onChange={(e) => handleAssignLeadInternal(lead.id, e.target.value)}
                            disabled={role !== 'ADMIN' && (role === 'TEAM_LEADER' && lead.assignedToId && lead.assignedToId != currentUserId)}
                            style={{ width: '140px' }}
                          />
                          {(role !== 'ADMIN' && (role === 'TEAM_LEADER' && lead.assignedToId && lead.assignedToId != currentUserId)) && (
                            <div className="text-muted fw-bold opacity-30 mt-1 px-1" style={{ fontSize: '7px' }}>ROLE RESTRICTED</div>
                          )}
                        </>
                      )}
                    </td>
                  )}
                  <td onClick={(e) => e.stopPropagation()} className="text-center">
                    {(lead.status === 'CONVERTED' || lead.paymentStatus) ? (
                      <div className="d-flex justify-content-center">
                        <div 
                          className={`fw-black text-uppercase text-center d-inline-block ${getStatusColorClass(lead.paymentStatus || lead.status)}`}
                          style={{ minWidth: '130px', fontSize: '10px' }}
                        >
                          {lead.paymentStatus?.replace('_', ' ') || lead.status?.toUpperCase()}
                        </div>
                      </div>
                    ) : !lead.assignedToId ? (
                      <div className="d-flex flex-column align-items-center" style={{ width: '130px' }}>
                        <div 
                          className="w-100 bg-surface bg-opacity-10 py-1 px-2 fw-black text-uppercase text-center text-muted border border-white border-opacity-5"
                          style={{ fontSize: '10px', borderRadius: '8px', cursor: 'not-allowed', opacity: 0.6 }}
                        >
                          {pipelineStages.find(s => s.statusValue === (lead.status || 'OPEN'))?.label || lead.status}
                        </div>
                        <div className="text-muted fw-bold opacity-30 mt-1" style={{ fontSize: '7px' }}>ASSIGNMENT REQUIRED</div>
                      </div>
                    ) : (
                      <StatusDropdown 
                        lead={lead} 
                        pipelineStages={pipelineStages} 
                        onChange={handleStatusChange} 
                        getStatusColorClass={getStatusColorClass} 
                        index={idx}
                        totalItems={currentItems.length}
                      />
                    )}
                  </td>
                  <td className="pe-4">
                    <div className="d-flex align-items-center justify-content-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {showActions && (
                        <>
                          {(['INTERESTED', 'FOLLOW_UP', 'WORKING', 'CALL_BACK', 'PRE_PAYMENT', 'PRE-PAYMENT'].includes(lead.status?.toUpperCase()) || 
                            lead.status?.toUpperCase().startsWith('POST_PAYMENT')) && (
                            <button 
                              className="p-2 border-0 bg-transparent text-primary hover-scale animate-pulse" 
                              onClick={() => {
                                navigate(`/leads/${lead.id}/status-update`);
                              }} 
                              title="Generate/Manage Payment Link"
                            >
                              <Zap size={16} fill="currentColor" />
                            </button>
                          )}

                          {lead.paymentStatus === 'PENDING_APPROVAL' && (role === 'ADMIN' || role === 'MANAGER') && (
                            <button 
                              className="p-2 border-0 bg-transparent text-warning hover-scale" 
                              onClick={async () => {
                                if (window.confirm("Approve this manual payment?")) {
                                  try {
                                    // We need to fetch the payment ID from the lead or its history
                                    // For simplicity, we'll use a direct API call if we have the payment ID
                                    // But here we might need to find it first.
                                    // Actually, we'll navigate to status update or handle it via a new API call
                                    const payments = await leadsApi.getLeadPayments(lead.id);
                                    const pending = payments.find(p => p.status === 'PENDING_APPROVAL');
                                    if (pending) {
                                      await leadsApi.approvePayment(pending.id);
                                      toast.success("Payment Approved Protocol Engaged");
                                      if (typeof loadLeads === 'function') loadLeads();
                                      else window.location.reload();
                                    }
                                  } catch (err) {
                                    toast.error("Approval failed: Registry sync error");
                                  }
                                }
                              }} 
                              title="Approve Manual Payment"
                            >
                              <ShieldCheck size={16} />
                            </button>
                          )}

                          {lead.paymentStatus === 'PENDING_APPROVAL' && (role === 'ADMIN' || role === 'MANAGER') && (
                            <button 
                              className="p-2 border-0 bg-transparent text-info hover-scale" 
                              onClick={async () => {
                                try {
                                  const payments = await leadsApi.getLeadPayments(lead.id);
                                  const pending = payments.find(p => p.status === 'PENDING_APPROVAL');
                                  if (pending && pending.receiptUrl) {
                                    const baseUrl = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8080' : '');
                                    const cleanBase = baseUrl.replace('/api', '');
                                    const fullUrl = pending.receiptUrl.startsWith('http') ? pending.receiptUrl : `${cleanBase}${pending.receiptUrl}`;
                                    window.open(fullUrl, '_blank');
                                  } else {
                                    toast.info("No receipt screenshot found for this payment.");
                                  }
                                } catch (err) {
                                  toast.error("Failed to fetch receipt link");
                                }
                              }} 
                              title="View Receipt Screenshot"
                            >
                              <Eye size={16} />
                            </button>
                          )}

                          {lead.paymentStatus === 'PENDING_APPROVAL' && (role === 'ADMIN' || role === 'MANAGER') && (
                            <button 
                              className="p-2 border-0 bg-transparent text-danger hover-scale" 
                              onClick={() => {
                                setRejectModalData(lead);
                                setRejectReason('');
                              }} 
                              title="Reject Manual Payment"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                          
                          <button 
                            className="p-2 border-0 bg-transparent text-success hover-scale" 
                            onClick={() => {
                              const message = `Hello ${lead.name}, I have generated your secure enrollment payment link and sent it to your email (${lead.email}). Please check and complete the process. Let me know if you need any help!`;
                              window.open(`https://wa.me/${lead.mobile?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                            }} 
                            title="Share via WhatsApp"
                          >
                            <MessageSquare size={16} />
                          </button>

                          <button className="p-2 border-0 bg-transparent text-muted hover-scale" onClick={() => setSelectedHistoryLead(lead)} title="Lead Audit History">
                            <History size={16} />
                          </button>

                          <button className="p-2 border-0 bg-transparent text-muted hover-scale" onClick={() => onEdit ? onEdit(lead) : setSelectedEditLead(lead)} title="Edit Lead Registry">
                            <Edit size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-4 bg-surface bg-opacity-10 border-top border-main border-opacity-10 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <small className="text-muted fw-bold text-uppercase tracking-widest" style={{ fontSize: '10px' }}>
            Showing {leads.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, leads.length)}
          </small>
          <span className="text-muted opacity-25">|</span>
          <PortalSelect 
            options={[
              { value: "20", label: "20 Per Page" },
              { value: "50", label: "50 Per Page" },
              { value: "100", label: "100 Per Page" }
            ]}
            value={itemsPerPage.toString()}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ width: '120px' }}
          />
          <span className="text-muted opacity-25">|</span>
          <small className="text-primary fw-black text-uppercase tracking-widest" style={{ fontSize: '10px' }}>
            Total {leads.length} Registry Assets
          </small>
        </div>
        
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex gap-1">
            <button 
              className={`ui-btn btn-sm rounded-pill px-3 py-2 d-flex align-items-center justify-content-center transition-all ${currentPage === 1 ? 'ui-btn-secondary opacity-25' : 'ui-btn-primary shadow-glow'}`}
              onClick={() => setCurrentPage(prev => prev - 1)} 
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="d-flex align-items-center px-3">
              <span className="text-main fw-black text-uppercase tracking-widest" style={{ fontSize: '11px' }}>
                Page {currentPage} <span className="text-muted opacity-50 mx-1">/</span> {totalPages || 1}
              </span>
            </div>

            <button 
              className={`ui-btn btn-sm rounded-pill px-3 py-2 d-flex align-items-center justify-content-center transition-all ${currentPage >= totalPages ? 'ui-btn-secondary opacity-25' : 'ui-btn-primary shadow-glow'}`}
              onClick={() => setCurrentPage(prev => prev + 1)} 
              disabled={currentPage >= totalPages || loading}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <LeadEditModal isOpen={!!selectedEditLead} onClose={() => setSelectedEditLead(null)} lead={selectedEditLead} onUpdate={onUpdateLead} role={role} />
      <CallOutcomeModal 
        isOpen={!!selectedOutcomeLead} 
        onClose={() => setSelectedOutcomeLead(null)} 
        lead={selectedOutcomeLead} 
        theme={isDarkMode ? 'dark' : 'light'} 
        onShowHistory={() => {
          const leadToHistory = selectedOutcomeLead;
          setSelectedOutcomeLead(null);
          setSelectedHistoryLead(leadToHistory);
        }}
        onSubmit={async (data) => {
          if (onUpdateStatus) {
            await onUpdateStatus(selectedOutcomeLead.id, data.status, data.note || '', data);
          } else if (onRecordCallOutcome) {
            await onRecordCallOutcome(selectedOutcomeLead.id, data);
          }
          setSelectedOutcomeLead(null);
        }} 
      />
      <LeadHistoryModal 
        isOpen={!!selectedHistoryLead} 
        onClose={() => setSelectedHistoryLead(null)} 
        lead={selectedHistoryLead} 
        onEdit={(lead) => {
          if (onEdit) onEdit(lead);
          else setSelectedEditLead(lead);
        }}
        onRecordCallOutcome={(lead) => {
          setSelectedHistoryLead(null);
          setSelectedOutcomeLead(lead);
        }}
        onViewInvoice={onViewInvoice}
        navigate={navigate}
      />

      {errorPopup && (
        <div 
          className="position-fixed top-0 start-50 translate-middle-x mt-4 animate-fade-in"
          style={{ 
            zIndex: 9999999,
            minWidth: '400px'
          }}
        >
          <div className="bg-danger bg-opacity-90 text-white p-4 rounded-4 shadow-lg border border-white border-opacity-20 backdrop-blur-md d-flex align-items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-circle">
              <AlertCircle size={24} />
            </div>
            <div>
              <h6 className="mb-1 fw-black text-uppercase tracking-widest" style={{ fontSize: '12px' }}>Strategic Restriction</h6>
              <p className="mb-0 small fw-bold opacity-90">{errorPopup}</p>
            </div>
          </div>
        </div>
      )}

      {rejectModalData && ReactDOM.createPortal(
        <>
          <div 
            className="modal-backdrop fade show" 
            style={{ 
              zIndex: 999998, 
              backgroundColor: 'rgba(0,0,0,0.7)', 
              backdropFilter: 'blur(5px)' 
            }} 
          />
          <div 
            className="modal fade show d-block" 
            tabIndex="-1" 
            style={{ zIndex: 999999 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div 
                className="modal-content border-0 rounded-4 overflow-hidden"
                style={{ 
                  backgroundColor: isDarkMode ? '#1e1e2d' : '#ffffff',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div className="modal-header border-0 px-4 pt-4 pb-0">
                  <h5 className={`modal-title fw-black d-flex align-items-center gap-2 ${isDarkMode ? 'text-white' : 'text-dark'}`}>
                    <XCircle size={22} className="text-danger" />
                    Reject Payment
                  </h5>
                  <button 
                    type="button" 
                    className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`} 
                    onClick={() => setRejectModalData(null)}
                    style={{ opacity: 0.8 }}
                  ></button>
                </div>
                <div className="modal-body px-4 py-3">
                  <p className={`small mb-3 fw-bold ${isDarkMode ? 'text-secondary' : 'text-muted'}`}>
                    Please provide a clear reason for rejecting the manual payment for <span className="text-primary fw-black">{rejectModalData.name}</span>.
                  </p>
                  <textarea
                    className="form-control rounded-3"
                    style={{
                      backgroundColor: isDarkMode ? '#151521' : '#f8f9fa',
                      color: isDarkMode ? '#ffffff' : '#212529',
                      border: `1px solid ${isDarkMode ? '#323248' : '#dee2e6'}`,
                      boxShadow: 'none',
                      resize: 'none'
                    }}
                    rows="4"
                    placeholder="Enter rejection reason here..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="modal-footer border-0 px-4 pb-4 pt-0 d-flex gap-2 justify-content-end">
                  <button 
                    type="button" 
                    className={`btn rounded-pill px-4 fw-bold ${isDarkMode ? 'btn-dark border-secondary' : 'btn-light border'}`} 
                    onClick={() => setRejectModalData(null)} 
                    disabled={isRejecting}
                    style={{ color: isDarkMode ? '#aaa' : '#555' }}
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
                        const payments = await leadsApi.getLeadPayments(rejectModalData.id);
                        const pending = payments.find(p => p.status === 'PENDING_APPROVAL');
                        if (pending) {
                          await leadsApi.rejectPayment(pending.id, rejectReason);
                          toast.success("Payment Rejected Protocol Executed");
                          setRejectModalData(null);
                          if (typeof loadLeads === 'function') loadLeads();
                          else window.location.reload();
                        } else {
                           toast.error("No pending payment found to reject");
                           setRejectModalData(null);
                        }
                      } catch (err) {
                        toast.error("Rejection failed: Command error");
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

      <style>{`
        .cursor-pointer { cursor: pointer; }
        .hover-bg-primary:hover { background: var(--primary) !important; color: white !important; }
        .transition-smooth { transition: all 0.3s ease; }
        
        .table-hover tbody tr:hover { background: rgba(255,255,255,0.02) !important; }
        .hover-scale:hover { transform: scale(1.15); }
        
        @keyframes blink-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .blink-slow { animation: blink-slow 2s infinite ease-in-out; }
        
        @media (max-width: 768px) {
          .lead-table-container { overflow-x: auto; }
          table { min-width: 900px; }
        }
      `}</style>
    </div>
  );
};

export default LeadTable;
