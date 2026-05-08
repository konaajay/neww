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
    <div className="dashboard-wrapper">
      <Sidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        activeTab={activeTab}
        onTabChange={onTabChange}
        role={role || user?.role}
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
      />

      <div className={`main-content ${isCollapsed ? 'sidebar-closed' : ''}`}>
        {!hideNavbar && (
          <Navbar 
            userEmail={user?.email} 
            onLogout={logout} 
            onToggleSidebar={toggleSidebar}
            navbarExtras={navbarExtras}
          />
        )}

        <main className="layout-body animate-fade-in">
          <div className="container-fluid">
            {children}
          </div>
        </main>
      </div>

      <WfhRequestModal />
    </div>
  );
};

export default DashboardLayout;
