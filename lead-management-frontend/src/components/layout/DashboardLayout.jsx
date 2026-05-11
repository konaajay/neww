import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import CallOutcomeModal from '../CallOutcomeModal';
import WfhRequestModal from './WfhRequestModal';
import { ShieldHalf, Menu } from 'lucide-react';

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
    <div className={`app-shell ${isCollapsed ? 'sidebar-closed' : ''}`}>
      {/* Unified SaaS Header */}
      <header className="unified-header">
        <div className="brand-section">
          <div className="d-flex align-items-center gap-3 overflow-hidden">
            <button 
              onClick={toggleSidebar}
              className="btn btn-link text-main p-0 border-0 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>
            
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              <div className="p-2 bg-primary rounded-pill flex-shrink-0">
                <ShieldHalf size={22} className="text-white" />
              </div>
              {!isCollapsed && (
                <span className="fw-black tracking-widest text-main text-truncate" style={{ fontSize: '18px' }}>GYNATRIX</span>
              )}
            </div>
          </div>
        </div>

        <div className="nav-section">
          <Navbar
            userEmail={user?.email}
            onLogout={logout}
            onToggleSidebar={toggleSidebar}
            navbarExtras={navbarExtras}
            onTabChange={onTabChange}
          />
        </div>
      </header>

      <div className="app-main-area">
        <Sidebar
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          activeTab={activeTab}
          onTabChange={onTabChange}
          role={role || user?.role}
          isCollapsed={isCollapsed}
          onToggle={toggleSidebar}
          hideHeader={true} // Hide internal sidebar header
        />

        <main className="layout-body custom-scroll">
          {children}
        </main>
      </div>

      <WfhRequestModal />
    </div>
  );
};

export default DashboardLayout;
