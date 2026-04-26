import React from 'react';
import { useTheme } from '../context/ThemeContext';

const StatCard = ({ title, value, sub, icon, color = 'primary', unit = 'Nodes', onClick }) => {
  const { isDarkMode } = useTheme();
  
  const colorMap = {
    primary: { base: '#3b82f6', light: 'rgba(59, 130, 246, 0.1)', shadow: 'rgba(59, 130, 246, 0.3)' },
    success: { base: '#10b981', light: 'rgba(16, 185, 129, 0.1)', shadow: 'rgba(16, 185, 129, 0.3)' },
    warning: { base: '#f59e0b', light: 'rgba(245, 158, 11, 0.1)', shadow: 'rgba(245, 158, 11, 0.3)' },
    danger: { base: '#ef4444', light: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.3)' },
    info: { base: '#06b6d4', light: 'rgba(6, 182, 212, 0.1)', shadow: 'rgba(6, 182, 212, 0.3)' },
    secondary: { base: '#6366f1', light: 'rgba(99, 102, 241, 0.1)', shadow: 'rgba(99, 102, 241, 0.3)' },
    pink: { base: '#ec4899', light: 'rgba(236, 72, 153, 0.1)', shadow: 'rgba(236, 72, 153, 0.3)' }
  };

  const themeColor = colorMap[color] || colorMap.primary;

  return (
    <div 
      className={`premium-card h-100 overflow-hidden relative border-0 shadow-lg group transition-all ${onClick ? 'hover-translate-y cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Dynamic Background Glow removed */}
      
      <div className="card-body p-3 relative z-10 d-flex flex-column h-100">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="p-2 rounded-3 shadow-sm transition-all group-hover:scale-105" 
               style={{ backgroundColor: themeColor.light, color: themeColor.base, border: `1px solid ${themeColor.base}20` }}>
            {React.cloneElement(icon, { size: 18, strokeWidth: 2.5 })}
          </div>
          <div>
            <div className="text-muted fw-black text-uppercase tracking-widest mb-0 opacity-50" style={{ fontSize: '8px' }}>{title}</div>
            <div className="d-flex align-items-baseline gap-1">
                <h4 className="fw-black text-main mb-0 tracking-tighter" style={{ fontSize: '1.25rem' }}>{value}</h4>
                {unit && (
                  <span className="small text-muted fw-bold opacity-50 font-monospace" style={{ fontSize: '10px' }}>{unit}</span>
                )}
            </div>
          </div>
        </div>

        {/* <div className="mt-auto">
          <div className="p-2 rounded-3 bg-surface bg-opacity-40 border border-white border-opacity-5 relative overflow-hidden backdrop-blur-sm">
              <div className="d-flex justify-content-between align-items-center mb-1 gap-2">
                 <span className="text-muted fw-bold small opacity-50 text-uppercase tracking-widest text-truncate" style={{ fontSize: '7px', maxWidth: '70%' }}>{sub}</span>
                 <div className="d-flex align-items-center gap-1 flex-shrink-0">
                    <div className="p-0.5 rounded-circle" style={{ backgroundColor: themeColor.base }}></div>
                    <span className="fw-black text-main small text-uppercase" style={{ fontSize: '7px', color: themeColor.base }}>Verified</span>
                 </div>
              </div>
             <div className="progress overflow-hidden rounded-pill bg-white bg-opacity-5 mt-1" style={{ height: '3px' }}>
                <div className="progress-bar rounded-pill shadow-glow transition-all duration-1000" 
                     role="progressbar" 
                     style={{ width: '100%', backgroundColor: themeColor.base, boxShadow: `0 0 8px ${themeColor.shadow}` }}></div>
             </div>
          </div>
        </div> */}
      </div>

      <style>{`
        .hover-translate-y:hover { transform: translateY(-5px); }
        .duration-1000 { transition-duration: 1.5s; }
        .group:hover .shadow-glow { filter: brightness(1.2); }
      `}</style>
    </div>
  );
};

export default StatCard;
