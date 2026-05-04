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

  // Dark Theme Colors (Premium Glassmorphism)
  const bgColor = '#0f172a';
  const surfaceColor = 'rgba(30, 41, 59, 0.7)';
  const textColor = '#f8fafc';
  const mutedColor = '#94a3b8';
  const borderColor = 'rgba(255, 255, 255, 0.1)';
  const accentColor = '#6366f1';

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
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '650px',
          maxHeight: '85vh',
          background: bgColor,
          borderRadius: '28px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 d-flex align-items-center justify-content-between border-bottom" style={{ background: 'rgba(255,255,255,0.03)', borderColor: borderColor }}>
          <div className="d-flex align-items-center gap-4">
            <div className="p-3 bg-primary bg-opacity-20 rounded-4 text-primary shadow-glow">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-uppercase tracking-widest text-primary fw-black mb-1" style={{ fontSize: '11px', letterSpacing: '2px' }}>Operational Audit Log</p>
              <h4 className="fw-black mb-0 text-white" style={{ letterSpacing: '0.5px', fontSize: '24px' }}>{lead?.name?.toUpperCase()}</h4>
            </div>
          </div>
          <button 
            className="btn btn-link text-white opacity-50 p-2 hover-opacity-100 transition-all border-0 shadow-none" 
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-auto custom-scroll" style={{ flex: 1 }}>
          
          {/* Compact Actions Section (Simplified) */}
          <div className="mb-5 d-flex flex-wrap gap-2 align-items-center">
             <button 
                className="btn btn-sm d-flex align-items-center gap-2 rounded-3 px-3 py-2 fw-black text-uppercase tracking-wider transition-all"
                style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontSize: '9px', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                onClick={() => onRecordCallOutcome && onRecordCallOutcome(lead)}
             >
                <Zap size={12} /> CALL OUTCOME
             </button>

             {isFinalized && (
                <>
                  <button 
                      className="btn btn-sm d-flex align-items-center gap-2 rounded-3 px-3 py-2 fw-black text-uppercase tracking-wider transition-all"
                      style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '9px', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                      onClick={() => onViewInvoice && onViewInvoice(lead)}
                  >
                      <FileText size={12} /> INVOICE
                  </button>
                  <button 
                      className="btn btn-sm d-flex align-items-center gap-2 rounded-3 px-3 py-2 fw-black text-uppercase tracking-wider transition-all"
                      style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', fontSize: '9px', border: '1px solid rgba(168, 85, 247, 0.2)' }}
                      onClick={() => navigate && navigate(`/leads/${lead.id}/fee-structure`)}
                  >
                      <Wallet size={12} /> FEE STRUCTURE
                  </button>
                </>
             )}
          </div>

          {isLoading ? (
            <div className="py-5 text-center">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
              <p className="mt-4 text-primary small text-uppercase fw-black tracking-widest">Decrypting Registry...</p>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="py-5 text-center">
              <div className="p-5 bg-white bg-opacity-5 rounded-circle d-inline-flex mb-4">
                <Clock size={64} className="text-white opacity-10" />
              </div>
              <p className="fw-black text-white text-uppercase tracking-widest mb-2" style={{ fontSize: '14px' }}>Timeline Empty</p>
              <p className="text-muted small px-5 mx-auto" style={{ maxWidth: '400px' }}>No historical modifications have been registered for this entity in the central cluster.</p>
            </div>
          ) : (
            <div className="timeline-container px-2">
              {history.map((log, index) => (
                <div key={log.id} className="timeline-item mb-5 ps-5 position-relative">
                  {/* Vertical Line */}
                  {index !== history.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: '11px',
                      top: '24px',
                      bottom: '-40px',
                      width: '2px',
                      background: 'linear-gradient(to bottom, #6366f1, transparent)',
                      opacity: 0.3
                    }}></div>
                  )}

                  {/* Icon Node */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '0', 
                    top: '0', 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '8px', 
                    background: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
                    zIndex: 2
                  }}>
                    {getIconForAction(log.fieldName)}
                  </div>
                  
                  <div className="p-4 rounded-4 border transition-all" style={{ background: surfaceColor, borderColor: borderColor }}>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-primary fw-black text-uppercase tracking-wider" style={{ fontSize: '12px' }}>{log.changedByName}</span>
                        <span className="text-white opacity-20 small">/</span>
                        <span className="text-muted fw-bold small text-uppercase" style={{ fontSize: '10px' }}>{log.action}</span>
                      </div>
                      <span className="text-muted font-monospace fw-bold" style={{ fontSize: '11px', opacity: 0.6 }}>
                        {log.timestamp?.replace('T', ' ')}
                      </span>
                    </div>

                    <div className="change-card p-3 rounded-3 bg-black bg-opacity-30 border border-white border-opacity-5">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-white bg-opacity-10 text-white rounded small fw-black text-uppercase" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                          {log.fieldName}
                        </span>
                      </div>
                      
                      <div className="d-flex align-items-center gap-4">
                        <div className="flex-grow-1 min-w-0">
                          <p className="text-muted mb-0 small text-uppercase fw-bold opacity-40" style={{ fontSize: '8px' }}>Previous</p>
                          <p className="text-white opacity-60 mb-0 text-truncate font-monospace" style={{ fontSize: '14px' }}>{log.oldValue || '∅ NULL'}</p>
                        </div>
                        <ArrowRight size={18} className="text-primary opacity-50 flex-shrink-0" />
                        <div className="flex-grow-1 min-w-0 text-end">
                          <p className="text-primary mb-0 small text-uppercase fw-bold opacity-40" style={{ fontSize: '8px' }}>Updated</p>
                          <p className="text-primary mb-0 text-truncate fw-black font-monospace" style={{ fontSize: '14px' }}>{log.newValue}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-top bg-black bg-opacity-20 d-flex gap-4" style={{ borderColor: borderColor }}>
          <button 
            className="ui-btn w-50 rounded-xl py-3 fw-black text-uppercase tracking-widest transition-all" 
            style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: textColor, border: `1px solid ${borderColor}` }} 
            onClick={onClose}
          >
            DISMISS LOG
          </button>
          <button 
            className="ui-btn ui-btn-primary w-50 rounded-xl py-3 fw-black text-uppercase tracking-widest shadow-glow transition-all" 
            style={{ fontSize: '12px' }} 
            onClick={() => {
              onClose();
              if (onEdit) onEdit(lead);
            }}
          >
            EDIT LEAD
          </button>
        </div>

        <style>{`
          .custom-scroll::-webkit-scrollbar { width: 6px; }
          .custom-scroll::-webkit-scrollbar-track { background: transparent; }
          .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
          .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
          
          .animate-fade-in { animation: fadeIn 0.3s ease-out; }
          .animate-modal-pop { animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
          
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modalPop { 
            from { opacity: 0; transform: scale(0.9) translateY(30px); } 
            to { opacity: 1; transform: scale(1) translateY(0); } 
          }
          
          .btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
          .transition-all { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
          .shadow-glow { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
        `}</style>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default LeadHistoryModal;
