import React, { useState, useMemo } from 'react';
import { 
  History, Edit, FileText, Wallet, Zap, ChevronLeft, ChevronRight, 
  Search, Filter, ArrowUpRight, Clock, CheckCircle2, AlertCircle,
  MoreVertical, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LeadEditModal from './LeadEditModal';
import CallOutcomeModal from './CallOutcomeModal';
import LeadHistoryModal from './LeadHistoryModal';
import { useTheme } from '../context/ThemeContext';
import ReactDOM from 'react-dom';

const StatusDropdown = ({ lead, pipelineStages, onChange, getStatusColorClass, index, totalItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = React.useRef(null);
  const { isDarkMode } = useTheme();

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) updateCoords();
    setIsOpen(!isOpen);
  };

  const handleSelect = (status) => {
    onChange(lead, status);
    setIsOpen(false);
  };

  const currentStage = pipelineStages.find(s => s.statusValue === (lead.status || 'NEW')) || pipelineStages[0];
  
  // Open upwards only for the very last row to prevent clipping if not using Portal
  // But with Portal, we can just check if we are near the bottom of the viewport
  const openUpwards = buttonRef.current && (buttonRef.current.getBoundingClientRect().bottom + 250 > window.innerHeight);

  return (
    <div className="position-relative" style={{ width: '130px' }}>
      <button
        ref={buttonRef}
        className={`w-100 d-flex align-items-center justify-content-between py-1 px-2 border-0 rounded-3 fw-black text-uppercase ${getStatusColorClass(lead.status)}`}
        style={{ 
          fontSize: '10px', 
          background: 'rgba(255,255,255,0.05)',
          cursor: 'pointer',
          height: '24px'
        }}
        onClick={toggleDropdown}
      >
        <span className="text-truncate">{currentStage.label}</span>
        <ChevronDown size={10} className="ms-1 opacity-50" />
      </button>

      {isOpen && ReactDOM.createPortal(
        <>
          <div 
            className="position-fixed top-0 start-0 w-100 h-100" 
            style={{ zIndex: 9999998 }} 
            onClick={() => setIsOpen(false)}
          ></div>
          <div 
            className="position-absolute shadow-xl rounded-3 border overflow-hidden custom-scroll animate-fade-in"
            style={{ 
              zIndex: 9999999, 
              width: '180px', 
              maxHeight: '300px',
              overflowY: 'auto',
              background: '#0f172a', 
              borderColor: 'rgba(255,255,255,0.1)',
              left: coords.left,
              top: openUpwards ? 'auto' : coords.top + 5,
              bottom: openUpwards ? (window.innerHeight - coords.top + 30) : 'auto'
            }}
          >
            {pipelineStages.map(s => (
              <div
                key={s.statusValue}
                className="px-3 py-2 text-white hover-bg-primary transition-all cursor-pointer d-flex align-items-center gap-2 border-bottom border-white border-opacity-5"
                style={{ fontSize: '10px', fontWeight: '800' }}
                onClick={() => handleSelect(s.statusValue)}
              >
                <div className={`rounded-circle ${getStatusColorClass(s.statusValue)}`} style={{ width: '6px', height: '6px' }}></div>
                {s.label.toUpperCase()}
                {s.isRoot && (
                  <span className="ms-auto px-1 rounded-pill bg-success bg-opacity-10 text-success fw-black" style={{ fontSize: '6px' }}>ROOT</span>
                )}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

const LeadTable = ({ 
  leads = [], 
  onUpdateLead, 
  onRecordCallOutcome, 
  onUpdateStatus, 
  onEdit,
  onViewInvoice,
  role = 'ADMIN',
  loading = false,
  teamLeaders = []
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEditLead, setSelectedEditLead] = useState(null);
  const [selectedOutcomeLead, setSelectedOutcomeLead] = useState(null);
  const [selectedHistoryLead, setSelectedHistoryLead] = useState(null);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const itemsPerPage = 10;

  const pipelineStages = [
    { label: 'New', statusValue: 'NEW', color: 'primary', isRoot: true },
    { label: 'Contacted', statusValue: 'CONTACTED', color: 'info' },
    { label: 'FollowUp', statusValue: 'FOLLOWUP', color: 'warning' },
    { label: 'Converted', statusValue: 'CONVERTED', color: 'success' },
    { label: 'Interested', statusValue: 'INTERESTED', color: 'primary' },
    { label: 'Lost', statusValue: 'LOST', color: 'danger' },
    { label: 'FollowUp2', statusValue: 'FOLLOWUP2', color: 'warning' },
    { label: 'SwitchOff', statusValue: 'SWITCHOFF', color: 'secondary' },
  ];

  const getStatusColorClass = (status) => {
    const s = status?.toUpperCase().replace(' ', '_');
    if (['CONVERTED', 'PAID', 'SUCCESS', 'EMI', 'COMPLETED'].includes(s)) return 'text-success';
    if (['LOST', 'REJECTED', 'REFUND', 'NOT_INTERESTED'].includes(s)) return 'text-danger';
    if (['FOLLOW_UP', 'FOLLOWUP', 'CALL_BACK', 'CALLBACK'].includes(s)) return 'text-warning';
    if (['INTERESTED', 'WORKING'].includes(s)) return 'text-primary';
    if (['CONTACTED', 'UNDER_REVIEW'].includes(s)) return 'text-info';
    return 'text-main';
  };

  const handleStatusChange = async (lead, newStatus) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(lead.id, newStatus);
      } else if (onUpdateLead) {
        await onUpdateLead(lead.id, { status: newStatus });
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAssignLead = async (leadId, newUserId, users) => {
    const user = users.find(u => u.id === parseInt(newUserId));
    if (!user) return;
    
    try {
      if (onUpdateLead) {
        await onUpdateLead(leadId, { assignedToId: user.id });
      }
    } catch (err) {
      console.error('Failed to assign lead', err);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = leads.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(leads.length / itemsPerPage);

  const showActions = true;

  return (
    <div className="lead-table-container">
      <div className="overflow-auto custom-scroll">
        <table className="table table-hover mb-0 align-middle">
          <thead className="bg-surface bg-opacity-10 border-bottom border-white border-opacity-5">
            <tr>
              <th className="ps-4 py-3 text-muted fw-black small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Name</th>
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
                <td colSpan={7} className="text-center py-5">
                  <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                  <span className="text-muted fw-bold text-uppercase tracking-widest small">Synchronizing Registry...</span>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-5 text-muted fw-bold text-uppercase tracking-widest small opacity-50">Zero records discovered</td>
              </tr>
            ) : (
              currentItems.map((lead, idx) => (
                <tr 
                  key={lead.id} 
                  className="border-bottom border-white border-opacity-5 hover-bg-light cursor-pointer"
                  onClick={() => setSelectedOutcomeLead(lead)}
                >
                  <td className="ps-4 py-4">
                    <span 
                      className="fw-black text-primary hover-underline" 
                      style={{ fontSize: '13px' }}
                    >
                      {lead.name}
                    </span>
                  </td>
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
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className={`form-select bg-surface bg-opacity-20 border-0 ${!lead.assignedToId ? 'text-danger fw-black' : 'text-main'} py-1 px-2 fw-black text-uppercase`}
                        style={{ width: '130px', fontSize: '10px', borderRadius: '8px' }}
                        onChange={(e) => handleAssignLead(lead.id, e.target.value, teamLeaders)}
                        value={lead.assignedToId || ''}
                      >
                        <option value="" className="text-danger">UNASSIGNED</option>
                        {teamLeaders.filter(u => u.active || u.id === lead.assignedToId).map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                      </select>
                    </td>
                  )}
                  <td onClick={(e) => e.stopPropagation()}>
                    {['CONVERTED', 'PAID', 'SUCCESS', 'EMI'].includes(lead.status?.toUpperCase()) ? (
                      <div 
                        className={`bg-surface bg-opacity-20 py-1 px-2 fw-black text-uppercase text-center ${getStatusColorClass(lead.status)}`}
                        style={{ width: '130px', fontSize: '10px', borderRadius: '8px' }}
                      >
                        {lead.status?.toUpperCase()}
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
                          <button className="p-2 border-0 bg-transparent text-info hover-scale" onClick={() => setSelectedHistoryLead(lead)}>
                            <History size={16} />
                          </button>
                          <button className="p-2 border-0 bg-transparent text-warning hover-scale" onClick={() => onEdit ? onEdit(lead) : setSelectedEditLead(lead)}>
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
        onShowHistory={() => {
          const leadToHistory = selectedOutcomeLead;
          setSelectedOutcomeLead(null);
          setSelectedHistoryLead(leadToHistory);
        }}
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
        onRecordCallOutcome={(lead) => {
          setSelectedHistoryLead(null);
          setSelectedOutcomeLead(lead);
        }}
        onViewInvoice={onViewInvoice}
        navigate={navigate}
      />

      <style>{`
        .cursor-pointer { cursor: pointer; }
        .hover-bg-primary:hover { background: var(--primary) !important; color: white !important; }
        .transition-smooth { transition: all 0.3s ease; }
        
        .table-hover tbody tr:hover { background: rgba(255,255,255,0.02) !important; }
        .hover-scale:hover { transform: scale(1.15); }
        
        @media (max-width: 768px) {
          .lead-table-container { overflow-x: auto; }
          table { min-width: 900px; }
        }
      `}</style>
    </div>
  );
};

export default LeadTable;
