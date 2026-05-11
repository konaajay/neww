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
    className="premium-card h-100 cursor-pointer border border-main border-opacity-10 shadow-lg group hover-active-card overflow-hidden"
    onClick={onClick}
    style={{
      borderRadius: '20px',
      background: 'var(--bg-card)',
      backdropFilter: 'var(--glass-blur)',
      position: 'relative',
      minHeight: '80px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
  >
    <div className="p-3 metric-card-padding position-relative z-10 d-flex flex-column h-100">
      <div className="mb-1">
        <h6 className="fw-black text-uppercase tracking-widest text-muted mb-0" style={{ fontSize: '8px', opacity: 0.5 }}>{title}</h6>
      </div>

      <div className="flex-grow-1 d-flex align-items-center justify-content-between my-1">
        <div>
          <span className="fw-black text-main tabular-nums d-block metric-card-value" style={{ fontSize: '24px', lineHeight: 1, letterSpacing: '-0.5px' }}>{stats?.primary?.value ?? 0}</span>
          <span className="fw-black text-muted text-uppercase" style={{ fontSize: '8px', opacity: 0.6, letterSpacing: '0.5px' }}>{stats?.primary?.label ?? ''}</span>
        </div>
      </div>

      <div className="mt-auto d-flex justify-content-between align-items-center pt-2 border-top border-white border-opacity-5">
        {(stats?.secondary || []).map((s, idx) => (
          <div key={idx} className="d-flex flex-column align-items-center text-center px-1">
            <span className={`fw-black text-${s?.color || 'main'} mb-0`} style={{ fontSize: '11px', lineHeight: 1 }}>{s?.value ?? 0}</span>
            <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '7px', opacity: 0.5, letterSpacing: '0.2px' }}>{s?.label ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
));

const MetricCommandCenter = memo(({ stats, role, filters, onNavigate, leads = [], hideUsers = false, vertical = false }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const statsMemo = useMemo(() => {
    if (!stats) return null;

    const isAssociate = role === 'ASSOCIATE';
    // Prioritize current subject (filtered user or current user)
    const subjectId = filters?.userId || currentUser?.id;
    const personalRecord = stats?.performance?.find(p => p.userId == subjectId);
    const statsToUse = (isAssociate || filters?.userId) ? stats : (personalRecord || (hideUsers ? {} : (stats?.performance?.[0] || stats)));
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
    <div className="metric-grid-custom no-scrollbar animate-fade-in-up pb-2 px-1">
      <div className="metric-card-wrapper">
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
        <div className="metric-card-wrapper">
          {role === 'ASSOCIATE' ? (
            <MetricCard
              title="MY PERFORMANCE"
              icon={TrendingUp}
              color="success"
              onClick={() => handleNav('revenue', '/revenue')}
              stats={{
                primary: { value: `₹${(stats.dailyRevenue || 0).toLocaleString()}`, label: 'Today Collection' },
                secondary: [
                  { label: 'This Month', value: `₹${(stats.monthlyRevenue || 0).toLocaleString()}`, color: 'success' },
                  { label: 'Target', value: `₹${(stats.monthlyTarget || stats.assignedTarget || stats.targetAmount || stats.target || stats.distributedTarget || 0).toLocaleString()}`, color: 'primary' },
                  { 
                    label: 'Pending', 
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
        <div className="metric-card-wrapper">
          <MetricCard
            title={(!hideUsers && !filters?.userId) ? "TEAM PERFORMANCE" : "MY PERFORMANCE"}
            icon={TrendingUp}
            color="success"
            onClick={() => handleNav('revenue', '/revenue')}
            stats={(() => {
              // The "subject" is either the filtered user or the current user
              const subjectId = filters?.userId || currentUser?.id;
              
              // If we have a specific user filter OR we are in Team Dashboard mode (not hideUsers),
              // the 'stats' object itself represents our current context (individual or team)
              const myStats = stats?.performance?.find(p => (p.userId || p.id) == subjectId) || 
                             (role === 'ASSOCIATE' || filters?.userId || !hideUsers ? stats : null);
              
              const target = myStats 
                ? (myStats.assignedTarget || myStats.targetAmount || myStats.monthlyTarget || myStats.target || 0) 
                : (stats.assignedTarget || stats.targetAmount || stats.personalTarget || stats.individualTarget || stats.target || 
                  ((role === 'ASSOCIATE' || filters?.userId) 
                    ? (stats.monthlyTarget || 0) 
                    : Math.max(0, (stats.monthlyTarget || 0) - (stats.distributedAmount || stats.distributedTarget || 0))));
                
              const revenue = myStats ? (myStats.monthlyRevenue || myStats.totalRevenue || myStats.revenue || 0) : 0;
              const dailyRevenue = myStats ? (myStats.dailyRevenue || myStats.todayCollection || 0) : 0;
              const pending = myStats ? (myStats.pendingPaymentsAmount || myStats.totalPending || myStats.pendingRevenue || 0) : 0;

              return {
                primary: { value: `₹${(dailyRevenue).toLocaleString()}`, label: 'Today Collection' },
                secondary: [
                  { label: 'This Month', value: `₹${(revenue).toLocaleString()}`, color: 'success' },
                  { label: 'Target', value: `₹${(target).toLocaleString()}`, color: 'primary' },
                  { label: 'Pending', value: `₹${(pending).toLocaleString()}`, color: 'info' }
                ]
              };
            })()}
          />
        </div>
      )}

      <div className="metric-card-wrapper">
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

    </div>
  );
});

export default MetricCommandCenter;
