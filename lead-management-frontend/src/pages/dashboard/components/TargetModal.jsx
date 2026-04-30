import React, { useState } from 'react';
import { Target, X, Check } from 'lucide-react';
import api from '../../../api/api';
import { toast } from 'react-toastify';

const TargetModal = ({ isOpen, onClose, userId, onSuccess }) => {
  const now = new Date();
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/targets/set', {
        userId,
        amount,
        month: parseInt(month),
        year: parseInt(year)
      });
      toast.success('Mission target synchronized');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Strategic alignment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop show d-flex align-items-center justify-content-center" style={{zIndex: 1060, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)'}}>
      <div className="premium-card p-4 animate-scale-in" style={{width: '400px', border: '1px solid rgba(255,255,255,0.1)'}}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle">
              <Target size={20} />
            </div>
            <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Set Revenue Goal</h5>
          </div>
          <button className="btn-close btn-close-white opacity-50" onClick={onClose}></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-4">
            <div className="col-12">
              <label className="fw-black text-muted small text-uppercase mb-2 d-block">Monthly Capital Target (₹)</label>
              <input
                type="number"
                className="ui-input w-100 bg-surface border-white border-opacity-5 text-main fw-black font-monospace"
                placeholder="Enter amount..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="col-8">
              <label className="fw-black text-muted small text-uppercase mb-2 d-block">Target Month</label>
              <select 
                className="ui-input w-100 bg-surface border-white border-opacity-5 text-main fw-black"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-4">
              <label className="fw-black text-muted small text-uppercase mb-2 d-block">Year</label>
              <select 
                className="ui-input w-100 bg-surface border-white border-opacity-5 text-main fw-black"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {[now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-3 bg-primary bg-opacity-5 rounded-3 border border-primary border-opacity-10 mb-4">
            <p className="small text-muted fw-bold mb-0 d-flex align-items-center gap-2">
              <Check size={12} className="text-primary" />
              Strategic alignment for lead {userId || 'system-wide'}
            </p>
          </div>

          <div className="d-flex gap-2">
            <button type="button" className="ui-btn ui-btn-outline w-50 justify-content-center" onClick={onClose} disabled={loading}>
              CANCEL
            </button>
            <button type="submit" className="ui-btn ui-btn-primary w-50 justify-content-center" disabled={loading}>
              {loading ? 'SYNCING...' : 'COMMIT TARGET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TargetModal;
