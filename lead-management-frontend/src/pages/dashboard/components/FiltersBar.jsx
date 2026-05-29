import React, { useMemo, useCallback } from 'react';
import { CalendarDays, RefreshCcw, Command } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useLookupData } from '../../../features/users/hooks/useLookupData';
import PortalSelect from '../../../components/PortalSelect';

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
    const seenIds = new Set();
    const collect = (list) => {
      if (!list) return;
      const arr = Array.isArray(list) ? list : [list];
      arr.forEach(n => {
        if (isRole(n.role, targetRole) && n.active !== false && !seenIds.has(n.id)) {
          results.push(n);
          seenIds.add(n.id);
        }
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
      userId: hideUserFilter ? filters.userId : null,
      managerId: hideUserFilter ? filters.managerId : null,
      teamId: hideUserFilter ? filters.teamId : null
    });
  };

  const handleTLChange = (val) => {
    handleFilterChange('teamId', val);
  };

  return (
    <div className={`px-4 py-3 animate-fade-in ${isDarkMode ? 'bg-surface bg-opacity-30 border border-white border-opacity-5' : 'bg-white border border-dark border-opacity-5 shadow-sm'} rounded-4 mb-3 w-100`} style={{ position: 'relative', zIndex: 10 }}>
      <div className="row g-3 align-items-center w-100 m-0">
        
        {/* Title Header */}
        <div className="col-12 col-xl-auto d-flex align-items-center gap-2">
          <div className="p-2 bg-primary bg-opacity-10 rounded-3 text-primary">
            <Command size={14} strokeWidth={2.5} />
          </div>
          <h5 className="fw-black mb-0 text-main tracking-widest text-uppercase d-none d-xl-block" style={{ fontSize: '10px', letterSpacing: '1px' }}>{title}</h5>
        </div>

        {/* User Dropdowns Grid */}
        {!hideUserFilter && role !== 'ASSOCIATE' && (
          <>
            {role === 'ADMIN' ? (
              <>
                <div className="col-12 col-sm-6 col-xl">
                  <PortalSelect
                    options={[{ value: "", label: "ALL MANAGERS" }, ...managers.map(u => ({ value: u.id.toString(), label: u.name.toUpperCase() }))]}
                    value={filters.managerId || ""}
                    onChange={(e) => handleFilterChange('managerId', e.target.value || null)}
                    className="w-100" style={{ width: '100%' }}
                  />
                </div>
                <div className="col-12 col-sm-6 col-xl">
                  <PortalSelect
                    options={[{ value: "", label: "TEAM LEADERS" }, ...tls.map(u => ({ value: u.id.toString(), label: u.name.toUpperCase() }))]}
                    value={filters.teamId || ""}
                    onChange={(e) => handleTLChange(e.target.value || null)}
                    className="w-100" style={{ width: '100%' }}
                  />
                </div>
                <div className="col-12 col-sm-6 col-xl">
                  <PortalSelect
                    options={[{ value: "", label: "ASSOCIATES" }, ...associates.map(u => ({ value: u.id.toString(), label: u.name.toUpperCase() }))]}
                    value={filters.userId || ""}
                    onChange={(e) => handleFilterChange('userId', e.target.value || null)}
                    className="w-100" style={{ width: '100%' }}
                  />
                </div>
              </>
            ) : role === 'MANAGER' ? (
              <>
                <div className="col-12 col-sm-6 col-xl">
                  <PortalSelect
                    options={[{ value: "", label: "TEAM LEADERS" }, ...tls.map(u => ({ value: u.id.toString(), label: u.name.toUpperCase() }))]}
                    value={filters.teamId || ""}
                    onChange={(e) => handleTLChange(e.target.value || null)}
                    className="w-100" style={{ width: '100%' }}
                  />
                </div>
                <div className="col-12 col-sm-6 col-xl">
                  <PortalSelect
                    options={[{ value: "", label: "ASSOCIATES" }, ...associates.map(u => ({ value: u.id.toString(), label: u.name.toUpperCase() }))]}
                    value={filters.userId || ""}
                    onChange={(e) => handleFilterChange('userId', e.target.value || null)}
                    className="w-100" style={{ width: '100%' }}
                  />
                </div>
              </>
            ) : role === 'TEAM_LEADER' || role === 'TL' ? (
              <>
                <div className="col-12 col-sm-6 col-xl opacity-75">
                  <PortalSelect
                    options={[{ value: currentUserId, label: (findInTree(teamTree, currentUserId)?.name || "TEAM LEADER").toUpperCase() }]}
                    value={currentUserId}
                    disabled={true}
                    className="w-100" style={{ width: '100%' }}
                  />
                </div>
                <div className="col-12 col-sm-6 col-xl">
                  <PortalSelect
                    options={[{ value: "", label: "ALL ASSOCIATES" }, ...associates.map(u => ({ value: u.id.toString(), label: u.name.toUpperCase() }))]}
                    value={filters.userId || ""}
                    onChange={(e) => handleFilterChange('userId', e.target.value || null)}
                    className="w-100" style={{ width: '100%' }}
                  />
                </div>
              </>
            ) : (
              <div className="col-12 col-xl">
                <PortalSelect
                  options={[{ value: "", label: "TEAM ASSOCIATE" }, ...associates.map(u => ({ value: u.id.toString(), label: u.name.toUpperCase() }))]}
                  value={filters.userId || ""}
                  onChange={(e) => handleFilterChange('userId', e.target.value || null)}
                  className="w-100" style={{ width: '100%' }}
                />
              </div>
            )}
          </>
        )}

        {/* Date From */}
        <div className="col-12 col-sm-6 col-xl-auto">
          <div
            className={`d-flex align-items-center gap-2 px-3 py-2 rounded-3 border w-100 ${isDarkMode ? 'border-white border-opacity-10 bg-surface bg-opacity-40' : 'border-dark border-opacity-5 bg-light'}`}
            style={{ height: '38px', cursor: 'pointer', minWidth: '150px' }}
            onClick={(e) => { const el = e.currentTarget.querySelector('input'); if(el?.showPicker) el.showPicker(); }}
          >
            <CalendarDays size={14} className="text-primary flex-shrink-0" />
            <input
              type="date"
              className="bg-transparent border-0 text-main fw-black w-100"
              style={{ fontSize: '12px', outline: 'none', color: 'inherit', colorScheme: isDarkMode ? 'dark' : 'light' }}
              value={filters.from || ""}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Date To */}
        <div className="col-12 col-sm-6 col-xl-auto">
          <div
            className={`d-flex align-items-center gap-2 px-3 py-2 rounded-3 border w-100 ${isDarkMode ? 'border-white border-opacity-10 bg-surface bg-opacity-40' : 'border-dark border-opacity-5 bg-light'}`}
            style={{ height: '38px', cursor: 'pointer', minWidth: '150px' }}
            onClick={(e) => { const el = e.currentTarget.querySelector('input'); if(el?.showPicker) el.showPicker(); }}
          >
            <CalendarDays size={14} className="text-primary flex-shrink-0" />
            <input
              type="date"
              className="bg-transparent border-0 text-main fw-black w-100"
              style={{ fontSize: '12px', outline: 'none', color: 'inherit', colorScheme: isDarkMode ? 'dark' : 'light' }}
              value={filters.to || ""}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="col-12 col-xl-auto ms-xl-auto d-flex align-items-center gap-3 mt-2 mt-xl-0 justify-content-end">
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="btn btn-link p-0 text-muted fw-black text-uppercase tracking-widest text-decoration-none"
            style={{ fontSize: '10px', letterSpacing: '1px' }}
          >
            RESET
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); onSync(); }}
            className="px-4 d-flex align-items-center justify-content-center gap-2 shadow-glow border-0 rounded-3 ui-btn-primary"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', color: 'white', height: '38px', minWidth: '120px' }}
          >
            <RefreshCcw size={14} strokeWidth={2.5} className="animate-spin-slow" />
            <span className="fw-black text-uppercase tracking-widest" style={{ fontSize: '11px' }}>UPDATE</span>
          </button>
        </div>

      </div>

      <style>{`
        .filter-select-wrapper { 
          background: ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'}; 
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}; 
          border-radius: 50px; 
          padding: 6px 12px; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: ${isDarkMode ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none'};
          margin: 2px 0;
        }
        .filter-select-wrapper:hover { 
          border-color: var(--primary);
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
          min-width: 120px; 
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
