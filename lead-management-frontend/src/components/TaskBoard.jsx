import React, { useState, useMemo, useCallback } from 'react';
import { Search, Clock, AlertCircle, Calendar, CheckSquare, RefreshCw, Plus, Phone, Mail } from 'lucide-react';
import CallOutcomeModal from './CallOutcomeModal';
import ManualTaskModal from './ManualTaskModal';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../features/leads/hooks/useTasks';
import callApi from '../features/calls/api/callApi';

const TaskBoard = ({ leads = [], theme = 'light', onUpdateStatus, loadLeads, userId, managerId, teamId, startDate, endDate, initialFilter = 'ALL' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [reschedulingTask, setReschedulingTask] = useState(null);
  const { activeCall, startCall: logActiveCall } = useAuth();
  const [isStartingCall, setIsStartingCall] = useState(false);
  
  // React to initialFilter changes from parent
  React.useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  const isDarkMode = theme === 'dark';

  // 1. DATA HOOKS (Single source of truth)
  const filters = useMemo(() => ({
    from: startDate,
    to: endDate,
    userId: userId,
    managerId: managerId,
    teamId: teamId
  }), [startDate, endDate, userId, managerId, teamId]);

  const { 
    tasks: cloudTasks, 
    loading, 
    refresh: loadTasks, 
    updateStatus, 
    createTask 
  } = useTasks(filters);

  // 2. HANDLERS
  const handleStartCall = async (lead) => {
    if (activeCall) {
      toast.warning('Another interaction is currently active. Finish it first.');
      return;
    }

    setIsStartingCall(true);
    try {
      const res = await callApi.startCall({
        leadId: lead.id,
        phoneNumber: lead.mobile
      });
      
      const sessionData = {
        callId: res.id, // Assuming safeRequest returns data directly
        leadId: lead.id,
        leadName: lead.name,
        phoneNumber: lead.mobile,
        startTime: res.startTime
      };
      
      logActiveCall(sessionData);
      toast.success('Interaction sequence initiated');
      setSelectedLead({ lead });
    } catch (err) {
      toast.error('Failed to initiate interaction');
    } finally {
      setIsStartingCall(false);
    }
  };

  const isToday = (dateInput) => {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isOverdue = (dateInput) => {
    if (!dateInput) return false;
    return new Date(dateInput) < new Date();
  };

  const processedTasks = useMemo(() => {
    if (!Array.isArray(cloudTasks)) return [];

    return cloudTasks.map(t => {
      let priority = 'Low';
      let priorityColor = 'success';
      let timeString = 'No date set';

      if (t.dueDate) {
        const due = new Date(t.dueDate);
        const now = new Date();
        const diffMs = due - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffHours < 0) {
          priority = 'High';
          priorityColor = 'danger';
          timeString = Math.abs(diffHours) < 24 ? `Due ${Math.abs(Math.round(diffHours))}h ago` : `Due ${Math.abs(Math.round(diffDays))}d ago`;
        } else if (diffDays <= 1) {
          priority = 'Medium';
          priorityColor = 'warning';
          timeString = `Due in ${Math.round(diffHours)}h`;
        } else {
          priority = 'Low';
          priorityColor = 'success';
          timeString = `Due in ${Math.round(diffDays)}d`;
        }
      }

      return {
        ...t,
        name: t.lead?.name || 'System Task',
        priority,
        priorityColor,
        timeString,
        isOverdue: priority === 'High'
      };
    }).sort((a, b) => {
      const aVal = a.priority === 'High' ? 0 : a.priority === 'Medium' ? 1 : 2;
      const bVal = b.priority === 'High' ? 0 : b.priority === 'Medium' ? 1 : 2;
      if (aVal !== bVal) return aVal - bVal;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [cloudTasks]);

  const filteredTasks = useMemo(() => {
    return processedTasks.filter(task => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        (task.title || "").toLowerCase().includes(s) ||
        (task.description || "").toLowerCase().includes(s) ||
        (task.name || "").toLowerCase().includes(s);

      let matchesDate = true;
      if (dateFilter) {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        const taskDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        matchesDate = taskDateStr === dateFilter;
      }

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        if (statusFilter.toUpperCase() === 'TODAY') {
          matchesStatus = task.dueDate && isToday(task.dueDate);
        } else if (statusFilter.toUpperCase() === 'OVERDUE') {
          matchesStatus = task.dueDate && isOverdue(task.dueDate) && task.status !== 'COMPLETED';
        } else {
          matchesStatus = task.priority && task.priority.toUpperCase() === statusFilter.toUpperCase();
        }
      }

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [processedTasks, searchTerm, dateFilter, statusFilter]);

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    await updateStatus({ taskId, status: newStatus });
    toast.success(`Task marked as ${newStatus.toLowerCase()}`);
  };

  const handleLogInteraction = async (data) => {
    if (selectedLead && onUpdateStatus) {
      const leadId = selectedLead.lead?.id || selectedLead.leadId;
      await onUpdateStatus(leadId, data.status, data.note, data.followUpDate);
      setSelectedLead(null);
    }
  };

  // 3. DERIVED DATA


  return (
    <div className="d-flex flex-column gap-3 animate-fade-in pb-5">
      {/* Analytics Summary */}
      <div className="row g-3 mb-2">
        {[
          { label: "Pending (Today)", icon: Calendar, color: "primary", value: filteredTasks.filter(t => t.status !== 'COMPLETED' && isToday(t.dueDate)).length },
          { label: "Overdue Tasks", icon: AlertCircle, color: "danger", value: filteredTasks.filter(t => t.isOverdue && t.status !== 'COMPLETED').length },
          { label: "Completed Today", icon: CheckSquare, color: "success", value: filteredTasks.filter(t => t.status?.toUpperCase() === 'COMPLETED' && isToday(t.updatedAt)).length }
        ].map((stat, i) => (
          <div key={i} className="col-12 col-md-4">
            <div className="premium-card p-4 shadow-lg border-0 d-flex align-items-center gap-4" style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '24px' }}>
              <div className={`p-3 bg-${stat.color} bg-opacity-10 rounded-4 text-${stat.color} border border-${stat.color} border-opacity-20 shadow-glow-sm`}>
                <stat.icon size={22} />
              </div>
              <div>
                <div className="text-muted small fw-black text-uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: '9px' }}>{stat.label}</div>
                <h2 className="fw-black text-main mb-0 tabular-nums">{stat.value}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Actions */}
      <div className="px-1 d-flex justify-content-between align-items-center mb-1">
        <div className="d-flex align-items-center gap-3">
          <div className={`input-group ${isDarkMode ? 'bg-surface' : 'bg-light'} rounded-pill border border-secondary border-opacity-20`} style={{ width: '320px' }}>
            <span className="input-group-text border-0 bg-transparent ps-3"><Search size={16} className="text-muted" /></span>
            <input
              type="text"
              className="form-control border-0 bg-transparent text-main py-2.5 fw-bold"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => setShowTaskModal(true)} className="ui-btn ui-btn-primary btn-sm px-4 rounded-pill fw-black text-uppercase tracking-widest shadow-glow">
            <Plus size={14} /> NEW TASK
          </button>
          <button onClick={loadTasks} disabled={loading} className="btn btn-light btn-sm rounded-pill px-3 border shadow-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Task Ledger Table */}
      <div className="premium-card overflow-hidden shadow-lg border-0">
        <div className="table-responsive">
          <table className="table ui-table mb-0 align-middle">
            <thead className="bg-surface bg-opacity-30">
              <tr className="border-bottom border-white border-opacity-5">
                <th className="ps-4 text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px', width: '60px' }}>S/NO</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>NAME</th>
                <th className="text-center text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px', width: '60px' }}>CALL</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>DUE DATE</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>CREATED BY</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>STATUS</th>
                <th className="pe-4 text-end text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>UPDATE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-5"><RefreshCw size={24} className="text-primary animate-spin mb-2" /></td></tr>
              ) : filteredTasks.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-5 opacity-50"><CheckSquare size={32} className="mb-2" /></td></tr>
              ) : (
                filteredTasks.map((task, idx) => (
                  <tr key={task.id} className="border-bottom border-light hover-bg-light-subtle cursor-pointer" onClick={() => setSelectedLead(task)}>
                    <td className="ps-4"><span className="text-muted small">{idx + 1}</span></td>
                    <td>
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-main small">{task.name}</span>
                        <span className="text-muted extra-small opacity-50">{task.lead?.email || 'SYSTEM'}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <button className="p-1 border-0 bg-transparent text-success" onClick={(e) => { e.stopPropagation(); handleStartCall(task.lead); }}>
                        <Phone size={14} />
                      </button>
                    </td>
                    <td><div className={`small fw-bold ${task.isOverdue ? 'text-danger' : 'text-main'}`}>{task.timeString}</div></td>
                    <td>
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-main extra-small text-uppercase opacity-75">{task.createdByName || 'System'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge rounded-pill fw-bold bg-${task.status === 'COMPLETED' ? 'success' : task.isOverdue ? 'danger' : 'warning'} bg-opacity-10 text-${task.status === 'COMPLETED' ? 'success' : task.isOverdue ? 'danger' : 'warning'}`} style={{ fontSize: '9px' }}>
                        {task.status === 'COMPLETED' ? 'COMPLETED' : task.isOverdue ? 'OVERDUE' : 'PENDING'}
                      </span>
                    </td>
                    <td className="pe-4 text-end">
                      {task.status !== 'COMPLETED' && (
                        <button className="btn btn-sm btn-outline-primary rounded-pill py-1 px-3" style={{ fontSize: '10px' }} onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, 'COMPLETED'); }}>Complete</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CallOutcomeModal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} lead={selectedLead?.lead || selectedLead} theme={theme} onSubmit={handleLogInteraction} />
      <ManualTaskModal 
        show={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        onTaskCreated={() => { setShowTaskModal(false); loadTasks(); }} 
        leads={leads}
      />

      <style>{`
        .extra-small { font-size: 8px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default TaskBoard;
