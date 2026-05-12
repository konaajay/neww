import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, ChevronDown, ChevronRight, BarChart2, Users, Search, Phone, Zap, FileText, TrendingUp, AlertCircle, CheckCircle, MessageCircle, Power, Target } from 'lucide-react';
import TargetHistoryModal from './TargetHistoryModal';
import { useTheme } from '../../../context/ThemeContext';
import { History } from 'lucide-react';

const TeamManagement = ({
  teamLeaders,
  roles,
  offices,
  shifts,
  handleCreateUser,
  handleDeleteUser,
  handleUpdateUser,
  handleEditUser,
  handleAssignSupervisor,
  setSelectedPerfUserId,
  setActiveTab,
  defaultShowForm = false,
  canAdd = false,
  handleSync
}) => {
  useEffect(() => {
    // Force native select dropdowns to honor dark mode
    const selects = document.querySelectorAll('select.ui-input');
    selects.forEach(s => {
      s.style.colorScheme = 'dark';
    });
  }, []);

  const { isDarkMode } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState(defaultShowForm ? 'onboarding' : 'active');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: '',
    supervisorId: '',
    officeId: '',
    shiftId: '',
    joiningDate: new Date().toISOString().split('T')[0]
  });
  const [userStatusFilter, setUserStatusFilter] = useState(true); // true = Active, false = Inactive
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHistoryUser, setSelectedHistoryUser] = useState(null);



  const filteredUsers = teamLeaders.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.mobile?.includes(searchTerm);
    const matchesStatus = u.active === userStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const UserRow = ({ user, index }) => {
    return (
      <tr className="border-bottom border-white border-opacity-5 transition-smooth hover-bg-surface">
        <td className="ps-4 text-muted small fw-bold" style={{ width: '60px' }}>
          {index + 1}.
        </td>

        <td className="">
          <div className="d-flex flex-column">
            <span className={`fw-black text-uppercase ${!user.supervisorName ? 'opacity-25' : 'text-primary'}`} style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
              {user.supervisorName || 'MASTER'}
            </span>
            <small className="text-muted fw-bold opacity-50" style={{ fontSize: '7px' }}>{user.supervisorName ? 'UPSTREAM LEAD' : 'ROOT IDENTITY'}</small>
          </div>
        </td>

        <td>
          <div className="d-flex align-items-center gap-2">
            <span className="fw-black text-main fs-6" style={{ letterSpacing: '-0.2px' }}>
              {user.name}
            </span>
            <BarChart2
              size={12}
              className="text-primary cursor-pointer opacity-30 hover-opacity-100 transition-all"
              onClick={() => { setSelectedPerfUserId(user.id); setActiveTab('overview'); }}
            />
          </div>
        </td>

        <td>
          <span className="text-main fw-black font-monospace" style={{ fontSize: '10px' }}>{user.mobile || '---'}</span>
        </td>

        <td>
          <span className="text-muted fw-bold opacity-75 font-monospace" style={{ fontSize: '9px' }}>{user.email || '---'}</span>
        </td>

        <td className="">
          <div className={`badge rounded-pill px-2 py-1 ${user.role === 'MANAGER' ? 'bg-warning bg-opacity-10 text-warning' :
            user.role === 'TEAM_LEADER' ? 'bg-primary bg-opacity-10 text-primary' :
            'bg-surface text-muted'
            }`} style={{ fontSize: '8px', fontWeight: '900', letterSpacing: '0.5px' }}>
            {user.role?.replace(/_/g, ' ')}
          </div>
        </td>

        <td className="">
          <span className="text-muted small fw-bold opacity-75 font-monospace">{user.joiningDate || '---'}</span>
        </td>

        <td className="">
          <div className="d-flex align-items-center gap-2">
            <span className="text-main fw-black font-monospace" style={{ fontSize: '11px' }}>
              {user.monthlyTarget ? `₹${user.monthlyTarget.toLocaleString()}` : '---'}
            </span>
            <Target
              size={12}
              className="text-primary cursor-pointer opacity-30 hover-opacity-100 transition-all"
              onClick={() => setActiveTab('strategy')}
              title="Manage Strategic Targets"
            />
            <History
              size={12}
              className="text-info cursor-pointer opacity-30 hover-opacity-100 transition-all"
              onClick={() => setSelectedHistoryUser(user)}
              title="Performance History"
            />
          </div>
        </td>

        <td className="pe-4 text-end">
          <div className="d-flex align-items-center justify-content-end gap-2">
            <div className="d-flex gap-2 me-2 pe-2 border-end border-white border-opacity-10">
              <a href={`tel:${user.mobile}`} className="btn btn-sm btn-link p-0 text-primary opacity-50 hover-opacity-100"><Phone size={13} /></a>
              <a href={`https://wa.me/${user.mobile}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-link p-0 text-success opacity-50 hover-opacity-100"><MessageCircle size={13} /></a>
            </div>

            <button onClick={() => handleEditUser(user)} className="btn btn-sm btn-link p-0 text-primary opacity-50 hover-opacity-100 transition-all hover-scale"><Edit size={13} /></button>
            {user.active ? (
              <button onClick={() => handleDeleteUser(user.id)} className="btn btn-sm btn-link p-0 text-danger opacity-50 hover-opacity-100 ms-1 transition-all hover-scale" title="Deactivate"><Power size={13} /></button>
            ) : (
              <button onClick={() => handleUpdateUser(user.id, { ...user, active: true })} className="btn btn-sm btn-link p-0 text-success opacity-50 hover-opacity-100 ms-1 transition-all hover-scale" title="Reactivate"><CheckCircle size={13} /></button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCreateUser(formData);
    setFormData({
      name: '',
      email: '',
      mobile: '',
      password: '',
      role: '',
      supervisorId: '',
      officeId: '',
      shiftId: '',
      joiningDate: new Date().toISOString().split('T')[0]
    });
    setActiveSubTab('active');
  };

  return (
    <div className="animate-fade-in d-flex flex-column gap-4">
      <div className="d-flex align-items-center justify-content-between px-1 bg-surface bg-opacity-10 p-4 rounded-4 border border-white border-opacity-5">
        <div className="d-flex align-items-center gap-4">
          <div>
            <h2 className="fw-black text-main mb-0 text-uppercase tracking-widest border-bottom border-primary border-4 pb-1">Users</h2>
          </div>

          <div className="d-flex gap-2 p-1.5 bg-surface bg-opacity-20 rounded-pill border border-white border-opacity-5 ms-4">
            {[
              { id: 'active', label: 'Registered Personnel', icon: Users, show: true },
              { id: 'onboarding', label: 'Add user', icon: UserPlus, show: canAdd },
            ].filter(tab => tab.show).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2 rounded-pill border-0 fw-black text-uppercase tracking-widest transition-all d-flex align-items-center gap-2 ${activeSubTab === tab.id ? 'bg-primary text-white shadow-glow' : 'bg-transparent text-muted opacity-50 hover:opacity-100'}`}
                style={{ fontSize: '11px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          {activeSubTab === 'active' && (
            <div className="d-flex gap-2 p-1 bg-surface bg-opacity-20 rounded-3 border border-white border-opacity-5 me-2">
              <button
                className={`btn btn-sm px-3 rounded-2 fw-black text-uppercase ${userStatusFilter ? 'btn-primary shadow-glow' : 'text-muted opacity-50'}`}
                style={{ fontSize: '10px' }}
                onClick={() => setUserStatusFilter(true)}
              >
                Active
              </button>
              <button
                className={`btn btn-sm px-3 rounded-2 fw-black text-uppercase ${!userStatusFilter ? 'btn-danger shadow-glow' : 'text-muted opacity-50'}`}
                style={{ fontSize: '10px' }}
                onClick={() => setUserStatusFilter(false)}
              >
                Inactive
              </button>
            </div>
          )}
          <div className="position-relative flex-grow-1 flex-sm-grow-0" style={{ maxWidth: '300px' }}>
            <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted opacity-50" />
            <input
              placeholder="Search personnel registry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control bg-surface border-white border-opacity-10 py-2.5 ps-5 rounded-pill transition-all"
              style={{
                fontSize: '11px',
                width: '100%',
                background: 'rgba(255,255,255,0.02)',
                boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.2)'
              }}
            />
          </div>
        </div>
      </div>

      {activeSubTab === 'onboarding' ? (
        <div className="row justify-content-center animate-slide-in">
          <div className="col-12 col-xl-8">
            <div className="premium-card overflow-hidden shadow-glow border-0" style={{ borderRadius: '24px' }}>
              <div className="card-header bg-primary bg-opacity-10 p-4 border-0 border-bottom border-white border-opacity-5 d-flex align-items-center gap-3">
                <div className="p-2 bg-primary rounded-3 shadow-glow">
                  <UserPlus size={20} className="text-white" />
                </div>
                <div>
                  <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Create New Identity</h6>
                  <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INITIALIZING PERSONNEL ONBOARDING PROTOCOL</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 p-md-5 bg-surface bg-opacity-10">
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Full Name</label>
                    <input className="ui-input py-3 w-100 fw-bold" placeholder="Rahul Sharma" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Email ID</label>
                    <input type="email" className="ui-input py-3 w-100 fw-bold font-monospace" placeholder="rahul@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Phone Number</label>
                    <input type="tel" className="ui-input py-3 w-100 fw-bold" placeholder="910000000000" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })} required />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Password</label>
                    <input type="password" className="ui-input py-3 w-100 fw-bold" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Joining Date</label>
                    <input type="date" className="ui-input py-3 w-100 fw-bold" value={formData.joiningDate} onChange={e => setFormData({ ...formData, joiningDate: e.target.value })} required />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Access Role</label>
                    <select className="ui-input py-3 w-100 fw-black text-uppercase tracking-widest cursor-pointer" value={formData.role}
                      onChange={e => {
                        const newRole = e.target.value;
                        let defaultSupId = formData.supervisorId;
                        if (newRole === 'MANAGER') {
                          const adminLead = teamLeaders.find(u => u.role === 'ADMIN');
                          if (adminLead) defaultSupId = adminLead.id;
                        } else {
                          defaultSupId = '';
                        }
                        setFormData({ ...formData, role: newRole, supervisorId: defaultSupId });
                      }} required>
                      <option value="">Select Target Role...</option>
                      {roles.filter(r => r.name !== 'USER').map(r => <option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>

                  {(formData.role === 'ASSOCIATE' || formData.role === 'TEAM_LEADER' || formData.role === 'MANAGER') && (
                    <div className="col-12 col-md-6 col-lg-4">
                      <label className="form-label small fw-black text-uppercase text-primary mb-2 tracking-widest" style={{ fontSize: '10px' }}>Hierarchy Mapping (Superior ID)</label>
                      <select className="ui-input py-3 w-100 border-primary border-opacity-30 fw-black text-uppercase tracking-widest cursor-pointer" 
                        value={formData.supervisorId} onChange={e => setFormData({ ...formData, supervisorId: e.target.value })} required>
                        <option value="">Select Direct Reporting Lead...</option>
                        {teamLeaders.filter(u => {
                          if (formData.role === 'ASSOCIATE') return u.role === 'TEAM_LEADER';
                          if (formData.role === 'TEAM_LEADER') return u.role === 'MANAGER';
                          if (formData.role === 'MANAGER') return u.role === 'ADMIN';
                          return false;
                        })
                          .map(sup => <option key={sup.id} value={sup.id}>{sup.name} ({sup.role})</option>)}
                      </select>
                    </div>
                  )}

                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Office Location</label>
                    <select className="ui-input py-3 w-100 fw-black text-uppercase tracking-widest cursor-pointer" 
                      value={formData.officeId} onChange={e => setFormData({ ...formData, officeId: e.target.value })} required>
                      <option value="">Select Office...</option>
                      {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>

                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Shift Timing</label>
                    <select className="ui-input py-3 w-100 fw-black text-uppercase tracking-widest cursor-pointer" 
                      value={formData.shiftId} onChange={e => setFormData({ ...formData, shiftId: e.target.value })} required>
                      <option value="">Select Shift...</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>)}
                    </select>
                  </div>

                  <div className="col-12">
                    <button type="submit" className="btn btn-primary w-100 fw-black text-uppercase py-3 rounded-pill shadow-glow mt-2">Create User</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="premium-card overflow-hidden h-100 border-0 shadow-lg animate-fade-in">
          <div className="table-responsive">
            <table className="table ui-table align-middle mb-0">
              <thead className="bg-surface bg-opacity-20 border-bottom border-white border-opacity-5">
                <tr>
                  <th className="ps-4" style={{ fontSize: '10px', width: '60px' }}>S/NO</th>
                  <th style={{ fontSize: '10px', width: '100px' }}>SUP ID</th>
                  <th style={{ fontSize: '10px' }}>NAME</th>
                  <th style={{ fontSize: '10px' }}>PH</th>
                  <th style={{ fontSize: '10px' }}>EMAIL</th>
                  <th style={{ fontSize: '10px' }}>ROLE</th>
                  <th style={{ fontSize: '10px' }}>DOJ</th>
                  <th style={{ fontSize: '10px' }}>TARGET</th>
                  <th className="pe-4 text-end" style={{ fontSize: '10px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, idx) => (
                    <UserRow key={user.id} user={user} index={idx} />
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-5 opacity-50">
                      <AlertCircle className="mb-2" size={24} />
                      <div className="small fw-black text-uppercase tracking-widest">No matching personnel found</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      <TargetHistoryModal
        isOpen={!!selectedHistoryUser}
        onClose={() => setSelectedHistoryUser(null)}
        user={selectedHistoryUser}
        onEdit={() => {
          setActiveTab('strategy');
          setSelectedHistoryUser(null);
        }}
      />
    </div>
  );
};

export default TeamManagement;