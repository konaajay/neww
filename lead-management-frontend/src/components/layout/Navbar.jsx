import React from 'react';
import { Menu, User as UserIcon, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ onToggleSidebar, userEmail, onLogout, navbarExtras }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <nav className="premium-nav d-flex align-items-center justify-content-between px-3 w-100" style={{ justifyContent: 'space-between !important' }}>
      {/* Left Section: Toggle + Logo fallback */}
      <div className="d-flex align-items-center gap-2">
        <button 
          className="d-flex d-lg-none btn btn-link text-main p-1 border-0 shadow-none outline-none"
          onClick={onToggleSidebar}
        >
          <Menu size={20} />
        </button>

        {navbarExtras && (
          <div className="d-none d-sm-block">
             {navbarExtras}
          </div>
        )}
      </div>
      {/* Spacer to force items to ends */}
      <div className="flex-grow-1"></div>

      {/* Right Section */}
      <div className="d-flex align-items-center gap-3">
        {/* Theme Toggle */}
        <div className="d-none d-md-flex align-items-center gap-1 p-1 bg-surface bg-opacity-30 rounded-pill border border-white border-opacity-5">
           <button 
             className={`p-1 rounded-circle border-0 d-flex ${!isDarkMode ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted opacity-50'}`}
             onClick={() => isDarkMode && toggleTheme()}
             style={{ width: '24px', height: '24px', alignItems: 'center', justifyContent: 'center' }}
           >
              <Sun size={12} />
           </button>
           <button 
             className={`p-1 rounded-circle border-0 d-flex ${isDarkMode ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted opacity-50'}`}
             onClick={() => !isDarkMode && toggleTheme()}
             style={{ width: '24px', height: '24px', alignItems: 'center', justifyContent: 'center' }}
           >
              <Moon size={12} />
           </button>
        </div>

        {/* User Info */}
        <div className="d-flex align-items-center gap-3">
          <div className="text-end d-none d-lg-block" style={{ lineHeight: '1.2' }}>
             <p className="mb-0 fw-black text-main text-uppercase" style={{ fontSize: '10px' }}>{userEmail?.split('@')[0]}</p>
             <p className="mb-0 text-muted fw-bold opacity-40 text-uppercase" style={{ fontSize: '8px' }}>Identity Active</p>
          </div>
          
          <div className="position-relative">
            <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle border border-primary border-opacity-10 shadow-glow flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
               <UserIcon size={16} />
            </div>
            <div className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle" style={{ width: '10px', height: '10px', marginRight: '-2px', marginBottom: '-2px' }}></div>
          </div>

          <button 
            onClick={onLogout} 
            className="ui-btn ui-btn-secondary py-1.5 px-3 rounded-pill d-flex align-items-center gap-2 flex-shrink-0"
            style={{ height: '36px' }}
          >
            <LogOut size={14} />
            <span className="d-none d-md-inline fw-black tracking-widest" style={{ fontSize: '10px' }}>LOGOUT</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
