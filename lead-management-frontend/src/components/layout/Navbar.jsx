import React from 'react';
import { LogOut, Sun, Moon, Bell, Search, User as UserIcon, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ isCollapsed, userEmail, onLogout, onToggleSidebar, windowWidth }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <nav 
      className="position-fixed top-0 end-0 d-flex align-items-center justify-content-between px-3 px-md-4"
      style={{ 
        height: 'var(--header-height)', 
        left: (windowWidth > 992) ? (isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)') : '0',
        width: 'auto',
        backgroundColor: 'var(--nav-bg)',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 1010,
        backdropFilter: 'var(--glass-blur)',
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Mobile hamburger — always visible on phones */}
        <button
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
          style={{
            display: (windowWidth <= 992) ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            lineHeight: 1,
          }}
        >
          <Menu size={24} />
        </button>

        {/* Desktop search bar */}
        {windowWidth > 1280 && (
          <div className="search-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-input)', padding: '6px 16px', borderRadius: '999px', border: '1px solid var(--border-color)', transition: 'all 0.3s' }}>
            <Search size={14} className="search-icon" style={{ color: 'var(--text-muted)', transition: 'color 0.3s' }} />
            <input
              type="text"
              placeholder="Search leads, users or nodes... (Ctrl+K)"
              className="search-input"
              style={{ outline: 'none', width: '280px', fontSize: '12px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontWeight: 500 }}
            />
          </div>
        )}
      </div>

      <style>{`
        .search-container:focus-within { border-color: var(--primary-color) !important; background: var(--nav-bg) !important; box-shadow: 0 0 15px rgba(99, 102, 241, 0.15); }
        .search-container:focus-within .search-icon { color: var(--primary-color) !important; }
        .search-input::placeholder { color: var(--text-muted); opacity: 0.5; }
      `}</style>

      <div className="d-flex align-items-center gap-3 gap-md-4">
        <div className="d-flex align-items-center gap-2 p-1 bg-surface bg-opacity-50 rounded-pill border border-white border-opacity-5">
           <button 
             className={`p-1.5 rounded-circle border-0 d-flex transition-all ${!isDarkMode ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted opacity-50'}`}
             onClick={() => isDarkMode && toggleTheme()}
           >
              <Sun size={12} />
           </button>
           <button 
             className={`p-1.5 rounded-circle border-0 d-flex transition-all ${isDarkMode ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted opacity-50'}`}
             onClick={() => !isDarkMode && toggleTheme()}
           >
              <Moon size={12} />
           </button>
        </div>

        <div className="d-flex align-items-center gap-2 gap-md-3">
          <div className="text-end d-none d-md-block">
             <p className="mb-0 fw-black text-main" style={{ fontSize: '11px', letterSpacing: '0.02em' }}>{userEmail?.split('@')[0].toUpperCase()}</p>
             <p className="mb-0 text-muted fw-bold opacity-50" style={{fontSize: '8px', textTransform: 'uppercase'}}>Identity Node Active</p>
          </div>
          <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-pill border border-primary border-opacity-10 shadow-glow">
             <UserIcon size={16} />
          </div>
          
          <div className="d-none d-sm-block bg-border-color" style={{width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 8px'}}></div>
          
          <button 
            onClick={onLogout} 
            className="ui-btn ui-btn-secondary py-1.5 px-3 rounded-pill"
            style={{ fontSize: '10px' }}
          >
            <LogOut size={12} />
            <span className="ms-1 d-none d-sm-inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
