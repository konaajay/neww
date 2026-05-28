import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const SystemStatGrid = ({ children }) => {
  return (
    <div 
      className="mb-4 animate-fade-in"
      style={{
        display: 'grid',
        gap: '1.5rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
      }}
    >
      {React.Children.map(children, child => (
        <div>
          {child}
        </div>
      ))}
    </div>
  );
};

export const SystemStatCard = ({ label, value, colorClass = 'text-primary', isActive = false, onClick }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div 
      className={`dashboard-stat-card cursor-pointer transition-smooth ${isActive ? 'shadow-glow border-primary' : 'shadow-sm'}`} 
      style={{ 
        height: '105px',
        borderRadius: '20px',
        padding: '24px',
        background: isActive 
          ? (isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)') 
          : (isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'),
        border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transform: isActive ? 'translateY(-2px)' : 'none'
      }}
      onClick={onClick}
    >
      <h3 
        className={`dashboard-stat-value mb-1 ${isActive ? 'text-primary' : colorClass}`} 
        style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1 }}
      >
        {value}
      </h3>
      <div 
        className="dashboard-stat-label text-muted opacity-70" 
        style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}
      >
        {label}
      </div>
    </div>
  );
};
