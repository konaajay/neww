import React from 'react';
import ReactDOM from 'react-dom';
import { Clock, User, ArrowRight, Activity, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/api';
import { useTheme } from '../context/ThemeContext';

const LeadHistoryModal = ({ isOpen, onClose, lead, onEdit }) => {
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

  // Use light theme colors as requested
  const bgColor = '#ffffff';
  const surfaceColor = '#f8fafc';
  const textColor = '#0f172a';
  const mutedColor = '#64748b';
  const borderColor = 'rgba(0, 0, 0, 0.05)';

  const modalContent = (
    <div 
      className="history-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#ffffff',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        className="history-modal-container shadow-2xl animate-modal-pop"
        style={{
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          background: bgColor,
          borderRadius: '24px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: `1px solid ${borderColor}`
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 d-flex align-items-center justify-content-between border-bottom" style={{ background: surfaceColor, borderColor: borderColor }}>
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-10 rounded-3 text-primary shadow-sm">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-uppercase tracking-widest text-muted fw-bold mb-0" style={{ fontSize: '9px', opacity: 0.7 }}>Identity Log #{lead?.id}</p>
              <h5 className="fw-black mb-0" style={{ letterSpacing: '0.5px', color: textColor }}>{lead?.name?.toUpperCase()} HISTORY</h5>
            </div>
          </div>
          <button className="btn btn-link text-muted p-2 hover-bg-light rounded-circle border-0 transition-all" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-auto custom-scroll" style={{ flex: 1, background: bgColor }}>
          {isLoading ? (
            <div className="py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-3 text-muted small text-uppercase fw-black tracking-widest" style={{ fontSize: '10px' }}>Loading Registry...</p>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="py-5 text-center">
              <div className="p-4 bg-light rounded-circle d-inline-flex mb-4">
                <Clock size={48} className="text-muted opacity-30" />
              </div>
              <p className="fw-black text-uppercase tracking-widest mb-1" style={{ fontSize: '12px', color: textColor }}>No Activity Detected</p>
              <p className="text-muted small px-5">All modifications to this lead will appear here in chronological order.</p>
            </div>
          ) : (
            <div className="timeline-v3">
              {history.map((log, index) => (
                <div key={log.id} className="timeline-v3-item mb-4 ps-4 position-relative border-start" style={{ marginLeft: '10px', borderColor: 'rgba(79, 70, 229, 0.2)' }}>
                  <div className="timeline-v3-node" style={{ 
                    position: 'absolute', 
                    left: '-6px', 
                    top: '0', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: '#4f46e5',
                    boxShadow: '0 0 0 4px rgba(79, 70, 229, 0.1)'
                  }}></div>
                  
                  <div className="p-3 rounded-4 border hover-bg-light transition-all" style={{ background: surfaceColor, borderColor: borderColor }}>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="p-1 bg-white rounded shadow-sm text-primary">
                          <User size={10} />
                        </div>
                        <span className="fw-black small text-uppercase tracking-wider" style={{ fontSize: '10px', color: textColor }}>{log.changedByName}</span>
                      </div>
                      <span className="text-muted font-monospace" style={{ fontSize: '9px' }}>
                        {log.timestamp?.replace('T', ' ')}
                      </span>
                    </div>

                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <div className="px-2 py-1 bg-primary text-white rounded-pill fw-black text-uppercase" style={{ fontSize: '8px', letterSpacing: '1px' }}>{log.fieldName}</div>
                      <div className="d-flex align-items-center gap-3 bg-white px-3 py-2 rounded-3 border w-100 mt-1 shadow-sm" style={{ borderColor: borderColor }}>
                        <span className="text-muted small text-truncate" style={{ maxWidth: '40%' }}>{log.oldValue || 'NULL'}</span>
                        <ArrowRight size={14} className="text-primary opacity-30 flex-shrink-0" />
                        <span className="fw-bold small text-truncate flex-grow-1" style={{ color: textColor }}>{log.newValue}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-top bg-light d-flex gap-3" style={{ borderColor: borderColor }}>
          <button 
            className="ui-btn ui-btn-secondary w-50 rounded-pill py-3 fw-black text-uppercase tracking-widest shadow-sm" 
            style={{ fontSize: '11px' }} 
            onClick={onClose}
          >
            DISMISS LOG
          </button>
          <button 
            className="ui-btn ui-btn-primary w-50 rounded-pill py-3 fw-black text-uppercase tracking-widest shadow-lg" 
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
          @keyframes modal-pop {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .custom-scroll::-webkit-scrollbar { width: 4px; }
          .custom-scroll::-webkit-scrollbar-track { background: transparent; }
          .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); borderRadius: 10px; }
          .animate-modal-pop { animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .transition-all { transition: all 0.2s ease; }
        `}</style>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default LeadHistoryModal;
