import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';
import { X, Key, ShieldCheck, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!user?.email) return toast.error('User email not found');
    try {
      setLoading(true);
      await authService.forgotPassword(user.email);
      toast.success('Security code sent successfully');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate security code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passcodes do not match');
    if (newPassword.length < 6) return toast.error('Passcode must be at least 6 characters');

    try {
      setLoading(true);
      await authService.resetPassword(user.email, otp, newPassword);
      toast.success('Security passcode updated successfully');
      onClose();
      setStep(1);
      setOtp('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay d-flex justify-content-center align-items-start p-3" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 10000,
      overflowY: 'auto'
    }}>
      <div className="premium-card p-0 overflow-hidden shadow-2xl animate-zoom-in border-0"
        style={{
          width: '100%',
          maxWidth: '380px',
          borderRadius: '20px',
          background: '#ffffff',
          marginTop: '12vh',
          marginBottom: '10vh'
        }}>
        {/* Header - Ultra Clean & Minimalist */}
        <div className="p-3 d-flex align-items-center justify-content-between border-bottom border-light">
          <div className="d-flex align-items-center gap-3 ps-1">
            <div className="text-primary opacity-80">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h5 className="fw-black text-dark mb-0 text-uppercase tracking-widest" style={{ fontSize: '10px', letterSpacing: '2px' }}>Security Protocol</h5>
              <p className="text-muted small mb-0 fw-bold opacity-40" style={{ fontSize: '8px' }}>VERIFICATION REQUIRED</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-link p-2 rounded-circle text-dark opacity-30 hover-opacity-100 border-0 transition-all d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 bg-white">
          {step === 1 ? (
            <div className="text-center py-2">
              <div className="mb-4 d-inline-flex position-relative">
                <div className="p-3 bg-white rounded-pill border border-light shadow-sm">
                  <Mail size={40} className="text-primary opacity-60" />
                </div>
              </div>
              <h5 className="fw-black text-dark mb-2 text-uppercase tracking-widest" style={{ fontSize: '15px' }}>Request OTP</h5>
              <p className="text-muted small mb-5 px-3 leading-relaxed">A security code will be sent to your email to authorize this change.</p>

              <button
                onClick={handleRequestOtp}
                disabled={loading}
                className="w-100 py-3 rounded-4 d-flex align-items-center justify-content-center gap-3 transition-all"
                style={{ 
                  background: '#4f46e5', 
                  color: '#ffffff',
                  height: '52px', 
                  fontSize: '12px', 
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: '900',
                  letterSpacing: '1px'
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                <span className="text-uppercase tracking-widest">Send Security Code</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="d-flex flex-column gap-3 py-1 animate-fade-in" autoComplete="off">
              <div className="p-2 border border-success border-opacity-20 rounded-3 mb-2 text-center bg-white">
                <p className="text-success fw-bold mb-0 text-uppercase tracking-widest" style={{ fontSize: '9px' }}>
                  Code Dispatched • Verify Below
                </p>
              </div>

              <div className="form-group">
                <label className="form-label text-muted fw-bold text-uppercase mb-2 d-block px-1" style={{ fontSize: '9px', letterSpacing: '1.5px', background: 'transparent' }}>6-Digit Authorization Code</label>
                <input
                  type="text"
                  maxLength="6"
                  name="secure_otp_input_unique"
                  id="secure_otp_input_unique"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  className="form-control bg-white border border-light py-3 text-center fw-black tracking-widest rounded-3"
                  style={{ fontSize: '20px', letterSpacing: '8px', color: '#1e293b' }}
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-muted fw-bold text-uppercase mb-2 d-block px-1" style={{ fontSize: '9px', letterSpacing: '1.5px' }}>New Security Passcode</label>
                <div className="position-relative">
                  <Key size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-primary opacity-40" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="form-control bg-light border-0 py-3 ps-5 fw-bold rounded-3"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-muted fw-bold text-uppercase mb-2 d-block px-1" style={{ fontSize: '9px', letterSpacing: '1.5px' }}>Verify New Passcode</label>
                <div className="position-relative">
                  <Key size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-primary opacity-40" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="form-control bg-light border-0 py-3 ps-5 fw-bold rounded-3"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="d-flex flex-column gap-3 pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-100 py-3 rounded-4 d-flex align-items-center justify-content-center gap-3 transition-all shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    height: '52px',
                    fontSize: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: '900',
                    letterSpacing: '1px'
                  }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  <span className="text-uppercase tracking-widest fw-black">Finalize Update</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-link text-muted fw-bold text-decoration-none small border-0 transition-all hover-text-primary"
                  style={{ fontSize: '10px', letterSpacing: '1px' }}
                >
                  RESEND SECURITY CODE
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChangePasswordModal;
