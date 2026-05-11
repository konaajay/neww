import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import CallOutcomeModal from '../CallOutcomeModal';
import WfhRequestModal from './WfhRequestModal';
import { ShieldHalf, PanelLeft } from 'lucide-react';

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
        <div 
          className="brand-section cursor-pointer hover-opacity d-flex align-items-center justify-content-center" 
          onClick={toggleSidebar}
          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
        >
            {/* Desktop Expanded Branding */}
            {!isCollapsed && (
              <div className="d-none d-lg-flex align-items-center gap-3 overflow-hidden px-3">
                <div className="p-2 bg-primary rounded-circle shadow-glow animate-pulse-slow">
                  <ShieldHalf size={26} className="text-white" />
                </div>
                <span className="fw-black tracking-widest text-main text-truncate" style={{ fontSize: '20px', letterSpacing: '0.15em' }}>GYNATRIX</span>
              </div>
            )}

            {/* Mobile/Collapsed Symbolic Toggle */}
            <div className={`d-flex align-items-center justify-content-center w-100 ${!isCollapsed ? 'd-lg-none' : ''}`}>
               <div className="p-2 bg-primary rounded-circle shadow-glow transition-all hover-scale">
                 <ShieldHalf size={28} className="text-white" />
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
          hideHeader={window.innerWidth >= 992}
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
