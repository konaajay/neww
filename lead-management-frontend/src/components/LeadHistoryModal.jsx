import React from 'react';
import ReactDOM from 'react-dom';
import { Clock, User, ArrowRight, Activity, X, FileText, PhoneCall, Zap, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';

const LeadHistoryModal = ({ isOpen, onClose, lead, onEdit, onRecordCallOutcome, onViewInvoice, navigate }) => {
  const { isDarkMode } = useTheme();
  
  const { data: history, isLoading } = useQuery({
    queryKey: ['lead-history', lead?.id],
    queryFn: async () => {
      const res = await api.get(`/leads/${lead.id}/history`);
      return res.data;
    },
    enabled: !!lead?.id && isOpen,
  });

  if (!isOpen || !lead) return null;

  // Light Theme Colors (Clean, Simple, Calm)
  const bgColor = '#ffffff';
  const surfaceColor = '#f8fafc';
  const textColor = '#1e293b';
  const mutedColor = '#64748b';
  const borderColor = '#e2e8f0';
  const accentColor = '#3b82f6';

  const getIconForAction = (fieldName) => {
    switch (fieldName?.toUpperCase()) {
      case 'STATUS': return <Activity size={12} />;
      case 'ASSIGNMENT': return <User size={12} />;
      case 'NOTE': return <FileText size={12} />;
      case 'CALL': return <PhoneCall size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const isFinalized = ['PAID', 'CONVERTED', 'EMI'].includes(lead.status?.toUpperCase());

  const modalContent = (
    <div 
      className="history-modal-overlay animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        className="history-modal-container shadow-xl animate-modal-pop"
        style={{
          width: '100%',
          maxWidth: '550px',
          maxHeight: '80vh',
          background: bgColor,
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 d-flex align-items-center justify-content-between border-bottom" style={{ background: '#fff', borderColor: borderColor }}>
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-10 rounded-3 text-primary">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-uppercase tracking-widest text-muted fw-bold mb-0" style={{ fontSize: '9px', letterSpacing: '1.5px' }}>Operational History</p>
              <h5 className="fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.3px' }}>{lead?.name}</h5>
            </div>
          </div>
          <button 
            className="btn btn-link text-muted p-2 hover-bg-light transition-all border-0 shadow-none" 
            onClick={onClose}
            style={{ borderRadius: '8px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-auto custom-scroll" style={{ flex: 1, background: '#fcfdfe' }}>
          
          {isLoading ? (
            <div className="py-5 text-center">
              <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
              <p className="mt-3 text-muted small text-uppercase fw-bold tracking-widest">Loading Records...</p>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="py-5 text-center">
              <Clock size={48} className="text-muted opacity-20 mb-3" />
              <p className="fw-bold text-dark mb-1" style={{ fontSize: '13px' }}>No history found</p>
              <p className="text-muted small">This lead has no registered modifications yet.</p>
            </div>
          ) : (
            <div className="timeline-container ps-3">
              {history.map((log, index) => (
                <div key={log.id} className="timeline-item mb-4 ps-4 position-relative">
                  {/* Vertical Line */}
                  {index !== history.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: '6px',
                      top: '20px',
                      bottom: '-30px',
                      width: '1.5px',
                      background: '#e2e8f0'
                    }}></div>
                  )}

                  {/* Icon Node */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '0', 
                    top: '2px', 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    background: index === 0 ? accentColor : '#cbd5e1',
                    border: '3px solid #fff',
                    boxShadow: index === 0 ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                    zIndex: 2
                  }}></div>
                  
                  <div className="p-3 rounded-3 border bg-white shadow-sm" style={{ borderColor: borderColor }}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-dark fw-bold" style={{ fontSize: '11px' }}>{log.changedByName}</span>
                        <span className="badge bg-light text-muted fw-bold text-uppercase p-1 px-2" style={{ fontSize: '8px' }}>{log.action}</span>
                      </div>
                      <span className="text-muted fw-medium" style={{ fontSize: '10px' }}>
                        {log.timestamp?.replace('T', ' ').split('.')[0]}
                      </span>
                    </div>

                    <div className="p-2 rounded-2 bg-light border border-light d-flex align-items-center gap-3">
                        <div className="flex-grow-1 min-w-0">
                          <p className="text-muted mb-0 fw-bold text-uppercase" style={{ fontSize: '7px' }}>{log.fieldName || 'Update'}</p>
                          <p className="text-dark mb-0 text-truncate fw-medium" style={{ fontSize: '12px' }}>
                             {log.oldValue || '—'} <ArrowRight size={10} className="mx-1 text-muted" /> <span className="text-primary fw-bold">{log.newValue}</span>
                          </p>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-top bg-white d-flex gap-3" style={{ borderColor: borderColor }}>
          <button 
            className="btn btn-light w-50 rounded-3 py-2 fw-bold text-muted" 
            style={{ fontSize: '11px' }} 
            onClick={onClose}
          >
            DISMISS
          </button>
          <button 
            className="btn btn-primary w-50 rounded-3 py-2 fw-bold" 
            style={{ fontSize: '11px' }} 
            onClick={() => {
              onClose();
              if (onEdit) onEdit(lead);
            }}
          >
            EDIT LEAD
          </button>
        </div>

        <style>{`
          .custom-scroll::-webkit-scrollbar { width: 4px; }
          .custom-scroll::-webkit-scrollbar-track { background: transparent; }
          .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; borderRadius: 10px; }
          
          .animate-fade-in { animation: fadeIn 0.2s ease-out; }
          .animate-modal-pop { animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
          
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modalPop { 
            from { opacity: 0; transform: scale(0.95) translateY(10px); } 
            to { opacity: 1; transform: scale(1) translateY(0); } 
          }
          
          .btn { transition: all 0.2s ease; }
          .btn:hover { filter: brightness(0.95); }
        `}</style>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default LeadHistoryModal;
