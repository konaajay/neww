import React from 'react';
import {
  LayoutDashboard, Users, UserPlus, Layers, Target, TrendingUp, Settings,
  LogOut, Phone as PhoneIcon, Upload, IndianRupee, FileText, Menu, X, ShieldHalf, LifeBuoy
} from 'lucide-react';
import AttendanceWidget from './AttendanceWidget';

const Sidebar = ({ isOpen, onClose, activeTab, onTabChange, role, isCollapsed, onToggle }) => {
  const getNavItems = () => {
    switch (role) {
      case 'ADMIN':
        return [
          // { id: 'my-stats', label: 'My Dashboard', icon: ShieldHalf },
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'team-dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
          { id: 'hierarchy', label: 'Users', icon: Layers },
          { id: 'pipeline', label: 'Team Leads ', icon: Target },
          // { id: 'ingestion', label: 'Add Lead', icon: UserPlus },
          { id: 'tasks', label: 'Team Task ', icon: Layers },
          { id: 'revenue', label: 'Revenue Stats', icon: IndianRupee },
          { id: 'attendance-logs', label: 'Team Attendance', icon: FileText },
          { id: 'call-logs', label: 'Team Calllogs', icon: PhoneIcon },
          { id: 'attendance-settings', label: 'Global Settings', icon: Settings },
        ];
      case 'MANAGER':
        return [
          { id: 'my-stats', label: 'My HOME', icon: ShieldHalf },
          { id: 'overview', label: 'Team Dashboard', icon: LayoutDashboard },
          { id: 'pipeline', label: 'Team Leads', icon: Target },
          // { id: 'ingestion', label: 'Add Lead', icon: UserPlus },
          { id: 'payments', label: 'Team Revenue', icon: IndianRupee },
          { id: 'call-logs', label: 'Team Calllogs', icon: PhoneIcon },
          { id: 'attendance-logs', label: 'Team Attendance', icon: FileText }
          , { id: 'tasks', label: 'Team Task ', icon: Layers },
          // { id: 'tickets', label: 'Team Raise ticket', icon: ShieldHalf },
          // { id: 'hierarchy', label: 'Team member', icon: Users },
          { id: 'reports', label: 'Team Reports', icon: TrendingUp },
        ];
      case 'TEAM_LEADER':
        return [
          { id: 'my-stats', label: 'My Dashboard', icon: ShieldHalf },
          { id: 'overview', label: 'Team Dashboard', icon: LayoutDashboard },
          { id: 'pipeline', label: 'Team Leads', icon: Target },
          // { id: 'ingestion', label: 'Add Lead', icon: UserPlus },
          { id: 'tasks', label: 'Team Task ', icon: Layers },
          { id: 'payments', label: 'Team Revenues', icon: IndianRupee },
          { id: 'attendance', label: 'Team Attendance', icon: FileText },
          { id: 'call-logs', label: 'Team Call Logs', icon: PhoneIcon },
          { id: 'reports', label: 'Team Reports', icon: TrendingUp },
          // { id: 'tickets', label: 'Raise Ticket', icon: ShieldHalf },
        ];
      case 'ASSOCIATE':
        return [
          { id: 'overview', label: 'My Home', icon: LayoutDashboard },
          { id: 'leads', label: 'Leads', icon: Target },
          // { id: 'ingestion', label: 'Add Lead', icon: UserPlus },
          { id: 'tasks', label: 'Tasks', icon: Layers },
          { id: 'call-logs', label: 'Call logs', icon: PhoneIcon },
          { id: 'payments', label: 'Revenues', icon: IndianRupee },
          { id: 'attendance', label: 'Attendance', icon: FileText },
          { id: 'reports', label: 'Reports', icon: TrendingUp },
          // { id: 'tickets', label: 'Raise Ticket', icon: ShieldHalf },
        ];
      default:
        return [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }];
    }
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
          {/* Sidebar Header */}
          <div className="p-4 d-flex align-items-center justify-content-between border-bottom border-white border-opacity-5" style={{ height: 'var(--header-height)' }}>
            {!isCollapsed && (
              <div className="d-flex align-items-center gap-2">
                <div className="p-1.5 bg-primary rounded-pill">
                  <ShieldHalf size={18} className="text-white" />
                </div>
                <span className="fw-black tracking-widest small text-main">GYNATRIX</span>
              </div>
            )}
            {isCollapsed && <ShieldHalf size={24} className="text-primary mx-auto" />}
            
            <button
              className="btn btn-link text-main p-1 border-0 ms-2 hover-bg-surface rounded-circle transition-all d-none d-lg-flex"
              onClick={onToggle}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <Menu size={18} className="opacity-75" />
            </button>

            {/* Desktop toggle button - hidden on mobile */}

            {/* Mobile close button - only on smaller screens */}
            <button
              className="btn btn-link text-main p-1 border-0 d-lg-none"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-grow-1 py-3 overflow-auto custom-scroll">
            <div className="d-flex flex-column px-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onTabChange(item.id); onClose(); }}
                    className={`nav-link-premium border-0 ${isActive ? 'active' : ''}`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-muted'} />
                    {(!isCollapsed || isOpen) && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bottom Widget */}
          <div className="mt-auto border-top border-white border-opacity-5 p-2 bg-surface bg-opacity-10">
            <AttendanceWidget isCollapsed={isCollapsed && !isOpen} />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
