import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, ChevronDown, ChevronRight, BarChart2, Users, Search, Phone, Zap, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeamManagement = ({
  teamLeaders,
  roles,
  permissions,
  offices,
  shifts,
  handleCreateUser,
  handleDeleteUser,
  handleEditUser,
  handleAssignSupervisor,
  setSelectedPerfUserId,
  setActiveTab,
  defaultShowForm = false
}) => {
  const { isDarkMode } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState(defaultShowForm ? 'onboarding' : 'active');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: '',
    permissions: [],
    supervisorId: '',
    officeId: '',
    joiningDate: new Date().toISOString().split('T')[0]
  });
  const [expandedIds, setExpandedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper for strict ID comparison (normalizes types)
  const isSameId = (a, b) => {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return Number(a) === Number(b);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleCreateUser(formData);
    setFormData({
      name: '', email: '', mobile: '', password: '', role: '', permissions: [], supervisorId: '',
      officeId: '',
      joiningDate: new Date().toISOString().split('T')[0]
    });
    setActiveSubTab('active');
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev =>
      prev.some(eid => isSameId(eid, id))
        ? prev.filter(eid => !isSameId(eid, id))
        : [...prev, id]
    );
  };

  const filteredUsers = teamLeaders.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mobile?.includes(searchTerm)
  );

  const UserRow = ({ user, level = 0, index, children }) => {
    const isExpanded = expandedIds.some(eid => isSameId(eid, user.id));

    // Check if the node actually has valid children elements passed
    let childCount = 0;
    React.Children.forEach(children, child => { if (child) childCount++; });
    const hasChildren = childCount > 0;

    return (
      <React.Fragment>
        <tr className={`border-bottom border-white border-opacity-5 transition-smooth hover-bg-surface ${level > 0 ? 'bg-surface bg-opacity-20' : ''}`} style={{ borderLeft: level > 0 ? `${level * 4}px solid var(--bs-primary)` : 'none' }}>
          {/* 1. S/NO */}
          <td className="ps-4 text-muted small fw-bold" style={{ width: '60px' }}>
            {index !== undefined ? `${index}.` : ''}
          </td>

          {/* 2. SUPERVISOR */}
          <td className="">
            <div className="d-flex flex-column">
              <span className={`fw-black text-uppercase ${!user.supervisorName ? 'opacity-25' : 'text-primary'}`} style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
                {user.supervisorName || 'MASTER'}
              </span>
              <small className="text-muted fw-bold opacity-50" style={{ fontSize: '7px' }}>{user.supervisorName ? 'UPSTREAM NODE' : 'ROOT IDENTITY'}</small>
            </div>
          </td>

          {/* 3. NAME & HIERARCHY */}
          <td style={{ paddingLeft: `${15 + (level * 25)}px` }}>
            <div className="d-flex align-items-center gap-3">
              {hasChildren ? (
                <button
                  className="btn btn-link link-primary p-0 shadow-none border-0 hover-scale"
                  onClick={() => toggleExpand(user.id)}
                >
                  {isExpanded ? <ChevronDown size={14} className="text-primary" /> : <ChevronRight size={14} className="text-muted" />}
                </button>
              ) : level > 0 ? (
                <div className="text-primary opacity-50" style={{ width: '14px' }}>↳</div>
              ) : <div style={{ width: '14px' }} />}

              <div className="d-flex align-items-center gap-2">
                <div className="position-relative">
                  <span className={`fw-black ${level === 0 ? 'text-main fs-6' : 'text-main small'}`} style={{ letterSpacing: '-0.2px' }}>
                    {user.name}
                  </span>
                  {level > 0 && (
                    <div className="position-absolute translate-middle-y start-0 h-100 border-start border-primary border-opacity-25" style={{ left: '-30px', top: '50%' }}></div>
                  )}
                </div>
                <BarChart2
                  size={12}
                  className="text-primary cursor-pointer opacity-30 hover-opacity-100 transition-all"
                  onClick={() => { setSelectedPerfUserId(user.id); setActiveTab('overview'); }}
                />
              </div>
            </div>
          </td>

          {/* 4. PH */}
          <td>
            <span className="text-main fw-black font-monospace" style={{ fontSize: '10px' }}>{user.mobile || '---'}</span>
          </td>

          {/* 5. DEPT */}
          <td>
            <span className="text-muted fw-bold opacity-50 text-uppercase" style={{ fontSize: '8px', letterSpacing: '1px' }}>Core Operations</span>
          </td>

          {/* 6. ROLE */}
          <td className="">
            <div className={`badge rounded-pill px-2 py-1 ${user.role === 'MANAGER' ? 'bg-warning bg-opacity-10 text-warning' :
              user.role === 'TEAM_LEADER' ? 'bg-primary bg-opacity-10 text-primary' :
                'bg-light bg-opacity-5 text-muted'
              }`} style={{ fontSize: '8px', fontWeight: '900', letterSpacing: '0.5px' }}>
              {user.role?.replace(/_/g, ' ')}
            </div>
          </td>

          {/* 7. DOJ */}
          <td className="">
            <span className="text-muted small fw-bold opacity-75 font-monospace">{user.joiningDate || '---'}</span>
          </td>

          {/* 8. ACTIONS */}
          <td className="pe-4 text-end">
            <div className="d-flex align-items-center justify-content-end gap-2">
              <div className="d-flex gap-2 me-2 pe-2 border-end border-white border-opacity-10">
                <a href={`tel:${user.mobile}`} className="btn btn-sm btn-link p-0 text-primary opacity-50 hover-opacity-100"><Phone size={13} /></a>
                <a href={`https://wa.me/${user.mobile}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-link p-0 text-success opacity-50 hover-opacity-100"><Zap size={13} /></a>
              </div>

              <button onClick={() => handleEditUser(user)} className="btn btn-sm btn-link p-0 text-primary opacity-50 hover-opacity-100 transition-all hover-scale"><Edit size={13} /></button>
              <button onClick={() => handleDeleteUser(user.id)} className="btn btn-sm btn-link p-0 text-danger opacity-50 hover-opacity-100 ms-1 transition-all hover-scale"><Trash2 size={13} /></button>
            </div>
          </td>
        </tr>
        {isExpanded && children}
      </React.Fragment>
    );
  };

  return (
    <div className="animate-fade-in d-flex flex-column gap-4">
      {/* Header & Section Switching - Sketch-inspired layout */}
      <div className="d-flex align-items-center justify-content-between px-1 bg-surface bg-opacity-10 p-4 rounded-4 border border-white border-opacity-5">
        <div className="d-flex align-items-center gap-4">
          <div>
            <h2 className="fw-black text-main mb-0 text-uppercase tracking-widest border-bottom border-primary border-4 pb-1">Users</h2>
          </div>

          <div className="d-flex gap-2 p-1.5 bg-surface bg-opacity-20 rounded-pill border border-white border-opacity-5 ms-4">
            {[
              { id: 'active', label: 'Active User', icon: Users },
              { id: 'onboarding', label: 'Add user', icon: UserPlus },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2 rounded-pill border-0 fw-black text-uppercase tracking-widest transition-all d-flex align-items-center gap-2 ${activeSubTab === tab.id ? 'bg-primary text-white shadow-glow' : 'bg-transparent text-muted opacity-50 hover:opacity-100'}`}
                style={{ fontSize: '9px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 bg-surface bg-opacity-50 border border-white border-opacity-10 rounded-3 px-3 py-1.5" style={{ minWidth: '300px' }}>
            <Search size={14} className="text-muted opacity-50" />
            <input
              type="text"
              className="bg-transparent border-0 shadow-none text-main small fw-bold w-100"
              placeholder="SEARCH NODES..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ fontSize: '10px', outline: 'none' }}
            />
          </div>

          <button className="ui-btn ui-btn-outline px-3 py-2 rounded-3 text-muted d-flex align-items-center gap-2" style={{ fontSize: '10px' }}>
            <Zap size={12} /> FILTER
          </button>
          <button
            onClick={() => setActiveSubTab('onboarding')}
            className="btn btn-primary px-4 py-2 rounded-3 fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center gap-2"
            style={{ fontSize: '10px' }}
          >
            <UserPlus size={12} /> ADD
          </button>
        </div>
      </div>

      {activeSubTab === 'onboarding' ? (
        <div className="row justify-content-center animate-slide-in">
          <div className="col-12 col-xl-8">
            <div className="premium-card overflow-hidden shadow-glow border-0">
              <div className="card-header bg-primary bg-opacity-5 p-4 border-0 border-bottom border-white border-opacity-5">
                <h6 className="fw-black mb-0 text-primary text-uppercase tracking-widest small">Onboard New Personnel</h6>
              </div>
              <form onSubmit={onSubmit} className="p-4 bg-surface bg-opacity-10">
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Full Name</label>
                    <input className="ui-input py-3 w-100 fw-bold" placeholder="Rahul Sharma" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Email ID</label>
                    <input type="email" className="ui-input py-3 w-100 fw-bold font-monospace" placeholder="rahul@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Phone Terminal</label>
                    <input className="ui-input py-3 w-100 fw-bold" placeholder="+91 00000 00000" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Security String</label>
                    <input type="password" className="ui-input py-3 w-100 fw-bold" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Joining Date</label>
                    <input type="date" className="ui-input py-3 w-100 fw-bold" value={formData.joiningDate} onChange={e => setFormData({ ...formData, joiningDate: e.target.value })} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Access Role</label>
                    <select className="ui-input py-3 w-100 fw-black text-uppercase tracking-widest cursor-pointer" value={formData.role}
                      onChange={e => {
                        const newRole = e.target.value;
                        let defaultSupId = formData.supervisorId;
                        if (newRole === 'MANAGER') {
                          const adminNode = teamLeaders.find(u => u.role === 'ADMIN');
                          if (adminNode) defaultSupId = adminNode.id;
                        } else {
                          defaultSupId = ''; // Reset supervisor if role changes to avoid invalid reporting lines
                        }
                        setFormData({ ...formData, role: newRole, supervisorId: defaultSupId });
                      }} required>
                      <option value="" className="text-dark">Select Target Role...</option>
                      {roles.map(r => <option key={r.id} value={r.name} className="text-dark">{r.name.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-black text-uppercase text-muted mb-2 tracking-widest" style={{ fontSize: '10px' }}>Office Terminal</label>
                    <select className="ui-input py-3 w-100 fw-black text-uppercase tracking-widest cursor-pointer" value={formData.officeId} onChange={e => setFormData({ ...formData, officeId: e.target.value })} required>
                      <option value="" className="text-dark">Select Location...</option>
                      {(offices || []).map(o => <option key={o.id} value={o.id} className="text-dark">{o.name}</option>)}
                    </select>
                  </div>
                  {(formData.role === 'ASSOCIATE' || formData.role === 'TEAM_LEADER' || formData.role === 'MANAGER') && (
                    <div className="col-md-4">
                      <label className="form-label small fw-black text-uppercase text-primary mb-2 tracking-widest" style={{ fontSize: '10px' }}>Hierarchy Mapping (Superior ID)</label>
                      <select className="ui-input py-3 w-100 border-primary border-opacity-30 fw-black text-uppercase tracking-widest cursor-pointer" value={formData.supervisorId} onChange={e => setFormData({ ...formData, supervisorId: e.target.value })} required>
                        <option value="" className="text-dark">Select Direct Reporting Node...</option>
                        {teamLeaders.filter(u => {
                          if (formData.role === 'ASSOCIATE') return u.role === 'TEAM_LEADER';
                          if (formData.role === 'TEAM_LEADER') return u.role === 'MANAGER';
                          if (formData.role === 'MANAGER') return u.role === 'ADMIN';
                          return false;
                        })
                          .map(sup => <option key={sup.id} value={sup.id} className="text-dark">{sup.name} ({sup.role})</option>)}
                      </select>
                    </div>
                  )}

                  <div className="col-12 mt-2">
                    <label className="form-label small fw-black text-uppercase text-muted d-block mb-3 tracking-widest" style={{ fontSize: '10px' }}>System Access Privileges</label>
                    <div className="bg-surface p-4 rounded-4 shadow-inner border border-white border-opacity-5" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      <div className="row g-3">
                        {permissions.map(perm => (
                          <div key={perm} className="col-md-4">
                            <div className="form-check custom-check">
                              <input
                                className="form-check-input shadow-none"
                                type="checkbox"
                                id={`onboard-perm-${perm}`}
                                checked={formData.permissions.includes(perm)}
                                onChange={() => {
                                  const currentPerms = formData.permissions;
                                  const perms = currentPerms.includes(perm)
                                    ? currentPerms.filter(p => p !== perm)
                                    : [...currentPerms, perm];
                                  setFormData({ ...formData, permissions: perms });
                                }}
                              />
                              <label className="form-check-label small fw-bold opacity-75 ms-2 cursor-pointer" htmlFor={`onboard-perm-${perm}`}>
                                {perm.replace(/_/g, ' ')}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary w-100 fw-black text-uppercase py-3 rounded-pill shadow-glow mt-2">Provision System Identity</button>
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
                  <th style={{ fontSize: '10px' }}>DEPT</th>
                  <th style={{ fontSize: '10px' }}>ROLE</th>
                  <th style={{ fontSize: '10px' }}>DOJ</th>
                  <th className="pe-4 text-end" style={{ fontSize: '10px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  let globalIdx = 0;

                  // 1. Root Nodes (Admins or those who have no supervisor in the current list)
                  const rootNodes = filteredUsers.filter(u =>
                    u.role === 'ADMIN' || !u.supervisorId || !filteredUsers.some(parent => isSameId(parent.id, u.supervisorId))
                  );

                  // 2. Helper to find subordinates
                  const getSubordinates = (parentId) => filteredUsers.filter(u => isSameId(u.supervisorId, parentId));

                  // 3. Depth-first render to build the branches
                  const renderHierarchy = (user, level = 0, isRoot = false) => {
                    const subordinates = getSubordinates(user.id);
                    return (
                      <UserRow
                        key={user.id}
                        user={user}
                        level={level}
                        index={isRoot ? ++globalIdx : undefined}
                      >
                        {subordinates.map(sub => renderHierarchy(sub, level + 1))}
                      </UserRow>
                    );
                  };

                  rootNodes.forEach(root => {
                    rows.push(renderHierarchy(root, 0, true));
                  });

                  return rows.length > 0 ? rows : (
                    <tr>
                      <td colSpan="8" className="text-center py-5 opacity-50">
                        <AlertCircle className="mb-2" size={24} />
                        <div className="small fw-black text-uppercase tracking-widest">No matching personnel nodes found</div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;