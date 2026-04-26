import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  Layers,
  BarChart3,
  Phone,
  IndianRupee,
  Clock,
  AlertCircle,
  TrendingUp,
  History,
  CheckCircle2,
  Calendar,
  Filter,
  ShieldHalf,
  Command
} from 'lucide-react';
import { Card } from '../../../components/common/Components';
import LeadTable from '../../../components/LeadTable';
import CallLogDashboard from './CallLogDashboard';
import PaymentHistory from '../../../components/PaymentHistory';
import TicketManager from '../../../components/TicketManager';
import StatCard from '../../../components/StatCard';
import { MetricCard } from './MetricCommandCenter';
import { useAuth } from '../../../context/AuthContext';
import adminService from '../../../services/adminService';

const ManagerDashboardFilterHub = ({
  teamTree,
  stats,
  callStats,
  leads,
  loadLeads,
  filters,
  setFilters,
  onEdit,
  handleAssignLead,
  onUpdateLead,
  onRecordCallOutcome,
  onSendPaymentLink,
  onDeleteLead,
  teamLeaders: initialTeamLeaders,
  loading,
  hideFilters = false,
  dataType: externalDataType,
  onDataTypeChange,
  refreshTrigger
}) => {
  const { user } = useAuth();
  const [selectedMgrId, setSelectedMgrId] = useState('');
  const [selectedTlId, setSelectedTlId] = useState('');
  const [selectedAssocId, setSelectedAssocId] = useState('');
  const [internalDataType, setInternalDataType] = useState('Leads');
  const dataType = externalDataType || internalDataType;
  const setDataType = onDataTypeChange || setInternalDataType;

  // Role-based scoping logic
  const isManager = user?.role === 'MANAGER';

  // API Driven States
  const [managers, setManagers] = useState([]);
  const [tls, setTls] = useState([]);
  const [associates, setAssociates] = useState([]);

  // Fetch Managers on Load
  useEffect(() => {
    if (!isManager) {
      adminService.fetchManagers().then(res => setManagers(res.data)).catch(() => { });
    }
  }, [isManager]);

  // Fetch Teams on Manager Change
  useEffect(() => {
    const targetMgrId = isManager ? user.id : selectedMgrId;
    if (targetMgrId) {
      adminService.fetchTeamsByManager(targetMgrId).then(res => setTls(res.data)).catch(() => { });
    } else {
      setTls([]);
    }
  }, [selectedMgrId, isManager, user?.id]);

  // Fetch Associates on Team Change
  useEffect(() => {
    const targetMgrId = isManager ? user.id : selectedMgrId;
    if (selectedTlId) {
      adminService.fetchAssociates(selectedTlId, null).then(res => setAssociates(res.data)).catch(() => { });
    } else if (targetMgrId) {
      adminService.fetchAssociates(null, targetMgrId).then(res => setAssociates(res.data)).catch(() => { });
    } else {
      setAssociates([]);
    }
  }, [selectedTlId, selectedMgrId, isManager, user?.id]);

  const effectiveMgr = isManager ? user : managers.find(m => m.id.toString() === selectedMgrId);

  // Selection logic moved to event handlers to prevent infinite render loops.

  const renderCards = () => {
    if (loading) {
      return (
        <div className="row g-3 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="col-12 col-md-4">
              <div className="premium-card p-4 d-flex flex-column gap-2 opacity-50 bg-surface bg-opacity-20 backdrop-blur" style={{ minHeight: '120px', borderRadius: '24px' }}>
                <div className="skeleton-line w-50 h-10 mb-2"></div>
                <div className="skeleton-line w-75 h-20"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    switch (dataType) {
      case 'Leads': {
        return null; // Removed redundant Registry cards per user request
      }
      case 'Calls':
        return (
          <div className="row g-3 mb-1 animate-fade-in">
            <div className="col-12 col-md-6">
              <MetricCard title="Nodal Connectivity" icon={Phone} color="primary" stats={{ primary: { value: callStats?.totalCalls || 0, label: 'Total Dials' } }} />
            </div>
            <div className="col-12 col-md-6">
              <MetricCard title="Successful Connects" icon={TrendingUp} color="success" stats={{ primary: { value: callStats?.connectedCalls || 0, label: 'Connected' } }} />
            </div>
          </div>
        );
      case 'Payments':
        return (
          <div className="row g-3 mb-1 animate-fade-in">
            <div className="col-12 col-md-4">
              <MetricCard title="Revenue Channel" icon={IndianRupee} color="success" stats={{ primary: { value: `₹${(stats?.monthlyRevenue || 0).toLocaleString()}`, label: 'Collected' } }} />
            </div>
            <div className="col-12 col-md-4">
              <MetricCard title="Remaining Target" icon={TrendingUp} color="danger" stats={{ primary: { value: `₹${(stats?.expectedRevenue || 0).toLocaleString()}`, label: 'Revenue Gap' } }} />
            </div>
            <div className="col-12 col-md-4">
              <MetricCard title="Target vs Achieved" icon={BarChart3} color="warning" stats={{ primary: { value: `${stats?.targetAchievement?.toFixed(1) || 0}%`, label: 'Achievement' } }} />
            </div>
          </div>
        );
      case 'Follow Ups':
        return (
          <div className="row g-3 mb-1 animate-fade-in">
            <div className="col-12 col-md-6">
              <MetricCard title="Awaiting Action" icon={Clock} color="danger" stats={{ primary: { value: stats?.pendingFollowups || 0, label: 'Pending' } }} />
            </div>
            <div className="col-12 col-md-6">
              <MetricCard title="Daily Progress" icon={CheckCircle2} color="success" stats={{ primary: { value: stats?.completedToday || 0, label: 'Completed Today' } }} />
            </div>
          </div>
        );
      case 'Raised Tickets':
        return (
          <div className="row g-3 mb-1 animate-fade-in">
            <div className="col-12 col-md-6">
              <MetricCard title="Pending Support" icon={AlertCircle} color="warning" stats={{ primary: { value: stats?.openTickets || 0, label: 'Open Tickets' } }} />
            </div>
            <div className="col-12 col-md-6">
              <MetricCard title="Closed Nodes" icon={CheckCircle2} color="success" stats={{ primary: { value: stats?.resolvedTickets || 0, label: 'Resolved' } }} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const [hubSearchTerm, setHubSearchTerm] = useState('');

  const renderTable = () => {
    if (loading) {
      return (
        <div className="premium-card p-5 text-center mt-3 shadow-lg bg-surface bg-opacity-10 backdrop-blur" style={{ borderRadius: '24px' }}>
          <div className="spinner-border text-primary opacity-25" style={{ width: '3rem', height: '3rem' }}></div>
          <p className="mt-3 text-muted fw-bold small tracking-widest">SYNCHRONIZING SECURE LEDGER...</p>
        </div>
      );
    }
    switch (dataType) {
      case 'Leads':
        return null; // Deactivated per user request: "do nt sho eLead Transmission Ledger"
      // case 'Leads':
      //   return (
      //     <div className="premium-card overflow-hidden shadow-lg animate-fade-in">
      //       <div className="p-4 border-bottom border-white border-opacity-5">
      //         <h6 className="fw-black mb-1 text-uppercase tracking-widest small">Lead Transmission Ledger</h6>
      //         <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>CORE DATASET: LEADS</p>
      //       </div>
      //       <LeadTable
      //         leads={leads || []}
      //         loadLeads={loadLeads}
      //         teamLeaders={initialTeamLeaders}
      //         hideFilters={true}
      //         searchTerm={hubSearchTerm}
      //         setSearchTerm={setHubSearchTerm}
      //         selectedLeadIds={[]}
      //         toggleSelection={() => { }}
      //         onEdit={onEdit}
      //         handleAssignLead={handleAssignLead}
      //         onUpdateLead={onUpdateLead}
      //         onRecordCallOutcome={onRecordCallOutcome}
      //         onSendPaymentLink={onSendPaymentLink}
      //         onDeleteLead={onDeleteLead}
      //       />
      //     </div>
      //   );
      case 'Calls':
        return <CallLogDashboard hideHeader={true} userId={filters.userId} refreshTrigger={refreshTrigger} />;
      case 'Payments':
        return <PaymentHistory role="MANAGER" hideHeader={true} userId={filters.userId} refreshTrigger={refreshTrigger} />;
      case 'Follow Ups':
        return (
          <div className="premium-card overflow-hidden shadow-lg animate-fade-in">
            <div className="p-4 border-bottom border-white border-opacity-5">
              <h6 className="fw-black mb-1 text-uppercase tracking-widest small">Follow-up Registry</h6>
              <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>PENDING ENGAGEMENT NODES</p>
            </div>
            <LeadTable
              leads={(leads || []).filter(l => l.status === 'FOLLOW_UP')}
              loadLeads={loadLeads}
              teamLeaders={initialTeamLeaders}
              hideFilters={true}
              searchTerm={hubSearchTerm}
              setSearchTerm={setHubSearchTerm}
              selectedLeadIds={[]}
              toggleSelection={() => { }}
              onEdit={onEdit}
              handleAssignLead={handleAssignLead}
              onUpdateLead={onUpdateLead}
              onRecordCallOutcome={onRecordCallOutcome}
              onSendPaymentLink={onSendPaymentLink}
              onDeleteLead={onDeleteLead}
            />
          </div>
        );
      case 'Raised Tickets':
        return <TicketManager role="MANAGER" />;
      default:
        return null;
    }
  };

  const hubReset = () => {
    setSelectedMgrId('');
    setSelectedTlId('');
    setSelectedAssocId('');
    setDataType('Leads');
  };

  return (
    <div className="d-flex flex-column gap-3">
      {!hideFilters && (
        <div className="premium-card p-1 border-0 shadow-lg bg-surface bg-opacity-10 backdrop-blur rounded-pill px-3" style={{ backdropFilter: 'blur(20px)' }}>
          <div className="d-flex align-items-center justify-content-between gap-2 overflow-x-auto no-scrollbar py-1">
            {/* Left: Title & Analysis Type */}
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2 pe-3 border-end border-white border-opacity-10 animate-fade-in">
                <div className={`text-primary ${isDarkMode ? 'opacity-75' : ''}`}>
                  <Command size={16} strokeWidth={2.5} />
                </div>
                <div className="d-none d-xl-block">
                  <h6 className="fw-black mb-0 text-main tracking-widest text-uppercase" style={{ fontSize: '10px' }}>Command Center</h6>
                  <small className="text-muted fw-bold opacity-50" style={{ fontSize: '7px' }}>HIERARCHICAL ANALYSIS</small>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                {!isManager && (
                  <div className="d-flex align-items-center gap-2 bg-surface bg-opacity-25 p-1 px-3 rounded-pill border border-white border-opacity-10 animate-fade-in">
                    <Users size={12} className="text-primary opacity-50" />
                    <select
                      className="bg-transparent border-0 text-main fw-black small text-uppercase tracking-wider outline-none py-1"
                      style={{ fontSize: '9px', minWidth: '130px' }}
                      value={selectedMgrId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedMgrId(val);
                        setSelectedTlId('');
                        setSelectedAssocId('');
                        setFilters(prev => ({
                          ...prev,
                          userId: val || (isManager ? user.id : null)
                        }));
                      }}
                    >
                      <option value="" className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>CHOOSE MANAGER</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id} className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="d-flex align-items-center gap-2 bg-surface bg-opacity-25 p-1 px-3 rounded-pill border border-white border-opacity-10 animate-fade-in">
                  <ShieldHalf size={12} className="text-warning opacity-50" />
                  <select
                    className="bg-transparent border-0 text-main fw-black small text-uppercase tracking-wider outline-none py-1"
                    style={{ fontSize: '9px', minWidth: '130px' }}
                    value={selectedTlId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTlId(val);
                      setSelectedAssocId('');
                      setFilters(prev => ({
                        ...prev,
                        userId: val || selectedMgrId || (isManager ? user.id : null)
                      }));
                    }}
                    disabled={!isManager && !selectedMgrId}
                  >
                    <option value="" className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{(isManager || selectedMgrId) ? 'ALL TEAMS' : '---'}</option>
                    {tls.map(tl => (
                      <option key={tl.id} value={tl.id} className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{tl.name}</option>
                    ))}
                  </select>
                </div>

                <div className="d-flex align-items-center gap-2 bg-surface bg-opacity-25 p-1 px-3 rounded-pill border border-white border-opacity-10 animate-fade-in">
                  <User size={12} className="text-info opacity-50" />
                  <select
                    className="bg-transparent border-0 text-main fw-black small text-uppercase tracking-wider outline-none py-1"
                    style={{ fontSize: '9px', minWidth: '130px' }}
                    value={selectedAssocId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAssocId(val);
                      setFilters(prev => ({
                        ...prev,
                        userId: val || selectedTlId || selectedMgrId || (isManager ? user.id : null)
                      }));
                    }}
                    disabled={!effectiveMgr}
                  >
                    <option value="" className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{effectiveMgr ? 'ALL ASSOCIATES' : '---'}</option>
                    {associates.map(member => (
                      <option key={member.id} value={member.id} className={isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              className="ui-btn ui-btn-outline btn-sm px-4 rounded-pill border-white border-opacity-10 fw-black transition-all hover-scale"
              style={{ fontSize: '9px', whiteSpace: 'nowrap' }}
              onClick={hubReset}
            >
              RESET ALL
            </button>
          </div>
        </div>
      )}


      {renderCards()}

      {renderTable() && (
        <div className="animate-slide-up">
          {renderTable()}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboardFilterHub;

