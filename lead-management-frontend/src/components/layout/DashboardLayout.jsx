import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import CallOutcomeModal from '../CallOutcomeModal';
import WfhRequestModal from './WfhRequestModal';

const DashboardLayout = ({ children, activeTab, onTabChange, role, navbarExtras, hideNavbar = false }) => {
  const { user, logout, clearCall } = useAuth();
  const { isDarkMode } = useTheme();
  const [endingCallLead, setEndingCallLead] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const toggleSidebar = () => {
    if (window.innerWidth >= 992) {
      setIsCollapsed(!isCollapsed);
    } else {
      setIsMobileOpen(!isMobileOpen);
    }
  };

  return (
    <div
      className={`dashboard-wrapper ${isCollapsed ? 'sidebar-closed' : ''}`}
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        background: 'var(--bg-body)'
      }}
    >
      <Sidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        activeTab={activeTab}
        onTabChange={onTabChange}
        role={role || user?.role}
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
      />

      <div
        className="main-content"
        style={{
          flex: 1,
          marginLeft: window.innerWidth >= 992
            ? (isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)')
            : '0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          width: '100%'
        }}
      >
        {!hideNavbar && (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              flexShrink: 0
            }}
          >
            <Navbar
              userEmail={user?.email}
              onLogout={logout}
              onToggleSidebar={toggleSidebar}
              navbarExtras={navbarExtras}
              onTabChange={onTabChange}
            />
          </div>
        )}

        <main
          className="layout-body custom-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            padding: '24px'
          }}
        >
          {children}
        </main>
      </div>

      <WfhRequestModal />
    </div>
  );
};

export default DashboardLayout;
