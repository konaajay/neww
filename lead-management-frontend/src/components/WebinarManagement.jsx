import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Link as LinkIcon, Copy, Plus, Trash2, CheckCircle2, ExternalLink, Eye, X, Download, Loader } from 'lucide-react';
import Papa from 'papaparse';

import './WebinarManagement.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://32.199.180.3:8080";

const WebinarManagement = () => {
  const [webinars, setWebinars] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    eventDate: '',
    startTime: '',
    endTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [generatedLink, setGeneratedLink] = useState('');
  
  const [selectedWebinar, setSelectedWebinar] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch webinars on load
  useEffect(() => {
    fetchWebinars();
  }, []);

  const fetchWebinars = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/webinars`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWebinars(data);
      }
    } catch (err) {
      console.error('Error fetching webinars:', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setGeneratedLink('');

    try {
      const response = await fetch(`${API_BASE}/api/webinars/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          webinarTitle: formData.title,
          eventDate: formData.eventDate,
          startTime: formData.startTime.length === 5 ? `${formData.startTime}:00` : formData.startTime,
          endTime: formData.endTime.length === 5 ? `${formData.endTime}:00` : formData.endTime
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: 'Webinar created successfully!' });

        // Robustly extract the new ID from common response structures
        const newId = data.id || data.webinarId || data.ID || (data.data && data.data.id) || (data.webinar && data.webinar.id);

        if (newId) {
          // Construct the registration link
          const registrationUrl = `${window.location.origin}/registration/form?webinarId=${newId}`;
          setGeneratedLink(registrationUrl);
        } else {
          setGeneratedLink('Error: Backend did not return the webinar ID. Please find the link in the Recent Webinars table below.');
        }

        setFormData({ title: '', eventDate: '', startTime: '', endTime: '' });
        fetchWebinars();
      } else {
        setMessage({ type: 'error', text: 'Failed to create webinar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast here
    alert('Link copied to clipboard!');
  };

  const handleViewRegistrations = async (webinar) => {
    setSelectedWebinar(webinar);
    setIsModalOpen(true);
    setLoadingRegistrations(true);
    setRegistrations([]);
    try {
      const response = await fetch(`${API_BASE}/api/webinars/${webinar.id}/registrations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data);
      } else {
        console.error('Failed to fetch registrations');
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const downloadCSV = () => {
    if (!registrations || registrations.length === 0) return;
    const csvData = registrations.map((r, index) => ({
      'S.No': index + 1,
      'Full Name': r.fullName,
      'Email': r.email,
      'Phone': r.phone,
      'College Name': r.collegeName,
      'Department': r.department,
      'Year of Study': r.yearOfStudy,
      'Referral Source': r.referralSource || 'Direct',
      'CR Name': r.crName || 'N/A',
      'CR Phone': r.crPhone || 'N/A',
      'Friend Name': r.friendName || 'N/A',
      'Friend College': r.friendCollege || 'N/A',
      'Friend Phone': r.friendPhone || 'N/A',
      'Registration Date': r.registrationDate ? new Date(r.registrationDate).toLocaleString() : 'N/A'
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedWebinar?.webinarTitle || selectedWebinar?.title || 'webinar'}_registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="webinar-grid">

        {/* Left Side: Creation Form */}
        <div className="glass-panel webinar-form-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Plus size={20} style={{ color: 'var(--accent-primary)' }} />
              Create New Webinar
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fill in the details to generate a unique registration link.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Webinar Title *</label>
              <input
                type="text"
                name="title"
                required
                className="input-field"
                placeholder="e.g. Full Stack Development Masterclass"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Event Date *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="date"
                  name="eventDate"
                  required
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  value={formData.eventDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Start Time *</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="time"
                    name="startTime"
                    required
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    value={formData.startTime}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>End Time *</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="time"
                    name="endTime"
                    required
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    value={formData.endTime}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
              {loading ? 'Creating...' : 'Create Webinar & Generate Link'}
            </button>
          </form>

          {message.text && (
            <div className={`badge ${message.type === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ textAlign: 'center', padding: '10px' }}>
              {message.text}
            </div>
          )}

          {generatedLink && (
            <div style={{
              marginTop: '8px',
              padding: '16px',
              background: 'rgba(59, 130, 246, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-primary)' }}>Shareable Registration Link:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  className="input-field"
                  style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  value={generatedLink}
                />
                <button
                  onClick={() => copyToClipboard(generatedLink)}
                  className="btn-secondary"
                  style={{ padding: '8px' }}
                  title="Copy to clipboard"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Recent Webinars Table */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LinkIcon size={20} style={{ color: 'var(--accent-primary)' }} />
              Recent Webinars
            </h2>
            <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {webinars.length} Total
            </span>
          </div>

          <div>
            <table className="webinar-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--bg-secondary)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>WEBINAR DETAILS</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>DATE & TIME</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {webinars.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No webinars created yet.
                    </td>
                  </tr>
                ) : (
                  webinars.map((webinar) => (
                    <tr key={webinar.id} style={{ borderBottom: '1px solid var(--bg-secondary)', transition: 'background 0.2s' }}>
                      <td data-label="Webinar" style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{webinar.webinarTitle || webinar.title || 'Untitled Webinar'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {webinar.id}</div>
                      </td>
                      <td data-label="Schedule" style={{ padding: '16px' }}>
                        <div style={{ fontSize: '0.9rem' }}>{webinar.eventDate}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{webinar.startTime} - {webinar.endTime}</div>
                      </td>
                      <td data-label="Actions" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => copyToClipboard(`${window.location.origin}/registration/form?webinarId=${webinar.id}`)}
                          >
                            <Copy size={14} style={{ marginRight: '4px' }} /> Link
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => handleViewRegistrations(webinar)}
                          >
                            <Eye size={14} style={{ marginRight: '4px' }} /> View
                          </button>
                          <a
                            href={`/registration/form?webinarId=${webinar.id}`}
                            target="_blank"
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '1200px',
              maxHeight: '85vh',
              background: 'var(--bg-card)',
              backdropFilter: 'var(--glass-blur)',
              borderRadius: '24px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Webinar Registration Details
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '4px 0 0 0', color: 'var(--text-main)' }}>
                  {selectedWebinar?.webinarTitle || selectedWebinar?.title}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {registrations.length > 0 && (
                  <button
                    onClick={downloadCSV}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--primary)',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Download CSV"
                  >
                    <Download size={16} /> Export CSV
                  </button>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--border-color)',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: 'var(--bg-body)' }}>
              {loadingRegistrations ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyKey: 'center', padding: '60px 0', gap: '16px' }}>
                  <Loader className="animate-spin text-primary" size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Fetching registrations...</span>
                </div>
              ) : registrations.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
                  <div style={{
                    background: 'var(--border-color)',
                    padding: '16px',
                    borderRadius: '50%',
                    color: 'var(--text-muted)'
                  }}>
                    <Eye size={32} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '4px 0', color: 'var(--text-main)' }}>No Registrations Yet</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', maxWidth: '300px' }}>
                    Share the link to get students registered for this webinar.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Summary Card */}
                  <div style={{
                    background: 'var(--bg-card)',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Registered Students</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                        {registrations.length}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--success)',
                      padding: '8px 16px',
                      borderRadius: '30px',
                      fontSize: '0.85rem',
                      fontWeight: '700'
                    }}>
                      Active Form
                    </div>
                  </div>

                  {/* List / Table */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600', width: '50px' }}>#</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>STUDENT INFO</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>COLLEGE & ACADEMICS</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>CR REFERRAL</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>FRIEND REFERRAL</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>REG. DATE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, index) => (
                            <tr key={reg.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                              <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: '500' }}>{index + 1}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{reg.fullName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reg.email}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reg.phone}</div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{reg.collegeName}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                  {reg.department} • {reg.yearOfStudy} Year
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {reg.crName ? (
                                  <>
                                    <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{reg.crName}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{reg.crPhone || 'No Phone'}</div>
                                  </>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {reg.friendName ? (
                                  <>
                                    <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{reg.friendName}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{reg.friendPhone || 'No Phone'}</div>
                                    {reg.friendCollege && (
                                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{reg.friendCollege}</div>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                                {reg.registrationDate ? new Date(reg.registrationDate).toLocaleString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              background: 'transparent',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
                style={{ padding: '8px 24px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default WebinarManagement;
