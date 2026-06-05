import React, { useState } from 'react';
import { User, Mail, Award, Send, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { isRetryable } from '../utils/statusUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://3.84.147.168:8080";

const SingleGenerationForm = ({ onComplete, onDataChange }) => {
  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    webinarName: ''
  });

  React.useEffect(() => {
    if (onDataChange) {
      onDataChange(formData);
    }
  }, [formData, onDataChange]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_BASE}/api/certificates/single`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          studentName: formData.studentName,
          email: formData.email,
          webinarName: formData.webinarName
        })
      });

      const responseText = await response.text();

      if (response.ok || responseText.includes("Processing started")) {
        setStatus({
          type: 'success',
          message: responseText || 'Certificate queued — status: PENDING'
        });
        setFormData({ studentName: '', email: '', webinarName: '' });
        if (onComplete) onComplete();
      } else {
        throw new Error(responseText || 'Failed to generate certificate');
      }
    } catch (err) {
      const isRet = isRetryable(err.message);
      setStatus({
        type: 'error',
        message: `${err.message || 'Generation failed'} ${isRet ? '(Will be retried automatically)' : '(Terminal failure)'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} color="var(--accent-primary)" />
          Single Candidate Issuance
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Generate an individual certificate for a specific recipient.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Student Name"
            className="input-field"
            style={{ paddingLeft: '40px' }}
            value={formData.studentName}
            onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
            required
          />
        </div>

        <div style={{ position: 'relative' }}>
          <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="email"
            placeholder="Recipient Email"
            className="input-field"
            style={{ paddingLeft: '40px' }}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div style={{ position: 'relative' }}>
          <Award size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Webinar Name"
            className="input-field"
            style={{ paddingLeft: '40px' }}
            value={formData.webinarName}
            onChange={(e) => setFormData({ ...formData, webinarName: e.target.value })}
            required
          />
        </div>


        {status && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: status.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)',
            border: `1px solid ${status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {status.message}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ padding: '12px', marginTop: '4px' }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Zap className="spin-animation" size={18} />
              Generating...
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Send size={18} />
              Generate Certificate
            </div>
          )}
        </button>
      </form>
    </div>
  );
};

export default SingleGenerationForm;
