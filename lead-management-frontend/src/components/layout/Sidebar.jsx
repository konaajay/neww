import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import wfhService from '../../services/wfhService';
import {
  LayoutDashboard, Users, UserPlus, Layers, Target, TrendingUp, Settings,
  LogOut, Phone as PhoneIcon, Upload, IndianRupee, FileText, Menu, X, ShieldHalf, LifeBuoy, BookOpen, Award
} from 'lucide-react';
import SidebarAttendance from './SidebarAttendance';


const Sidebar = ({ isOpen, onClose, activeTab, onTabChange, role, isCollapsed, onToggle, hideHeader = false }) => {
  const normalizedRole = (role || '').toUpperCase();
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

  const pendingCount = wfhNotify?.count || 0;

  const getNavItems = () => {
    const normalizedRole = (role || '').toUpperCase();

    if (normalizedRole === 'ADMIN') {
      return [
        // { id: 'overview', label: 'MY HOME', icon: LayoutDashboard },
        { id: 'team-dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
        { id: 'strategy', label: 'Revenue Strategy', icon: TrendingUp },
        { id: 'users', label: 'USERS', icon: Users },
        { id: 'hierarchy', label: 'Hierarchy', icon: Layers },
        { id: 'attendance', label: 'Attendance logs', icon: FileText },
        { id: 'leads', label: 'Team Leads ', icon: Target },
        { id: 'tasks', label: 'Team Task ', icon: Layers },
        { id: 'payments', label: 'Revenue Stats', icon: IndianRupee },
        { id: 'calls', label: 'Team Calllogs', icon: PhoneIcon },
        { id: 'reports', label: 'Monthly Reports', icon: FileText },
        { id: 'certificate', label: 'Certificate', icon: Award, url: '/certificates' },
        // { id: 'courses', label: 'Courses', icon: BookOpen },
        { id: 'settings', label: 'Global Settings', icon: Settings },
      ];
    }

    if (normalizedRole === 'MANAGER' || normalizedRole === 'MGR') {
      return [
        { id: 'my-stats', label: 'My HOME', icon: ShieldHalf },
        { id: 'overview', label: 'Team Dashboard', icon: LayoutDashboard },
        { id: 'strategy', label: 'Strategic Hub', icon: TrendingUp },
        { id: 'users', label: 'Personnel', icon: Users },
        { id: 'attendance', label: 'Attendance', icon: FileText },
        { id: 'leads', label: 'Team Leads', icon: Target },
        { id: 'payments', label: 'Team Revenue', icon: IndianRupee },
        { id: 'calls', label: 'Team Calllogs', icon: PhoneIcon },
        { id: 'tasks', label: 'Team Task ', icon: Layers },
        { id: 'certificate', label: 'Certificate', icon: Award, url: '/certificates' },
        // { id: 'courses', label: 'Courses', icon: BookOpen },
        { id: 'reports', label: 'Team Reports', icon: TrendingUp },
      ];
    }

    if (normalizedRole.includes('TEAM_LEAD') || normalizedRole === 'TL' || normalizedRole.includes('TEAMLEAD')) {
      return [
        { id: 'my-stats', label: 'My HOME', icon: ShieldHalf },
        { id: 'overview', label: 'Team Dashboard', icon: LayoutDashboard },
        { id: 'strategy', label: 'Strategic Hub', icon: TrendingUp },
        { id: 'users', label: 'My Squad', icon: Users },
        { id: 'attendance', label: 'Attendance', icon: FileText },
        { id: 'leads', label: 'Team Leads', icon: Target },
        { id: 'tasks', label: 'Team Task ', icon: Layers },
        { id: 'payments', label: 'Team Revenues', icon: IndianRupee },
        { id: 'calls', label: 'Team Call Logs', icon: PhoneIcon },
        // { id: 'courses', label: 'Courses', icon: BookOpen },
        { id: 'reports', label: 'Team Reports', icon: TrendingUp },
      ];
    }

    // Default to ASSOCIATE-style menu
    return [
      { id: 'overview', label: 'My Home', icon: LayoutDashboard },
      { id: 'attendance', label: 'Attendance', icon: FileText },
      { id: 'leads', label: 'Leads', icon: Target },
      { id: 'tasks', label: 'Tasks', icon: Layers },
      { id: 'calls', label: 'Call logs', icon: PhoneIcon },
      { id: 'payments', label: 'Revenues', icon: IndianRupee },
      { id: 'reports', label: 'Reports', icon: TrendingUp },
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop - only rendered when drawer is open */}
      {isOpen && (
        <div
          className="fixed-top w-100 h-100 bg-black opacity-50 visible"
          style={{ zIndex: 1040, transition: 'opacity 0.3s ease' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`glass-sidebar ${isCollapsed ? 'closed' : ''} ${isOpen ? 'show' : ''}`}
      >
        <div className="d-flex flex-column h-100">
          {/* Sidebar Header - Hidden on desktop as it's in the main header */}
          {!hideHeader && !isCollapsed && (
            <div
              className="sidebar-header px-3 border-bottom border-white border-opacity-5 cursor-pointer d-lg-none"
              onClick={onClose}
            >
              <div className="d-flex align-items-center gap-3 overflow-hidden py-2">
                <div style={{ width: '42px', height: '42px' }}>
                  <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span className="fw-black tracking-widest text-main text-truncate" style={{ fontSize: '18px', letterSpacing: '0.1em' }}>GYANTRIX</span>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-grow-1 overflow-auto custom-scroll">
            <div className="d-flex flex-column px-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                if (item.url) {
                  const isExternal = item.url.startsWith('http');
                  return isExternal ? (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`nav-link-premium border-0 position-relative text-decoration-none`}
                      title={isCollapsed ? item.label : ''}
                      onClick={() => onClose()}
                    >
                      <Icon size={18} className="text-muted" />
                      {(!isCollapsed || isOpen) && <span>{item.label}</span>}
                    </a>
                  ) : (
                    <Link
                      key={item.id}
                      to={item.url}
                      className={`nav-link-premium border-0 position-relative text-decoration-none`}
                      title={isCollapsed ? item.label : ''}
                      onClick={() => onClose()}
                    >
                      <Icon size={18} className="text-muted" />
                      {(!isCollapsed || isOpen) && <span>{item.label}</span>}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => { onTabChange(item.id); onClose(); }}
                    className={`nav-link-premium border-0 ${isActive ? 'active' : ''} position-relative`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-muted'} />
                    {(!isCollapsed || isOpen) && <span>{item.label}</span>}

                    {item.id === 'attendance' && pendingCount > 0 && (
                      <span
                        className="position-absolute translate-middle badge rounded-pill bg-danger shadow-sm border border-white border-opacity-10"
                        style={{
                          top: '12px',
                          right: isCollapsed ? '8px' : '15px',
                          fontSize: '8px',
                          padding: '3px 5px',
                          zIndex: 2,
                          animation: 'pulse-red 2s infinite'
                        }}
                      >
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <SidebarAttendance isCollapsed={isCollapsed} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
