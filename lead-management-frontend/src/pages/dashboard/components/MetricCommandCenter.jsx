import React, { useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  IndianRupee,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Target,
  LifeBuoy,
  Zap
} from 'lucide-react';
import TargetModal from './TargetModal';

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
          <span className="fs-2 fw-black text-main tabular-nums d-block" style={{ lineHeight: 1, letterSpacing: '-0.5px' }}>{stats?.primary?.value ?? 0}</span>
          <span className="fw-bold text-muted text-uppercase" style={{ fontSize: '9px', opacity: 0.4, letterSpacing: '0.8px' }}>{stats?.primary?.label ?? ''}</span>
        </div>
        <div className={`p-3 rounded-4 bg-${color} bg-opacity-10 text-${color} border border-${color} border-opacity-20 shadow-glow-sm group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>

      <div className="mt-auto grid-secondary-stats pt-3 border-top border-white border-opacity-5">
        {(stats?.secondary || []).map((s, idx) => (
          <div key={idx} className="d-flex flex-column align-items-center text-center">
            <span className={`fw-black text-${s?.color || 'main'} mb-0.5`} style={{ fontSize: '13px', lineHeight: 1 }}>{s?.value ?? 0}</span>
            <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '7px', opacity: 0.4, letterSpacing: '0.4px' }}>{s?.label ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
));

const MetricCommandCenter = memo(({ stats, role, filters, onNavigate, leads = [] }) => {
  const navigate = useNavigate();
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  const statsMemo = useMemo(() => {
    if (!stats) return null;
    
    const getCount = (k) => stats.userBreakdown?.[k.toUpperCase()] || stats.userBreakdown?.[k.toLowerCase()] || 0;
    const totalUsers = stats.totalUsers || (getCount('ADMIN') + getCount('MANAGER') + getCount('TEAM_LEADER') + getCount('ASSOCIATE'));
    
    return {
      displayToday: stats.todayFollowups || 0,
      displayOverdue: stats.pendingFollowups || 0,
      totalUsers,
      getCount
    };
  }, [stats]);

  if (!statsMemo) return null;

  const handleNav = (target, path, extra = {}) => {
    const tabMap = {
      attendance: role === 'ADMIN' || role === 'MANAGER' ? 'attendance-logs' : 'attendance',
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
    <div className="row g-3 mb-4 animate-fade-in-up">
      <div className="col-12 col-md-4 col-xl">
        <MetricCard
          title="ATTENDANCE"
          icon={Users}
          color="primary"
          onClick={() => handleNav('attendance', `/attendance-logs?from=${filters.from}&to=${filters.to}`)}
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

      <div className="col-12 col-md-4 col-xl">
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
      </div>

      <div className="col-12 col-md-4 col-xl">
        <MetricCard
          title="FOLLOWUPS"
          icon={Clock}
          color="secondary"
          onClick={() => handleNav('tasks', '/tasks', { filter: 'TODAY' })}
          stats={{
            primary: { value: statsMemo.displayToday, label: 'Today' },
            secondary: [
              { label: 'Leads', value: stats.todayLeadsCount || 0, color: 'primary' },
              { label: 'EMI/Pay', value: stats.todayPaymentsCount || 0, color: 'success' },
            ]
          }}
        />
      </div>

      <div className="col-12 col-md-4 col-xl">
        <MetricCard
          title="PENDING FOLLOWUPS"
          icon={AlertCircle}
          color="danger"
          onClick={() => handleNav('tasks', '/tasks', { filter: 'OVERDUE' })}
          stats={{
            primary: { value: statsMemo.displayOverdue, label: 'Overdue' },
            secondary: [
              { label: 'Leads', value: stats.pendingLeadsCount || 0, color: 'primary' },
              { label: 'EMI/Pay', value: stats.pendingPaymentsCount || 0, color: 'success' },
            ]
          }}
        />
      </div>

      <style>{`
        .premium-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); min-height: 90px; position: relative; overflow: hidden; }
        .hover-active-card:hover { transform: translateY(-3px) scale(1.01); background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.15) !important; box-shadow: 0 10px 20px -10px rgba(0,0,0,0.4) !important; }
        .grid-secondary-stats { display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
        .shadow-glow-sm { box-shadow: 0 0 8px currentColor; }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
});

export default MetricCommandCenter;
