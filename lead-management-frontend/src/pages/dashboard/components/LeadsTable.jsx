import { Search, Users, ShieldHalf, Phone, FileText, Edit, CreditCard, Trash2, Wallet } from 'lucide-react';
import { Table } from '../../../components/common/Components';
import LeadEditModal from '../../../components/LeadEditModal';
import CallOutcomeModal from '../../../components/CallOutcomeModal';
import GeneratePaymentLinkModal from '../../../components/GeneratePaymentLinkModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-toastify';

const LeadsTable = ({
  leads,
  searchTerm,
  setSearchTerm,
  filterUnassigned,
  setFilterUnassigned,
  selectedLeadIds,
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
  onEdit,
  teamLeaders,
  role,
  hideFilters = false
}) => {
  const { isDarkMode } = useTheme();
  const [selectedEditLead, setSelectedEditLead] = useState(null);
  const [selectedOutcomeLead, setSelectedOutcomeLead] = useState(null);
  const [selectedPaymentLead, setSelectedPaymentLead] = useState(null);
  const navigate = useNavigate();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const getStatusBadge = (status) => {
    let variant = 'bg-surface text-muted';
    if (['NEW', 'PENDING'].includes(status)) variant = 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10';
    if (['PAID', 'CONVERTED', 'SUCCESS', 'EMI'].includes(status)) variant = 'bg-success bg-opacity-10 text-success border border-success border-opacity-10';
    if (['WORKING', 'CONTACTED', 'INTERESTED'].includes(status)) variant = 'bg-info bg-opacity-10 text-info border border-info border-opacity-10';
    if (['RETRY', 'FOLLOW_UP'].includes(status)) variant = 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-10';
    if (['LOST', 'NOT_INTERESTED', 'PAYMENT_FAILED', 'REJECTED'].includes(status)) variant = 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-10';

    return (
      <span className={`ui-badge ${variant}`} style={{ minWidth: '80px', textAlign: 'center', display: 'inline-block' }}>
        {status || 'IDENTIFIED'}
      </span>
    );
  };

  // Filter leads based on search term
  const filteredLeads = (leads || []).filter(lead => {
    if (!lead) return false;
    const searchLower = (searchTerm || "").toLowerCase();

    const nameMatch = lead.name ? lead.name.toLowerCase().includes(searchLower) : false;
    const mobileMatch = lead.mobile ? lead.mobile.includes(searchLower) : false;
    const serialMatch = lead.serialNumber ? lead.serialNumber.toLowerCase().includes(searchLower) : false;
    const emailMatch = lead.email ? lead.email.toLowerCase().includes(searchLower) : false;

    return nameMatch || mobileMatch || serialMatch || emailMatch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLeads.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="d-flex flex-column h-100 animate-fade-in">
      {/* Dynamic Command Header */}
      {!hideFilters && (
        <div className="p-4 bg-surface bg-opacity-10 border-bottom border-white border-opacity-5 d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-4">
          <div className="d-flex align-items-center gap-4">
            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4 shadow-glow border border-primary border-opacity-10">
              <Users size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h5 className="mb-1 text-main fw-black text-uppercase tracking-widest small">Global Pipeline Ledger</h5>
              <div className="d-flex align-items-center gap-2">
                <span className="p-1 bg-success rounded-circle animate-pulse" style={{ width: '6px', height: '6px' }}></span>
                <small className="text-muted fw-bold opacity-50 text-uppercase tracking-widest" style={{ fontSize: '8px' }}>REAL-TIME OPERATIONAL REGISTRY • {leads.length} NODES</small>
              </div>
            </div>
          </div>

          <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center">
            <div className="position-relative" style={{ minWidth: '320px' }}>
              <div className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted opacity-50">
                <Search size={14} />
              </div>
              <input
                placeholder="Search by name, mobile, or serial..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to page 1 on search
                }}
                className="form-control bg-surface bg-opacity-50 border border-white border-opacity-10 text-main py-2.5 ps-5 shadow-none rounded-pill focus:border-primary transition-all"
                style={{ fontSize: '12px' }}
              />
            </div>

            <div className="d-flex align-items-center gap-4 px-3 py-1 bg-surface bg-opacity-20 rounded-pill border border-white border-opacity-5">
              <div className="form-check form-switch mb-0 d-flex align-items-center gap-2 ps-0">
                <label className="text-muted fw-black small text-uppercase tracking-widest cursor-pointer ms-1 mb-0" htmlFor="unassignedSw" style={{ fontSize: '9px' }}>Floating Nodes Only</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedLeadIds.length > 0 && (
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
            <div className="d-flex align-items-center gap-3 ps-2">
              {filterUnassigned && (
                <input className="form-check-input" type="checkbox" checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} onChange={toggleSelectAll} style={{ width: '14px', height: '14px' }} />
              )}
              <span>#</span>
            </div>,
            'IDENTITY CHARACTER', 'PIPELINE ARCHITECTURE', 'ASSIGNED NODE', 'OPERATIONS'
          ]}
          data={currentItems}
          renderRow={(lead, index) => (
            <>
              <td className="ps-4">
                <div className="d-flex align-items-center gap-3">
                  {filterUnassigned && !lead.assignedToId ? (
                    <input className="form-check-input mt-0" type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleSelection(lead.id)} style={{ width: '14px', height: '14px' }} />
                  ) : filterUnassigned ? (
                    <div style={{ width: '14px' }}></div>
                  ) : null}
                  <span className="text-muted fw-black small" style={{ fontSize: '10px', minWidth: '15px' }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </span>
                </div>
              </td>
              <td>
                <div className="d-flex align-items-center gap-3">
                  <div className="p-1 bg-dark bg-opacity-50 border border-white border-opacity-5 rounded-circle overflow-hidden shadow-sm" style={{ width: '36px', height: '36px' }}>
                    <div className="w-100 h-100 bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-black small">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="d-flex flex-column">
                    <span className="fw-black text-main small text-uppercase tracking-wider" style={{ letterSpacing: '0.5px' }}>{lead.name}</span>
                    <div className="d-flex align-items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-primary small fw-black opacity-75" style={{ fontSize: '10px' }}>{lead.mobile}</span>
                      {lead.email && <span className="text-info small fw-black opacity-75" style={{ fontSize: '10px' }}>• {lead.email.toLowerCase()}</span>}
                      <span className="text-muted small fw-bold opacity-40" style={{ fontSize: '9px' }}>• {lead.college || 'NO INSTITUTION'}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="text-center">{getStatusBadge(lead.status)}</td>
              <td>
                <div className="d-flex align-items-center gap-3">
                  <div className={`p-1 rounded-circle ${lead.assignedToId ? 'bg-success shadow-glow' : 'bg-muted opacity-25'}`} style={{ width: '6px', height: '6px' }}></div>
                  <div className="d-flex flex-column">
                    <span className={`small fw-black text-uppercase tracking-tighter ${lead.assignedToId ? 'text-main' : 'text-muted italic opacity-50'}`} style={{ fontSize: '10px' }}>
                      {lead.assignedToName || 'AWAITING NODE'}
                    </span>
                    {lead.assignedToId && <small className="text-muted fw-bold opacity-30" style={{ fontSize: '7px' }}>UPLINK ESTABLISHED</small>}
                  </div>
                </div>
              </td>
              <td className="pe-4">
                <div className="d-flex align-items-center justify-content-end gap-1">
                  <button className="p-2 border-0 bg-transparent text-primary hover-scale transition-smooth rounded-circle hover:bg-primary hover:bg-opacity-10" title="Log Manual Call" 
                    onClick={() => {
                      console.log("Triggering Call Outcome Modal for Lead:", lead.id);
                      setSelectedOutcomeLead(lead);
                    }}>
                    <Phone size={15} />
                  </button>
                  {(role === 'ADMIN' || (!['PAID', 'EMI', 'CONVERTED', 'SUCCESSFUL'].includes(lead.status) && !lead.paymentOrderId)) && (
                    <button className="p-2 border-0 bg-transparent text-success hover-scale transition-smooth rounded-circle hover:bg-success hover:bg-opacity-10" title="Generate Payment Link" onClick={() => setSelectedPaymentLead(lead)}>
                      <CreditCard size={15} />
                    </button>
                  )}
                  <button className="p-2 border-0 bg-transparent text-warning hover-scale transition-smooth rounded-circle hover:bg-warning hover:bg-opacity-10" title="Edit Lead Details" onClick={() => onEdit ? onEdit(lead) : setSelectedEditLead(lead)}>
                    <Edit size={15} />
                  </button>
                  {(['PAID', 'CONVERTED', 'EMI', 'SUCCESSFUL'].includes(lead.status) || lead.paymentOrderId) && (
                    <button className="p-2 border-0 bg-transparent text-info hover-scale transition-smooth rounded-circle hover:bg-info hover:bg-opacity-10" title="View Invoice" onClick={() => onViewInvoice && onViewInvoice(lead)}>
                      <FileText size={15} />
                    </button>
                  )}
                  <button className="p-2 border-0 bg-transparent text-danger hover-scale transition-smooth rounded-circle hover:bg-danger hover:bg-opacity-10" title="Decommission Node" onClick={() => onDeleteLead && onDeleteLead(lead.id)}>
                    <Trash2 size={15} />
                  </button>
                  {(['PAID', 'CONVERTED', 'EMI', 'SUCCESSFUL'].includes(lead.status)) && (
                    <button 
                      className="p-2 border-0 bg-transparent text-primary hover-scale transition-smooth rounded-circle hover:bg-primary hover:bg-opacity-10" 
                      title="View Fee Ledger" 
                      onClick={() => navigate(`/leads/${lead.id}/fee-structure`)}
                    >
                      <Wallet size={15} />
                    </button>
                  )}
                  <div className="ms-2 ps-2 border-start border-white border-opacity-10">
                    <select
                      className={`form-select bg-surface bg-opacity-20 border-0 text-main py-1 px-2 mb-0 ${['PAID', 'CONVERTED', 'SUCCESSFUL'].includes(lead.status) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-40'}`}
                      style={{ width: '120px', fontSize: '10px', borderRadius: '8px', appearance: 'none' }}
                      onChange={(e) => handleAssignLead(lead.id, e.target.value, teamLeaders)}
                      value={lead.assignedToId || ''}
                      disabled={['PAID', 'CONVERTED', 'SUCCESSFUL'].includes(lead.status)}
                    >
                      <option value="0">UNASSIGN NODE</option>
                      <option value="">REASSIGN...</option>
                      {teamLeaders
                        .filter(u => ['MANAGER', 'TEAM_LEADER', 'ASSOCIATE'].includes(u.role))
                        .map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                    </select>
                  </div>
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
            <button
              className={`ui-btn ui-btn-secondary btn-sm px-3 py-1 rounded-pill ${currentPage === 1 ? 'opacity-25 cursor-not-allowed' : 'hover-scale'}`}
              onClick={() => currentPage > 1 && paginate(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ fontSize: '9px' }}
            >
              PREVIOUS
            </button>
            <div className="d-flex gap-1 align-items-center">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`border-0 rounded-circle fw-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-glow' : 'bg-surface bg-opacity-20 text-muted'}`}
                  style={{ width: '24px', height: '24px', fontSize: '9px' }}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
            </div>
            <button
              className={`ui-btn ui-btn-secondary btn-sm px-3 py-1 rounded-pill ${currentPage === totalPages ? 'opacity-25 cursor-not-allowed' : 'hover-scale'}`}
              onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ fontSize: '9px' }}
            >
              NEXT
            </button>
          </div>
        </div>
      )}

      <LeadEditModal
        isOpen={!!selectedEditLead}
        onClose={() => setSelectedEditLead(null)}
        lead={selectedEditLead}
        onUpdate={onUpdateLead}
        role={role}
      />

      <CallOutcomeModal
        isOpen={!!selectedOutcomeLead}
        onClose={() => setSelectedOutcomeLead(null)}
        lead={selectedOutcomeLead}
        theme={isDarkMode ? 'dark' : 'light'}
        onSubmit={async (data) => {
          console.log("LeadsTable: CallOutcomeModal reported outcome", data);
          if (onRecordCallOutcome) {
            try {
              await onRecordCallOutcome(selectedOutcomeLead.id, data);
              console.log("LeadsTable: onRecordCallOutcome success");
              setSelectedOutcomeLead(null);
            } catch (err) {
              console.error("LeadsTable: onRecordCallOutcome failed", err);
              // Error is already toasted in ManagerDashboard/TeamLeaderDashboard
            }
          } else {
            console.warn("LeadsTable: onRecordCallOutcome prop is missing");
          }
        }}
      />

      <GeneratePaymentLinkModal
        show={!!selectedPaymentLead}
        onClose={() => setSelectedPaymentLead(null)}
        lead={selectedPaymentLead}
        role={role}
        onConfirm={async (id, data) => {
          if (onSendPaymentLink) {
             const success = await onSendPaymentLink(id, data);
             if (success) {
               setSelectedPaymentLead(null);
             }
          }
        }}
      />
    </div>
  );

}; export default LeadsTable;
