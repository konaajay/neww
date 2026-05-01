import { Search, Users, ShieldHalf, Zap, FileText, Edit, CreditCard, Trash2, Wallet, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Table } from './common/Components';
import LeadEditModal from './LeadEditModal';
import CallOutcomeModal from './CallOutcomeModal';
import GeneratePaymentLinkModal from './GeneratePaymentLinkModal';
import LeadHistoryModal from './LeadHistoryModal';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLookupData } from '../features/users/hooks/useLookupData';

const LeadTable = ({
  leads = [],
  selectedLeadIds = [],
  toggleSelection,
  toggleSelectAll,
  bulkAssignTlId,
  setBulkAssignTlId,
  handleBulkAssign,
  handleAssignLead,
  onRecordCallOutcome,
  onSendPaymentLink,
  onViewInvoice,
  onDeleteLead,
  onUpdateLead,
  onUpdateStatus, 
  onEdit,
  teamLeaders = [],
  role,
  showActions = true,
  loading = false
}) => {
  const { isDarkMode } = useTheme();
  const [selectedEditLead, setSelectedEditLead] = useState(null);
  const [selectedOutcomeLead, setSelectedOutcomeLead] = useState(null);
  const [selectedHistoryLead, setSelectedHistoryLead] = useState(null);
  const [selectedPaymentLead, setSelectedPaymentLead] = useState(null);
  const navigate = useNavigate();

  // 1. DATA HOOKS (Single source of truth)
  const { pipelineStages } = useLookupData(role);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // 2. DERIVED DATA (Memoized for performance)
  const statusConfigMap = useMemo(() => {
    return pipelineStages.reduce((acc, stage) => {
      acc[stage.statusValue] = {
        label: stage.label.toUpperCase(),
        color: stage.color || 'primary'
      };
      return acc;
    }, {});
  }, [pipelineStages]);

  const getStatusColorClass = (status) => {
    const config = statusConfigMap[status];
    if (config) return `text-${config.color}`;
    
    // Fallback logic
    if (['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(status)) return 'text-success';
    if (['LOST', 'NOT_INTERESTED'].includes(status)) return 'text-danger';
    return 'text-primary';
  };

  // Pagination Logic
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = leads.slice(indexOfFirstItem, indexOfLastItem);

  const handleStatusChange = (lead, newStatus) => {
    navigate(`/leads/${lead.id}/status-update?newStatus=${newStatus}`);
  };

  if (loading) return (
    <div className="p-5 text-center">
      <div className="spinner-border text-primary opacity-50"></div>
      <p className="mt-3 text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Loading Leads...</p>
    </div>
  );

  return (
    <div className="d-flex flex-column h-100 animate-fade-in">
      {selectedLeadIds.length > 0 && role !== 'ASSOCIATE' && (
        <div className="px-4 py-3 bg-primary bg-opacity-10 border-bottom border-primary border-opacity-20 animate-slide-in">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-4">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 bg-primary text-white rounded-circle shadow-glow">
                <ShieldHalf size={16} />
              </div>
              <div className="d-flex flex-column">
                <span className="text-main fw-black small text-uppercase tracking-widest">{selectedLeadIds.length} Leads Selected</span>
                <small className="text-primary fw-bold opacity-75" style={{ fontSize: '9px' }}>CHOOSE WHERE TO MOVE THEM</small>
              </div>
            </div>
            <div className="d-flex gap-3 align-items-center">
              <select
                className="form-select bg-surface bg-opacity-20 border border-white border-opacity-10 text-main py-2 px-4 rounded-pill shadow-none"
                style={{ width: '260px', fontSize: '13px', appearance: 'none', background: 'rgba(255,255,255,0.05)' }}
                value={bulkAssignTlId}
                onChange={(e) => setBulkAssignTlId(e.target.value)}
              >
                <option value="">SELECT PERSON...</option>
                {teamLeaders.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()} — {u.role}</option>)}
              </select>
              <button
                onClick={() => {
                  if (!bulkAssignTlId) {
                    return alert('Please select a target member first');
                  }
                  handleBulkAssign(bulkAssignTlId);
                }}
                className="ui-btn ui-btn-primary px-5 py-2 rounded-pill shadow-glow fw-black tracking-widest"
                style={{ fontSize: '12px' }}
              >
                MOVE LEADS
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow-1 overflow-auto custom-scroll">
        <Table
          headers={[
            <div className="d-flex align-items-center gap-3" style={{ width: '60px' }}>
              {role !== 'ASSOCIATE' && (
                <input 
                  className="form-check-input mt-0 cursor-pointer" 
                  type="checkbox" 
                  checked={currentItems.filter(l => !l.assignedToId).length > 0 && currentItems.filter(l => !l.assignedToId).every(l => selectedLeadIds.includes(l.id))}
                  onChange={(e) => {
                    const unassignedItems = currentItems.filter(l => !l.assignedToId);
                    if (e.target.checked) {
                      unassignedItems.forEach(l => {
                        if (!selectedLeadIds.includes(l.id)) toggleSelection(l.id);
                      });
                    } else {
                      unassignedItems.forEach(l => {
                        if (selectedLeadIds.includes(l.id)) toggleSelection(l.id);
                      });
                    }
                  }}
                  style={{ width: '14px', height: '14px' }} 
                />
              )}
              <span>S/N</span>
            </div>,
            <div style={{ width: '180px' }}>NAME</div>,
            <div style={{ width: '220px' }}>EMAIL</div>,
            <div style={{ width: '140px' }}>PHONE</div>,
            <div style={{ width: '130px' }}>SOURCE</div>,
            ...(role !== 'ASSOCIATE' ? [<div style={{ width: '150px' }}>ASSIGNED TO</div>] : []),
            <div style={{ width: '150px' }}>STATUS</div>,
            'MANAGE'
          ]}
          data={currentItems}
          renderRow={(lead, index) => (
            <>
              <td className="ps-4">
                <div className="d-flex align-items-center gap-3">
                  {role !== 'ASSOCIATE' && !lead.assignedToId ? (
                    <input className="form-check-input mt-0 cursor-pointer" type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleSelection(lead.id)} style={{ width: '14px', height: '14px' }} />
                  ) : role !== 'ASSOCIATE' ? (
                    <div style={{ width: '14px' }}></div> // Spacer for assigned leads
                  ) : null}
                  <span className="text-muted fw-black small" style={{ fontSize: '10px' }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </span>
                </div>
              </td>
              <td><span className="fw-black text-main small text-uppercase tracking-wider">{lead.name}</span></td>
              <td><span className="text-info small fw-black opacity-75" style={{ fontSize: '10px' }}>{lead.email?.toLowerCase() || '—'}</span></td>
              <td><span className="text-primary small fw-black opacity-75" style={{ fontSize: '10px' }}>{lead.mobile}</span></td>
              <td>
                <div className="d-flex flex-column">
                  <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '9px', opacity: 0.6 }}>
                    {lead.createdByName ? (lead.createdByName.toUpperCase().includes('SYSTEM') ? 'ADMIN' : lead.createdByName.split(' ')[0]) : 'ADMIN'}
                  </span>
                  <small className="text-main fw-black opacity-40" style={{ fontSize: '7px' }}>ASSIGNED BY</small>
                </div>
              </td>
              {role !== 'ASSOCIATE' && (
                <td>
                  {(() => {
                    const isAssignedOutsideList = lead.assignedToId && !teamLeaders.some(u => u.id === lead.assignedToId);
                    if (isAssignedOutsideList) {
                      // Lead is assigned to an associate/non-TL — show their name, not "UNASSIGNED"
                      return (
                        <select
                          className={`form-select bg-surface bg-opacity-20 border-0 ${!lead.assignedToId ? 'text-danger fw-black' : 'text-main'} py-1 px-2 fw-black text-uppercase`}
                          style={{ width: '130px', fontSize: '10px', borderRadius: '8px' }}
                          onChange={(e) => handleAssignLead && handleAssignLead(lead.id, e.target.value, teamLeaders)}
                          value={lead.assignedToId}
                        >
                          <option value="" className="text-danger">UNASSIGNED</option>
                          <option value={lead.assignedToId}>
                            {lead.assignedToName ? lead.assignedToName.split(' ')[0].toUpperCase() : 'ASSOCIATE'} ✓
                          </option>
                          {teamLeaders.filter(u => u.active || u.id === lead.assignedToId).map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                        </select>
                      );
                    }
                    return (
                      <select
                        className={`form-select bg-surface bg-opacity-20 border-0 ${!lead.assignedToId ? 'text-danger fw-black' : 'text-main'} py-1 px-2 fw-black text-uppercase`}
                        style={{ width: '130px', fontSize: '10px', borderRadius: '8px' }}
                        onChange={(e) => handleAssignLead && handleAssignLead(lead.id, e.target.value, teamLeaders)}
                        value={lead.assignedToId || ''}
                      >
                        <option value="" className="text-danger">UNASSIGNED</option>
                        {teamLeaders.filter(u => u.active || u.id === lead.assignedToId).map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()} {u.id === lead.assignedToId ? '✓' : ''}</option>)}
                      </select>
                    );
                  })()}
                </td>
              )}
              <td>
                {['CONVERTED', 'PAID', 'SUCCESS', 'EMI'].includes(lead.status?.toUpperCase()) ? (
                  <div 
                    className={`bg-surface bg-opacity-20 py-1 px-2 fw-black text-uppercase text-center ${getStatusColorClass(lead.status)}`}
                    style={{ width: '130px', fontSize: '10px', borderRadius: '8px' }}
                  >
                    {lead.status?.toUpperCase()}
                  </div>
                ) : (
                  <select
                    className={`form-select bg-surface bg-opacity-20 border-0 py-1 px-2 fw-black text-uppercase ${getStatusColorClass(lead.status)}`}
                    style={{ width: '130px', fontSize: '10px', borderRadius: '8px' }}
                    value={lead.status || 'NEW'}
                    onChange={(e) => handleStatusChange(lead, e.target.value)}
                  >
                    {pipelineStages.map(s => (
                      <option key={s.statusValue} value={s.statusValue}>{s.label.toUpperCase()}</option>
                    ))}
                  </select>
                )}
              </td>
              <td className="pe-4">
                <div className="d-flex align-items-center justify-content-end gap-1">
                  {showActions && (
                    <>
                      <button className="p-2 border-0 bg-transparent text-primary hover-scale" onClick={() => setSelectedOutcomeLead(lead)}>
                        <Zap size={15} />
                      </button>
                      <button className="p-2 border-0 bg-transparent text-info hover-scale" onClick={() => setSelectedHistoryLead(lead)}>
                        <History size={15} />
                      </button>
                      <button className="p-2 border-0 bg-transparent text-warning hover-scale" onClick={() => onEdit ? onEdit(lead) : setSelectedEditLead(lead)}>
                        <Edit size={15} />
                      </button>
                      {['PAID', 'CONVERTED', 'EMI'].includes(lead.status) && (
                        <>
                          <button className="p-2 border-0 bg-transparent text-info hover-scale" onClick={() => onViewInvoice && onViewInvoice(lead)}>
                            <FileText size={15} />
                          </button>
                          <button className="p-2 border-0 bg-transparent text-primary hover-scale" onClick={() => navigate(`/leads/${lead.id}/fee-structure`)}>
                            <Wallet size={15} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 bg-surface bg-opacity-10 border-top border-white border-opacity-5 d-flex align-items-center justify-content-between">
          <small className="text-muted fw-bold opacity-50 text-uppercase tracking-widest" style={{ fontSize: '8px' }}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, leads.length)} of {leads.length} leads
          </small>
          <div className="d-flex gap-2">
            <button className="ui-btn ui-btn-secondary btn-sm px-3 py-1 rounded-pill" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>
              <ChevronLeft size={14} />
            </button>
            <button className="ui-btn ui-btn-secondary btn-sm px-3 py-1 rounded-pill" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPages}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <LeadEditModal isOpen={!!selectedEditLead} onClose={() => setSelectedEditLead(null)} lead={selectedEditLead} onUpdate={onUpdateLead} role={role} />
      <CallOutcomeModal 
        isOpen={!!selectedOutcomeLead} 
        onClose={() => setSelectedOutcomeLead(null)} 
        lead={selectedOutcomeLead} 
        theme={isDarkMode ? 'dark' : 'light'} 
        onSubmit={async (data) => {
          if (onRecordCallOutcome) await onRecordCallOutcome(selectedOutcomeLead.id, data);
          else if (onUpdateStatus) await onUpdateStatus(selectedOutcomeLead.id, data.status, data);
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
      />
    </div>
  );
};

export default LeadTable;
