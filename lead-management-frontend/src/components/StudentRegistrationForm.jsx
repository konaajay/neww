import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, Send, Calendar, XCircle, GraduationCap } from 'lucide-react';
import './StudentRegistrationForm.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://34.225.217.229:8080";

const StudentRegistrationForm = () => {
  const [searchParams] = useSearchParams();
  const webinarId = searchParams.get('webinarId');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    collegeName: '',
    department: '',
    yearOfStudy: '',
    crName: '',
    crPhone: '',
    friendName: '',
    friendCollege: '',
    friendPhone: '',
    confirmation: false,
    webinarId: webinarId || ''
  });

  const [status, setStatus] = useState(webinarId ? 'idle' : 'no-webinar');
  const [errors, setErrors] = useState({});
  const [webinarDetails, setWebinarDetails] = useState(null);
  const [activeColleges, setActiveColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);

  useEffect(() => {
    if (webinarId) {
      fetch(`${API_BASE}/api/webinars/${webinarId}`)
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => {
          if (data) {
            setWebinarDetails(data);
            if (data.expiryTime && new Date(data.expiryTime) < new Date()) {
              setStatus('expired');
            }
          }
        })
        .catch(() => { });
    }
  }, [webinarId]);

  // Fetch active colleges for dropdown
  useEffect(() => {
    setCollegesLoading(true);
    fetch(`${API_BASE}/api/colleges/active`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setActiveColleges(Array.isArray(data) ? data : []))
      .catch(() => setActiveColleges([]))
      .finally(() => setCollegesLoading(false));
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Required';
    if (!formData.email.trim()) {
      newErrors.email = 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Required';
    } else if (!/^\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }
    if (!formData.collegeName.trim()) newErrors.collegeName = 'Required';
    if (!formData.department.trim()) newErrors.department = 'Required';
    if (!formData.yearOfStudy) newErrors.yearOfStudy = 'Required';
    if (!formData.confirmation) newErrors.confirmation = 'You must confirm';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('loading');

    try {
      const response = await fetch(`${API_BASE}/api/form/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinarId: parseInt(formData.webinarId),
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          collegeName: formData.collegeName,
          department: formData.department,
          yearOfStudy: formData.yearOfStudy,
          referralSource: formData.crName || formData.friendName || 'Direct',
          confirmation: formData.confirmation,
          crName: formData.crName,
          crPhone: formData.crPhone,
          friendName: formData.friendName,
          friendPhone: formData.friendPhone,
          friendCollege: formData.friendCollege
        })
      });

      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Could not parse error response as JSON", responseText);
      }

      if (response.ok) {
        setStatus('success');
      } else {
        const errorMsg = data.error || data.message || responseText;
        console.error(`Server Error (${response.status}):`, errorMsg);

        if (errorMsg.toLowerCase().includes('already')) {
          setStatus('duplicate');
        } else if (errorMsg.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      setStatus('error');
    }
  };

  const renderFeedback = () => {
    if (status === 'idle' || status === 'loading') return null;

    let icon, title, message, typeClass;

    switch (status) {
      case 'success':
        icon = <CheckCircle2 size={48} />;
        title = "Registration Successful!";
        message = "Your certificate is being generated and will be sent to your email shortly.";
        typeClass = "success";
        break;
      case 'duplicate':
        icon = <AlertCircle size={48} />;
        title = "Already Submitted";
        message = "You have already registered for this webinar.";
        typeClass = "error";
        break;
      case 'expired':
        icon = <AlertCircle size={48} />;
        title = "Form Expired";
        message = "This webinar registration form is no longer accepting responses.";
        typeClass = "error";
        break;
      case 'no-webinar':
        icon = <AlertCircle size={48} />;
        title = "No Webinar Selected";
        message = "Please use the specific link provided for your webinar registration.";
        typeClass = "error";
        break;
      case 'error':
      default:
        icon = <XCircle size={64} />;
        title = "Oops!";
        message = "Something went wrong. Please check your connection to the server and try again.";
        typeClass = "error";
        break;
    }

    return (
      <div className="feedback-overlay">
        <div className={`feedback-card-inner ${typeClass}`}>
          <div className="feedback-icon-wrapper">
            {icon}
          </div>
          <h2 className="feedback-title">{title}</h2>
          <p className="feedback-message">{message}</p>

          {(status === 'error' || status === 'no-webinar') && (
            <button className="retry-btn" onClick={() => status !== 'no-webinar' && setStatus('idle')}>
              {status === 'no-webinar' ? 'Go to Home' : 'Try Again'}
            </button>
          )}

          {status === 'success' && (
            <div className="success-badge">
              <CheckCircle2 size={16} />
              Verification Email Sent
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="registration-container">
      <div className={`registration-card ${status !== 'idle' && status !== 'loading' ? 'has-feedback' : ''}`}>
        {renderFeedback()}

        {(status === 'idle' || status === 'loading') && (
          <>
            <div className="registration-header">
              <h1>{webinarDetails ? (webinarDetails.webinarTitle || webinarDetails.title || 'Webinar Registration') : 'Webinar Registration'}</h1>
              <p>
                {webinarDetails && webinarDetails.eventDate ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Calendar size={16} /> {webinarDetails.eventDate}
                  </span>
                ) : 'Please fill in your details to receive your certificate'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {webinarDetails && (webinarDetails.webinarTitle || webinarDetails.title) && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ color: 'var(--accent-primary)' }}>Registering For Webinar</label>
                  <input
                    type="text"
                    className="registration-input"
                    value={webinarDetails.webinarTitle || webinarDetails.title}
                    disabled
                    style={{ background: 'var(--bg-secondary)', fontWeight: '600', color: 'var(--text-primary)' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  className={`registration-input ${errors.fullName ? 'error' : ''}`}
                  placeholder="e.g. John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                />
                {errors.fullName && <span className="error-text">{errors.fullName}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    className={`registration-input ${errors.email ? 'error' : ''}`}
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    className={`registration-input ${errors.phone ? 'error' : ''}`}
                    placeholder="10-digit number"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">College Name *</label>
                {collegesLoading ? (
                  <div className="registration-input d-flex align-items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 size={16} className="spin-loader" /> Loading colleges...
                  </div>
                ) : (
                  <select
                    name="collegeName"
                    className={`registration-input ${errors.collegeName ? 'error' : ''}`}
                    value={formData.collegeName}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                    style={{ maxWidth: '100%', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Select College</option>
                    {activeColleges.map(c => (
                      <option key={c.id} value={c.collegeName?.trim()}>{c.collegeName?.trim()}</option>
                    ))}
                  </select>
                )}
                {errors.collegeName && <span className="error-text">{errors.collegeName}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    name="department"
                    className={`registration-input ${errors.department ? 'error' : ''}`}
                    placeholder="e.g. CSE"
                    value={formData.department}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  />
                  {errors.department && <span className="error-text">{errors.department}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Year of Study *</label>
                  <select
                    name="yearOfStudy"
                    className={`registration-input ${errors.yearOfStudy ? 'error' : ''}`}
                    value={formData.yearOfStudy}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  >
                    <option value="">Select Year</option>
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                  </select>
                  {errors.yearOfStudy && <span className="error-text">{errors.yearOfStudy}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CR Name (Optional)</label>
                  <input
                    type="text"
                    name="crName"
                    className="registration-input"
                    placeholder="Class Representative"
                    value={formData.crName}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CR Phone (Optional)</label>
                  <input
                    type="tel"
                    name="crPhone"
                    className="registration-input"
                    placeholder="CR's Phone"
                    value={formData.crPhone}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Friend Name (Optional)</label>
                <input
                  type="text"
                  name="friendName"
                  className="registration-input"
                  placeholder="Refer a friend"
                  value={formData.friendName}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Friend's College (Optional)</label>
                  <input
                    type="text"
                    name="friendCollege"
                    className="registration-input"
                    placeholder="Friend's college"
                    value={formData.friendCollege}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Friend's Mobile (Optional)</label>
                  <input
                    type="tel"
                    name="friendPhone"
                    className="registration-input"
                    placeholder="Friend's phone"
                    value={formData.friendPhone}
                    onChange={handleChange}
                    disabled={status === 'loading'}
                  />
                </div>
              </div>

              <div className="checkbox-group" onClick={() => !status === 'loading' && handleChange({ target: { name: 'confirmation', type: 'checkbox', checked: !formData.confirmation } })}>
                <input
                  type="checkbox"
                  name="confirmation"
                  checked={formData.confirmation}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                  onClick={(e) => e.stopPropagation()}
                />
                <label className="checkbox-label">
                  I confirm that the details provided are correct and I am eligible for the certificate.
                </label>
              </div>
              {errors.confirmation && <p className="error-text" style={{ marginTop: '-24px', marginBottom: '24px', marginLeft: '40px' }}>{errors.confirmation}</p>}

              <button
                type="submit"
                className="submit-btn"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="loader" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Details
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentRegistrationForm;
