import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Send, Clock, CheckCircle, XCircle, ExternalLink, Copy, MessageSquare, MessageCircle, BookOpen, Phone, Heart, Zap, TrendingUp, Edit, Search } from 'lucide-react';
import { Button, Card, Input, Table } from './common/Components';
import RejectionModal from './RejectionModal';
import { toast } from 'react-toastify';
import CallOutcomeModal from './CallOutcomeModal';
import LeadEditModal from './LeadEditModal';
import associateService from '../services/associateService';
import { useAuth } from '../context/AuthContext';

const LeadTable = ({ 
  leads, 
  onSendPaymentLink, 
  onViewInvoice, 
  onUpdateStatus, 
  onRecordCallOutcome, 
  onAssignLead, 
  onUpdateLead,
  onEdit,
  associates = [], 
  role, 
  showActions = true,
  currentUser = null 
}) => {
  const { isDarkMode } = useTheme();
  const { activeCall, startCall: logActiveCall } = useAuth();
  const [selectedOutcomeLead, setSelectedOutcomeLead] = useState(null);
  const [selectedEditLead, setSelectedEditLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isStartingCall, setIsStartingCall] = useState(false);

  const handleStartCall = (lead) => {
    // Immediate modal opening without background call registration
    setSelectedOutcomeLead(lead);
  };

  const isLocked = (status) => ['PAID', 'CONVERTED', 'EMI', 'SUCCESSFUL'].includes(status);

  const filteredLeads = leads.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      (l.name && l.name.toLowerCase().includes(term)) ||
      (l.mobile && l.mobile.includes(term)) ||
      (l.email && l.email.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status) => {
    let variant = 'bg-surface text-muted';
    if (['NEW', 'PENDING'].includes(status)) variant = 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10';
    if (isLocked(status)) variant = 'bg-success bg-opacity-10 text-success border border-success border-opacity-10';
    if (['WORKING', 'CONTACTED', 'INTERESTED'].includes(status)) variant = 'bg-info bg-opacity-10 text-info border border-info border-opacity-10';
    if (['EMI', 'RETRY', 'FOLLOW_UP'].includes(status)) variant = 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-10';
    if (['LOST', 'NOT_INTERESTED', 'PAYMENT_FAILED'].includes(status)) variant = 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-10';

    return (
      <span className={`ui-badge ${variant}`} style={{ minWidth: '80px', textAlign: 'center', display: 'inline-block' }}>
        {status || 'IDENTIFIED'}
      </span>
    );
  };

  return (
    <div className="w-100 animate-fade-in">
      <div className="p-4 bg-surface bg-opacity-5 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
        <div>
          <h6 className="mb-1 text-main fw-black text-uppercase tracking-widest small">Local Data Pool</h6>
          <small className="text-muted fw-bold opacity-30 text-uppercase tracking-widest" style={{ fontSize: '8px' }}>Personal Lead Cluster • Synchronized</small>
        </div>
        <div className="position-relative" style={{ maxWidth: '300px', width: '100%' }}>
          <div className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted opacity-50">
            <Search size={14} />
          </div>
          <input 
            placeholder="Search leads..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control bg-dark bg-opacity-40 border border-white border-opacity-10 text-main py-2 ps-5 shadow-none rounded-pill transition-all"
            style={{ fontSize: '12px' }}
          />
        </div>
      </div>

      <div className="overflow-auto custom-scroll">
        <Table 
          headers={['SNo', 'Serial No.', 'Identity Node', 'Contact Info', 'Institutional Node', 'Status', 'Log State', ...(showActions ? ['Operations'] : [])]}
          data={filteredLeads}
          renderRow={(lead, index) => (
            <>
              <td className="ps-4">
                 <span className="text-muted small fw-bold opacity-30">{index + 1}</span>
              </td>
              <td>
                 <span className="text-info small fw-black tracking-tighter" style={{ fontSize: '11px' }}>{lead.serialNumber || 'NON-INDEXED'}</span>
              </td>
              <td>
                <div className="d-flex align-items-center gap-2">
                  <div className="p-1 bg-primary bg-opacity-10 text-primary rounded-circle small fw-black d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="fw-black text-main small text-uppercase tracking-tight">{lead.name}</span>
                </div>
              </td>
              <td>
                 <div className="d-flex flex-column">
                   <span className="text-primary small fw-black tracking-tighter" style={{ fontSize: '11px' }}>{lead.mobile}</span>
                   <small className="text-muted fw-bold opacity-30" style={{ fontSize: '8px' }}>{lead.email || 'NO_MAIL'}</small>
                 </div>
              </td>
              <td>
                 <span className="text-muted small fw-bold opacity-75" style={{fontSize: '10px'}}>{lead.college || '—'}</span>
              </td>
              <td className="text-center">
                {getStatusBadge(lead.status)}
              </td>
              <td>
                <div className="d-flex align-items-center gap-2">
                  <div className={`p-1 rounded-circle ${lead.assignedToId ? 'bg-success' : 'bg-muted opacity-25'}`} style={{ width: '6px', height: '6px' }}></div>
                  <span className={`small fw-black text-uppercase tracking-tighter ${lead.assignedToId ? 'text-main' : 'text-muted italic opacity-50'}`} style={{ fontSize: '9px' }}>
                    {lead.assignedToName?.split(' ')[0] || 'UNSYNCED'}
                  </span>
                </div>
              </td>
              {showActions && (
                <td className="pe-4">
                  <div className="d-flex align-items-center justify-content-end gap-1">
                    <button 
                      className={`p-2 border-0 bg-transparent transition-smooth rounded-circle hover-scale ${activeCall ? 'opacity-25 pointer-events-none' : 'text-primary hover:bg-primary hover:bg-opacity-10'}`} 
                      title={activeCall ? "Interaction Blocked: Current Session Active" : "Initiate Terminal Connection"}
                      disabled={isStartingCall || !!activeCall}
                      onClick={() => handleStartCall(lead)}
                    >
                      <Phone size={15} />
                    </button>

                    <button 
                      className="p-2 border-0 bg-transparent text-warning hover-scale transition-smooth rounded-circle hover:bg-warning hover:bg-opacity-10" 
                      title="Edit Lead Details"
                      onClick={() => onEdit ? onEdit(lead) : setSelectedEditLead(lead)}
                    >
                      <Edit size={15} />
                    </button>
                    {['PAID', 'CONVERTED', 'EMI', 'SUCCESSFUL'].includes(lead.status) && (
                      <button 
                        className="p-2 border-0 bg-transparent text-info hover-scale transition-smooth rounded-circle hover:bg-info hover:bg-opacity-10" 
                        title="View Invoice"
                        onClick={() => onViewInvoice && onViewInvoice(lead)}
                      >
                        <BookOpen size={15} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </>
          )}
        />
      </div>

      {selectedOutcomeLead && (
        <CallOutcomeModal 
          isOpen={!!selectedOutcomeLead}
          onClose={() => setSelectedOutcomeLead(null)}
          lead={selectedOutcomeLead}
          theme={isDarkMode ? 'dark' : 'light'}
          onSendPaymentLink={onSendPaymentLink}
          onSubmit={async (data) => {
            if (onRecordCallOutcome) {
              await onRecordCallOutcome(selectedOutcomeLead.id, data);
            } else {
              onUpdateStatus(selectedOutcomeLead.id, data.status, data);
            }
            setSelectedOutcomeLead(null);
          }}
        />
      )}


      {selectedEditLead && (
        <LeadEditModal 
          isOpen={!!selectedEditLead}
          onClose={() => setSelectedEditLead(null)}
          lead={selectedEditLead}
          onUpdate={onUpdateLead}
          role={role}
        />
      )}
    </div>
  );
};

export default LeadTable;
