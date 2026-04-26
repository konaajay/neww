import { Search, Users, ShieldHalf, Zap, FileText, Edit, CreditCard, Trash2, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table } from './common/Components';
import LeadEditModal from './LeadEditModal';
import CallOutcomeModal from './CallOutcomeModal';
import GeneratePaymentLinkModal from './GeneratePaymentLinkModal';
import StatusChangeModal from './StatusChangeModal';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import adminService from '../services/adminService';

const LeadTable = ({
  leads = [],
  searchTerm,
  setSearchTerm,
  filterUnassigned,
  setFilterUnassigned,
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
  onUpdateStatus, // For Associate compatibility
  onEdit,
  loadLeads,
  teamLeaders = [],
  role,
  hideFilters = false,
  showActions = true
}) => {
  const { isDarkMode } = useTheme();
  const [selectedEditLead, setSelectedEditLead] = useState(null);
  const [selectedOutcomeLead, setSelectedOutcomeLead] = useState(null);
  const [selectedPaymentLead, setSelectedPaymentLead] = useState(null);
  const [selectedStatusLead, setSelectedStatusLead] = useState(null);
  const navigate = useNavigate();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [pipelineStatuses, setPipelineStatuses] = useState([]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await adminService.fetchPipelineStages();
        if (res.data && res.data.length > 0) {
          const activeStages = res.data.filter(s => s.active).map(s => ({
            value: s.statusValue,
            label: s.label.toLowerCase(),
            color: s.color || 'primary'
          }));
          if (activeStages.length > 0) {
            setPipelineStatuses(activeStages);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load statuses", err);
      }
      
      // Fallback
      setPipelineStatuses([
        { value: 'NEW', label: 'new', color: 'primary' },
        { value: 'CONTACTED', label: 'contacted', color: 'info' },
        { value: 'LOST', label: 'lost', color: 'danger' },
        { value: 'CONVERTED', label: 'converted', color: 'success' }
      ]);
    };
    fetchStatuses();
  }, []);

  const getStatusColorClass = (status) => {
    const dynamicStatus = pipelineStatuses.find(s => s.value === status);
    if (dynamicStatus) return `text-${dynamicStatus.color}`;

    if (['NEW', 'PENDING'].includes(status)) return 'text-primary';
    if (['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(status)) return 'text-success';
    if (['WORKING', 'CONTACTED', 'INTERESTED', 'FOLLOWUP_1', 'FOLLOWUP_2', 'FOLLOWUP_3', 'DEMO', 'PAYMENT_LINK_SENT'].includes(status)) return 'text-info';
    if (['RETRY', 'FOLLOW_UP'].includes(status)) return 'text-warning';
    if (['LOST', 'NOT_INTERESTED', 'PAYMENT_FAILED', 'REJECTED', 'NOT_ANSWERED', 'SWITCHED_OFF'].includes(status)) return 'text-danger';
    return 'text-muted';
  };

  // Filter leads based on search term (if not handled externally)
  const filteredLeads = leads.filter(lead => {
    if (!lead) return false;
    const searchLower = (searchTerm || "").toLowerCase();
    const nameMatch = lead.name ? lead.name.toLowerCase().includes(searchLower) : false;
    const mobileMatch = lead.mobile ? lead.mobile.includes(searchLower) : false;
    const emailMatch = lead.email ? lead.email.toLowerCase().includes(searchLower) : false;
    return nameMatch || mobileMatch || emailMatch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLeads.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleStatusChange = (lead, newStatus) => {
    navigate(`/leads/${lead.id}/status-update?newStatus=${newStatus}`);
  };

  return (
    <div className="d-flex flex-column h-100 animate-fade-in">
      {/* Dynamic Command Header */}

      {selectedLeadIds.length > 0 && role !== 'ASSOCIATE' && (
        <div className="px-4 py-3 bg-primary bg-opacity-10 border-bottom border-primary border-opacity-20 animate-slide-in">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-4">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 bg-primary text-white rounded-circle shadow-glow animate-pulse">
                <ShieldHalf size={16} />
              </div>
              <div className="d-flex flex-column">
                <span className="text-main fw-black small text-uppercase tracking-widest">{selectedLeadIds.length} Nodes Intercepted</span>
                <small className="text-primary fw-bold opacity-75" style={{ fontSize: '9px' }}>AWAITING BULK PROPAGATION COMMAND</small>
              </div>
            </div>
            <div className="d-flex gap-3 align-items-center">
              <select
                className="form-select bg-dark bg-opacity-60 border border-white border-opacity-20 text-main py-2 px-4 rounded-pill shadow-none"
                style={{ width: '240px', fontSize: '11px', appearance: 'none' }}
                value={bulkAssignTlId}
                onChange={(e) => setBulkAssignTlId(e.target.value)}
              >
                <option value="">REDIRECT TO COMMANDER...</option>
                {teamLeaders
                  .filter(u => ['MANAGER', 'TEAM_LEADER', 'ASSOCIATE'].includes(u.role))
                  .map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()} — {u.role}</option>)}
              </select>
              <button
                onClick={() => handleBulkAssign(bulkAssignTlId, teamLeaders)}
                className="ui-btn ui-btn-primary px-5 py-2 rounded-pill shadow-glow fw-black tracking-widest"
                style={{ fontSize: '10px' }}
              >
                EXECUTE TRANSFER
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow-1 overflow-auto custom-scroll">
        <Table
          headers={[
            <div className="d-flex align-items-center gap-3" style={{ width: '60px' }}>
              {role !== 'ASSOCIATE' && filterUnassigned && (
                <input className="form-check-input" type="checkbox" checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} onChange={toggleSelectAll} style={{ width: '14px', height: '14px' }} />
              )}
              <span>SL NO</span>
            </div>,
            <div style={{ width: '180px' }}>NAME</div>,
            <div style={{ width: '220px' }}>EMAIL</div>,
            <div style={{ width: '140px' }}>PHONE</div>,
            ...(role !== 'ASSOCIATE' ? [<div style={{ width: '150px' }}>ASSIGNED</div>] : []),
            <div style={{ width: '150px' }}>STATUS</div>,
            'ACTIONS'
          ]}
          data={currentItems}
          renderRow={(lead, index) => (
            <>
              <td className="ps-4">
                <div className="d-flex align-items-center gap-3">
                  {role !== 'ASSOCIATE' && filterUnassigned && !lead.assignedToId ? (
                    <input className="form-check-input mt-0" type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleSelection(lead.id)} style={{ width: '14px', height: '14px' }} />
                  ) : null}
                  <span className="text-muted fw-black small" style={{ fontSize: '10px', minWidth: '15px' }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </span>
                </div>
              </td>
              <td>
                <span className="fw-black text-main small text-uppercase tracking-wider">{lead.name}</span>
              </td>
              <td>
                <span className="text-info small fw-black opacity-75" style={{ fontSize: '10px' }}>{lead.email?.toLowerCase() || '—'}</span>
              </td>
              <td>
                <span className="text-primary small fw-black opacity-75" style={{ fontSize: '10px' }}>{lead.mobile}</span>
              </td>
              {role !== 'ASSOCIATE' && (
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <div className={`p-1 rounded-circle ${lead.assignedToId ? 'bg-primary shadow-glow' : 'bg-muted opacity-25'}`} style={{ width: '6px', height: '6px' }}></div>
                    <select
                      className={`form-select bg-surface bg-opacity-20 border-0 ${isDarkMode ? 'text-main' : 'text-dark'} py-1 px-2 mb-0 cursor-pointer fw-black text-uppercase`}
                      style={{ width: '130px', fontSize: '10px', borderRadius: '8px', appearance: 'none' }}
                      onChange={(e) => handleAssignLead(lead.id, e.target.value, teamLeaders)}
                      value={lead.assignedToId || ''}
                      disabled={['CONVERTED', 'PAID', 'SUCCESS', 'EMI'].includes(lead.status?.toUpperCase())}
                    >
                      <option value="" className={`${isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'} fw-bold`}>UNASSIGNED</option>
                      {teamLeaders
                        .filter(u => ['MANAGER', 'TEAM_LEADER', 'ASSOCIATE'].includes(u.role))
                        .map(u => <option key={u.id} value={u.id} className={`${isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'} fw-bold`}>{u.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                </td>
              )}
              <td>
                <select
                  className={`form-select bg-surface bg-opacity-20 border-0 ${isDarkMode ? 'text-main' : 'text-dark'} py-1 px-2 mb-0 cursor-pointer hover:bg-opacity-40 fw-black text-uppercase ${getStatusColorClass(lead.status)}`}
                  style={{ width: '130px', fontSize: '10px', borderRadius: '8px', appearance: 'none', margin: '0 auto' }}
                  value={lead.status || 'NEW'}
                  onChange={(e) => handleStatusChange(lead, e.target.value)}
                  disabled={['CONVERTED', 'PAID', 'SUCCESS', 'EMI'].includes(lead.status?.toUpperCase())}
                >
                  {pipelineStatuses.map(s => (
                    <option key={s.value} value={s.value} className={`${isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'} fw-bold`}>{s.label.toUpperCase()}</option>
                  ))}
                </select>
              </td>
              <td className="pe-4">
                <div className="d-flex align-items-center justify-content-end gap-1">
                  {showActions && (
                    <>
                      {/* Log Interaction - Always Visible */}
                      <button className="p-2 border-0 bg-transparent text-primary hover-scale transition-smooth rounded-circle hover:bg-primary hover:bg-opacity-10" title="Log Interaction"
                        onClick={() => setSelectedOutcomeLead(lead)}>
                        <Zap size={15} />
                      </button>
                      
                      {/* Payment Link removed as per user request */}
                      
                      {/* Edit - Always Visible */}
                      <button className="p-2 border-0 bg-transparent text-warning hover-scale transition-smooth rounded-circle hover:bg-warning hover:bg-opacity-10" title="Edit" onClick={() => onEdit ? onEdit(lead) : setSelectedEditLead(lead)}>
                        <Edit size={15} />
                      </button>
                      
                      {/* Invoice - Show only for Paid/EMI/Converted */}
                      {['PAID', 'CONVERTED', 'EMI'].includes(lead.status) && (
                        <button className="p-2 border-0 bg-transparent text-info hover-scale transition-smooth rounded-circle hover:bg-info hover:bg-opacity-10" title="Invoice" onClick={() => onViewInvoice && onViewInvoice(lead)}>
                          <FileText size={15} />
                        </button>
                      )}
                      
                      {/* Ledger - Show only for Paid/EMI/Converted */}
                      {['PAID', 'CONVERTED', 'EMI'].includes(lead.status) && (
                        <button className="p-2 border-0 bg-transparent text-primary hover-scale transition-smooth rounded-circle hover:bg-primary hover:bg-opacity-10" title="Ledger" onClick={() => navigate(`/leads/${lead.id}/fee-structure`)}>
                          <Wallet size={15} />
                        </button>
                      )}

                      {/* Delete - Role Based */}
                      {role !== 'ASSOCIATE' && (
                        <button className="p-2 border-0 bg-transparent text-danger hover-scale transition-smooth rounded-circle hover:bg-danger hover:bg-opacity-10" title="Delete" onClick={() => onDeleteLead && onDeleteLead(lead.id)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-surface bg-opacity-10 border-top border-white border-opacity-5 d-flex align-items-center justify-content-between">
          <small className="text-muted fw-bold opacity-50 text-uppercase tracking-widest" style={{ fontSize: '8px' }}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredLeads.length)} of {filteredLeads.length} nodes
          </small>
          <div className="d-flex gap-2">
            <button className="ui-btn ui-btn-secondary btn-sm px-3 py-1 rounded-pill" onClick={() => currentPage > 1 && paginate(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft size={14} />
            </button>
            <button className="ui-btn ui-btn-secondary btn-sm px-3 py-1 rounded-pill" onClick={() => currentPage < totalPages && paginate(currentPage + 1)} disabled={currentPage === totalPages}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <LeadEditModal isOpen={!!selectedEditLead} onClose={() => setSelectedEditLead(null)} lead={selectedEditLead} onUpdate={onUpdateLead} role={role} />
      <CallOutcomeModal isOpen={!!selectedOutcomeLead} onClose={() => setSelectedOutcomeLead(null)} lead={selectedOutcomeLead} theme={isDarkMode ? 'dark' : 'light'} onSubmit={async (data) => {
        if (onRecordCallOutcome) await onRecordCallOutcome(selectedOutcomeLead.id, data);
        else if (onUpdateStatus) await onUpdateStatus(selectedOutcomeLead.id, data.status, data);
        setSelectedOutcomeLead(null);
      }} />
      <GeneratePaymentLinkModal show={!!selectedPaymentLead} onClose={() => setSelectedPaymentLead(null)} lead={selectedPaymentLead} role={role} onConfirm={async (id, data) => {
        if (onSendPaymentLink) { const success = await onSendPaymentLink(id, data); if (success) setSelectedPaymentLead(null); }
      }} />
    </div>
  );
};

export default LeadTable;
