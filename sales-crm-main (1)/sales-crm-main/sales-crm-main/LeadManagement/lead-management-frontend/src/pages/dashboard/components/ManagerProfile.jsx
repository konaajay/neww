import React from 'react';
import { ShieldCheck, Mail, Phone, User } from 'lucide-react';

const ManagerProfile = ({ manager }) => {
  if (!manager) return null;

  return (
    <div className="premium-card p-4 border border-primary border-opacity-10 bg-primary bg-opacity-5 animate-slide-in mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="p-3 bg-primary bg-opacity-20 rounded-circle text-primary border border-primary border-opacity-20 shadow-glow">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h6 className="fw-black text-main mb-0 text-uppercase tracking-widest small">Direct Superior</h6>
            <p className="text-muted small mb-0 fw-bold opacity-75">REPT-LINE AUTHORITY</p>
          </div>
        </div>
        <div className="ui-badge bg-primary text-white border-0 shadow-glow px-3 py-1 fw-black small">
          {manager.role || 'MANAGER'}
        </div>
      </div>
      
      <div className="row g-3">
        <div className="col-12 col-md-3">
          <div className="p-3 bg-surface rounded-4 border border-white border-opacity-5 h-100">
            <div className="d-flex align-items-center gap-2 mb-1">
              <User size={14} className="text-primary opacity-50" />
              <span className="text-muted fw-bold text-uppercase" style={{fontSize: '9px'}}>IDENTITY</span>
            </div>
            <div className="text-main fw-black">{manager.name || manager.username || 'Not Specified'}</div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="p-3 bg-surface rounded-4 border border-white border-opacity-5 h-100">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Mail size={14} className="text-primary opacity-50" />
              <span className="text-muted fw-bold text-uppercase" style={{fontSize: '9px'}}>COMMUNICATION</span>
            </div>
            <div className="text-main fw-black text-truncate">{manager.email || 'N/A'}</div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="p-3 bg-surface rounded-4 border border-white border-opacity-5 h-100">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Phone size={14} className="text-primary opacity-50" />
              <span className="text-muted fw-bold text-uppercase" style={{fontSize: '9px'}}>HOTLINE</span>
            </div>
            <div className="text-main fw-black">{manager.mobile || 'Private Reach'}</div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="p-3 bg-surface rounded-4 border border-white border-opacity-5 h-100 border-primary border-opacity-20 shadow-glow-sm">
            <div className="d-flex align-items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-primary opacity-50" />
              <span className="text-muted fw-bold text-uppercase" style={{fontSize: '9px'}}>REGISTRY INFO</span>
            </div>
            <div className="text-main fw-black" style={{fontSize: '11px'}}>
              <span className="opacity-50 me-1">JOINED:</span> 
              {manager.joiningDate || 'Date Not Set'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerProfile;
