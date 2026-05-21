import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/api';
 
const LeadForm = ({ onSubmit, title = "Add New Lead", initialData = {} }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    mobile: initialData.mobile || '',
    college: initialData.college || '',
    courseId: initialData.course?.id || '',
  });
 

  // Effect to sync with initialData if it changes
  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        mobile: initialData.mobile || '',
        college: initialData.college || '',
        courseId: initialData.course?.id || '',
      });
    }
  }, [initialData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);

  React.useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/admin/attendance/courses');
        setCourses(res.data || []);
      } catch (err) {
        console.error("Failed to load course list", err);
      }
    };
    fetchCourses();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number: Must be exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.mobile)) {
      alert("Phone number must be exactly 10 numeric digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(formData);
      if (success) {
        setFormData({ name: '', email: '', mobile: '', college: '', courseId: '' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-100 animate-fade-in">
      {title && (
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4 shadow-glow border border-primary border-opacity-20 animate-pulse-slow">
            <UserPlus size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="fw-black text-main mb-1 text-uppercase tracking-widest">{title}</h4>
            <div className="d-flex align-items-center gap-2">
              <span className="p-1 bg-success rounded-circle animate-pulse" style={{ width: '6px', height: '6px' }}></span>
              <small className="text-muted fw-bold opacity-50 tracking-tighter" style={{ fontSize: '9px' }}>READY TO SAVE • DATA SECURED</small>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="d-flex flex-column h-100 gap-4">
        <div className="row g-4 mb-2">
          <div className="col-12 col-md-6">
            <div className="form-floating group">
              <input
                name="name"
                className={`form-control ${isDarkMode ? 'bg-card border-white border-opacity-10 text-main' : 'bg-white border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input`}
                placeholder="Lead Name"
                value={formData.name || ''}
                onChange={handleChange}
                autoComplete="off"
                required
                style={{ fontSize: '14px', height: '60px', fontWeight: '600' }}
              />
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3`} style={{ fontSize: '10px', transform: 'scale(0.85) translateY(-0.5rem) translateX(0.15rem)' }}>Name</label>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="form-floating group">
              <input
                name="mobile"
                className={`form-control ${isDarkMode ? 'bg-card border-white border-opacity-10 text-main' : 'bg-white border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input ${initialData?.id ? 'opacity-50' : ''}`}
                placeholder="Phone Number"
                value={formData.mobile || ''}
                onChange={handleChange}
                autoComplete="off"
                required
                readOnly={!!initialData?.id}
                minLength="10"
                maxLength="10"
                pattern="\d{10}"
                style={{ fontSize: '14px', height: '60px', fontWeight: '600', cursor: initialData?.id ? 'not-allowed' : 'text' }}
              />
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3`} style={{ fontSize: '10px', transform: 'scale(0.85) translateY(-0.5rem) translateX(0.15rem)' }}>
                {initialData?.id ? 'Phone (Locked)' : 'Phone (10 Digits)'}
              </label>
            </div>
          </div>
          <div className="col-12">
            <div className="form-floating group">
              <input
                name="college"
                className={`form-control ${isDarkMode ? 'bg-card border-white border-opacity-10 text-main' : 'bg-white border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input`}
                placeholder="College/University"
                value={formData.college || ''}
                onChange={handleChange}
                autoComplete="off"
                style={{ fontSize: '14px', height: '60px', fontWeight: '600' }}
              />
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3`} style={{ fontSize: '10px', transform: 'scale(0.85) translateY(-0.5rem) translateX(0.15rem)' }}>College</label>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="form-floating group">
              <input
                name="email"
                type="email"
                className={`form-control ${isDarkMode ? 'bg-card border-white border-opacity-10 text-main' : 'bg-white border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input`}
                placeholder="Email Address"
                value={formData.email || ''}
                onChange={handleChange}
                autoComplete="off"
                style={{ fontSize: '14px', height: '60px', fontWeight: '600' }}
              />
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3`} style={{ fontSize: '10px', transform: 'scale(0.85) translateY(-0.5rem) translateX(0.15rem)' }}>Mail</label>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="form-floating group">
              <select
                name="courseId"
                className={`form-select ${isDarkMode ? 'bg-card border-white border-opacity-10 text-main' : 'bg-white border-dark border-opacity-10 text-dark'} py-3 px-3 shadow-none rounded-4 focus:border-primary transition-all custom-input`}
                value={formData.courseId || ''}
                onChange={handleChange}
                required
                style={{ fontSize: '14px', height: '60px', fontWeight: '600' }}
              >
                <option value="">-- SELECT COURSE --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name.toUpperCase()} (₹{c.baseFee})</option>
                ))}
              </select>
              <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-3`} style={{ fontSize: '10px', transform: 'scale(0.85) translateY(-0.5rem) translateX(0.15rem)' }}>Course Inquiry</label>
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
                  <span>{initialData?.id ? 'SAVING...' : 'ADDING...'}</span>
                </div>
              ) : (
                <>
                  <div className={`p-2 px-3 ${isDarkMode ? 'bg-white bg-opacity-10' : 'bg-dark bg-opacity-10'} rounded-pill border border-white border-opacity-10`}>
                    <UserPlus size={18} />
                  </div>
                  {initialData?.id ? 'SAVE CHANGES' : 'ADD LEAD'}
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
