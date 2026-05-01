import React, { useState, useRef, useEffect } from 'react';
import { Menu, User as UserIcon, LogOut, Sun, Moon, Building2, Clock, ChevronDown, Key, Phone, Check, Edit2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ChangePasswordModal from './ChangePasswordModal';

const Navbar = ({ onToggleSidebar, userEmail, onLogout, navbarExtras }) => {
  const { user, updateProfile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [tempMobile, setTempMobile] = useState('');
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?.mobile) setTempMobile(user.mobile);
  }, [user?.mobile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMobileUpdate = async () => {
    if (tempMobile === user?.mobile) {
      setIsEditingMobile(false);
      return;
    }
    const success = await updateProfile({ mobile: tempMobile });
    if (success) {
      setIsEditingMobile(false);
    }
  };

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

        {/* User Info & Dropdown */}
        <div className="d-flex align-items-center gap-3 position-relative" ref={dropdownRef}>
          <div 
            className="d-flex align-items-center gap-3 cursor-pointer hover-bg-surface p-1 px-2 rounded-4 transition-all"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="text-end d-none d-lg-block" style={{ lineHeight: '1.2' }}>
                <p className="mb-0 fw-black text-main text-uppercase" style={{ fontSize: '10px' }}>
                  {user?.name?.toUpperCase() === 'SYSTEM ADMIN' ? 'ADMIN' : (user?.name || userEmail?.split('@')[0])}
                </p>
               <p className="mb-0 text-muted fw-bold opacity-40 text-uppercase" style={{ fontSize: '8px' }}>Identity Active</p>
            </div>
            
            <div className="position-relative">
              <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle border border-primary border-opacity-10 shadow-glow flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                 <UserIcon size={16} />
              </div>
              <div className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle" style={{ width: '10px', height: '10px', marginRight: '-2px', marginBottom: '-2px' }}></div>
            </div>
            <ChevronDown size={14} className={`text-muted transition-all ${isProfileOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="position-absolute top-100 end-0 mt-3 p-0 rounded-4 shadow-2xl animate-scale-in" style={{ 
              width: '320px', 
              background: isDarkMode ? '#111827' : '#ffffff', 
              border: '1px solid rgba(0,0,0,0.05)',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <div className="p-4 border-bottom border-light" style={{ background: 'linear-gradient(to bottom right, rgba(79, 70, 229, 0.05), rgba(59, 130, 246, 0.05))' }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="position-relative">
                    <div className="bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center rounded-circle" style={{ width: '52px', height: '52px' }}>
                      <UserIcon size={26} />
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <h6 className="fw-black text-dark mb-0 text-truncate text-uppercase tracking-wider" style={{ fontSize: '13px' }}>
                      {user?.name?.toUpperCase() === 'SYSTEM ADMIN' ? 'ADMIN' : user?.name}
                    </h6>
                    <p className="text-muted small mb-1 text-truncate fw-bold" style={{ fontSize: '10px' }}>{user?.email}</p>
                    <div className="badge bg-primary bg-opacity-10 text-primary fw-black border-0 px-2 py-1" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>
                      {user?.role?.toUpperCase() === 'SYSTEM ADMIN' ? 'ADMIN' : user?.role}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3">
                {/* Information Cluster */}
                <div className="bg-light bg-opacity-50 rounded-4 p-3 mb-3 border border-light">
                  {/* Workspace */}
                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className="p-2 bg-white rounded-3 shadow-sm border border-light">
                      <Building2 size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>Workspace / Office</p>
                      <p className="text-dark fw-black mb-0" style={{ fontSize: '11px' }}>{user?.officeName || 'Remote / Not Assigned'}</p>
                    </div>
                  </div>

                  {/* Mobile - Editable */}
                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className="p-2 bg-white rounded-3 shadow-sm border border-light">
                      <Phone size={14} className="text-primary" />
                    </div>
                    <div className="flex-grow-1">
                      <p className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>Direct Connection</p>
                      {isEditingMobile ? (
                        <div className="d-flex align-items-center gap-2">
                          <input 
                            autoFocus
                            className="text-primary fw-black mb-0 border-0 border-bottom border-primary bg-transparent p-0 w-100 outline-none" 
                            style={{ fontSize: '11px' }}
                            value={tempMobile}
                            onChange={(e) => setTempMobile(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleMobileUpdate()}
                          />
                          <button onClick={handleMobileUpdate} className="btn btn-link p-0 text-success border-0">
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center justify-content-between">
                          <p className="text-dark fw-black mb-0" style={{ fontSize: '11px' }}>{user?.mobile || 'No Contact Set'}</p>
                          <button onClick={() => setIsEditingMobile(true)} className="btn btn-link p-0 text-primary border-0 opacity-40 hover-opacity-100 transition-all">
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operating Shift */}
                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className="p-2 bg-white rounded-3 shadow-sm border border-light">
                      <Clock size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>Operating Shift</p>
                      <p className="text-dark fw-black mb-0" style={{ fontSize: '11px' }}>{user?.shiftTime || 'General Timing'}</p>
                    </div>
                  </div>

                  {/* GPS Coordinates */}
                  <div className="d-flex align-items-start gap-3">
                    <div className="p-2 bg-white rounded-3 shadow-sm border border-light">
                      <span className="text-primary fw-black" style={{ fontSize: '9px' }}>GPS</span>
                    </div>
                    <div>
                      <p className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>Geo Coordinates</p>
                      <p className="text-dark fw-black mb-0" style={{ fontSize: '10px' }}>
                        {user?.latitude && user?.longitude ? `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}` : 'Location Not Synced'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2">
                  <button 
                    onClick={() => { setIsPasswordModalOpen(true); setIsProfileOpen(false); }}
                    className="btn btn-link text-primary d-flex align-items-center gap-3 p-3 rounded-4 border-0 text-decoration-none hover-bg-primary hover-bg-opacity-5 transition-all"
                  >
                    <Key size={14} className="opacity-70" />
                    <span className="fw-black text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Access Credentials</span>
                  </button>
                  
                  <button 
                    onClick={onLogout}
                    className="btn w-100 py-3 rounded-4 d-flex align-items-center justify-content-center gap-2 border-0 transition-all"
                    style={{ background: '#ef4444', color: '#ffffff', fontWeight: '900', letterSpacing: '1px' }}
                  >
                    <LogOut size={16} />
                    <span className="text-uppercase" style={{ fontSize: '11px' }}>Terminate Session</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        userId={user?.id}
      />
    </nav>
  );
};

export default Navbar;
