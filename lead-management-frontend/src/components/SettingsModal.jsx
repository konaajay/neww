import React from 'react';
import { X, Save, Server, Shield, Mail } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Global Settings</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>
          Configure your email provider and delivery constraints.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Email Provider Section */}
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} color="var(--accent-primary)" />
              Email Provider
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{
                border: '1px solid var(--accent-primary)',
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '16px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>SMTP Server</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Custom mail server config</div>
              </div>
              <div style={{
                border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.02)',
                padding: '16px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>SendGrid API</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cloud-based delivery</div>
              </div>
            </div>
          </div>

          {/* SMTP Configuration */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="var(--accent-secondary)" />
              SMTP Configuration
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Host address</label>
                <input type="text" className="input-field" defaultValue="smtp.mail.provider.com" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Port</label>
                  <input type="text" className="input-field" defaultValue="587" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Security</label>
                  <select className="input-field" defaultValue="tls">
                    <option value="tls">STARTTLS</option>
                    <option value="ssl">SSL/TLS</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Configuration */}
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--accent-success)" />
              Safety & Limits
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: '500' }}>Batch Sending Rate</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Emails dispatched per minute</div>
              </div>
              <select className="input-field" style={{ width: 'auto' }} defaultValue="60">
                <option value="30">30 / min</option>
                <option value="60">60 / min</option>
                <option value="120">120 / min</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onClose}>
            <Save size={18} />
            Save Changes
          </button>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;
