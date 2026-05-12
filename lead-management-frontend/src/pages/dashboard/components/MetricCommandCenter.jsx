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
    className="premium-card h-100 cursor-pointer border border-light shadow-sm transition-all hover-translate-y-1"
    onClick={onClick}
    style={{
      borderRadius: '24px',
      background: 'var(--bg-card)',
      backdropFilter: 'var(--glass-blur)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '140px',
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    <div className="p-3 d-flex flex-column h-100">
      <div className="d-flex align-items-start justify-content-between mb-auto">
        <div className="flex-grow-1">
          <h6 className="fw-black text-uppercase tracking-widest text-muted mb-2" style={{ fontSize: '10px', letterSpacing: '1px', opacity: 0.5 }}>{title}</h6>
          <div className="d-flex flex-column align-items-start">
            <span className="fw-black text-main tabular-nums d-block" style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-1px' }}>{stats?.primary?.value ?? 0}</span>
            {stats?.primary?.label && (
              <span className="text-muted fw-black text-uppercase mt-1" style={{ fontSize: '10px', opacity: 0.8, letterSpacing: '0.8px' }}>{stats?.primary?.label}</span>
            )}
          </div>
        </div>
        <div className={`p-2 bg-${color} bg-opacity-10 rounded-3 text-${color} flex-shrink-0 ms-2`}>
          {Icon && <Icon size={18} strokeWidth={2.5} />}
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between pt-3 border-top border-white border-opacity-5 mt-auto">
        {(stats?.secondary || []).map((s, idx) => (
          <div key={idx} className="d-flex flex-column align-items-center">
            <span className="fw-black text-main mb-1" style={{ fontSize: '16px', lineHeight: 1 }}>{s?.value ?? 0}</span>
            <div className="d-flex align-items-center gap-1">
              <div className={`rounded-circle bg-${s?.color || color}`} style={{ width: '6px', height: '6px' }}></div>
              <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '8px', opacity: 0.4, letterSpacing: '0.5px' }}>{s?.label ?? ''}</span>
            </div>
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
    const subjectId = filters?.userId || currentUser?.id;
    const personalRecord = stats?.performance?.find(p => p.userId == subjectId);
    const statsToUse = (isAssociate || filters?.userId || filters?.teamId || filters?.managerId || ((role === 'ADMIN' || role === 'MANAGER' || role === 'TL') && !hideUsers)) ? stats : (personalRecord || (hideUsers ? {} : (stats?.performance?.[0] || stats)));
    
    const getCount = (k) => {
      const target = k.toUpperCase().replace(/_/g, '').replace(/\s/g, '');
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

    return {
      displayToday: statsToUse.todayFollowups || 0,
      displayOverdue: statsToUse.pendingFollowups || 0,
      totalUsers: statsToUse.totalUsers || (getCount('ADMIN') + getCount('MANAGER') + getCount('TEAM_LEADER') + getCount('ASSOCIATE')),
      getCount
    };
  }, [stats, role, filters, currentUser]);

  if (!statsMemo) return null;

  const handleNav = (target, path, extra = {}) => {
    const tabMap = { attendance: 'attendance', users: role === 'ADMIN' ? 'hierarchy' : 'users', revenue: 'payments', tasks: 'tasks', leads: 'leads' };
    const tabId = tabMap[target] || target;
    if (onNavigate) onNavigate(tabId, extra);
    else navigate(path, { state: extra });
  };

  return (
    <div 
      className="animate-fade-in-up pb-2 px-1" 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: vertical ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '12px'
      }}
    >
      {/* 1. ATTENDANCE */}
      <div className="h-100">
        <MetricCard
          title="ATTENDANCE"
          icon={Users}
          color="primary"
          onClick={() => handleNav('attendance', `/attendance`)}
          stats={{
            primary: { value: stats.presentCount || 0, label: 'WORKING TODAY' },
            secondary: [
              { label: 'Absent', value: stats.absentCount || 0, color: 'danger' },
              { label: 'Present', value: stats.presentCount || 0, color: 'success' },
              { label: 'Late', value: stats.lateCount || 0, color: 'warning' }
            ]
          }}
        />
      </div>

      {/* 2. USERS / STAFF */}
      { (role === 'ADMIN' || role === 'MANAGER') && (
        <div className="h-100">
          <MetricCard
            title="USERS"
            icon={Users}
            color="info"
            onClick={() => handleNav('users', '/users')}
            stats={{
              primary: { 
                value: statsMemo.totalUsers, 
                label: (role === 'ADMIN' && !filters?.managerId && !filters?.teamId && !filters?.userId) ? 'STAFF (INCL. ADMIN)' : 'TOTAL STAFF' 
              },
              secondary: [
                ...( (role === 'ADMIN' && !filters?.managerId && !filters?.teamId && !filters?.userId) ? [{ label: 'ADMIN', value: statsMemo.getCount('ADMIN'), color: 'success' }] : [] ),
                { label: 'MGR', value: statsMemo.getCount('MANAGER'), color: 'primary' },
                { label: 'TL', value: statsMemo.getCount('TEAM_LEADER'), color: 'info' },
                { label: 'BDA', value: statsMemo.getCount('ASSOCIATE'), color: 'warning' },
              ]
            }}
          />
        </div>
      )}

      {/* 3. PERFORMANCE */}
      {/* 3. PERFORMANCE */}
      <div className="h-100">
        {(() => {
          const subjectId = filters?.userId || currentUser?.id;
          const isTeamView = !hideUsers && !filters?.userId && !filters?.teamId && role !== 'ASSOCIATE';
          const isPersonalHome = hideUsers || (filters?.userId === currentUser?.id && !filters?.teamId);
          const myStats = stats?.performance?.find(p => (p.userId || p.id) == subjectId) || (role === 'ASSOCIATE' || filters?.userId || filters?.teamId || !hideUsers ? stats : null);
          
          // 1. If it's your Personal Home Tab, ALWAYS use the root monthlyTarget (the 35k we fixed in the backend)
          // 2. If it's the Team Dashboard, use the root monthlyTarget (the 50k master budget)
          // 3. Otherwise (filtered views), look at individual performance
          const isFiltered = filters?.userId || filters?.teamId;
          const target = (isPersonalHome || isTeamView || isFiltered) ? (stats.monthlyTarget || 0) : (myStats ? (myStats.assignedTarget || myStats.targetAmount || stats.monthlyTarget || 0) : 0);
          
          const revenue = (isPersonalHome || isTeamView || isFiltered) ? (stats.monthlyRevenue || 0) : (myStats ? (myStats.monthlyRevenue || 0) : 0);
          const dailyRevenue = (isPersonalHome || isTeamView || isFiltered) ? (stats.dailyRevenue || 0) : (myStats ? (myStats.dailyRevenue || 0) : 0);
          const pending = (isPersonalHome || isTeamView || isFiltered) ? (stats.pendingRevenueAmount || stats.pendingPaymentsAmount || 0) : (myStats ? (myStats.pendingPaymentsAmount || 0) : 0);

          const totalPipeline = revenue + pending;
          const pendingPercent = totalPipeline > 0 ? Math.round((pending / totalPipeline) * 100) : 0;

          return (
            <MetricCard
              title={role === 'ASSOCIATE' ? "MY PERFORMANCE" : ((!hideUsers && !filters?.userId) ? "TEAM PERFORMANCE" : "MY PERFORMANCE")}
              icon={(props) => <span style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '-0.5px' }}>{pendingPercent}% PENDING</span>}
              color={pendingPercent > 50 ? "danger" : pendingPercent > 20 ? "warning" : "success"}
              onClick={() => handleNav('revenue', '/revenue')}
              stats={{
                primary: { value: `₹${(dailyRevenue).toLocaleString()}`, label: 'Today Collection' },
                secondary: [
                  { label: 'Month', value: `₹${(revenue).toLocaleString()}`, color: 'success' },
                  { label: 'Target', value: `₹${(target).toLocaleString()}`, color: 'primary' },
                  { label: 'Pending', value: `₹${(pending).toLocaleString()}`, color: 'danger' }
                ]
              }}
            />
          );
        })()}
      </div>

      {/* 4. FOLLOWUP PIPELINE */}
      <div className="h-100">
        <MetricCard
          title="FOLLOWUP PIPELINE"
          icon={Clock}
          color="warning"
          onClick={() => handleNav('tasks', '/tasks')}
          stats={{
            primary: { value: statsMemo.displayToday, label: 'Today Tasks' },
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
