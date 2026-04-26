import React, { useState, useEffect } from 'react';
import { CalendarDays, RefreshCcw, Command } from 'lucide-react';
import adminService from '../../../services/adminService';
import tlService from '../../../services/tlService';
import { useTheme } from '../../../context/ThemeContext';

const FiltersBar = ({ filters, onChange, onSync, title = "COMMAND CENTER", role = "", currentUserId, modes = [], activeMode = "", onModeChange = () => {}, hideUserFilter = false }) => {
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

  // Fetch Associates on Team Change or TL Login
  useEffect(() => {
    if (isTL) {
      // For TL, fetch subordinates directly
      tlService.fetchSubordinates().then(res => setAssociates(res.data || [])).catch(() => {});
    } else if (selectedTlId) {
      adminService.fetchAssociates(selectedTlId, null).then(res => setAssociates(res.data)).catch(() => {});
    } else if (effectiveUserId) {
      adminService.fetchAssociates(null, effectiveUserId).then(res => setAssociates(res.data)).catch(() => {});
    } else {
      setAssociates([]);
    }
  }, [selectedTlId, effectiveUserId, isTL]);

  return (
    <div className={`premium-card p-4 px-4 animate-fade-in ${isDarkMode ? 'bg-surface bg-opacity-40 backdrop-blur' : 'bg-white shadow-sm'} rounded-4 mb-3`}>
      <div className="d-flex align-items-center justify-content-between gap-2 overflow-x-auto no-scrollbar py-2">
        {/* Left Section: Title + Dropdowns */}
        <div className="d-flex align-items-center gap-2">
          <div className="d-flex align-items-center gap-2 pe-3 border-end border-white border-opacity-10">
            <div className={`text-primary ${isDarkMode ? 'opacity-75' : ''}`}>
              <Command size={16} strokeWidth={2.5} />
            </div>
            <div className="d-none d-lg-block">
              <h5 className={`fw-black mb-0 ${isDarkMode ? 'text-main' : 'text-dark'} tracking-wide text-uppercase`} style={{ fontSize: '10px' }}>{title}</h5>
            </div>
          </div>

          <React.Fragment>
            {!isAssociate && !hideUserFilter && (
            <div className="d-flex align-items-center gap-2">
              {role === 'ADMIN' && (
                <div className={`${isDarkMode ? 'bg-white bg-opacity-10 border-white border-opacity-10' : 'bg-light border-light'} p-2 px-4 rounded-pill border`}>
                  <select
                    className="bg-transparent border-0 text-main fw-bold small text-uppercase outline-none py-1"
                    style={{ fontSize: '9px', minWidth: '100px' }}
                    value={selectedMgrId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMgrId(val);
                      setSelectedTlId("");
                      setSelectedAssocId("");
                      onChange({ ...filters, teamId: val || null, userId: null });
                    }}
                  >
                    <option value="" className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>MANAGER</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id} className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{m.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}

              {(role === 'ADMIN' || isManager) && (
                <div className={`${isDarkMode ? 'bg-white bg-opacity-10 border-white border-opacity-10' : 'bg-light border-light'} p-2 px-4 rounded-pill border`}>
                  <select
                    className="bg-transparent border-0 text-main fw-bold small text-uppercase outline-none py-1"
                    style={{ fontSize: '9px', minWidth: '100px' }}
                    value={selectedTlId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTlId(val);
                      setSelectedAssocId("");
                      const targetTeamId = val || selectedMgrId || (isManager ? currentUserId : null);
                      onChange({ ...filters, teamId: targetTeamId, userId: null });
                    }}
                    disabled={!effectiveUserId}
                  >
                    <option value="" className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{effectiveUserId ? 'ALL TEAMS' : '---'}</option>
                    {tls.map(t => (
                      <option key={t.id} value={t.id} className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{t.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}

              {(role === 'ADMIN' || isManager || isTL) && (
                <div className={`${isDarkMode ? 'bg-white bg-opacity-10 border-white border-opacity-10' : 'bg-light border-light'} p-2 px-4 rounded-pill border`}>
                  <select
                    className="bg-transparent border-0 text-main fw-bold small text-uppercase outline-none py-1"
                    style={{ fontSize: '9px', minWidth: '100px' }}
                    value={selectedAssocId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAssocId(val);
                      if (val) {
                        onChange({ ...filters, userId: val, teamId: null });
                      } else {
                        // Reset to team level
                        const targetTeamId = selectedTlId || selectedMgrId || (isManager ? currentUserId : null);
                        onChange({ ...filters, userId: null, teamId: targetTeamId });
                      }
                    }}
                    disabled={!effectiveUserId && role !== 'TEAM_LEADER'}
                  >
                    <option value="" className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{(effectiveUserId || isTL) ? 'ASSOCIATES' : '---'}</option>
                    {(associates.length > 0 ? associates : (typeof users !== 'undefined' ? users : [])).map(a => (
                      <option key={a.id} value={a.id} className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{a.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          </React.Fragment>

          {/* Option Filters (Modes) */}
          {modes && modes.length > 0 && (
            <div className="d-flex align-items-center gap-1 ps-3 border-start border-white border-opacity-10">
              {modes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => onModeChange(mode.id)}
                  className={`px-2 py-1.5 rounded-pill border-0 transition-all fw-black text-uppercase flex-shrink-0 ${activeMode === mode.id
                    ? 'bg-primary text-white shadow-glow-sm'
                    : 'bg-transparent text-muted hover-bg-surface'
                    }`}
                  style={{ fontSize: '8.5px', whiteSpace: 'nowrap' }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Section: Calendar + Reset + Sync */}
        <div className="d-flex align-items-center gap-2">
          <div className={`d-flex align-items-center gap-3 ${isDarkMode ? 'bg-white bg-opacity-10 border-white border-opacity-10' : 'bg-white border-light shadow-sm'} p-2 px-4 rounded-pill border`}>
            <CalendarDays 
              size={16} 
              strokeWidth={2}
              className="text-primary cursor-pointer" 
              onClick={() => document.getElementById('filter-date-from')?.showPicker?.() || document.getElementById('filter-date-from')?.focus()} 
            />
            <div className="d-flex align-items-center gap-1">
              <input
                id="filter-date-from"
                type="date"
                className={`bg-transparent border-0 text-main fw-bold px-1 ${isDarkMode ? 'color-scheme-dark' : 'color-scheme-light'}`}
                value={filters.from || ""}
                onChange={(e) => onChange({ ...filters, from: e.target.value })}
                onClick={(e) => e.target.showPicker?.()}
                style={{ width: '105px', fontSize: '9px', outline: 'none', cursor: 'pointer' }}
              />
              <span className="text-muted small opacity-25">|</span>
              <input
                id="filter-date-to"
                type="date"
                className={`bg-transparent border-0 text-main fw-bold px-1 ${isDarkMode ? 'color-scheme-dark' : 'color-scheme-light'}`}
                value={filters.to || ""}
                onChange={(e) => onChange({ ...filters, to: e.target.value })}
                onClick={(e) => e.target.showPicker?.()}
                style={{ width: '105px', fontSize: '9px', outline: 'none', cursor: 'pointer' }}
              />
            </div>
          </div>

          <button
            className={`btn ${isDarkMode ? 'btn-outline-light border-white border-opacity-10' : 'btn-outline-secondary border-light'} rounded-pill py-1.5 px-4 fw-bold text-uppercase`}
            onClick={() => {
              setSelectedMgrId("");
              setSelectedTlId("");
              setSelectedAssocId("");
              onChange({
                from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
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
            className="btn btn-primary rounded-pill py-1.5 px-4 border-0 fw-bold text-uppercase d-flex align-items-center gap-2 shadow-glow-sm"
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
