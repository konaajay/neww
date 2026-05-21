import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Link as LinkIcon, Copy, Plus, Trash2, CheckCircle2, ExternalLink } from 'lucide-react';

import './WebinarManagement.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://3.84.147.168:8080";

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
    </div>
  );
};

export default WebinarManagement;
