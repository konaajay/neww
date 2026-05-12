import React, { useMemo, useCallback } from 'react';
import { CalendarDays, RefreshCcw, Command } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useLookupData } from '../../../features/users/hooks/useLookupData';

const FiltersBar = ({
  filters,
  onChange,
  onSync,
  title = "FILTERS",
  role = "",
  currentUserId,
  hideUserFilter = false
}) => {
  const { isDarkMode } = useTheme();

  // 1. DATA HOOKS (Single source of truth)
  const {
    teamLeaders,
    subordinates,
    teamTree
  } = useLookupData(role);

  // 2. TREE HELPERS
  const findInTree = useCallback((nodes, targetId) => {
    if (!nodes || !targetId) return null;
    const list = Array.isArray(nodes) ? nodes : [nodes];
    for (const node of list) {
      if (node.id === parseInt(targetId)) return node;
      if (node.subordinates?.length > 0) {
        const found = findInTree(node.subordinates, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const isRole = useCallback((userRole, targetRole) => {
    if (!userRole) return false;
    const cleanRole = userRole.replace('ROLE_', '').toUpperCase().replace(/\s/g, '').replace('_', '');
    const target = targetRole.toUpperCase().replace(/\s/g, '').replace('_', '');
    
    // Comprehensive role mapping
    const tlRoles = ['TEAMLEADER', 'TEAMLEAD', 'TL'];
    const mgrRoles = ['MANAGER', 'MGR'];
    const assocRoles = ['ASSOCIATE', 'USER', 'AGENT', 'BDA'];

    if (target === 'TEAMLEADER') {
      return tlRoles.some(r => cleanRole.includes(r));
    }
    if (target === 'MANAGER') {
      return mgrRoles.some(r => cleanRole.includes(r));
    }
    if (target === 'ASSOCIATE') {
      return assocRoles.some(r => cleanRole.includes(r));
    }
    
    return cleanRole === target || cleanRole.includes(target);
  }, []);

  const getAllByRole = useCallback((nodes, targetRole) => {
    const results = [];
    const collect = (list) => {
      if (!list) return;
      const arr = Array.isArray(list) ? list : [list];
      arr.forEach(n => {
        if (isRole(n.role, targetRole) && n.active !== false) results.push(n);
        if (n.subordinates) collect(n.subordinates);
      });
    };
    collect(nodes);
    return results;
  }, [isRole]);

  // 3. DERIVED DATA (Stable options)
  const managers = useMemo(() => {
    if (role !== 'ADMIN' || !teamTree) return [];
    return getAllByRole(teamTree, 'MANAGER');
  }, [role, teamTree, getAllByRole]);

  const tls = useMemo(() => {
    if (role === 'MANAGER') {
      return (teamLeaders || []).filter(u => isRole(u.role, 'TEAM_LEADER') && u.active !== false);
    }
    if (role === 'ADMIN') {
      if (filters.managerId) {
        const mgr = findInTree(teamTree, filters.managerId);
        return mgr?.subordinates?.filter(u => isRole(u.role, 'TEAM_LEADER') && u.active !== false) || [];
      }
      // If no manager selected, show ALL team leaders from the tree
      return getAllByRole(teamTree, 'TEAM_LEADER');
    }
    return [];
  }, [role, teamLeaders, teamTree, filters.managerId, findInTree, isRole, getAllByRole]);

  const associates = useMemo(() => {
    if (role === 'TEAM_LEADER' || role === 'TL') {
      return (subordinates || []).filter(u => 
        isRole(u.role, 'ASSOCIATE') && 
        u.active !== false && 
        u.id !== currentUserId
      );
    }
    if (role === 'ADMIN' || role === 'MANAGER') {
      if (filters.teamId) {
        const tl = findInTree(teamTree || teamLeaders, filters.teamId);
        return tl?.subordinates?.filter(u => isRole(u.role, 'ASSOCIATE') && u.active !== false) || [];
      }
      if (role === 'MANAGER') {
        // For Manager, show all associates in the branch if no TL selected
        return (subordinates || []).filter(u => isRole(u.role, 'ASSOCIATE') && u.active !== false);
      }
      if (role === 'ADMIN' && !filters.managerId) {
        // If Admin and no TL/Manager selected, show ALL associates
        return getAllByRole(teamTree, 'ASSOCIATE');
      }
    }
    return [];
  }, [role, subordinates, teamTree, teamLeaders, filters.teamId, filters.managerId, findInTree, isRole, getAllByRole]);

  // 3. HANDLERS
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    // Reset subordinate filters if parent changes
    if (key === 'managerId') {
      newFilters.teamId = null;
      newFilters.userId = null;
    }
    if (key === 'teamId') {
      newFilters.userId = null;
    }
    // Update the parent state
    onChange(newFilters);
  };

  const handleReset = () => {
    const d = new Date();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    onChange({
      from: formatDate(firstDay),
      to: formatDate(lastDay),
      userId: null,
      managerId: null,
      teamId: null
    });
  };

  const handleTLChange = (val) => {
    handleFilterChange('teamId', val);
  };

  return (
    <div className={`premium-card pt-4 pb-4 px-4 animate-fade-in ${isDarkMode ? 'bg-surface bg-opacity-30 border-white border-opacity-5' : 'bg-white border-dark border-opacity-5 shadow-sm'} rounded-5 mb-4`}>
      <div className="d-flex align-items-center justify-content-between gap-4 overflow-auto no-scrollbar" style={{ whiteSpace: 'nowrap' }}>
        {/* Left Section: Title + Hierarchy Dropdowns */}
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 pe-4 border-end border-white border-opacity-10">
            <div className="p-2 bg-primary bg-opacity-10 rounded-3 text-primary">
              <Command size={14} strokeWidth={2.5} />
            </div>
            <h5 className="fw-black mb-0 text-main tracking-widest text-uppercase d-none d-xl-block" style={{ fontSize: '10px', letterSpacing: '2px' }}>{title}</h5>
          </div>

          {!hideUserFilter && role !== 'ASSOCIATE' && (
            <div className="d-flex align-items-center gap-2.5">
              {role === 'ADMIN' ? (
                <>
                  <div className="filter-select-wrapper">
                    <select
                      className="filter-select"
                      value={filters.managerId || ""}
                      onChange={(e) => handleFilterChange('managerId', e.target.value || null)}
                    >
                      <option value="">ALL MANAGERS</option>
                      {managers?.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="filter-select-wrapper">
                    <select
                      className="filter-select"
                      value={filters.teamId || ""}
                      onChange={(e) => handleTLChange(e.target.value || null)}
                    >
                      <option value="">TEAM LEADERS</option>
                      {tls?.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                    </select>
                  </div>
 
                  <div className="filter-select-wrapper">
                    <select
                      className="filter-select"
                      value={filters.userId || ""}
                      onChange={(e) => handleFilterChange('userId', e.target.value || null)}
                    >
                      <option value="">ASSOCIATES</option>
                      {associates?.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                </>
              ) : role === 'MANAGER' ? (
                <>
                  <div className="filter-select-wrapper">
                    <select
                      className="filter-select"
                      value={filters.teamId || ""}
                      onChange={(e) => handleTLChange(e.target.value || null)}
                    >
                      <option value="">TEAM LEADERS</option>
                      {tls?.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="filter-select-wrapper">
                    <select
                      className="filter-select"
                      value={filters.userId || ""}
                      onChange={(e) => handleFilterChange('userId', e.target.value || null)}
                    >
                      <option value="">ASSOCIATES</option>
                      {associates?.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                </>
              ) : role === 'TEAM_LEADER' || role === 'TL' ? (
                <>
                  <div className="filter-select-wrapper opacity-75">
                    <select className="filter-select" value={currentUserId} disabled>
                      <option value={currentUserId}>{(findInTree(teamTree, currentUserId)?.name || "TEAM LEADER").toUpperCase()}</option>
                    </select>
                  </div>
                  <div className="filter-select-wrapper">
                    <select
                      className="filter-select"
                      value={filters.userId || ""}
                      onChange={(e) => handleFilterChange('userId', e.target.value || null)}
                    >
                      <option value="">ALL ASSOCIATES</option>
                      {associates?.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div className="filter-select-wrapper">
                  <select
                    className="filter-select"
                    value={filters.userId || ""}
                    onChange={(e) => handleFilterChange('userId', e.target.value || null)}
                  >
                    <option value="">TEAM ASSOCIATE</option>
                    {associates?.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Date Range + Controls */}
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <div 
              className={`d-flex align-items-center gap-2 pt-2.5 pb-2.5 px-4 rounded-pill border cursor-pointer hover-bg-opacity transition-all ${isDarkMode ? 'border-white border-opacity-10 bg-white bg-opacity-5 shadow-inner' : 'border-dark border-opacity-5 bg-light shadow-sm'}`}
            >
              <CalendarDays size={13} className="text-primary" />
              <div className="position-relative">
               <input
                  type="date"
                  className="bg-transparent border-0 text-main fw-black cursor-pointer"
                  style={{ fontSize: '10px', outline: 'none', width: '90px', background: 'transparent', color: 'inherit', colorScheme: 'dark' }}
                  value={filters.from || ""}
                  onClick={(e) => { e.stopPropagation(); if (e.target.showPicker) e.target.showPicker(); }}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                />
              </div>
            </div>

            <span className="text-muted fw-black opacity-30" style={{ fontSize: '9px' }}>TO</span>

            <div 
              className={`d-flex align-items-center gap-2 pt-2.5 pb-2.5 px-4 rounded-pill border cursor-pointer hover-bg-opacity transition-all ${isDarkMode ? 'border-white border-opacity-10 bg-white bg-opacity-5 shadow-inner' : 'border-dark border-opacity-5 bg-light shadow-sm'}`}
            >
              <CalendarDays size={13} className="text-primary" />
              <div className="position-relative">
                <input
                  type="date"
                  className="bg-transparent border-0 text-main fw-black cursor-pointer"
                  style={{ fontSize: '10px', outline: 'none', width: '90px', background: 'transparent', color: 'inherit', colorScheme: 'dark' }}
                  value={filters.to || ""}
                  onClick={(e) => { e.stopPropagation(); if (e.target.showPicker) e.target.showPicker(); }}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); handleReset(); }} 
            className="btn btn-link p-0 text-muted fw-black text-uppercase tracking-widest text-decoration-none transition-all hover-opacity" 
            style={{ fontSize: '9px', letterSpacing: '1px' }}
          >
            RESET
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); onSync(); }} 
            className="ui-btn ui-btn-primary px-4 py-2 rounded-pill d-flex align-items-center gap-2 shadow-glow hover-scale-sm"
          >
            <RefreshCcw size={12} strokeWidth={2.5} />
            <span className="fw-black text-uppercase tracking-widest" style={{ fontSize: '10px' }}>UPDATE</span>
          </button>
        </div>
      </div>

      <style>{`
        .filter-select-wrapper { 
          background: ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'}; 
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}; 
          border-radius: 50px; 
          padding: 8px 20px; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: ${isDarkMode ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none'};
        }
        .filter-select-wrapper:hover { 
          border-color: var(--primary-main);
          background: ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
        }
        .filter-select { 
          background: transparent; 
          border: 0; 
          color: var(--text-main); 
          font-weight: 900; 
          font-size: 10px; 
          text-transform: uppercase; 
          outline: none; 
          min-width: 100px; 
          color-scheme: dark;
          letter-spacing: 0.5px;
        }
        .filter-select option { background: ${isDarkMode ? '#0f172a' : '#ffffff'}; color: ${isDarkMode ? '#ffffff' : '#000000'}; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        .hover-scale-sm:hover { transform: scale(1.05); }
        .hover-scale-sm:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
};

export default React.memo(FiltersBar);
