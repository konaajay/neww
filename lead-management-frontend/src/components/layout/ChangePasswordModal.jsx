import React, { useState } from 'react';
import { X, Key, ShieldCheck, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Reset with OTP
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!user?.email) return toast.error('User email not found');
    try {
      setLoading(true);
      await authService.forgotPassword(user.email);
      toast.success('Identity verification code sent to your mail');
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

  return (
    <div className="modal-overlay d-flex align-items-center justify-content-center p-3" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 10000 
    }}>
      <div className="premium-card p-0 overflow-hidden shadow-2xl animate-scale-in border-0" style={{ width: '100%', maxWidth: '420px', borderRadius: '24px', background: '#ffffff' }}>
        {/* Header - Clean & High Contrast */}
        <div className="p-4 d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-xl text-white shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h5 className="fw-black text-white mb-0 text-uppercase tracking-widest small">Security Protocol</h5>
              <p className="text-white text-opacity-70 small mb-0 fw-bold" style={{ fontSize: '9px' }}>IDENTITY VERIFICATION REQUIRED</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-link text-white p-1 opacity-70 hover-opacity-100 border-0 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-white">
          {step === 1 ? (
            <div className="text-center py-4">
              <div className="mb-4 d-inline-flex p-4 bg-primary bg-opacity-5 rounded-pill border border-primary border-opacity-10 shadow-sm">
                <div className="p-3 bg-white rounded-pill shadow-sm border border-light">
                  <Mail size={40} className="text-primary" />
                </div>
              </div>
              <h6 className="fw-black text-dark mb-2 text-uppercase tracking-wider" style={{ fontSize: '14px' }}>Request OTP</h6>
              <p className="text-muted small mb-5 px-3 leading-relaxed">A 6-digit security code will be sent to your email to authorize this change.</p>
              
              <button 
                onClick={handleRequestOtp}
                disabled={loading}
                className="btn w-100 py-3 rounded-4 d-flex align-items-center justify-content-center gap-3 transition-all"
                style={{ background: '#4f46e5', color: '#ffffff', fontWeight: '900', border: 'none' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                <span className="text-uppercase tracking-widest" style={{ fontSize: '12px' }}>GET SECURITY CODE</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="d-flex flex-column gap-4 py-2">
              <div className="p-3 bg-light rounded-4 border border-success border-opacity-20 mb-2 text-center">
                <p className="text-success fw-black mb-0 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Secure Code Dispatched • Verify Below</p>
              </div>

              <div className="form-group">
                <label className="form-label text-muted fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '10px', letterSpacing: '1px' }}>6-Digit Authorization Code</label>
                <input
                  type="text"
                  maxLength="6"
                  className="form-control bg-light border-0 py-3 text-center fw-black tracking-widest rounded-4"
                  style={{ fontSize: '20px', letterSpacing: '8px', color: '#1f2937' }}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-muted fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '10px', letterSpacing: '1px' }}>New Security Passcode</label>
                <div className="position-relative">
                  <Key size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-primary" />
                  <input
                    type="password"
                    className="form-control bg-light border-0 py-3 ps-5 fw-bold rounded-4"
                    style={{ color: '#1f2937' }}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-2">
                <label className="form-label text-muted fw-bold text-uppercase mb-2 d-block" style={{ fontSize: '10px', letterSpacing: '1px' }}>Verify New Passcode</label>
                <div className="position-relative">
                  <Key size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-primary" />
                  <input
                    type="password"
                    className="form-control bg-light border-0 py-3 ps-5 fw-bold rounded-4"
                    style={{ color: '#1f2937' }}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="d-flex flex-column gap-3 pt-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="btn py-3 rounded-4 d-flex align-items-center justify-content-center gap-3 transition-all"
                  style={{ background: '#4f46e5', color: '#ffffff', fontWeight: '900', border: 'none' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  <span className="text-uppercase tracking-widest" style={{ fontSize: '12px' }}>FINALIZE UPDATE</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-link text-muted fw-bold text-decoration-none small border-0 transition-all"
                  style={{ fontSize: '11px' }}
                >
                  RESEND SECURITY CODE
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
