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
          <h2 className="fw-black text-main tracking-widest text-uppercase mb-1" style={{ letterSpacing: '4px' }}>GYNATRIX</h2>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-surface bg-opacity-30 rounded-pill border border-white border-opacity-5">
             <Sparkles size={10} className="text-warning" />
             <span className="text-muted fw-black text-uppercase" style={{ fontSize: '9px', letterSpacing: '1px' }}>Premium SaaS Edition</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-morphism rounded-4 p-4 p-md-5 shadow-2xl border border-white border-opacity-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="mb-4">
            <h4 className="fw-black text-main mb-1">Welcome back</h4>
            <p className="text-muted small fw-bold">Enter your credentials to access the terminal</p>
          </div>

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
            <div className="form-group">
              <label className="text-muted fw-black text-uppercase mb-2 d-block" style={{ fontSize: '10px', letterSpacing: '1px' }}>Authentication ID</label>
              <div className="position-relative">
                <Mail size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted opacity-50" />
                <input
                  type="email"
                  className="form-control ui-input ps-5 bg-opacity-20 border-white border-opacity-10 py-2.5"
                  placeholder="admin@gynatrix.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="text-muted fw-black text-uppercase d-block" style={{ fontSize: '10px', letterSpacing: '1px' }}>Security Protocol</label>
                <button 
                  type="button" 
                  onClick={() => setIsForgotModalOpen(true)}
                  className="btn btn-link p-0 text-primary fw-black text-uppercase text-decoration-none"
                  style={{ fontSize: '9px' }}
                >
                  Recovery
                </button>
              </div>
              <div className="position-relative">
                <Lock size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted opacity-50" />
                <input
                  type={show ? 'text' : 'password'}
                  className="form-control ui-input ps-5 bg-opacity-20 border-white border-opacity-10 py-2.5"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-1 text-muted border-0 opacity-50 hover-opacity-100"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="ui-btn ui-btn-primary w-100 py-3 rounded-3 fw-black text-uppercase tracking-widest mt-2"
              disabled={loading}
              style={{ fontSize: '12px' }}
            >
              {loading ? (
                <div className="d-flex align-items-center justify-content-center gap-2">
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Authenticating...</span>
                </div>
              ) : 'Establish Connection'}
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-5 opacity-40 animate-fade-in" style={{ animationDelay: '0.3s' }}>
           <p className="text-muted small fw-bold mb-0">© 2026 GYNATRIX INTELLIGENCE SYSTEMS</p>
           <p className="text-muted" style={{ fontSize: '8px' }}>ENCRYPTED SESSION • MULTI-CLUSTER ARCHITECTURE</p>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
    </div>
  );
};

export default LoginPage;