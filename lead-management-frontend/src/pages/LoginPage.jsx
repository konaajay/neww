import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ShieldCheck, UserCog, Users, User, Sparkles, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = (role) => {
    try {
      loginDemo(role);
      toast.success(`Logged in as ${role}`);
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'MANAGER') navigate('/manager');
      else if (role === 'TEAM_LEADER') navigate('/tl');
      else if (role === 'ASSOCIATE') navigate('/associate');
      else navigate('/');
    } catch {
      toast.error('Demo login failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('All fields required');
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error('Invalid email');
    try {
      setLoading(true);
      const user = await login(email, password);
      toast.success('Login successful');
      if (user?.role === 'ADMIN') navigate('/admin');
      else if (user?.role === 'MANAGER') navigate('/manager');
      else if (user?.role === 'TEAM_LEADER') navigate('/tl');
      else navigate('/associate');
    } catch (err) {
      console.error('Login error:', err);
      if (err?.response?.status === 500) {
        toast.error('Server Error (500): Database connection failed. Please check backend Aiven config/IP allowlist.');
      } else {
        toast.error(err?.response?.data?.message || 'Login failed - Check credentials');
      }
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
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 1rem' }}>

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

          {/* Divider */}
          <div className="d-flex align-items-center my-4">
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span className="mx-3" style={{ color: '#6b7280', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>DEMO ACCESS</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Demo Role Buttons */}
          <div className="row g-2">
            {[
              { role: 'ADMIN', label: 'Admin', Icon: ShieldCheck, color: '#6366f1' },
              { role: 'MANAGER', label: 'Manager', Icon: UserCog, color: '#22d3ee' },
              { role: 'TEAM_LEADER', label: 'Team Lead', Icon: Users, color: '#10b981' },
              { role: 'ASSOCIATE', label: 'Associate', Icon: User, color: '#f59e0b' },
            ].map(({ role, label, Icon, color }) => (
              <div key={role} className="col-6">
                <button
                  onClick={() => handleDemoLogin(role)}
                  className="w-100 d-flex flex-column align-items-center justify-content-center gap-1 py-2 rounded-3"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#9ca3af',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color + '55'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <Icon size={16} color={color} />
                  <span>{label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;