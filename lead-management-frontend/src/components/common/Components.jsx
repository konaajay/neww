import React from 'react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  type = 'button', 
  className = '', 
  disabled = false,
  ...props 
}) => {
  const baseClass = 'ui-btn';
  const variantClass = variant === 'primary' ? 'ui-btn-primary' : 'ui-btn-secondary';
  
  return (
    <button 
      type={type}
      className={`${baseClass} ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, title, subtitle, extra, className = '', ...props }) => {
  return (
    <div className={`premium-card p-4 h-100 ${className}`} {...props}>
      {(title || subtitle || extra) && (
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div>
              {title && <h5 className="fw-black mb-0 text-main" style={{ fontSize: '15px' }}>{title}</h5>}
              {subtitle && <small className="text-muted fw-bold opacity-50 text-uppercase tracking-widest mt-1 d-block" style={{ fontSize: '9px' }}>{subtitle}</small>}
            </div>
            {extra && <div className="d-flex align-items-center gap-2">{extra}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export const Input = ({ label, icon, className = '', ...props }) => {
  return (
    <div className="mb-3">
      {label && <label className="text-muted fw-bold small text-uppercase mb-2 d-block" style={{fontSize: '0.65rem', letterSpacing: '0.05em'}}>{label}</label>}
      <div className="position-relative">
        {icon && <div className="position-absolute translate-middle-y text-muted opacity-50" style={{ top: '50%', left: '14px' }}>{icon}</div>}
        <input className={`ui-input ${icon ? 'ps-5' : ''} ${className}`} {...props} />
      </div>
    </div>
  );
};

export const Table = ({ headers = [], data = [], renderRow, className = '' }) => {
  return (
    <div className={`table-responsive ${className}`}>
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr className="text-muted small fw-black border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            {headers?.map((header, idx) => (
              <th key={idx} className={`${idx === 0 ? 'ps-4' : ''} ${idx === (headers?.length - 1) ? 'pe-4 text-end' : ''}`} style={{ fontSize: '10px', textTransform: 'uppercase', tracking: '0.05em' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((item, idx) => (
            <tr key={idx} className="table-row border-bottom transition-all" style={{ borderColor: 'var(--border-color)' }}>
              {renderRow(item, idx)}
            </tr>
          ))}
          {(!data || data.length === 0) && (
            <tr>
              <td colSpan={headers?.length || 1} className="text-center p-5 text-muted fw-bold opacity-20">
                NO OPERATIONAL RECORDS FOUND
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
