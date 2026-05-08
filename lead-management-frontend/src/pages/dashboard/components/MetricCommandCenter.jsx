import React, { useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  TrendingUp,
  ArrowRight,
  Target,
  LifeBuoy,
  Zap,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';

export const MetricCard = memo(({ title, stats, icon: Icon, color, onClick }) => (
  <div
    className="premium-card h-100 cursor-pointer border border-white border-opacity-10 shadow-lg group hover-active-card overflow-hidden"
    onClick={onClick}
    style={{
      borderRadius: '24px',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(30px)',
      position: 'relative',
      minHeight: '120px'
    }}
  >
    <div className="p-4 position-relative z-10 d-flex flex-column h-100">
      <div className="mb-2">
        <h6 className="fw-black text-uppercase tracking-widest text-muted mb-0" style={{ fontSize: '9px', opacity: 0.6 }}>{title}</h6>
      </div>

      <div className="flex-grow-1 d-flex align-items-center justify-content-between my-2">
        <div>
          <span className="fw-black text-main tabular-nums d-block" style={{ fontSize: '38px', lineHeight: 1, letterSpacing: '-1px' }}>{stats?.primary?.value ?? 0}</span>
          <span className="fw-black text-muted text-uppercase" style={{ fontSize: '11px', opacity: 0.7, letterSpacing: '0.8px' }}>{stats?.primary?.label ?? ''}</span>
        </div>
      </div>

      <div className="mt-auto d-flex justify-content-between align-items-center pt-3 border-top border-white border-opacity-5">
        {(stats?.secondary || []).map((s, idx) => (
          <div key={idx} className="d-flex flex-column align-items-center text-center">
            <span className={`fw-black text-${s?.color || 'main'} mb-0.5`} style={{ fontSize: '14px', lineHeight: 1 }}>{s?.value ?? 0}</span>
            <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '10px', opacity: 0.6, letterSpacing: '0.4px' }}>{s?.label ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
));

const MetricCommandCenter = memo(({ stats, role, filters, onNavigate, leads = [], hideUsers = false }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const statsMemo = useMemo(() => {
    if (!stats) return null;

    const isAssociate = role === 'ASSOCIATE';
    const statsToUse = isAssociate ? stats : (stats?.performance?.[0] || stats);
    const getCount = (k) => {
      const target = k.toUpperCase().replace(/_/g, '').replace(/\s/g, '');
      // Handle various role name formats (TEAMLEAS, TEAMLEAD, TL -> TEAMLEADER)
      if (target === 'TEAMLEADER' || target === 'TEAMLEAD' || target === 'TL' || target === 'TEAMLEAS') {
        return (statsToUse.userBreakdown?.['TEAMLEADER'] || 0) + 
               (statsToUse.userBreakdown?.['TEAMLEAD'] || 0) + 
               (statsToUse.userBreakdown?.['TEAMLEAS'] || 0) + 
               (statsToUse.userBreakdown?.['TEAM_LEADER'] || 0) + 
               (statsToUse.userBreakdown?.['TL'] || 0);
      }
      if (target === 'MANAGER' || target === 'MGR') {
        return (statsToUse.userBreakdown?.['MANAGER'] || 0) + (statsToUse.userBreakdown?.['MGR'] || 0);
      }
      if (target === 'ASSOCIATE' || target === 'BDA' || target === 'AGENT') {
        return (statsToUse.userBreakdown?.['ASSOCIATE'] || 0) + (statsToUse.userBreakdown?.['BDA'] || 0) + (statsToUse.userBreakdown?.['AGENT'] || 0);
      }
      return statsToUse.userBreakdown?.[target] || statsToUse.userBreakdown?.[k.toUpperCase()] || 0;
    };
    const totalUsers = statsToUse.totalUsers || (getCount('ADMIN') + getCount('MANAGER') + getCount('TEAM_LEADER') + getCount('ASSOCIATE'));

    return {
      displayToday: statsToUse.todayFollowups || 0,
      displayOverdue: statsToUse.pendingFollowups || 0,
      totalUsers,
      getCount
    };
  }, [stats]);

  if (!statsMemo) return null;

  const handleNav = (target, path, extra = {}) => {
    const tabMap = {
      attendance: 'attendance',
      users: role === 'ADMIN' ? 'hierarchy' : 'users',
      revenue: role === 'ADMIN' ? 'payments' : 'payments',
      tasks: 'tasks',
      leads: 'leads'
    };

    const tabId = tabMap[target] || target;
    if (onNavigate) onNavigate(tabId, extra);
    else navigate(path, { state: extra });
  };

  return (
    <div 
      className="d-flex overflow-auto pb-3 gap-3 animate-fade-in-up scrollbar-hidden" 
      style={{ scrollSnapType: 'x mandatory' }}
    >
      <div style={{ minWidth: '320px', scrollSnapAlign: 'start' }}>
        <MetricCard
          title="ATTENDANCE"
          icon={Users}
          color="primary"
          onClick={() => handleNav('attendance', `/attendance?from=${filters.from}&to=${filters.to}`)}
          stats={{
            primary: { value: stats.presentCount || 0, label: '' },
            secondary: [
              { label: 'Absent', value: stats.absentCount || 0, color: 'danger' },
              { label: 'Present', value: stats.presentCount || 0, color: 'success' },
              { label: 'Late', value: stats.lateCount || 0, color: 'warning' }
            ]
          }}
        />
      </div>

      {!hideUsers && (
        <div style={{ minWidth: '320px', scrollSnapAlign: 'start' }}>
          {role === 'ASSOCIATE' ? (
            <MetricCard
              title="MY PERFORMANCE"
              icon={TrendingUp}
              color="success"
              onClick={() => handleNav('revenue', '/revenue')}
              stats={{
                primary: { value: `₹${(stats.monthlyRevenue || 0).toLocaleString()}`, label: 'Month Collection' },
                secondary: [
                  { label: 'Today', value: `₹${(stats.dailyRevenue || 0).toLocaleString()}`, color: 'success' },
                  { label: 'Target', value: `₹${(stats.monthlyTarget || stats.assignedTarget || stats.targetAmount || stats.target || stats.distributedTarget || 0).toLocaleString()}`, color: 'primary' },
                  { 
                    label: 'Pending Amount', 
                    value: `₹${(stats.pendingPaymentsAmount || 0).toLocaleString()}`, 
                    color: 'info' 
                  }
                ]
              }}
            />
          ) : (
            <MetricCard
              title="USERS"
              icon={Users}
              color="info"
              onClick={() => handleNav('users', '/users')}
              stats={{
                primary: { value: statsMemo.totalUsers, label: role === 'ADMIN' ? 'Staff (incl. Admin)' : 'Staff' },
                secondary: [
                  ...(role === 'ADMIN' ? [{ label: 'Admin', value: statsMemo.getCount('ADMIN'), color: 'success' }] : []),
                  { label: 'Manager', value: statsMemo.getCount('MANAGER'), color: 'primary' },
                  { label: 'TeamLead', value: statsMemo.getCount('TEAM_LEADER'), color: 'info' },
                  { label: 'Associate', value: statsMemo.getCount('ASSOCIATE'), color: 'warning' },
                ]
              }}
            />
          )}
        </div>
      )}

      {role !== 'ASSOCIATE' && (
        <div style={{ minWidth: '320px', scrollSnapAlign: 'start' }}>
          <MetricCard
            title="MY PERFORMANCE"
            icon={TrendingUp}
            color="success"
            onClick={() => handleNav('revenue', '/revenue')}
            stats={(() => {
              const myStats = stats?.performance?.find(p => p.userId === currentUser?.id) || stats?.performance?.[0] || stats;
              const target = myStats.monthlyTarget || myStats.assignedTarget || myStats.targetAmount || myStats.target || myStats.distributedTarget || 0;
              const revenue = myStats.monthlyRevenue || myStats.revenue || 0;
              return {
                primary: { value: `₹${(revenue).toLocaleString()}`, label: 'Month Collection' },
                secondary: [
                  { label: 'Today', value: `₹${(myStats.dailyRevenue || 0).toLocaleString()}`, color: 'success' },
                  { label: 'Target', value: `₹${(target).toLocaleString()}`, color: 'primary' },
                  { 
                    label: 'Pending Amount', 
                    value: `₹${(myStats.pendingPaymentsAmount || 0).toLocaleString()}`, 
                    color: 'info' 
                  }
                ]
              };
            })()}
          />
        </div>
      )}

      <div style={{ minWidth: '320px', scrollSnapAlign: 'start' }}>
        <MetricCard
          title="FOLLOWUP PIPELINE"
          icon={Clock}
          color="warning"
          onClick={() => handleNav('tasks', '/tasks', { filter: 'ALL' })}
          stats={{
            primary: { value: statsMemo.displayToday, label: 'Today Task' },
            secondary: [
              { label: 'Today', value: statsMemo.displayToday, color: 'primary' },
              { label: 'Overdue', value: statsMemo.displayOverdue, color: 'danger' },
              { label: 'EMI/Pay', value: (stats.todayPaymentsCount || 0) + (stats.pendingPaymentsCount || 0), color: 'success' },
            ]
          }}
        />
      </div>

      <style>{`
        .scrollbar-hidden::-webkit-scrollbar { display: none; }
        .scrollbar-hidden { -ms-overflow-style: none; scrollbar-width: none; }
        .premium-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); min-height: 90px; position: relative; overflow: hidden; }
        .hover-active-card:hover { transform: translateY(-3px) scale(1.01); background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.15) !important; box-shadow: 0 10px 20px -10px rgba(0,0,0,0.4) !important; }
        .grid-secondary-stats { display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
        .shadow-glow-sm { box-shadow: 0 0 8px currentColor; }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
    </div>
  );
});

export default MetricCommandCenter;
