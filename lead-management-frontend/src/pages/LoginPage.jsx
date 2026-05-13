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
    <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center bg-light" style={{
      background: '#f8fafc',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div className="container" style={{ maxWidth: '400px' }}>
        {/* Simple Branding */}
        <div className="text-center mb-4">
          <div className="d-inline-flex p-3 bg-white rounded-circle shadow-sm mb-3">
            <ShieldHalf size={32} className="text-primary" />
          </div>
          <h2 className="fw-bold text-dark mb-1">GYANTRIX</h2>
          <p className="text-muted small">Sign in to your account</p>
        </div>

        {/* Simple White Card */}
        <div className="bg-white rounded-4 p-4 p-md-5 shadow-sm border border-0">
          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            <div className="form-group">
              <label className="form-label fw-bold text-secondary small text-uppercase mb-2">Username</label>
              <div className="position-relative">
                <User size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <input
                  type="email"
                  className="form-control ps-5 py-3 border-light-subtle bg-light bg-opacity-50"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ fontSize: '14px', borderRadius: '12px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-bold text-secondary small text-uppercase">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="btn btn-link p-0 text-primary text-decoration-none small fw-bold"
                  style={{ fontSize: '12px' }}
                >
                  Forgot?
                </button>
              </div>
              <div className="position-relative">
                <Lock size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <input
                  type={show ? 'text' : 'password'}
                  className="form-control ps-5 py-3 border-light-subtle bg-light bg-opacity-50"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ fontSize: '14px', borderRadius: '12px' }}
                  required
                />
                <button
                  type="button"
                  className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-1 text-muted border-0 shadow-none"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-3 rounded-3 fw-bold text-uppercase mt-3"
              disabled={loading}
              style={{ 
                fontSize: '13px', 
                letterSpacing: '1px',
                background: '#6366f1',
                border: 'none',
                borderRadius: '12px'
              }}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Simple Footer */}
        <div className="text-center mt-4">
          <p className="text-muted small">© 2026 Gyantrix Intelligence Systems</p>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
    </div>
  );
};

export default LoginPage;