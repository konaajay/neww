import React, { useState } from 'react';
import { X, Mail, Key, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/api';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Email is required');
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });
      toast.success('Security code sent to your email');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 6) return toast.error('Password too short');

    try {
      setLoading(true);
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset successful. You can now login.');
      onClose();
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay d-flex align-items-center justify-content-center p-3" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000 
    }}>
      <div className="premium-card p-0 overflow-hidden shadow-2xl animate-scale-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="p-4 border-bottom border-white border-opacity-5 d-flex align-items-center justify-content-between bg-primary bg-opacity-5">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
              <Key size={20} />
            </div>
            <div>
              <h5 className="fw-black text-main mb-0 text-uppercase tracking-widest small">Identity Recovery</h5>
              <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>SECURE ACCESS RESTORATION</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-link text-main p-1 opacity-50 hover-opacity-100 border-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="d-flex flex-column gap-4 py-2">
              <div className="text-center">
                <div className="mb-3 d-inline-flex p-3 bg-primary bg-opacity-5 rounded-pill border border-primary border-opacity-10 shadow-glow-sm">
                  <Mail size={32} className="text-primary" />
                </div>
                <h6 className="fw-black text-main mb-2">Forgot Password?</h6>
                <p className="text-muted small px-2">Enter your email and we'll send an OTP to verify it's you.</p>
              </div>

              <div>
                <label className="form-label text-muted fw-bold text-uppercase" style={{ fontSize: '9px' }}>Registered Email</label>
                <input
                  type="email"
                  className="form-control bg-surface border-white border-opacity-10 py-2.5 fw-bold"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="ui-btn ui-btn-primary w-100 py-2.5 rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-glow"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                <span className="fw-black tracking-widest text-uppercase" style={{ fontSize: '11px' }}>SEND RECOVERY CODE</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="d-flex flex-column gap-3">
              <div className="p-3 bg-primary bg-opacity-5 rounded-4 border border-primary border-opacity-10 mb-2">
                <p className="text-primary fw-black text-center mb-0" style={{ fontSize: '10px' }}>CODE SENT TO {email}</p>
              </div>

              <div>
                <label className="form-label text-muted fw-bold text-uppercase" style={{ fontSize: '9px' }}>6-Digit Security Code</label>
                <input
                  type="text"
                  maxLength="6"
                  className="form-control bg-surface border-white border-opacity-10 py-2.5 text-center fw-black tracking-widest"
                  placeholder="0 0 0 0 0 0"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label text-muted fw-bold text-uppercase" style={{ fontSize: '9px' }}>Set New Password</label>
                <input
                  type="password"
                  className="form-control bg-surface border-white border-opacity-10 py-2.5 fw-bold"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label text-muted fw-bold text-uppercase" style={{ fontSize: '9px' }}>Confirm New Password</label>
                <input
                  type="password"
                  className="form-control bg-surface border-white border-opacity-10 py-2.5 fw-bold"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="d-flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-link text-muted fw-bold text-decoration-none small border-0"
                  style={{ fontSize: '10px' }}
                >
                  BACK
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="ui-btn ui-btn-primary flex-grow-1 py-2.5 rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-glow"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  <span className="fw-black tracking-widest text-uppercase" style={{ fontSize: '11px' }}>RESET PASSCODE</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
