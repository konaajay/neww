import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ShieldHalf, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
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
    if (!email || !password) return toast.error('All fields required');
    try {
      setLoading(true);
      const user = await login(email, password);
      toast.success('Access Granted');

      const role = (user?.role || '').toUpperCase();
      let target = '/associate';
      if (role === 'ADMIN') target = '/admin';
      else if (role === 'MANAGER' || role === 'MGR') target = '/manager';
      else if (role.includes('TEAM_LEADER') || role.includes('TL') || role.includes('TEAM_LEAD') || role.includes('TEAMLEAD')) target = '/tl';

      navigate(target, { replace: true });
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.response?.data?.message || 'Authentication Failed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center" style={{
      background: 'radial-gradient(circle at top right, #1e1b4b 0%, #030712 50%, #020617 100%)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Background Decorative Elements */}
      <div className="position-absolute top-0 start-0 w-100 h-100 opacity-20" style={{ pointerEvents: 'none' }}>
        <div className="position-absolute top-0 end-0 rounded-circle bg-primary blur-3xl" style={{ width: '400px', height: '400px', transform: 'translate(30%, -30%)', filter: 'blur(100px)' }}></div>
        <div className="position-absolute bottom-0 start-0 rounded-circle bg-indigo-900 blur-3xl" style={{ width: '300px', height: '300px', transform: 'translate(-30%, 30%)', filter: 'blur(100px)' }}></div>
      </div>

      <div className="container position-relative z-index-10 animate-fade-in" style={{ maxWidth: '440px' }}>
        {/* Logo Section */}
        <div className="text-center mb-5 animate-slide-up">
          <div className="d-inline-flex p-3 bg-primary bg-opacity-10 rounded-pill border border-primary border-opacity-20 shadow-glow-sm mb-3">
            <ShieldHalf size={32} className="text-primary" />
          </div>
          <h2 className="fw-black text-main tracking-widest text-uppercase mb-1" style={{ letterSpacing: '4px' }}>GYANTRIX</h2>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-surface bg-opacity-30 rounded-pill border border-white border-opacity-5">
            <Sparkles size={10} className="text-warning" />
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-morphism rounded-4 p-4 p-md-5 shadow-2xl border border-white border-opacity-10 animate-slide-up hover-scale-sm transition-smooth"
          style={{
            animationDelay: '0.1s',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.05)'
          }}>

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
            <div className="form-group">
              <label className="text-white text-opacity-60 fw-black text-uppercase mb-2 d-block px-1" style={{ fontSize: '9px', letterSpacing: '1.5px' }}>USERNAME</label>
              <div className="position-relative">
                <Mail size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-white text-opacity-30" />
                <input
                  type="email"
                  className="form-control ps-5 text-white py-3 transition-all"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}
                  placeholder="admin@gyantrix.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                <label className="text-white text-opacity-60 fw-black text-uppercase d-block" style={{ fontSize: '9px', letterSpacing: '1.5px' }}>PASSWORD</label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="btn btn-link p-0 text-primary fw-bold text-uppercase text-decoration-none hover-opacity-100"
                  style={{ fontSize: '9px', opacity: 0.8 }}
                >
                  FORGET PASSWORD
                </button>
              </div>
              <div className="position-relative">
                <Lock size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-white text-opacity-30" />
                <input
                  type={show ? 'text' : 'password'}
                  className="form-control ps-5 text-white py-3 transition-all"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-1 text-white text-opacity-30 border-0 hover-opacity-80"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="ui-btn ui-btn-primary w-100 py-3 rounded-3 fw-black text-uppercase tracking-widest mt-2 shadow-glow-sm"
              disabled={loading}
              style={{ fontSize: '12px', height: '54px' }}
            >
              {loading ? (
                <div className="d-flex align-items-center justify-content-center gap-2">
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>VERIFYING...</span>
                </div>
              ) : 'LOGIN'}
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-5 opacity-60 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-white text-opacity-40 small fw-bold mb-0">© 2026 GYANTRIX INTELLIGENCE SYSTEMS</p>
          <div className="d-flex align-items-center justify-content-center gap-2 mt-1">
            <div className="dot bg-success animate-pulse"></div>
            <p className="text-white text-opacity-20 mb-0" style={{ fontSize: '8px', letterSpacing: '2px' }}>ENCRYPTED SESSION • MULTI-CLUSTER ARCHITECTURE</p>
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
    </div>
  );
};

export default LoginPage;