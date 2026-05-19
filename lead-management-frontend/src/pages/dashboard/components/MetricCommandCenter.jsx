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

import { useTheme } from '../../../context/ThemeContext';

export const MetricCard = memo(({ title, stats, icon: Icon, color, onClick, badge }) => {
  const { isDarkMode } = useTheme();
  return (
  <div
    className={`p-3 d-flex flex-column h-100 cursor-pointer transition-smooth ${onClick ? (isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-light') : ''} ${badge ? 'shadow-glow' : 'shadow-sm'}`}
    onClick={onClick}
    style={{
      borderRadius: '24px',
      background: 'var(--bg-card)',
      backdropFilter: 'var(--glass-blur)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '120px',
      border: '1px solid var(--border-color)'
    }}
  >
    {/* Subtle Background Glow */}
    <div 
      className={`position-absolute top-0 end-0 bg-${color} opacity-5`} 
      style={{ width: '80px', height: '80px', filter: 'blur(40px)', borderRadius: '50%', transform: 'translate(30%, -30%)' }}
    />

    <div className="d-flex flex-column h-100 position-relative z-1">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          <div className={`p-1.5 bg-${color} bg-opacity-10 rounded-3 text-${color} d-flex align-items-center justify-content-center`} style={{ width: '24px', height: '24px' }}>
            {Icon && <Icon size={12} strokeWidth={3} />}
          </div>
          <h6 className="fw-black text-uppercase tracking-widest text-muted mb-0" style={{ fontSize: '8px', letterSpacing: '1px', opacity: 0.6 }}>{title}</h6>
        </div>
        {badge && (
          <div className={`px-3 py-1 bg-${badge.color} bg-opacity-10 text-${badge.color} rounded-pill border border-${badge.color} border-opacity-10`} style={{ fontSize: '10px', fontWeight: '900' }}>
            {badge.text}
          </div>
        )}
      </div>

      <div className="mb-auto">
        <div className="d-flex flex-column align-items-start">
          <h2 className="fw-black text-main tabular-nums mb-0" style={{ fontSize: '28px', lineHeight: 1, letterSpacing: '-1px' }}>
            {stats?.primary?.value ?? 0}
          </h2>
          {stats?.primary?.label && (
            <span className="text-muted fw-black text-uppercase mt-1 d-block" style={{ fontSize: '8px', opacity: 0.5, letterSpacing: '0.5px' }}>{stats?.primary?.label}</span>
          )}
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between pt-2 border-top border-white border-opacity-5 mt-3">
        {(stats?.secondary || []).map((s, idx) => (
          <div 
            key={idx} 
            className={`d-flex flex-column align-items-start ${s?.onClick ? 'cursor-pointer hover-opacity-100 transition-all' : ''}`}
            onClick={(e) => { if (s?.onClick) { e.stopPropagation(); s.onClick(); } }}
            style={{ opacity: s?.onClick ? 1 : 0.8 }}
          >
            <span className="fw-black text-main mb-0.5" style={{ fontSize: '15px', lineHeight: 1 }}>{s?.value ?? 0}</span>
            <div className="d-flex align-items-center gap-1">
              <div className={`rounded-circle bg-${s?.color || color}`} style={{ width: '4px', height: '4px' }}></div>
              <span className="text-muted fw-black text-uppercase" style={{ fontSize: '7px', opacity: 0.4, letterSpacing: '0.2px' }}>{s?.label ?? ''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
});

const MetricCommandCenter = memo(({ stats, role, filters, onNavigate, leads = [], hideUsers = false, vertical = false, columns }) => {
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
      displayToday: (statsToUse.todayFollowups || 0) + (statsToUse.todayPaymentsCount || 0),
      displayOverdue: (statsToUse.pendingFollowups || 0) + (statsToUse.pendingPaymentsCount || 0),
      totalActiveTasks: (statsToUse.todayFollowups || 0) + (statsToUse.pendingFollowups || 0) + (statsToUse.todayPaymentsCount || 0) + (statsToUse.pendingPaymentsCount || 0),
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
        gridTemplateColumns: vertical ? '1fr' : columns ? `repeat(${columns}, 1fr)` : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}
    >
      {/* 1. ATTENDANCE */}
      {(() => {
        const isRange = filters?.from && filters?.to && filters.from !== filters.to;
        
        // Helper to get aggregated attendance for the range or today
        const getAttendance = () => {
          if (!isRange) {
            return {
              primary: filters?.userId ? (stats.performance?.find(p => p.userId == filters.userId)?.presentCount ?? stats.presentCount) : stats.presentCount,
              absent: filters?.userId ? (stats.performance?.find(p => p.userId == filters.userId)?.absentCount ?? stats.absentCount) : stats.absentCount,
              present: filters?.userId ? (stats.performance?.find(p => p.userId == filters.userId)?.presentCount ?? stats.presentCount) : stats.presentCount,
              late: filters?.userId ? (stats.performance?.find(p => p.userId == filters.userId)?.lateCount ?? stats.lateCount) : stats.lateCount
            };
          }

          // Sum performance records for the range total
          const relevantPerf = filters?.userId ? stats.performance?.filter(p => p.userId == filters.userId) : stats.performance;
          return (relevantPerf || []).reduce((acc, p) => ({
            primary: acc.primary + (p.presentCount || 0),
            absent: acc.absent + (p.absentCount || 0),
            present: acc.present + (p.presentCount || 0),
            late: acc.late + (p.lateCount || 0)
          }), { primary: 0, absent: 0, present: 0, late: 0 });
        };

        const att = getAttendance();

        return (
          <MetricCard
            title="ATTENDANCE"
            icon={Users}
            color="primary"
            onClick={() => handleNav('attendance', `/attendance`)}
            stats={{
              primary: { 
                value: att.primary || 0, 
                label: isRange ? 'RANGE PRESENTS' : 'WORKING TODAY' 
              },
              secondary: [
                { label: 'Absent', value: att.absent || 0, color: 'danger' },
                { label: 'Present', value: att.present || 0, color: 'success' },
                { label: 'Late', value: att.late || 0, color: 'warning' }
              ]
            }}
          />
        );
      })()}

      {/* 2. USERS / STAFF */}
      { (role === 'ADMIN' || role === 'MANAGER') && (
        <MetricCard
          title="STAFF"
          icon={Users}
          color="info"
          onClick={() => handleNav('users', '/users')}
          stats={{
            primary: { 
              value: statsMemo.totalUsers, 
              label: (role === 'ADMIN' && !filters?.managerId && !filters?.teamId && !filters?.userId) ? 'ACTIVE' : 'TOTAL STAFF' 
            },
            secondary: [
              ...( (role === 'ADMIN' && !filters?.managerId && !filters?.teamId && !filters?.userId) ? [{ label: 'ADMIN', value: statsMemo.getCount('ADMIN'), color: 'success' }] : [] ),
              { label: 'MGR', value: statsMemo.getCount('MANAGER'), color: 'primary' },
              { label: 'TL', value: statsMemo.getCount('TEAM_LEADER'), color: 'info' },
              { label: 'BDA', value: statsMemo.getCount('ASSOCIATE'), color: 'warning' },
            ]
          }}
        />
      )}

      {/* 3. PERFORMANCE */}
      {(() => {
        const subjectId = filters?.userId || currentUser?.id;
        const isTeamView = !hideUsers && !filters?.userId && !filters?.teamId && role !== 'ASSOCIATE';
        const isPersonalHome = hideUsers || (filters?.userId === currentUser?.id && !filters?.teamId);
        const myStats = stats?.performance?.find(p => (p.userId || p.id) == subjectId) || (role === 'ASSOCIATE' || filters?.userId || filters?.teamId || !hideUsers ? stats : null);
        
        const isFiltered = filters?.userId || filters?.teamId;
        const target = (isPersonalHome || isTeamView || isFiltered) ? (stats.monthlyTarget || 0) : (myStats ? (myStats.assignedTarget || myStats.targetAmount || stats.monthlyTarget || 0) : 0);
        
        const revenue = (isPersonalHome || isTeamView || isFiltered) ? (stats.monthlyRevenue || 0) : (myStats ? (myStats.monthlyRevenue || 0) : 0);
        const dailyRevenue = (isPersonalHome || isTeamView || isFiltered) ? (stats.dailyRevenue || 0) : (myStats ? (myStats.dailyRevenue || 0) : 0);
        const pending = (isPersonalHome || isTeamView || isFiltered) ? (stats.pendingRevenueAmount || stats.pendingPaymentsAmount || 0) : (myStats ? (myStats.pendingPaymentsAmount || 0) : 0);

        const totalPipeline = revenue + pending;
        const pendingPercent = totalPipeline > 0 ? Math.round((pending / totalPipeline) * 100) : 0;

        return (
          <MetricCard
            title={role === 'ASSOCIATE' ? "PERFORMANCE" : ((!hideUsers && !filters?.userId) ? "REVENUE" : "MY PERFORMANCE")}
            icon={TrendingUp}
            color={pendingPercent > 50 ? "danger" : pendingPercent > 20 ? "warning" : "success"}
            badge={{ text: `${pendingPercent}% PEND`, color: pendingPercent > 50 ? "danger" : pendingPercent > 20 ? "warning" : "success" }}
            onClick={() => handleNav('revenue', '/revenue')}
            stats={{
              primary: { value: `₹${(dailyRevenue).toLocaleString()}`, label: 'Today Col.' },
              secondary: [
                { label: 'Month', value: `₹${(revenue).toLocaleString()}`, color: 'success' },
                { label: 'Target', value: `₹${(target).toLocaleString()}`, color: 'primary' },
                { label: 'Pending', value: `₹${(pending).toLocaleString()}`, color: 'danger' }
              ]
            }}
          />
        );
      })()}

      {/* 4. FOLLOWUP PIPELINE */}
      <MetricCard
        title="FOLLOWUP"
        icon={Clock}
        color="warning"
        onClick={() => handleNav('tasks', '/tasks')}
        stats={{
          primary: { value: statsMemo.totalActiveTasks, label: 'Active Tasks' },
          secondary: [
            { label: 'Today', value: statsMemo.displayToday, color: 'primary', onClick: () => handleNav('tasks', '/tasks', { filter: 'TODAY' }) },
            { label: 'Overdue', value: statsMemo.displayOverdue, color: 'danger', onClick: () => handleNav('tasks', '/tasks', { filter: 'OVERDUE' }) },
            { label: 'EMI/Pay', value: (stats.todayPaymentsCount || 0) + (stats.pendingPaymentsCount || 0), color: 'success' },
          ]
        }}
      />
    </div>
  );
});

export default MetricCommandCenter;
