import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCcw, Filter } from 'lucide-react';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';

const FiltersBar = ({ filters, onChange, onSync, title = "COMMAND CENTER", role = "", currentUserId }) => {
  const { isDarkMode } = useTheme();
  const [selectedMgrId, setSelectedMgrId] = useState("");
  const [selectedTlId, setSelectedTlId] = useState("");
  const [selectedAssocId, setSelectedAssocId] = useState("");

  const [managers, setManagers] = useState([]);
  const [tls, setTls] = useState([]);
  const [associates, setAssociates] = useState([]);

  const isManager = role === 'MANAGER';
  const isTL = role === 'TEAM_LEADER';
  const isAssociate = role === 'ASSOCIATE';
  const effectiveUserId = isManager ? currentUserId : selectedMgrId;

  // Fetch Managers on Load (Admin only)
  useEffect(() => {
    if (role === 'ADMIN') {
      adminService.fetchManagers().then(res => setManagers(res.data)).catch(() => {});
    }
  }, [role]);

  // Fetch Teams on Manager Change (Admin/Manager only)
  useEffect(() => {
    if (effectiveUserId && (role === 'ADMIN' || role === 'MANAGER')) {
      adminService.fetchTeamsByManager(effectiveUserId).then(res => setTls(res.data)).catch(() => {});
    } else {
      setTls([]);
    }
  }, [effectiveUserId, role]);

  // Fetch Associates on Team Change
  useEffect(() => {
    if (selectedTlId) {
      adminService.fetchAssociates(selectedTlId, null).then(res => setAssociates(res.data)).catch(() => {});
    } else if (effectiveUserId) {
      adminService.fetchAssociates(null, effectiveUserId).then(res => setAssociates(res.data)).catch(() => {});
    } else {
      setAssociates([]);
    }
  }, [selectedTlId, effectiveUserId]);

  useEffect(() => {
    let targetUserId = null;
    let targetTeamId = null;

    if (selectedAssocId) {
      targetUserId = selectedAssocId;
    } else if (selectedTlId) {
      targetTeamId = selectedTlId;
    } else if (selectedMgrId) {
      targetTeamId = selectedMgrId;
    } else if (isManager) {
      targetTeamId = currentUserId;
    }

    if (filters?.userId !== targetUserId || filters?.teamId !== targetTeamId) {
      onChange({ 
        ...filters, 
        userId: targetUserId, 
        teamId: targetTeamId 
      });
    }
  }, [selectedMgrId, selectedTlId, selectedAssocId, filters?.userId, filters?.teamId]);

  return (
    <div className={`premium-card p-2 px-3 mb-3 animate-fade-in ${isDarkMode ? 'bg-surface bg-opacity-40 backdrop-blur' : 'bg-white shadow-sm'} rounded-pill`}>
      <div className="d-flex align-items-center justify-content-between gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Left Section: Title + Dropdowns */}
        <div className="d-flex align-items-center gap-2">
          <div className="d-flex align-items-center gap-2 pe-3 border-end border-white border-opacity-10">
            <div className={`p-2 ${isDarkMode ? 'bg-white bg-opacity-5' : 'bg-primary bg-opacity-10'} text-primary rounded-circle`}>
              <Filter size={14} />
            </div>
            <div className="d-none d-lg-block">
              <h5 className={`fw-black mb-0 ${isDarkMode ? 'text-main' : 'text-dark'} tracking-wide text-uppercase`} style={{ fontSize: '10px' }}>{title}</h5>
            </div>
          </div>

          {!isAssociate && (
            <div className="d-flex align-items-center gap-2">
              {role === 'ADMIN' && (
                <div className={`${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-light'} p-1 px-3 rounded-pill border`}>
                  <select
                    className="bg-transparent border-0 text-main fw-bold small text-uppercase outline-none py-1"
                    style={{ fontSize: '9px', minWidth: '120px' }}
                    value={selectedMgrId}
                    onChange={(e) => {
                      setSelectedMgrId(e.target.value);
                      setSelectedTlId("");
                      setSelectedAssocId("");
                    }}
                  >
                    <option value="" className="text-dark">MANAGER</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id} className="text-dark">{m.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}

              {(role === 'ADMIN' || isManager) && (
                <div className={`${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-light'} p-1 px-3 rounded-pill border`}>
                  <select
                    className="bg-transparent border-0 text-main fw-bold small text-uppercase outline-none py-1"
                    style={{ fontSize: '9px', minWidth: '120px' }}
                    value={selectedTlId}
                    onChange={(e) => {
                      setSelectedTlId(e.target.value);
                      setSelectedAssocId("");
                    }}
                    disabled={!effectiveUserId}
                  >
                    <option value="" className="text-dark">{effectiveUserId ? 'ALL TEAMS' : '---'}</option>
                    {tls.map(t => (
                      <option key={t.id} value={t.id} className="text-dark">{t.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}

              {(role === 'ADMIN' || isManager || isTL) && (
                <div className={`${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-light'} p-1 px-3 rounded-pill border`}>
                  <select
                    className="bg-transparent border-0 text-main fw-bold small text-uppercase outline-none py-1"
                    style={{ fontSize: '9px', minWidth: '120px' }}
                    value={selectedAssocId}
                    onChange={(e) => setSelectedAssocId(e.target.value)}
                    disabled={!effectiveUserId && role !== 'TEAM_LEADER'}
                  >
                    <option value="" className="text-dark">{(effectiveUserId || isTL) ? 'ASSOCIATES' : '---'}</option>
                    {associates.map(a => (
                      <option key={a.id} value={a.id} className="text-dark">{a.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Calendar + Reset + Sync */}
        <div className="d-flex align-items-center gap-2">
          <div className={`d-flex align-items-center gap-2 ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-light'} p-1 px-3 rounded-pill border`}>
            <Calendar size={11} className="text-muted" />
            <div className="d-flex align-items-center gap-1">
              <input
                type="date"
                className="bg-transparent border-0 text-main fw-bold px-1"
                value={filters.from || ""}
                onChange={(e) => onChange({ ...filters, from: e.target.value })}
                style={{ width: '95px', fontSize: '9px', outline: 'none' }}
              />
              <span className="text-muted small opacity-25">|</span>
              <input
                type="date"
                className="bg-transparent border-0 text-main fw-bold px-1"
                value={filters.to || ""}
                onChange={(e) => onChange({ ...filters, to: e.target.value })}
                style={{ width: '95px', fontSize: '9px', outline: 'none' }}
              />
            </div>
          </div>

          <button
            className={`btn ${isDarkMode ? 'btn-outline-light border-white border-opacity-10' : 'btn-outline-secondary border-light'} rounded-pill py-1 px-3 fw-bold text-uppercase`}
            onClick={() => {
              setSelectedMgrId("");
              setSelectedTlId("");
              setSelectedAssocId("");
              onChange({
                from: new Date().toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0],
                userId: null,
                teamId: isManager ? currentUserId : null
              });
            }}
            style={{ fontSize: '9px' }}
          >
            RESET
          </button>
          
          <button
            className="btn btn-primary rounded-pill py-1 px-3 border-0 fw-bold text-uppercase d-flex align-items-center gap-2 shadow-glow-sm"
            onClick={() => onSync ? onSync() : onChange(filters)}
            style={{ fontSize: '9px' }}
          >
            <RefreshCcw size={11} />
            SYNC
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
