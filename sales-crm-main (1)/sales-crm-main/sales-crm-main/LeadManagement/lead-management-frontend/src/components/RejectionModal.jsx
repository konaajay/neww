import React, { useState } from 'react';
import { X, Calendar, MessageSquare, Phone, Mail, MessageCircle } from 'lucide-react';

const RejectionModal = ({ isOpen, onClose, onSubmit, leadName, theme }) => {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpType, setFollowUpType] = useState('CALL');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      reason,
      note,
      followUpRequired: followUp,
      followUpDate: followUp ? followUpDate : null,
      followUpType: followUp ? followUpType : null
    });
  };

  const reasons = [
    'Not interested',
    'Too expensive',
    'Already purchased elsewhere',
    'No response',
    'Wrong number',
    'Other'
  ];

  return (
    <div className="modal-overlay animate-fade-in" style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', 
      backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', 
      justifyContent: 'center', zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass card full-width-mobile border-0" style={{ width: '95%', maxWidth: '500px', padding: '1.5rem', position: 'relative', background: 'var(--card-bg)', color: 'var(--text)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Reject Lead</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Why is <strong>{leadName}</strong> not interested?</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Reason (Required)</label>
            <select 
              required
              className="input glass border-0" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              style={{ background: 'var(--input-bg)', color: 'var(--text)' }}
            >
              <option value="">Select a reason</option>
              {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Detailed Note (Optional)</label>
            <textarea 
              className="input glass border-0" 
              placeholder="Provide more context..."
              style={{ minHeight: '80px', background: 'var(--input-bg)', color: 'var(--text)' }}
              value={note} 
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="followup"
              checked={followUp}
              onChange={(e) => setFollowUp(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="followup" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Schedule a follow-up later?</label>
          </div>

          {followUp && (
            <div className="animate-slide-up flex flex-col gap-4" style={{ padding: '1rem', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
              <div className="flex flex-col gap-1">
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }} className="flex items-center gap-2">
                  <Calendar size={14} /> Follow-up Date
                </label>
                <input 
                  type="datetime-local" 
                  className="input glass border-0" 
                  required={followUp}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  style={{ background: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Follow-up Method</label>
                <div className="flex gap-2">
                  {[
                    { id: 'CALL', icon: <Phone size={14} />, label: 'Call' },
                    { id: 'WHATSAPP', icon: <MessageCircle size={14} />, label: 'WA' },
                    { id: 'EMAIL', icon: <Mail size={14} />, label: 'Email' }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      className={`btn flex-1 flex items-center justify-center gap-2 border-0 ${followUpType === method.id ? 'btn-primary shadow-sm' : 'glass'}`}
                      style={{ padding: '0.5rem', fontSize: '0.8rem', background: followUpType === method.id ? '' : 'var(--input-bg)', color: followUpType === method.id ? 'white' : 'var(--text)' }}
                      onClick={() => setFollowUpType(method.id)}
                    >
                      {method.icon} {method.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button type="button" className="btn glass flex-1 border-0" style={{ background: 'var(--input-bg)', color: 'var(--text)' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1 shadow-sm">Confirm Rejection</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;
