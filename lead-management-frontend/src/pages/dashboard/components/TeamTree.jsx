import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BarChart2, Users, User, Shield, Briefcase } from 'lucide-react';

const TeamTreeItem = ({ item, level = 0, onFocus, currentFocusId }) => {
  const [expanded, setExpanded] = useState(level < 2); // Show first two levels by default
  const hasSub = item.subordinates && item.subordinates.length > 0;
  const isFocused = currentFocusId === item.id;

  const getRoleIcon = (role) => {
    switch(role) {
      case 'MANAGER': return <Shield size={12} className="text-warning" />;
      case 'TEAM_LEADER': return <Shield size={12} className="text-info" />;
      case 'ASSOCIATE': return <Briefcase size={12} className="text-primary" />;
      default: return <User size={12} className="text-muted" />;
    }
  };

  return (
    <div className="team-tree-lead position-relative">
      {/* Connector lines for nested items */}
      {level > 0 && (
        <div 
          className="position-absolute border-start border-white border-opacity-10" 
          style={{ 
            left: `${(level - 1) * 32 + 16}px`, 
            top: '-12px', 
            bottom: '12px',
            width: '1px' 
          }} 
        />
      )}
      
      <div 
        className={`d-flex align-items-center gap-2 py-2 px-3 rounded-3 cursor-pointer transition-all mb-1 ${
          isFocused 
          ? 'bg-primary bg-opacity-10 border border-primary border-opacity-30 shadow-sm ring-1 ring-primary ring-opacity-20' 
          : 'hover-bg-surface border border-transparent'
        }`}
        style={{ marginLeft: `${level * 32}px` }}
        onClick={() => onFocus(item.id)}
      >
        <div className="d-flex align-items-center" style={{ width: '24px' }}>
          {hasSub && (
            <div 
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} 
              className="text-muted hover-text-primary transition-all"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
        </div>
        
        <div className={`p-1.5 rounded-circle flex-shrink-0 ${isFocused ? 'bg-primary bg-opacity-20' : 'bg-surface border border-white border-opacity-5'}`}>
          {getRoleIcon(item.role)}
        </div>
        
        <div className="flex-grow-1 d-flex align-items-center justify-content-between overflow-hidden">
          <div className="d-flex flex-column overflow-hidden text-truncate">
            <span className={`fw-bold small mb-0 text-truncate ${isFocused ? 'text-primary' : 'text-main'}`}>{item.name}</span>
            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '7px', letterSpacing: '0.6px' }}>
              {item.role?.replace(/_/g, ' ')}
            </span>
          </div>
          
          {isFocused && (
            <div className="bg-primary bg-opacity-20 p-1 rounded-circle flex-shrink-0 ms-2">
               <BarChart2 size={10} className="text-primary animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {expanded && hasSub && (
        <div className="team-tree-children animate-fade-in">
          {item.subordinates.map(sub => (
            <TeamTreeItem 
              key={sub.id} 
              item={sub} 
              level={level + 1} 
              onFocus={onFocus} 
              currentFocusId={currentFocusId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TeamTree = ({ data, onFocus, currentFocusId, onAddUser }) => {
  return (
    <div className="premium-card overflow-hidden h-100">
      <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
              <Users size={20} />
            </div>
            <div>
              <h6 className="fw-black mb-0 text-uppercase text-main tracking-widest small">Staff Hierarchy</h6>
              <p className="mb-0 text-muted fw-bold" style={{ fontSize: '9px' }}>Real-time Chain of Command</p>
            </div>
          </div>
          

        </div>
      </div>
      
      <div className="card-body p-3 overflow-auto custom-scrollbar" style={{ maxHeight: '600px' }}>
        {data && Array.isArray(data) ? (
          <div className="d-flex flex-column">
            {data.map(root => (
              <TeamTreeItem 
                key={root.id}
                item={root} 
                onFocus={onFocus} 
                currentFocusId={currentFocusId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-5 d-flex flex-column align-items-center">
            <div className="spinner-border spinner-border-sm text-primary mb-3"></div>
            <p className="text-muted small fw-bold text-uppercase" style={{ fontSize: '10px' }}>Mapping Structure...</p>
          </div>
        )}
        
        {currentFocusId && (
          <button 
            className="btn btn-outline-primary btn-sm w-100 mt-4 rounded-pill fw-black text-uppercase py-2 shadow-sm animate-fade-in border-opacity-25"
            style={{ fontSize: '10px' }}
            onClick={() => onFocus(null)}
          >
            Reset Analysis Context
          </button>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 4px; }
        .hover-bg-surface:hover { background: var(--bg-surface); }
        .ring-1 { box-shadow: 0 0 0 1px currentColor; }
      `}</style>
    </div>
  );
};

export default TeamTree;
