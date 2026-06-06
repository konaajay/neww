import React from 'react';
import { Search } from 'lucide-react';
import logo from '../assets/gy1-png.png';
import './Header.css';

const Header = ({ activeTab, setActiveTab, searchQuery, setSearchQuery }) => {
  return (
    <header className="glass-panel header-container">
      {/* Brand */}
      <div className="header-brand">
        <div style={{
          background: 'rgba(255,255,255,0.8)',
          padding: '6px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <img src={logo || null} alt="Gyantrix Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '0.5px' }}>
            Gyan<span style={{ color: 'var(--accent-primary)' }}>trix</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automated Bulk Issuance</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="header-nav">
        <button
          onClick={() => setActiveTab('generate')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            background: activeTab === 'generate' ? '#ffffff' : 'transparent',
            color: activeTab === 'generate' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'generate' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
        >
          Generate
        </button>
        <button
          onClick={() => setActiveTab('webinars')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            background: activeTab === 'webinars' ? '#ffffff' : 'transparent',
            color: activeTab === 'webinars' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'webinars' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
        >
          Webinars
        </button>
        <button
          onClick={() => setActiveTab('tracking')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            background: activeTab === 'tracking' ? '#ffffff' : 'transparent',
            color: activeTab === 'tracking' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'tracking' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
        >
          Tracking
        </button>
        <button
          onClick={() => setActiveTab('colleges')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            background: activeTab === 'colleges' ? '#ffffff' : 'transparent',
            color: activeTab === 'colleges' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'colleges' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
            transition: 'var(--transition-smooth)'
          }}
        >
          Colleges
        </button>
      </div>

      {/* Search Bar */}
      <div className="header-search">
        <div className="search-wrapper">
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search records..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '40px',
              background: 'rgba(255,255,255,0.7)',
              borderColor: 'rgba(0,0,0,0.08)',
              borderRadius: '99px'
            }}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
