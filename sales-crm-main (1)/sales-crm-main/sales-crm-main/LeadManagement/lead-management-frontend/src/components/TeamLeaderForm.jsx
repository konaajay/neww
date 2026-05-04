import { useState } from 'react';
import { UserPlus } from 'lucide-react';

const TeamLeaderForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', email: '', mobile: '', password: '' });
  };

  return (
    <div className="glass card animate-fade-in">
      <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
        <UserPlus color="var(--primary)" />
        <h3>Create Team Leader</h3>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Name</label>
            <input name="name" className="input" placeholder="TL Name" value={formData.name} onChange={handleChange} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Email</label>
            <input name="email" type="email" className="input" placeholder="tl@example.com" value={formData.email} onChange={handleChange} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Mobile</label>
            <input name="mobile" className="input" placeholder="91..." value={formData.mobile} onChange={handleChange} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Password</label>
            <input name="password" type="password" className="input" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          Create Team Leader
        </button>
      </form>
    </div>
  );
};

export default TeamLeaderForm;
