import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ShieldCheck, UserCog, Users, User, Sparkles, Eye, EyeOff, Key } from 'lucide-react';
import ForgotPasswordModal from '../components/layout/ForgotPasswordModal';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
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
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error('Invalid email');
    try {
      setLoading(true);
      const user = await login(email, password);
      toast.success('Login successful');
      
      const role = (user?.role || '').toUpperCase();
      let target = '/associate';
      if (role === 'ADMIN') target = '/admin';
      else if (role === 'MANAGER' || role === 'MGR') target = '/manager';
      else if (role.includes('TEAM_LEADER') || role.includes('TL') || role.includes('TEAM_LEAD') || role.includes('TEAMLEAD')) target = '/tl';
      
      navigate(target, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      // AuthContext throws the message string directly
      const msg = typeof err === 'string' ? err : (err?.response?.data?.message || 'Login failed - Check credentials');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#1f2937',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f9fafb',
    borderRadius: '8px',
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#030712', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 9999,
      overflowY: 'auto'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem 1rem' }}>

        {/* Branding */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
            style={{ width: 52, height: 52, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <Sparkles size={24} color="#6366f1" />
          </div>
          <h4 className="fw-bold mb-1" style={{ color: '#f9fafb' }}>GYANTRIX CRM</h4>
          <p className="mb-0" style={{ color: '#6b7280', fontSize: '13px' }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-4 p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium" style={{ color: '#d1d5db', fontSize: '13px' }}>Email address</label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-medium" style={{ color: '#d1d5db', fontSize: '13px' }}>Password</label>
              <div className="input-group">
                <input
                  id="login-password"
                  type={show ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, borderRight: 'none', borderRadius: '8px 0 0 8px' }}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  style={{
                    background: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderLeft: 'none',
                    color: '#9ca3af',
                    borderRadius: '0 8px 8px 0',
                    padding: '0 12px',
                    cursor: 'pointer',
                  }}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="text-end mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsForgotModalOpen(true)}
                  className="btn btn-link p-0 text-primary fw-bold text-decoration-none"
                  style={{ fontSize: '11px' }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn w-100 fw-semibold"
              disabled={loading}
              style={{ background: '#6366f1', color: '#fff', borderRadius: '8px', padding: '10px', border: 'none' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>


        </div>
      </div>
      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
    </div>
  );
};

export default LoginPage;