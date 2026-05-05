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
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('admin_activeTab') || 'overview';
  });
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
    refetch: refreshLeads,
    updateLead,
    updateStatus,
    assignLead,
    bulkAssignLeads,
    deleteLead,
    recordCallOutcome,
    selectedLeadIds,
    toggleSelection
  } = useLeads(debouncedFilters, 'ADMIN');

  const [bulkAssignTlId, setBulkAssignTlId] = useState('');

  const {
    users, roles, permissions: availablePermissions, teamLeaders, teamTree, offices, shifts, pipelineStages, loading: lookupLoading
  } = useLookupData('ADMIN');

  // 3. HANDLERS
  const handleSync = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['offices'] });
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    queryClient.invalidateQueries({ queryKey: ['teamTree'] });
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    queryClient.invalidateQueries({ queryKey: ['permissions'] });
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
      toast.success('Lead Added Successfully');
      handleSync();
      return true;
    } catch (err) {
      toast.error('Could not add lead');
      return false;
    }
  };

  const handleViewInvoice = async (lead) => {
    try {
      const res = await paymentService.fetchInvoiceByLead(lead.id);
      if (res.data) {
        setSelectedInvoice(res.data);
      } else {
        toast.info('No invoice found for this lead');
      }
    } catch (err) {
      toast.error('Could not get invoice');
    }
  };

  const handleCreateUser = async (formData) => {
    try {
      await userApi.createUser('ADMIN', formData);
      toast.success('Account Created Successfully');
      handleSync();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create user');
    }
  };

  const handleUpdateUser = async (id, formData) => {
    try {
      await userApi.updateUser('ADMIN', id, formData);
      toast.success('User Updated Successfully');
      handleSync();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Do you want to deactivate this account?')) {
      try {
        await userApi.deleteUser('ADMIN', id);
        toast.success('User Deactivated Successfully');
        handleSync();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not deactivate user');
      }
    }
  };

  const handleAssignSupervisor = async (assocId, supId) => {
    try {
      await userApi.assignSupervisor('ADMIN', assocId, supId);
      toast.success('Manager Assigned Successfully');
      handleSync();
    } catch (err) {
      toast.error('Could not change manager');
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await userApi.updateUser('ADMIN', editingUser.id, editingUser);
      toast.success('User Updated Successfully');
      setEditingUser(null);
      handleSync();
    } catch (err) {
      toast.error('Could not update user');
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
      <div className="dashboard-content-wrapper w-100 h-100 animate-fade-in d-flex flex-column gap-3">
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
                { id: 'leads', label: 'My Leads', icon: Users },
                { id: 'calls', label: 'Telephony Logs', icon: Phone },
                { id: 'attendance', label: 'Attendance', icon: Clock },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setMyDashboardSubTab(sub.id)}
                  className={`btn btn-sm rounded-pill px-4 py-2 fw-black text-uppercase tracking-widest d-flex align-items-center gap-2 transition-all ${myDashboardSubTab === sub.id ? 'bg-primary text-white shadow-glow' : 'text-muted hover-bg-white-10'}`}
                  style={{ fontSize: '9px' }}
                >
                  <sub.icon size={12} />
                  {sub.label}
                </button>
              ))}
            </div>
            {myDashboardSubTab === 'dashboard' && (
              <div className="animate-fade-in">
                <MetricCommandCenter stats={stats} role="ASSOCIATE" filters={debouncedFilters} onNavigate={handleTabChange} leads={leads} />
              </div>
            )}
            {myDashboardSubTab === 'leads' && (
              <div className="premium-card overflow-hidden shadow-lg border-0">
                <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                  <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Individual Lead Registry</h5>
                </div>
                <div className="card-body p-0">
                  <LeadTable
                    leads={leads.filter(l => l.assignedToId === user?.id)}
                    onUpdateLead={(id, data) => updateLead({ id, data })}
                    onUpdateStatus={updateStatus}
                    onViewInvoice={handleViewInvoice}
                    loading={leadsLoading}
                    teamLeaders={users.some(u => u.id === user?.id) ? users : [user, ...users]}
                    role="ADMIN"
                    pipelineStages={pipelineStages}
                  />
                </div>
              </div>
            )}
            {myDashboardSubTab === 'calls' && <CallLogDashboard userId={user?.id} filters={debouncedFilters} hideHeader={true} />}
            {myDashboardSubTab === 'attendance' && <AttendanceDashboard filters={filters} role="ADMIN" currentUserId={user?.id} hideHeader={true} />}
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
          <div className="d-flex flex-column gap-3">
            <div className="row g-3 mb-2 animate-fade-in">
              {[
                { label: 'Converted', value: (statusDistribution.CONVERTED || 0), color: 'success', icon: '✅' },
                { label: 'Interested', value: (statusDistribution.INTERESTED || 0), color: 'warning', icon: '🔥' },
                { label: 'Follow-up', value: stats.todayFollowups || 0, color: 'info', icon: '⏳' },
                { label: 'Lost', value: (statusDistribution.LOST || 0), color: 'danger', icon: '❌' }
              ].map((card, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="premium-card p-3 border border-white border-opacity-10 shadow-sm d-flex align-items-center gap-3" style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.02)' }}>
                    <div className={`p-2 rounded-3 bg-${card.color} bg-opacity-10 text-${card.color}`}>
                      <span style={{ fontSize: '18px' }}>{card.icon}</span>
                    </div>
                    <div>
                      <h4 className="mb-0 fw-black text-main">{card.value}</h4>
                      <small className="text-muted fw-bold text-uppercase tracking-widest" style={{ fontSize: '8px' }}>{card.label}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="premium-card overflow-hidden shadow-lg border-0">
              <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Global Lead Registry</h5>
                <div className="d-flex align-items-center gap-3">
                  <div className="position-relative" style={{ width: '260px' }}>
                    <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted opacity-50" />
                    <input
                      placeholder="Search Lead Registry..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-control bg-surface border-white border-opacity-10 py-2 ps-5 rounded-pill transition-all fw-bold"
                      style={{ fontSize: '14px', background: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                  <button className="ui-btn ui-btn-primary btn-sm px-4 rounded-pill fw-black text-uppercase tracking-widest" style={{ fontSize: '10px' }} onClick={() => setIsIngestionModalOpen(true)}>
                    Add Lead
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                <LeadTable
                  leads={filteredLeads}
                  onUpdateLead={(id, data) => updateLead({ id, data })}
                  onUpdateStatus={updateStatus}
                  handleAssignLead={(leadId, targetId) => assignLead({ leadId, targetId: targetId || 0 })}
                  onViewInvoice={handleViewInvoice}
                  loading={leadsLoading}
                  teamLeaders={users.some(u => u.id === user?.id) ? users : [user, ...users]}
                  role="ADMIN"
                  selectedLeadIds={selectedLeadIds}
                  toggleSelection={toggleSelection}
                  bulkAssignTlId={bulkAssignTlId}
                  setBulkAssignTlId={setBulkAssignTlId}
                  handleBulkAssign={(targetId) => bulkAssignLeads({ leadIds: selectedLeadIds, targetId })}
                  pipelineStages={pipelineStages}
                />
              </div>
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
            handleUpdateUser={handleUpdateUser}
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

        {activeTab === 'calls' && (
          <div className="d-flex flex-column gap-4 animate-fade-in">
             <div className="row g-4">
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
             <CallLogDashboard userId={user?.id} filters={debouncedFilters} hideHeader={true} />
          </div>
        )}

        {activeTab === 'attendance' && <AttendanceDashboard filters={debouncedFilters} role="ADMIN" />}

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

        <LeadModal isOpen={isIngestionModalOpen} onClose={() => setIsIngestionModalOpen(false)} onAddLead={handleAddLead} onSuccess={handleSync} associates={users.filter(u => u.role !== 'ADMIN')} />
        <UserEditModal
          user={editingUser}
          setUser={setEditingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={handleEditUserSubmit}
          roles={roles}
          teamLeaders={users}
        />
        <InvoiceModal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} invoiceData={selectedInvoice} />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
