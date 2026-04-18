import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Table } from '../components/common/Components';
import { 
  Users, 
  UserPlus, 
  IndianRupee, 
  ShieldHalf,
  BarChart3,
  TrendingUp,
  Zap,
  Phone,
  LayoutDashboard,
  ClipboardList,
  GitBranch, 
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';

// Internal Hooks & Services
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { useLeads } from './dashboard/hooks/useLeads';
import managerService from '../services/managerService';

// Modular Components
import ManagerDashboardFilterHub from './dashboard/components/ManagerDashboardFilterHub';
import LeadsTable from './dashboard/components/LeadsTable';
import TeamTree from './dashboard/components/TeamTree';
import TeamManagement from './dashboard/components/TeamManagement';
import UserEditModal from './dashboard/components/UserEditModal';
import PaymentHistory from '../components/PaymentHistory';
import RevenueTrendChart from './dashboard/components/RevenueTrendChart';
import StatCard from '../components/StatCard';
import DashboardLayout from '../components/layout/DashboardLayout';
import AttendanceDashboard from '../components/pages/AttendanceDashboard';
import CallLogDashboard from './dashboard/components/CallLogDashboard';
import CallAnalyticsGrid from './dashboard/components/CallAnalyticsGrid';
import InvoiceModal from './dashboard/components/InvoiceModal';
import paymentService from '../services/paymentService';
import TaskBoard from '../components/TaskBoard';
import LeadForm from '../components/LeadForm';
import BulkUploadModal from './dashboard/components/BulkUploadModal';
import LeadIngestionModal from './dashboard/components/LeadIngestionModal';
import FiltersBar from './dashboard/components/FiltersBar';

import MetricCommandCenter from './dashboard/components/MetricCommandCenter';
import LeadStatusPieChart from './dashboard/components/LeadStatusPieChart';
import TicketManager from '../components/TicketManager';
import ManagerProfile from './dashboard/components/ManagerProfile';
import LeadEditPage from './dashboard/components/LeadEditPage';
import authService from '../services/authService';


const ManagerDashboard = () => {
    const { user, logout } = useAuth();
    const { isDarkMode } = useTheme();
    const theme = isDarkMode ? 'dark' : 'light';
    const [activeTab, setActiveTab] = useState(localStorage.getItem('mgr_activeTab') || 'overview');
    const [myDashboardSubTab, setMyDashboardSubTab] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUnassigned, setFilterUnassigned] = useState(false);
    const [bulkAssignTlId, setBulkAssignTlId] = useState('');
    const [manager, setManager] = useState(null);
    const [personalStats, setPersonalStats] = useState(null);


    // Invoice state
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);

    const [filters, setFilters] = useState({
        from: new Date().toISOString().split('T')[0] + 'T00:00:00',
        to: new Date().toISOString().split('T')[0] + 'T23:59:59',
        userId: null
    });

    // Custom Hooks
    const { stats, performance, teamTree, trend, callStats, summary, loading, reload } = useDashboardData(filters);
    const { 
        leads, 
        loadLeads, 
        selectedLeadIds, 
        setSelectedLeadIds, 
        toggleSelection, 
        handleAssignLead, 
        handleBulkAssign,
        handleUpdateLead
    } = useLeads();

    // Secondary Data
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [availableOffices, setAvailableOffices] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingLead, setEditingLead] = useState(null);

    const fetchLookupData = async () => {
        try {
            const [tlRes, rolesRes, permRes, shiftRes, profileRes, officesRes] = await Promise.all([
                managerService.fetchTeamLeaders(),
                managerService.fetchRoles(),
                managerService.fetchPermissions(),
                managerService.fetchShifts(),
                authService.getProfile(),
                managerService.fetchOffices()
            ]);
            const tlData = Array.isArray(tlRes.data) ? tlRes.data : (tlRes.data?.data || []);
            // Add current manager for self-assignment capability, ensuring no duplicates
            const selfManager = { id: user.id, name: `${user.name} (Self)`, role: user.role };
            const filteredTlData = tlData.filter(u => u.id !== user.id);
            setTeamLeaders([selfManager, ...filteredTlData]);
            
            setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : (rolesRes.data?.data || []));
            setPermissions(Array.isArray(permRes.data) ? permRes.data : (permRes.data?.data || []));
            setShifts(Array.isArray(shiftRes.data) ? shiftRes.data : (shiftRes.data?.data || []));
            setAvailableOffices(Array.isArray(officesRes.data) ? officesRes.data : (officesRes.data?.data || []));
            setManager(profileRes.data?.supervisor || profileRes.data?.manager);
        } catch (err) {
            toast.error('Lookup data sync failed');
        }
    };


    // Recursive function to extract all users from the team tree hierarchy
    const flattenTeamTree = (data, userList = new Map()) => {
        if (!data) return Array.from(userList.values());

        // Handle case where data is an array (API returns [managerNode])
        if (Array.isArray(data)) {
            data.forEach(item => flattenTeamTree(item, userList));
            return Array.from(userList.values());
        }

        const node = data;
        
        // Add current node if it's a valid user (and not Admin)
        if (node.id && node.role !== 'ADMIN') {
            userList.set(node.id, {
                id: node.id,
                name: node.name,
                role: node.role,
                email: node.email,
                mobile: node.mobile
            });
        }
        
        // Process subordinates recursively
        if (Array.isArray(node.subordinates)) {
            node.subordinates.forEach(child => flattenTeamTree(child, userList));
        }
        
        return Array.from(userList.values());
    };

    // Synchronize the assignees list (teamLeaders state) with the full hierarchy tree
    useEffect(() => {
        if (teamTree) {
            console.log('>>> Syncing assignees from Team Tree...');
            const allUsers = flattenTeamTree(teamTree);
            
            // Ensure self (manager) is always present at the top
            const selfManager = { id: user.id, name: `${user.name} (Self)`, role: user.role };
            const others = allUsers.filter(u => u.id !== user.id);
            
            setTeamLeaders([selfManager, ...others]);
            console.log(`>>> Successfully synchronized ${allUsers.length} total squad members.`);
        }
    }, [teamTree, user?.id, user?.name, user?.role]);

    useEffect(() => {
        fetchLookupData();
    }, []);

    useEffect(() => {
        // Fetch personal stats for manager's own dashboard
        const fetchPersonalMetrics = async () => {
            try {
                const res = await managerService.fetchPersonalStats(filters);
                setPersonalStats(res.data);
            } catch (err) {
                console.warn('Failed to fetch personal metrics');
            }
        };
        fetchPersonalMetrics();
    }, [filters]);

    useEffect(() => {
        // Auto-scroll to top when drilling into a specific user's data
        if (filters.userId) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [filters.userId]);
    useEffect(() => {
        localStorage.setItem('mgr_activeTab', activeTab);
        
        // Tab-based data scoping:
        // 'My Dashboard' forces the filter to show the manager's personal data.
        // Switching to any 'Team' tab resets this filter to show aggregated team data.
        if (activeTab === 'my-stats' && user?.id) {
            if (filters.userId !== user.id) {
                setFilters(prev => ({ ...prev, userId: user.id }));
            }
        } else if (activeTab === 'overview' && filters.userId !== null) {
            setFilters(prev => ({ ...prev, userId: null }));
        }
    }, [activeTab, user?.id, filters.userId]);

    const handleCreateUser = async (formData) => {
        try {
            await managerService.createUser(formData);
            toast.success('Account created successfully');
            fetchLookupData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Creation failed');
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Delete this account permanently?')) {
            try {
                await managerService.deleteUser(id);
                toast.success('Account deleted');
                fetchLookupData();
            } catch (err) {
                toast.error('Deletion failed');
            }
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            await managerService.updateUser(editingUser.id, editingUser);
            toast.success('Profile updated');
            
            // Close first
            setIsEditModalOpen(false);
            
            // Delay refresh
            setTimeout(() => {
                fetchLookupData();
            }, 300);
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleAssignSupervisor = async (assocId, supId) => {
        try {
            await managerService.assignSupervisor(assocId, supId);
            toast.success('Relationship updated');
            fetchLookupData();
        } catch (err) {
            toast.error('Assignment failed');
        }
    };

    const handleAddLead = async (leadData) => {
        try {
            await managerService.addLead(leadData);
            toast.success('Lead added to nodal pipeline');
            loadLeads();
            return true;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lead ingestion failed: Constraint violation');
            return false;
        }
    };

    const handleRecordCallOutcome = async (leadId, data) => {
        console.log('Manager recording outcome:', { leadId, data });
        try {
            const response = await managerService.recordCallOutcome(leadId, data);
            console.log('Outcome record success:', response);
            toast.success('Outcome synchronized');
            loadLeads();
            reload();
        } catch (err) {
            console.error('Outcome record failure:', err);
            toast.error('Sync failed: ' + (err?.response?.data?.message || 'Unknown error'));
        }
    };

    const handleSendPaymentLink = async (leadId, paymentData) => {
        try {
            const res = await managerService.sendPaymentLink(leadId, paymentData);
            if (res.data?.payment_url) {
                toast.success('Payment protocol initialized');
                loadLeads();
                return true;
            }
            return false;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Transmission failed');
            return false;
        }
    };

    const handleDeleteLead = async (id) => {
        if (!window.confirm('PROTOCOL WARNING: This node will be purged from the registry. Proceed?')) return;
        try {
            await managerService.deleteLead(id);
            toast.success('Node Decommissioned');
            loadLeads();
        } catch (err) {
            toast.error('Purge failure');
        }
    };

    const handleViewInvoice = async (lead) => {
        try {
            toast.info('Retrieving official invoice document...');
            const res = await paymentService.generateInvoice(lead.id);
            setSelectedInvoiceData(res.data);
            setIsInvoiceModalOpen(true);
        } catch (err) {
            toast.error('Failed to retrieve invoice - no confirmed payment found');
        }
    };


    const filteredLeadsList = leads.filter(l => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
            (l.name && l.name.toLowerCase().includes(term)) || 
            (l.mobile && l.mobile.includes(searchTerm)) ||
            (l.email && l.email.toLowerCase().includes(term));
        const matchesUnassigned = filterUnassigned ? !l.assignedToId : true;
        return matchesSearch && matchesUnassigned;
    });

    return (
        <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} role="MANAGER">
            <div className="animate-fade-in d-flex flex-column gap-4">
                {activeTab === 'my-stats' && (
                  <div className="d-flex flex-column gap-3 animate-fade-in">
                    <div className="px-1 d-flex flex-wrap align-items-center justify-content-between gap-3">
                       <div>
                          <h5 className="fw-black text-main mb-1 text-uppercase tracking-widest small">Personal Command Center</h5>
                          <p className="text-muted small fw-bold opacity-50 mb-0" style={{ fontSize: '9px' }}>VIEWING INDIVIDUAL OPERATIONAL PERFORMANCE</p>
                       </div>
                    </div>

                    {/* Personal Command Selector (Dropdown) */}
                    <div className="d-flex align-items-center gap-3 mb-2 px-1">
                      <div className="position-relative">
                         <select 
                            className="form-select bg-surface border border-white border-opacity-10 text-main fw-black text-uppercase tracking-widest rounded-pill px-4 py-2 shadow-sm appearance-none"
                            style={{ fontSize: '9px', minWidth: '220px', cursor: 'pointer', outline: 'none' }}
                            value={myDashboardSubTab}
                            onChange={(e) => setMyDashboardSubTab(e.target.value)}
                         >
                            <option value="dashboard">📊 PERSONAL OVERVIEW</option>
                            <option value="leads">👥 MY INDIVIDUAL LEADS</option>
                            <option value="tasks">📋 MY PENDING TASKS</option>
                            <option value="attendance">📆 MY ATTENDANCE LOGS</option>
                            <option value="revenue">💰 MY REVENUE TRANSACTION</option>
                            <option value="calls">📞 MY TELEPHONY LOGS</option>
                            <option value="reports">📈 MY PERFORMANCE TRENDS</option>
                         </select>
                         <div className="position-absolute end-0 top-50 translate-middle-y me-3 pointer-events-none opacity-50">
                            <ChevronDown size={12} />
                         </div>
                      </div>
                      
                      <div className="d-flex align-items-center bg-surface border border-white border-opacity-10 rounded-pill shadow-sm px-3 py-1.5 gap-2 ms-auto">
                          <Clock size={12} className="text-primary opacity-50" />
                          <input 
                              type="date" 
                              className="bg-transparent border-0 shadow-none text-main fw-black p-0" 
                              value={filters.from.split('T')[0]} 
                              onChange={e => setFilters({...filters, from: e.target.value + 'T00:00:00'})}
                              style={{ fontSize: '10px', outline: 'none' }}
                          />
                          <span className="text-muted fw-bold small opacity-25">TO</span>
                          <input 
                              type="date" 
                              className="bg-transparent border-0 shadow-none text-main fw-black p-0" 
                              value={filters.to.split('T')[0]} 
                              onChange={e => setFilters({...filters, to: e.target.value + 'T23:59:59'})}
                              style={{ fontSize: '10px', outline: 'none' }}
                          />
                      </div>
                    </div>

                    {myDashboardSubTab === 'dashboard' && (
                      <>
                        <ManagerProfile manager={manager} />
                        
                        {/* ROW 1: CRITICAL ACTIONS (4 CARDS) */}
                        <div className="row g-3 mb-3">
                          <div className="col-12 col-md-6 col-xl-3">
                            <StatCard 
                              title="Today's Schedule" 
                              value={personalStats?.todayFollowUps || 0} 
                              icon={<Clock size={18} />} 
                              color="secondary" 
                              onClick={() => setMyDashboardSubTab('leads')} 
                            />
                          </div>
                          <div className="col-12 col-md-6 col-xl-3">
                            <StatCard 
                              title="Payment Overdue" 
                              value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(personalStats?.pendingPaymentsAmount || 0)} 
                              icon={<IndianRupee size={18} />} 
                              color="danger" 
                              unit="" 
                              onClick={() => setMyDashboardSubTab('revenue')} 
                            />
                          </div>
                          <div className="col-12 col-md-6 col-xl-3">
                            <StatCard 
                              title="Follow-up Overdue" 
                              value={personalStats?.pendingFollowUps || 0} 
                              icon={<AlertCircle size={18} />} 
                              color="warning" 
                              onClick={() => setMyDashboardSubTab('leads')} 
                            />
                          </div>
                          <div className="col-12 col-md-6 col-xl-3">
                            <StatCard 
                              title="30-Day Revenue Forecast" 
                              value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(personalStats?.forecastRevenue || 0)} 
                              icon={<TrendingUp size={18} />} 
                              color="info" 
                              unit="" 
                              onClick={() => setMyDashboardSubTab('revenue')} 
                            />
                          </div>
                        </div>

                        {/* ROW 2: PERFORMANCE TOTALS (3 CARDS) */}
                        <div className="row g-3 mb-4 justify-content-center">
                          <div className="col-12 col-md-4 col-xl-4">
                            <StatCard 
                              title="Total Leads" 
                              value={personalStats?.total || 0} 
                              icon={<Users size={18} />} 
                              color="primary" 
                              onClick={() => setMyDashboardSubTab('leads')} 
                            />
                          </div>
                          <div className="col-12 col-md-4 col-xl-4">
                            <StatCard 
                              title="Total Converted" 
                              value={personalStats?.convertedCount || 0} 
                              icon={<CheckCircle size={18} />} 
                              color="success" 
                              onClick={() => setMyDashboardSubTab('leads')} 
                            />
                          </div>
                          <div className="col-12 col-md-4 col-xl-4">
                            <StatCard 
                              title="Total Revenue" 
                              value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(personalStats?.totalRevenue || 0)} 
                              icon={<Zap size={18} />} 
                              color="pink" 
                              unit="" 
                              onClick={() => setMyDashboardSubTab('reports')} 
                            />
                          </div>
                        </div>
                        
                        {/* CONVERSION VELOCITY TREND (PERSONAL) */}
                        <div className="row g-4 mb-4">
                          <div className="col-12">
                            <div className="premium-card overflow-hidden shadow-lg border-0 h-100">
                              <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                                <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Conversion Velocity</h6>
                                <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INDIVIDUAL TREND ANALYTICS</p>
                              </div>
                              <div className="card-body p-4" style={{ height: '400px' }}>
                                <RevenueTrendChart data={trend} theme={isDarkMode ? 'dark' : 'light'} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {myDashboardSubTab === 'leads' && (
                       <div className="premium-card overflow-hidden shadow-lg animate-fade-in">
                          <LeadsTable 
                            leads={(leads || []).filter(l => l && l.assignedToId === user?.id)} 
                            searchTerm={searchTerm} 
                            setSearchTerm={setSearchTerm}
                            filterUnassigned={false}
                            setFilterUnassigned={setFilterUnassigned}
                            selectedLeadIds={[]}
                            toggleSelection={() => {}}
                            toggleSelectAll={() => {}}
                            bulkAssignTlId={''}
                            setBulkAssignTlId={() => {}}
                            handleBulkAssign={() => {}}
                            handleAssignLead={handleAssignLead}
                            onUpdateLead={handleUpdateLead}
                            onRecordCallOutcome={handleRecordCallOutcome}
                            onSendPaymentLink={handleSendPaymentLink}
                            onViewInvoice={handleViewInvoice}
                            teamLeaders={teamLeaders}
                            role={user?.role}
                            hideFilters={true}
                          />
                       </div>
                    )}

                    {myDashboardSubTab === 'attendance' && (
                      <div className="animate-fade-in">
                        <AttendanceDashboard role="MANAGER" userId={user.id} />
                      </div>
                    )}

                    {myDashboardSubTab === 'tasks' && (
                      <div className="animate-fade-in">
                        <TaskBoard 
                          leads={(leads || []).filter(l => l && l.assignedToId === user?.id)}
                          theme={theme}
                          onUpdateStatus={() => loadLeads()} 
                          fetchLeads={loadLeads}
                          userId={user.id}
                          hideFilters={true}
                        />
                      </div>
                    )}

                    {myDashboardSubTab === 'revenue' && <PaymentHistory role="MANAGER" userId={user?.id} from={filters.from} to={filters.to} hideHeader={true} />}
                    {myDashboardSubTab === 'calls' && <CallLogDashboard userId={user?.id} hideHeader={true} />}
                    {myDashboardSubTab === 'reports' && (
                      <div className="d-flex flex-column gap-4 animate-fade-in pb-5">
                        {/* Personal Analytics Node */}
                        <div className="premium-card overflow-hidden shadow-lg border-0 h-100">
                          <div className="card-header bg-transparent p-4 border-0 border-bottom border-white border-opacity-5">
                              <h6 className="fw-black mb-0 text-main text-uppercase tracking-widest small">My Performance Analytics</h6>
                              <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>INDIVIDUAL CONVERSION TRENDS</p>
                          </div>
                          <div className="card-body p-4" style={{ height: '400px' }}>
                              <RevenueTrendChart data={trend} theme={theme} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'overview' && (
                  <div className="d-flex flex-column gap-4">
                    {/* Operational Overview (Synchronized with TL Dashboard) */}
                    <div className="mb-2">
                        <MetricCommandCenter 
                            stats={{ 
                                ...summary, 
                                ...stats,
                                performance,
                                presentCount: stats?.presentCount || summary?.attendance?.present || 0,
                                absentCount: stats?.absentCount || summary?.attendance?.absent || 0,
                                lateCount: stats?.lateCount || summary?.attendance?.late || 0,
                                monthlyRevenue: stats?.monthlyRevenue || summary?.revenue?.monthly || 0,
                                monthlyTarget: stats?.monthlyTarget || summary?.revenue?.target || 0,
                                targetAchievement: stats?.targetAchievement || summary?.revenue?.achievement || 0,
                                todayFollowups: stats?.todayFollowups || summary?.leads?.todayFollowups || 0,
                                pendingFollowups: stats?.pendingFollowups || summary?.leads?.pendingFollowups || 0
                            }} 
                            role="MANAGER" 
                            filters={filters} 
                            onNavigate={setActiveTab} 
                        />
                    </div>

                    <ManagerDashboardFilterHub 
                        teamTree={teamTree}
                        stats={stats}
                        callStats={callStats}
                        leads={leads}
                        loadLeads={loadLeads}
                        filters={filters}
                        setFilters={setFilters}
                        teamLeaders={teamLeaders}
                        onEdit={(lead) => {
                            setEditingLead(lead);
                            setActiveTab('edit-lead');
                        }}
                        handleAssignLead={handleAssignLead}
                        onUpdateLead={handleUpdateLead}
                        onRecordCallOutcome={handleRecordCallOutcome}
                        onSendPaymentLink={handleSendPaymentLink}
                        onDeleteLead={handleDeleteLead}
                    />
                    
                    {/* Analytics Growth Row (Trend + Pie Chart) */}
                    <div className="row g-4 animate-fade-in">
                        <div className="col-12 col-xl-8">
                            <Card title="Team Conversion History" subtitle="Sales Performance Velocity" className="h-100">
                                <div className="py-2" style={{ height: '360px' }}>
                                    <RevenueTrendChart data={trend} theme={theme} />
                                </div>
                            </Card>
                        </div>
                        <div className="col-12 col-xl-4">
                            <Card title="Squad Pipeline Distribution" subtitle="Status Segmentation Analytics" className="h-100">
                                <div className="py-2" style={{ height: '360px' }}>
                                    <LeadStatusPieChart leads={leads} isDarkMode={isDarkMode} />
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Intermediate Performance Nodes */}
                    <div className="row g-4 animate-fade-in">
                        <div className="col-12 col-md-3">
                            <StatCard title="Interested" value={stats?.interestedCount || 0} sub="Hot Opportunities" icon={<Zap />} color="warning" />
                        </div>
                        <div className="col-12 col-md-3">
                            <StatCard title="Total Lead Lost" value={stats?.totalLostCount || 0} sub="Historical Attrition" icon={<Phone />} color="danger" />
                        </div>
                        <div className="col-12 col-md-3">
                            <StatCard title="Team Nodes" value={stats?.totalUsers || 0} sub="Active Squad Size" icon={<Users />} color="info" />
                        </div>
                        <div className="col-12 col-md-3">
                            <StatCard title="Revenue Flow" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats?.totalRevenue || 0)} unit="" sub="Confirmed Branch Capital" icon={<IndianRupee />} color="success" />
                        </div>
                    </div>

                    {/* NEW: Team Efficiency Matrix (Synchronized with TL Dashboard) */}
                    <div className="row g-4 animate-fade-in">
                        <div className="col-12">
                            <Card title="Team Efficiency Matrix" subtitle="Staff Performance & Conversion Sync">
                                <div className="card-body p-0">
                                    <Table 
                                        headers={[
                                            'S.NO',
                                            'Staff Member',
                                            'Identity Role',
                                            <div className="text-center">Active Load</div>,
                                            <div className="text-center">Success</div>,
                                            <div className="text-center">Risk</div>,
                                            <div className="text-end">Sync Rate</div>
                                        ]}
                                        data={performance || []}
                                        renderRow={(p, index) => (
                                            <>
                                                <td className="ps-4 text-muted fw-bold small" style={{ fontSize: '10px' }}>{index + 1}</td>
                                                <td 
                                                    onClick={() => {
                                                        setFilters({...filters, userId: p.userId});
                                                        toast.info(`Focusing on performance of: ${p.username}`);
                                                    }}
                                                    className="ps-4 cursor-pointer hover-scale transition-all"
                                                >
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 fw-black small border border-primary border-opacity-10 hover-shadow shadow-glow" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {p.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="d-flex flex-column">
                                                            <span className="fw-bold text-main small">{p.username}</span>
                                                            <span className="text-muted small opacity-50" style={{ fontSize: '9px' }}>DRILL DOWN ANALYTICS</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className="ui-badge bg-surface text-muted small border-white border-opacity-10">{p.role || 'ASSOCIATE'}</span></td>
                                                <td className="text-center fw-bold">{p.totalLeads}</td>
                                                <td className="text-center text-success fw-bold">{p.convertedLeads}</td>
                                                <td className="text-center text-danger fw-bold">{p.lostLeads}</td>
                                                <td className="pe-4 text-end text-primary fw-black">
                                                    {p.totalLeads > 0 ? ((p.convertedLeads / p.totalLeads) * 100).toFixed(1) : 0}%
                                                </td>
                                            </>
                                        )}
                                    />
                                </div>
                            </Card>
                        </div>
                    </div>
                  </div>
                )}

                {activeTab === 'hierarchy' && (
                    <div className="animate-fade-in row">
                        <div className="col-12">
                            <TeamTree 
                                data={teamTree} 
                                onFocus={(id) => setFilters({...filters, userId: id})} 
                                currentFocusId={filters.userId} 
                                onAddUser={() => setActiveTab('users')}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'pipeline' && (
                  <div className="animate-fade-in d-flex flex-column gap-3">
                    <FiltersBar 
                        filters={filters}
                        onChange={setFilters}
                        onSync={loadLeads}
                        title="PIPELINE HUB"
                        role={user?.role}
                        currentUserId={user?.id}
                    />

                    <div className="row g-3 px-1 mt-1">
                      {/* ... status cards ... */}
                      <div className="col-12 col-md-3">
                        <StatCard 
                          title="Call Back" 
                          value={stats?.callbackCount || 0} 
                          sub="Awaiting Registry Response" 
                          icon={<Phone size={18} />} 
                          color="warning" 
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <StatCard 
                          title="Converted" 
                          value={stats?.leadStats?.SUCCESS || stats?.leadStats?.PAID || stats?.convertedCount || 0} 
                          sub="Successful Transmissions" 
                          icon={<CheckCircle size={18} />} 
                          color="success" 
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <StatCard 
                          title="Follow-up" 
                          value={stats?.todayFollowups || 0} 
                          sub="Active Operational Nodes" 
                          icon={<Clock size={18} />} 
                          color="info" 
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <StatCard 
                          title="Lost" 
                          value={stats?.lostToday || stats?.leadStats?.LOST || 0} 
                          sub="Off-Pitch Terminations" 
                          icon={<AlertCircle size={18} />} 
                          color="danger" 
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-12">
                        <div className="premium-card overflow-hidden animate-fade-in shadow-lg h-100 mt-2">
                          <div className="card-header bg-transparent p-4 border-0 d-flex justify-content-between align-items-center border-bottom border-white border-opacity-5">
                            <div>
                                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest small">Global Pipeline Ledger</h5>
                                <p className="text-muted small mb-0 fw-bold opacity-50" style={{fontSize: '9px'}}>IDENTIFICATION & ASSIGNMENT NODE</p>
                            </div>
                            <div className="d-flex gap-2">
                               <button 
                                className="ui-btn ui-btn-outline btn-sm px-4 rounded-pill border-primary border-opacity-30 fw-black" 
                                style={{ fontSize: '10px' }}
                                onClick={() => setActiveTab('ingestion')}
                              >
                                ADD NEW LEAD
                              </button>
                            </div>
                          </div>
                          <LeadsTable 
                              leads={filteredLeadsList}
                              searchTerm={searchTerm}
                              setSearchTerm={setSearchTerm}
                              filterUnassigned={filterUnassigned}
                              setFilterUnassigned={setFilterUnassigned}
                              selectedLeadIds={selectedLeadIds}
                              toggleSelection={toggleSelection}
                              toggleSelectAll={() => setSelectedLeadIds(selectedLeadIds.length === filteredLeadsList.length ? [] : filteredLeadsList.map(l => l.id))}
                              bulkAssignTlId={bulkAssignTlId}
                              setBulkAssignTlId={setBulkAssignTlId}
                              handleBulkAssign={handleBulkAssign}
                              handleAssignLead={handleAssignLead}
                              onUpdateLead={handleUpdateLead}
                              onEdit={(lead) => {
                                  setEditingLead(lead);
                                  setActiveTab('edit-lead');
                              }}
                              onRecordCallOutcome={handleRecordCallOutcome}
                              onSendPaymentLink={handleSendPaymentLink}
                              onViewInvoice={handleViewInvoice}
                              teamLeaders={teamLeaders}
                              role={user?.role} 
                              hideFilters={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {activeTab === 'users' && (
                    <div className="animate-fade-in mb-4">
                        <TeamManagement 
                            teamLeaders={teamLeaders}
                            roles={roles}
                            permissions={permissions}
                            offices={availableOffices}
                            shifts={shifts}
                            handleCreateUser={handleCreateUser}
                            handleDeleteUser={handleDeleteUser}
                            handleEditUser={(u) => { 
                                // Deep clone for stability
                                setEditingUser(JSON.parse(JSON.stringify(u))); 
                                setIsEditModalOpen(true); 
                            }}
                            handleAssignSupervisor={handleAssignSupervisor}
                            setSelectedPerfUserId={(id) => setFilters({...filters, userId: id})}
                            setActiveTab={setActiveTab}
                        />
                    </div>
                )}

                 {activeTab === 'attendance-logs' && (
                  <div className="animate-fade-in d-flex flex-column gap-3">
                    <FiltersBar 
                        filters={filters}
                        onChange={setFilters}
                        onSync={() => {}} 
                        title="ATTENDANCE HUB"
                        role={user?.role}
                        currentUserId={user?.id}
                    />
                    <AttendanceDashboard role="MANAGER" userId={filters.userId} date={filters.from.split('T')[0]} />
                  </div>
                )}

                {activeTab === 'call-logs' && (
                    <CallLogDashboard />
                )}

                {activeTab === 'tasks' && (
                  <div className="animate-fade-in d-flex flex-column gap-3">
                    <FiltersBar 
                        filters={filters}
                        onChange={setFilters}
                        onSync={() => loadLeads()}
                        title="TASK COMMAND HUB"
                        role={user?.role}
                        currentUserId={user?.id}
                    />
                    <TaskBoard
                      leads={leads}
                      theme={theme}
                      onUpdateStatus={() => loadLeads()} 
                      fetchLeads={loadLeads}
                      userId={filters.userId}
                      hideFilters={true}
                    />
                  </div>
                )}

                {activeTab === 'payments' && (
                    <div className="d-flex flex-column gap-3 animate-fade-in">
                        <FiltersBar 
                            filters={filters}
                            onChange={setFilters}
                            onSync={reload}
                            title="FINANCIAL HUB"
                            role={user?.role}
                            currentUserId={user?.id}
                        />
                        <PaymentHistory role="MANAGER" userId={filters.userId} from={filters.from} to={filters.to} hideHeader={true} />
                    </div>
                )}

                {activeTab === 'reports' && (
                  <div className="d-flex flex-column gap-5 animate-fade-in pb-5">
                    {/* High-Level Performance Matrix */}
                    <div>
                      <h5 className="fw-black text-main text-uppercase tracking-widest small mb-4">Branch Performance Matrix</h5>
                      <MetricCommandCenter stats={stats} onNavigate={setActiveTab} />
                    </div>

                    {/* Conversational Analytics Node */}
                    <div className="row g-4">
                      <div className="col-12">
                        <Card title="Market Engagement History" subtitle="Transactional Velocity Analysis">
                          <div className="py-2" style={{ height: '400px' }}>
                            <RevenueTrendChart data={trend} theme={theme} />
                          </div>
                        </Card>
                      </div>
                    </div>

                    <div className="mt-4 animate-fade-in">
                       <h5 className="fw-black text-main text-uppercase tracking-widest small mb-4 ms-2">Telephony Interaction Grid</h5>
                       <CallAnalyticsGrid stats={callStats} isDarkMode={isDarkMode} />
                    </div>

                    {/* Operational Summary Grid */}
                    <div className="row g-4 mt-2">
                      <div className="col-12 col-md-4">
                        <StatCard 
                          title="Success Nodes" 
                          value={stats?.convertedCount || 0} 
                          sub="Global Terminations Verified" 
                          icon={<CheckCircle size={18} />} 
                          color="success" 
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <StatCard 
                          title="Revenue Yield" 
                          value={stats?.totalRevenue || 0} 
                          unit="₹"
                          sub="Aggregated Branch Capital" 
                          icon={<IndianRupee size={18} />} 
                          color="primary" 
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <StatCard 
                          title="Lead Density" 
                          value={stats?.totalGlobalLeads || 0} 
                          sub="Active Segment Portfolio" 
                          icon={<Users size={18} />} 
                          color="info" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'ingestion' && (
                  <div className="animate-fade-in">
                     <LeadIngestionModal 
                        isOpen={true}
                        isInline={true}
                        onAddLead={handleAddLead}
                        onSuccess={loadLeads}
                        associates={teamLeaders}
                        onClose={() => setActiveTab('pipeline')}
                      />
                  </div>
                )}

                {activeTab === 'tickets' && (
                  <div className="animate-fade-in">
                     <TicketManager role="MANAGER" />
                  </div>
                )}

                {activeTab === 'edit-lead' && (
                  <LeadEditPage 
                    lead={editingLead}
                    users={teamLeaders.concat(user)}
                    role={user?.role}
                    onCancel={() => {
                      setEditingLead(null);
                      setActiveTab('pipeline');
                    }}
                    onSendPaymentLink={handleSendPaymentLink}
                    onSave={async (data) => {
                      const success = await handleUpdateLead(editingLead.id, data);
                      if (success) {
                        setEditingLead(null);
                        setActiveTab('pipeline');
                      }
                    }}
                  />
                )}
            </div>

            {isEditModalOpen && (
                <UserEditModal 
                    key={editingUser?.id}
                    isOpen={isEditModalOpen} 
                    onClose={() => setIsEditModalOpen(false)} 
                    user={editingUser} 
                    setUser={setEditingUser} 
                    onSubmit={handleUpdateUser} 
                    roles={roles} 
                    permissions={permissions}
                    teamLeaders={teamLeaders}
                    shifts={shifts}
                    offices={availableOffices}
                />
            )}


            <InvoiceModal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} invoiceData={selectedInvoiceData} />
        </DashboardLayout>
    );
};

export default ManagerDashboard;
