import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ShieldHalf, Eye, EyeOff, Lock, User } from 'lucide-react';
import ForgotPasswordModal from '../components/layout/ForgotPasswordModal';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const role = (user.role || '').toUpperCase();
      let target = '/associate';
      if (role === 'ADMIN') target = '/admin';
      else if (role === 'MANAGER' || role === 'MGR') target = '/manager';
      else if (role.includes('TEAM_LEADER') || role.includes('TL') || role.includes('TEAM_LEAD') || role.includes('TEAMLEAD')) target = '/tl';
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please enter your credentials');
    try {
      setLoading(true);
      const user = await login(email, password);
      toast.success('Login Successful');

      const role = (user?.role || '').toUpperCase();
      let target = '/associate';
      if (role === 'ADMIN') target = '/admin';
      else if (role === 'MANAGER' || role === 'MGR') target = '/manager';
      else if (role.includes('TEAM_LEADER') || role.includes('TL') || role.includes('TEAM_LEAD') || role.includes('TEAMLEAD')) target = '/tl';

      navigate(target, { replace: true });
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.response?.data?.message || 'Invalid Username or Password');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center position-relative overflow-hidden" style={{
      background: '#030712',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Animated Background Accents */}
      <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="position-absolute" style={{
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          top: '-200px', left: '-100px',
          animation: 'float 20s infinite alternate ease-in-out'
        }} />
        <div className="position-absolute" style={{
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          bottom: '-100px', right: '-50px',
          animation: 'float 15s infinite alternate-reverse ease-in-out'
        }} />
      </div>

      <div className="container position-relative" style={{ maxWidth: '440px', zIndex: 1 }}>
        {/* Premium Branding */}
        <div className="text-center mb-5 animate-fade-in">
          <div className="mb-4 d-inline-block transition-smooth hover-scale">
            <img src="/logo.png" alt="Logo" style={{ width: '82px', height: '82px', objectFit: 'contain' }} />
          </div>
          <h1 className="fw-black text-white mb-2 tracking-widest text-uppercase" style={{ fontSize: '2.5rem', letterSpacing: '0.2em' }}>
            GYANTRIX
          </h1>
          <div className="d-flex align-items-center justify-content-center gap-2 opacity-50">
            <span className="h-1px bg-white w-20px"></span>
            <p className="text-white small mb-0 fw-bold tracking-widest text-uppercase" style={{ fontSize: '9px' }}>Strategic Intelligence Gateway</p>
            <span className="h-1px bg-white w-20px"></span>
          </div>
        </div>

        {/* Glassmorphic Card */}
        <div className="glass-card p-4 p-md-5 animate-slide-up" style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
            <div className="form-group">
              <label className="form-label fw-black text-white small text-uppercase mb-3 tracking-widest opacity-40" style={{ fontSize: '10px' }}>USERNAME</label>
              <div className="position-relative group">
                <User size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-primary opacity-50 transition-smooth" />
                <input
                  type="email"
                  className="form-control ps-5 py-3 border-0 bg-white bg-opacity-5 text-white"
                  placeholder="Enter your credentials..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ fontSize: '14px', borderRadius: '16px', transition: 'all 0.3s ease' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="form-label fw-black text-white small text-uppercase tracking-widest opacity-40" style={{ fontSize: '10px' }}>Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="btn btn-link p-0 text-primary text-decoration-none small fw-black tracking-widest"
                  style={{ fontSize: '9px' }}
                >
                  FORGOT?
                </button>
              </div>
              <div className="position-relative">
                <Lock size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-primary opacity-50 transition-smooth" />
                <input
                  type={show ? 'text' : 'password'}
                  className="form-control ps-5 py-3 border-0 bg-white bg-opacity-5 text-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ fontSize: '14px', borderRadius: '16px', transition: 'all 0.3s ease' }}
                  required
                />
                <button
                  type="button"
                  className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-1 text-muted border-0 shadow-none opacity-40 hover-opacity-100"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-3 rounded-4 fw-black text-uppercase mt-3 shadow-glow transition-smooth hover-scale"
              disabled={loading}
              style={{
                fontSize: '13px',
                letterSpacing: '3px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none'
              }}
            >
              {loading ? (
                <div className="d-flex align-items-center justify-content-center gap-2">
                  <span className="spinner-border spinner-border-sm" />
                  <span>Authorizing...</span>
                </div>
              ) : (
                'LOGIN'
              )}
            </button>
          </form>
        </div>

        {/* System Metadata Footer */}
        <div className="text-center mt-5 opacity-30 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-white small fw-bold tracking-widest text-uppercase mb-0" style={{ fontSize: '8px' }}>
            GYANTRIX OS &copy; 2026 | SECURE GATEWAY AUTHORIZED
          </p>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />

      <style>{`
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .w-20px { width: 20px !important; }
        .h-1px { height: 1px !important; }
        
        input:focus {
          background: rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2) !important;
          outline: none;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 40px); }
        }
        
        .shadow-glow {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }
        
        .hover-scale:hover {
          transform: scale(1.02);
        }
        
        .transition-smooth {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;