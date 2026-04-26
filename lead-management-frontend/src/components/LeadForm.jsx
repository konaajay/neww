import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LeadForm = ({ onSubmit, title = "Add New Lead", initialData = {} }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    mobile: initialData.mobile || '',
    college: initialData.college || '',
  });

  // Effect to sync with initialData if it changes
  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        mobile: initialData.mobile || '',
        college: initialData.college || '',

      });
    }
  }, [initialData]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const success = await onSubmit(formData);
      if (success) {
        setFormData({ name: '', email: '', mobile: '', college: '' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-100 animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4 shadow-glow border border-primary border-opacity-20 animate-pulse-slow">
          <UserPlus size={24} strokeWidth={1.5} />
        </div>
        <div>
          <h4 className="fw-black text-main mb-1 text-uppercase tracking-widest">{title || "Add Lead"}</h4>
          <div className="d-flex align-items-center gap-2">
            <span className="p-1 bg-success rounded-circle animate-pulse" style={{ width: '6px', height: '6px' }}></span>
            <small className="text-muted fw-bold opacity-50 tracking-tighter" style={{ fontSize: '9px' }}>READY TO SAVE • DATA SECURED</small>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="d-flex flex-column h-100">
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <div className="form-floating group">
              <input
                name="name"
                className={`form-control ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input`}
                placeholder="Lead Name"
                value={formData.name || ''}
                onChange={handleChange}
                autoComplete="off"
                required
                style={{ fontSize: '14px', height: '55px', fontWeight: '600' }}
              />
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3 pt-3`} style={{ fontSize: '10px' }}>Name</label>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="form-floating group">
              <input
                name="mobile"
                className={`form-control ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input`}
                placeholder="Phone Number"
                value={formData.mobile || ''}
                onChange={handleChange}
                autoComplete="off"
                required
                style={{ fontSize: '14px', height: '55px', fontWeight: '600' }}
              />
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3 pt-3`} style={{ fontSize: '10px' }}>Phone</label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-floating group">
              <input
                name="college"
                className={`form-control ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input`}
                placeholder="College/University"
                value={formData.college || ''}
                onChange={handleChange}
                autoComplete="off"
                style={{ fontSize: '14px', height: '55px', fontWeight: '600' }}
              />
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3 pt-3`} style={{ fontSize: '10px' }}>College</label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-floating group">
              <input
                name="email"
                type="email"
                className={`form-control ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input`}
                placeholder="Email Address"
                value={formData.email || ''}
                onChange={handleChange}
                autoComplete="off"
                style={{ fontSize: '14px', height: '55px', fontWeight: '600' }}
              />
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3 pt-3`} style={{ fontSize: '10px' }}>Mail</label>
            </div>
          </div>
        </div>

          <div className="mt-4 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`ui-btn ui-btn-primary w-100 py-3 rounded-pill fw-black text-uppercase d-flex align-items-center justify-content-center gap-3 shadow-glow transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover-scale'}`}
              style={{ letterSpacing: '4px', fontSize: '13px', minHeight: '60px' }}
            >
              {isSubmitting ? (
                <div className="d-flex align-items-center gap-3">
                  <div className="spinner-border spinner-border-sm" role="status"></div>
                  <span>ADDING LEAD...</span>
                </div>
              ) : (
                <>
                  <div className={`p-2 px-3 ${isDarkMode ? 'bg-white bg-opacity-10' : 'bg-dark bg-opacity-10'} rounded-pill border border-white border-opacity-10`}>
                    <UserPlus size={18} />
                  </div>
                  ADD LEAD
                </>
              )}
            </button>
            <div className="d-flex align-items-center justify-content-center gap-3 mt-4 opacity-30">
              <div className="h-1px bg-white bg-opacity-10 flex-grow-1"></div>
              <p className="text-muted small fw-bold mb-0 text-uppercase tracking-widest" style={{ fontSize: '7px' }}>V-PROTOCOL SECURED</p>
              <div className="h-1px bg-white bg-opacity-10 flex-grow-1"></div>
            </div>
          </div>
      </form>
    </div>
  );
};

export default LeadForm;
