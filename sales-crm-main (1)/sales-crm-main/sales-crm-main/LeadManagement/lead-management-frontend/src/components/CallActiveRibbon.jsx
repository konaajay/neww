import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle, Clock, Timer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CallActiveRibbon = ({ onEndCall }) => {
  const { activeCall } = useAuth();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval;
    if (activeCall) {
      const startTime = new Date(activeCall.startTime).getTime();
      interval = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  if (!activeCall) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed-bottom p-3 glass-header border-top border-primary animate-slide-up" style={{ zIndex: 10600, background: 'rgba(99, 102, 241, 0.9)', backdropFilter: 'blur(10px)' }}>
      <div className="container d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3 text-white">
          <div className="p-2 bg-white bg-opacity-20 rounded-circle animate-pulse">
            <Phone size={18} />
          </div>
          <div>
            <h6 className="mb-0 fw-black text-uppercase tracking-widest small">Active Interaction Terminal</h6>
            <p className="mb-0 x-small fw-bold opacity-75">TALKING TO: {activeCall.leadName} • {activeCall.phoneNumber}</p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2 text-white px-3 py-1 bg-black bg-opacity-20 rounded-pill border border-white border-opacity-10">
            <Timer size={14} className="text-warning" />
            <span className="fw-black tabular-nums">{formatTime(seconds)}</span>
          </div>
          
          <button 
            className="btn btn-light rounded-pill px-4 fw-black text-danger text-uppercase tracking-widest small shadow-lg hover-scale"
            onClick={() => onEndCall(activeCall)}
          >
            End Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallActiveRibbon;
