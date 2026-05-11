import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Menu, User as UserIcon, LogOut, Sun, Moon, Building2, Clock, ChevronDown, Key, Phone, Check, Edit2, Bell, ShieldHalf } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ChangePasswordModal from './ChangePasswordModal';
import { useTasks } from '../../features/leads/hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import wfhService from '../../services/wfhService';

const Navbar = ({ onToggleSidebar, userEmail, onLogout, navbarExtras, onTabChange }) => {
  const { user, updateProfile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [tempMobile, setTempMobile] = useState('');
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [notifiedTasks, setNotifiedTasks] = useState(new Set());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  // 1. Task Notification Logic
  const { tasks } = useTasks({ userId: user?.id });
  
  const normalizedRole = (user?.role || '').toUpperCase();
  const isSuperior = ['ADMIN', 'MANAGER', 'MGR', 'TEAM_LEADER', 'TL', 'TEAMLEAD'].some(r => normalizedRole.includes(r));

  const { data: wfhNotify } = useQuery({
    queryKey: ['wfh-pending-count'],
    queryFn: async () => {
      const res = await wfhService.getPendingCount();
      return res.data;
    },
    enabled: isSuperior,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const wfhPendingCount = wfhNotify?.count || 0;

  const upcomingTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    
    return tasks.filter(t => {
      if (t.status === 'COMPLETED') return false;
      const due = new Date(t.dueDate);
      // Filter for tasks due within the next 10 minutes (or just past due by 1 min)
      return due >= new Date(now.getTime() - 60000) && due <= tenMinutesFromNow;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [tasks]);

  useEffect(() => {
    upcomingTasks.forEach(task => {
      if (!notifiedTasks.has(task.id)) {
        toast.info(`UPCOMING TASK: ${task.title || 'Follow-up'} for ${task.lead?.name || 'Lead'} in 10 minutes`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setNotifiedTasks(prev => new Set(prev).add(task.id));
      }
    });
  }, [upcomingTasks, notifiedTasks]);

  useEffect(() => {
    if (user?.mobile) setTempMobile(user.mobile);
  }, [user?.mobile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
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
    <nav className="premium-nav d-flex align-items-center justify-content-between px-3 w-100 shadow-sm border-bottom border-white border-opacity-5" style={{ backdropFilter: 'blur(10px)', backgroundColor: isDarkMode ? 'rgba(3, 7, 18, 0.8)' : 'rgba(255, 255, 255, 0.8)' }}>
      {/* Left Section: Toggle + Logo fallback */}
      <div className="d-flex align-items-center gap-2">
        <button 
          className="d-flex d-lg-none btn btn-link text-main p-1 border-0 shadow-none outline-none"
          onClick={onToggleSidebar}
        >
          <Menu size={22} />
        </button>

        <div className="d-flex d-lg-none align-items-center gap-2 ms-1">
          <div className="p-1 bg-primary rounded-circle" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldHalf size={16} className="text-white" />
          </div>
          <span className="fw-black tracking-widest text-main" style={{ fontSize: '10px' }}>GYNATRIX</span>
        </div>

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

        {/* Notifications */}
        <div className="position-relative" ref={notificationRef}>
          <button 
            className={`p-2 rounded-circle border-0 transition-all position-relative ${isDarkMode ? 'bg-surface bg-opacity-30 text-main' : 'bg-light text-dark'}`}
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell size={18} className={(upcomingTasks.length > 0 || wfhPendingCount > 0) ? 'text-primary' : 'opacity-50'} />
            {(upcomingTasks.length > 0 || wfhPendingCount > 0) && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '7px', marginTop: '5px', marginLeft: '-5px' }}>
                {upcomingTasks.length + wfhPendingCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className={`position-absolute top-100 end-0 mt-3 p-0 rounded-4 shadow-2xl animate-zoom-in ${isDarkMode ? 'bg-surface' : 'bg-card'}`} style={{ 
              width: '300px', 
              border: '1px solid rgba(0,0,0,0.05)',
              zIndex: 2020
            }}>
              <div className="p-3 border-bottom border-light d-flex align-items-center justify-content-between">
                <h6 className="mb-0 fw-black text-uppercase tracking-widest text-main" style={{ fontSize: '10px' }}>Upcoming Alerts</h6>
                <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill fw-black" style={{ fontSize: '8px' }}>{(upcomingTasks.length + wfhPendingCount)} TOTAL</span>
              </div>
              <div className="p-2 overflow-auto" style={{ maxHeight: '300px' }}>
                {upcomingTasks.length === 0 && wfhPendingCount === 0 ? (
                  <div className="p-4 text-center opacity-30">
                    <Bell size={24} className="mb-2" />
                    <p className="extra-small fw-bold text-uppercase mb-0">No immediate tasks</p>
                  </div>
                ) : (
                  <>
                    {wfhPendingCount > 0 && (
                      <div className={`p-3 rounded-3 mb-2 border border-primary border-opacity-20 transition-all ${isDarkMode ? 'bg-primary bg-opacity-5' : 'bg-primary bg-opacity-10'}`}>
                        <div className="d-flex align-items-start gap-2">
                          <div className="p-1.5 bg-danger bg-opacity-10 text-danger rounded-circle">
                             <Bell size={12} />
                          </div>
                          <div className="flex-grow-1">
                             <p className="mb-0 fw-black text-danger text-uppercase" style={{ fontSize: '10px' }}>Attendance Action Needed</p>
                             <p className="mb-1 text-muted fw-bold" style={{ fontSize: '9px' }}>You have {wfhPendingCount} pending WFH requests to review.</p>
                             <button 
                               className="btn btn-link p-0 text-primary fw-black text-uppercase tracking-widest border-0" 
                               style={{ fontSize: '8px' }}
                               onClick={() => {
                                 setIsNotificationOpen(false);
                                 if (onTabChange) onTabChange('attendance');
                               }}
                             >
                               Review Now
                             </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {upcomingTasks.map(task => (
                    <div key={task.id} className={`p-3 rounded-3 mb-1 border border-transparent hover-bg-surface transition-all ${isDarkMode ? 'bg-white bg-opacity-5' : 'bg-light bg-opacity-50'}`}>
                      <div className="d-flex align-items-start gap-2">
                        <div className="p-1.5 bg-primary bg-opacity-10 text-primary rounded-circle">
                          <Clock size={12} />
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <p className="mb-0 fw-black text-main text-uppercase text-truncate" style={{ fontSize: '10px' }}>{task.title || 'EMI Call-up'}</p>
                          <p className="mb-1 text-muted fw-bold text-truncate" style={{ fontSize: '9px' }}>{task.lead?.name || 'Unknown Lead'}</p>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-primary fw-black" style={{ fontSize: '8px' }}>
                              {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-muted extra-small fw-bold opacity-50">In {Math.round((new Date(task.dueDate) - new Date()) / 60000)}m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
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
            <div className="position-absolute top-100 end-0 mt-3 p-0 rounded-4 shadow-2xl animate-zoom-in bg-card" style={{ 
              width: '320px', 
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto',
              border: '1px solid rgba(0,0,0,0.05)',
              zIndex: 2010,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              <div className="p-4 border-bottom border-light" style={{ background: 'linear-gradient(to bottom right, rgba(79, 70, 229, 0.05), rgba(59, 130, 246, 0.05))' }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="position-relative">
                    <div className="bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center rounded-circle" style={{ width: '52px', height: '52px' }}>
                      <UserIcon size={26} />
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <h6 className="fw-black text-main mb-0 text-truncate text-uppercase tracking-wider" style={{ fontSize: '13px' }}>
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
                <div className={`${isDarkMode ? 'bg-surface bg-opacity-40' : 'bg-light bg-opacity-50'} rounded-4 p-3 mb-3 border ${isDarkMode ? 'border-white border-opacity-10' : 'border-light'}`}>
                  {/* Workspace */}
                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className={`p-2 ${isDarkMode ? 'bg-surface' : 'bg-white'} rounded-3 shadow-sm border ${isDarkMode ? 'border-white border-opacity-10' : 'border-light'}`}>
                      <Building2 size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>Workspace / Office</p>
                      <p className="text-main fw-black mb-0" style={{ fontSize: '11px' }}>{user?.officeName || 'Remote / Not Assigned'}</p>
                    </div>
                  </div>
                  {/* Mobile - Editable */}
                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className={`p-2 ${isDarkMode ? 'bg-surface' : 'bg-white'} rounded-3 shadow-sm border ${isDarkMode ? 'border-white border-opacity-10' : 'border-light'}`}>
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
                          <p className="text-main fw-black mb-0" style={{ fontSize: '11px' }}>{user?.mobile || 'No Contact Set'}</p>
                          <button onClick={() => setIsEditingMobile(true)} className="btn btn-link p-0 text-primary border-0 opacity-40 hover-opacity-100 transition-all">
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operating Shift */}
                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className={`p-2 ${isDarkMode ? 'bg-surface' : 'bg-white'} rounded-3 shadow-sm border ${isDarkMode ? 'border-white border-opacity-10' : 'border-light'}`}>
                      <Clock size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>Operating Shift</p>
                      <p className="text-main fw-black mb-0" style={{ fontSize: '11px' }}>{user?.shiftTime || 'General Timing'}</p>
                    </div>
                  </div>

                  {/* GPS Coordinates */}
                  <div className="d-flex align-items-start gap-3">
                    <div className={`p-2 ${isDarkMode ? 'bg-surface' : 'bg-white'} rounded-3 shadow-sm border ${isDarkMode ? 'border-white border-opacity-10' : 'border-light'}`}>
                      <span className="text-primary fw-black" style={{ fontSize: '9px' }}>GPS</span>
                    </div>
                    <div>
                      <p className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>Geo Coordinates</p>
                      <p className="text-main fw-black mb-0" style={{ fontSize: '10px' }}>
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
                    <span className="fw-black text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Change Password</span>
                  </button>
                  
                  <button 
                    onClick={onLogout}
                    className="btn w-100 py-3 rounded-4 d-flex align-items-center justify-content-center gap-2 border-0 transition-all"
                    style={{ background: '#ef4444', color: '#ffffff', fontWeight: '900', letterSpacing: '1px' }}
                  >
                    <LogOut size={16} />
                    <span className="text-uppercase" style={{ fontSize: '11px' }}>Sign Out</span>
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
