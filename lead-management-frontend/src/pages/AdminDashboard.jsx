import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, Input, Table } from '../components/common/Components';
import {
  UserPlus, Users, IndianRupee, Phone, Layers, Edit, Trash2, CheckCircle,
  TrendingUp, Power, Zap, Clock, AlertCircle, ShieldHalf, LifeBuoy, RefreshCw,
  Target, Calendar, Save, Search
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';

// Centralized Feature Hooks
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { useLeads } from '../features/leads/hooks/useLeads';
import { useLookupData } from '../features/users/hooks/useLookupData';

// Modular Services
import userApi from '../features/users/api/userApi';
import leadsApi from '../features/leads/api/leadsApi';
import FiltersBar from './dashboard/components/FiltersBar';

// UI Components
import DashboardLayout from '../components/layout/DashboardLayout';
import LeadTable from '../components/LeadTable';
import TaskBoard from '../components/TaskBoard';
import TeamTree from './dashboard/components/TeamTree';
import TeamManagement from './dashboard/components/TeamManagement';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import LeadModal from './dashboard/components/LeadModal';
import MetricCommandCenter, { MetricCard } from './dashboard/components/MetricCommandCenter';
import AttendanceDashboard from './dashboard/components/AttendanceDashboard';
import PipelineStageManagement from './dashboard/components/PipelineStageManagement';
import RevenueStrategyHub from './dashboard/components/RevenueStrategyHub';
import { StatSkeleton, ChartSkeleton } from './dashboard/components/DashboardSkeletons';
import PaymentHistory from '../components/PaymentHistory';
import SystemSettings from './dashboard/components/SystemSettings';
import UserEditModal from './dashboard/components/UserEditModal';
import InvoiceModal from './dashboard/components/InvoiceModal';
import paymentService from '../services/paymentService';

const RevenueTrendChart = React.lazy(() => import('./dashboard/components/RevenueTrendChart'));
const LeadStatusPieChart = React.lazy(() => import('./dashboard/components/LeadStatusPieChart'));

const AdminDashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(localStorage.getItem('admin_activeTab') || 'overview');
  const [myDashboardSubTab, setMyDashboardSubTab] = useState('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState('pipeline');
  const [taskFilter, setTaskFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // 1. STABLE FILTERS (Core fix to prevent API spam)
  const [filters, setFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: null,
    managerId: null,
    teamId: null
  });

  const stableFilters = useMemo(() => ({
    from: filters.from,
    to: filters.to,
    userId: filters.userId,
    teamId: filters.teamId,
    managerId: filters.managerId
  }), [filters.from, filters.to, filters.userId, filters.managerId, filters.teamId]);

  const debouncedFilters = useDebounce(stableFilters, 400);

  // 2. DATA HOOKS (Single source of truth)
  const {
    data: dashboardData,
    isLoading: dashboardLoading
  } = useDashboardData(debouncedFilters);

  const {
    leads,
    loading: leadsLoading,
    updateLead,
    assignLead,
    deleteLead,
    recordCallOutcome
  } = useLeads(debouncedFilters, 'ADMIN');

  const {
    users, roles, permissions: availablePermissions, teamTree, offices, shifts
  } = useLookupData('ADMIN');

  // 3. HANDLERS
  const handleSync = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['lookup'] });
  }, [queryClient]);

  const handleTabChange = (tab, extra = {}) => {
    if (tab === 'ingestion') {
      setIsIngestionModalOpen(true);
      return;
    }
    setActiveTab(tab);
    if (tab === 'tasks' && extra.filter) {
      setTaskFilter(extra.filter);
    } else if (tab !== 'tasks') {
      setTaskFilter('ALL');
    }
    localStorage.setItem('admin_activeTab', tab);
    if (tab === 'my-stats') {
      setFilters(prev => ({ ...prev, userId: user?.id, teamId: null }));
    } else {
      setFilters(prev => ({ ...prev, userId: null }));
    }
  };

  const handleAddLead = async (data) => {
    try {
      await leadsApi.addLead('ADMIN', data);
      toast.success('Lead initialized in registry');
      handleSync();
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleViewInvoice = async (lead) => {
    try {
      const res = await paymentService.fetchInvoiceByLead(lead.id);
      if (res.data) {
        setSelectedInvoice(res.data);
      } else {
        toast.info('No payment records found for this lead');
      }
    } catch (err) {
      toast.error('Failed to retrieve invoice payload');
    }
  };

  const handleCreateUser = async (formData) => {
    try {
      await userApi.createUser('ADMIN', formData);
      toast.success('Account provisioned successfully');
      handleSync();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Creation failed');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('SECURITY WARNING: Permanently delete this account?')) return;
    try {
      await userApi.deleteUser('ADMIN', id);
      toast.success('User account decommissioned');
      handleSync();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deletion protocol failure');
    }
  };

  const handleAssignSupervisor = async (assocId, supId) => {
    try {
      await userApi.assignSupervisor('ADMIN', assocId, supId);
      toast.success('Direct reporting relationship synchronized');
      handleSync();
    } catch (err) {
      toast.error('Hierarchy update failed');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await userApi.updateUser('ADMIN', editingUser.id, editingUser);
      toast.success('Identity protocols synchronized');
      setEditingUser(null);
      handleSync();
    } catch (err) {
      toast.error('Failed to update system identity');
    }
  };

  // 4. MEMOIZED UI DATA
  const stats = dashboardData?.stats || {};
  const trend = dashboardData?.trend || [];
  const performance = dashboardData?.performance || [];
  const statusDistribution = dashboardData?.statusDistribution || {};

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(l =>
      l.name?.toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term) ||
      l.mobile?.includes(term)
    );
  }, [leads, searchTerm]);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} role="ADMIN">
      <div className="animate-fade-in d-flex flex-column gap-3">
        {/* Universal Filter Hub for Admin */}
        {['overview', 'team-dashboard', 'leads', 'tasks', 'my-stats', 'calls', 'attendance', 'payments'].includes(activeTab) && (
          <FiltersBar
            filters={filters}
            onChange={setFilters}
            onSync={handleSync}
            role="ADMIN"
            currentUserId={user?.id}
            hideUserFilter={activeTab === 'my-stats'}
          />
        )}

        {activeTab === 'my-stats' && (
          <div className="d-flex flex-column gap-3 animate-fade-in">
            <div className="d-flex gap-2 p-2 bg-surface bg-opacity-20 rounded-pill border border-white border-opacity-5 mb-2 overflow-auto" style={{ width: 'fit-content' }}>
              {[
                { id: 'dashboard', label: 'Dashboard', icon: ShieldHalf },
                { id: 'calls', label: 'Telephony Logs', icon: Phone },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setMyDashboardSubTab(sub.id)}
                  className={`px-4 py-2 rounded-pill border-0 fw-black text-uppercase tracking-widest transition-all d-flex align-items-center gap-2 ${myDashboardSubTab === sub.id ? 'bg-primary text-white shadow-glow' : 'bg-transparent text-muted opacity-50'}`}
                  style={{ fontSize: '9px' }}
                >
                  <sub.icon size={12} /> {sub.label}
                </button>
              ))}
            </div>
            {myDashboardSubTab === 'dashboard' && (
              dashboardLoading ? <StatSkeleton /> : (
                <MetricCommandCenter stats={stats} role="ADMIN" filters={debouncedFilters} onNavigate={handleTabChange} leads={leads} />
              )
            )}
            {myDashboardSubTab === 'calls' && <CallLogDashboard userId={user?.id} filters={debouncedFilters} />}
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'team-dashboard') && (
          <div className="d-flex flex-column gap-3 animate-fade-in">
            {dashboardLoading ? <StatSkeleton /> : (
              <MetricCommandCenter stats={stats} role="ADMIN" filters={debouncedFilters} onNavigate={handleTabChange} leads={leads} />
            )}
            <div className="row g-4 animate-fade-in">
              <div className="col-12 col-xl-8">
                <Card title="Global Performance Trend">
                  <div style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <RevenueTrendChart data={trend} theme={theme} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
              <div className="col-12 col-xl-4">
                <Card title="System Pipeline Map">
                  <div style={{ height: '360px' }}>
                    <React.Suspense fallback={<ChartSkeleton />}>
                      <LeadStatusPieChart distribution={statusDistribution} leads={leads} isDarkMode={theme === 'dark'} />
                    </React.Suspense>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="premium-card overflow-hidden shadow-lg border-0">
            <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
              <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Global Lead Registry</h5>
              <div className="d-flex align-items-center gap-2">
                <Input placeholder="Search registry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-25" />
                <button className="ui-btn ui-btn-primary btn-sm px-4 rounded-pill" onClick={() => setIsIngestionModalOpen(true)}>Add Lead</button>
              </div>
            </div>
            <div className="card-body p-0">
              <LeadTable
                leads={filteredLeads}
                onUpdateLead={(id, data) => updateLead({ id, data })}
                handleAssignLead={(leadId, targetId) => assignLead({ leadId, targetId })}
                onViewInvoice={handleViewInvoice}
                onDeleteLead={deleteLead}
                loading={leadsLoading}
                teamLeaders={users}
                role="ADMIN"
              />
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <TeamManagement
            teamLeaders={users}
            roles={roles}
            offices={offices}
            shifts={shifts}
            permissions={availablePermissions}
            handleCreateUser={handleCreateUser}
            handleDeleteUser={handleDeleteUser}
            handleEditUser={setEditingUser}
            handleAssignSupervisor={handleAssignSupervisor}
            handleSync={handleSync}
            canAdd={true}
          />
        )}
        {activeTab === 'hierarchy' && <TeamTree data={teamTree} />}
        {activeTab === 'tasks' && (
          <TaskBoard
            leads={leads}
            theme={theme}
            onUpdateStatus={handleSync}
            userId={debouncedFilters.userId}
            managerId={debouncedFilters.managerId}
            teamId={debouncedFilters.teamId}
            startDate={debouncedFilters.from}
            endDate={debouncedFilters.to}
            initialFilter={taskFilter}
          />
        )}

        {activeTab === 'calls' && <CallLogDashboard userId={user?.id} filters={debouncedFilters} hideHeader={true} />}

        {activeTab === 'attendance' && <AttendanceDashboard filters={filters} role="ADMIN" />}

        {activeTab === 'payments' && (
          <div className="animate-fade-in">
            <PaymentHistory
              role="ADMIN"
              from={debouncedFilters.from}
              to={debouncedFilters.to}
              managerId={debouncedFilters.managerId}
              teamId={debouncedFilters.teamId}
              userId={debouncedFilters.userId}
              hideHeader={true}
              hideFilters={true}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <SystemSettings />
          </div>
        )}
      </div>
      <LeadModal isOpen={isIngestionModalOpen} onClose={() => setIsIngestionModalOpen(false)} onAddLead={handleAddLead} associates={users} />
      <UserEditModal
        user={editingUser}
        setUser={setEditingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateUser}
        roles={roles}
        teamLeaders={users}
      />
      <InvoiceModal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} invoiceData={selectedInvoice} />
    </DashboardLayout>
  );
};

export default AdminDashboard;
