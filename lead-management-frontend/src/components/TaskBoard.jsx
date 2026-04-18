import React, { useState, useMemo } from 'react';
import { Search, Filter, Clock, AlertCircle, Calendar, User, AlignLeft, CheckSquare, RefreshCw, Plus, Phone, Mail } from 'lucide-react';
import CallOutcomeModal from './CallOutcomeModal';
import ManualTaskModal from './ManualTaskModal';
import associateService from '../services/associateService';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const TaskBoard = ({ leads, theme, onUpdateStatus, fetchLeads, userId, hideFilters = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [cloudTasks, setCloudTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reschedulingTask, setReschedulingTask] = useState(null);
  const { activeCall, startCall: logActiveCall } = useAuth();
  const [isStartingCall, setIsStartingCall] = useState(false);

  const isDarkMode = theme === 'dark';

  const handleStartCall = async (lead) => {
    if (activeCall) {
      toast.warning('Another interaction is currently active. Finish it first.');
      return;
    }

    setIsStartingCall(true);
    try {
      const res = await associateService.startCall({
        leadId: lead.id,
        phoneNumber: lead.mobile
      });
      
      const sessionData = {
        callId: res.data.data.id,
        leadId: lead.id,
        leadName: lead.name,
        phoneNumber: lead.mobile,
        startTime: res.data.data.startTime
      };
      
      logActiveCall(sessionData);
      toast.success('Interaction sequence initiated');
      // Open outcome modal immediately
      setSelectedLead({ lead });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate interaction');
    } finally {
      setIsStartingCall(false);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await associateService.fetchHierarchicalTasks();
      const taskData = Array.isArray(res.data) ? res.data : [];
      setCloudTasks(taskData);
    } catch (err) {
      console.error("Task fetch failed", err);
      setCloudTasks([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadTasks();
  }, [leads, userId]);

  // Extract valid tasks from cloud data
  const tasks = useMemo(() => {
    if (!Array.isArray(cloudTasks)) return [];

    return cloudTasks.map(t => {
      // Calculate Priority based on due date
      let priority = 'Low';
      let priorityColor = 'success';
      let timeString = 'No date set';

      if (t.dueDate) {
        const due = new Date(t.dueDate);
        const now = new Date();
        const diffMs = due - now;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const diffHours = diffMs / (1000 * 60 * 60);

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

  // Apply Search and Filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        (task.title || "").toLowerCase().includes(s) ||
        (task.description || "").toLowerCase().includes(s) ||
        (task.name || "").toLowerCase().includes(s);

      let matchesDate = true;
      if (dateFilter) {
        if (!task.dueDate) return false;
        const taskDateStr = new Date(task.dueDate).toISOString().split('T')[0];
        matchesDate = taskDateStr === dateFilter;
      }

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = task.priority && task.priority.toUpperCase() === statusFilter.toUpperCase();
      }

      let matchesUser = true;
      if (userId) {
         const validUserIdStr = userId.toString();
         matchesUser = (task.lead && task.lead.assignedToId?.toString() === validUserIdStr) || 
                       (task.assigneeId?.toString() === validUserIdStr) ||
                       (task.user?.id?.toString() === validUserIdStr);
      }

      return matchesSearch && matchesDate && matchesStatus && matchesUser;
    });
  }, [tasks, searchTerm, dateFilter, statusFilter, userId]);

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await associateService.updateTaskStatus(taskId, newStatus);
      toast.success(`Task marked as ${newStatus.toLowerCase()}`);
      loadTasks();
    } catch (err) {
      toast.error("Failed to update task status");
    }
  };

  const handleLogInteraction = async (data) => {
    if (selectedLead && onUpdateStatus) {
      const leadId = selectedLead.lead?.id || selectedLead.leadId;
      await onUpdateStatus(leadId, data.status, data.note, data.followUpDate);
      setSelectedLead(null);
      loadTasks();
    }
  };

  return (
    <div className="d-flex flex-column gap-3 animate-fade-in pb-5">
      {/* High-Fidelity Task Analytics Nodes */}
      <div className="row g-3 mb-2">
        <div className="col-12 col-md-4">
          <div className="premium-card p-4 shadow-lg border-0 d-flex align-items-center gap-4 group hover-active-card overflow-hidden" 
               style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px' }}>
            <div className="p-3 bg-primary bg-opacity-10 rounded-4 text-primary border border-primary border-opacity-20 shadow-glow-sm group-hover:scale-110 transition-all">
              <Clock size={22} />
            </div>
            <div>
              <div className="text-muted small fw-black text-uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: '9px' }}>Active Followups</div>
              <h2 className="fw-black text-main mb-0 tabular-nums" style={{ letterSpacing: '-1px' }}>
                {filteredTasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString() && t.status !== 'COMPLETED').length}
              </h2>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-md-4">
          <div className="premium-card p-4 shadow-lg border-0 d-flex align-items-center gap-4 group hover-active-card overflow-hidden" 
               style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px' }}>
            <div className="p-3 bg-warning bg-opacity-10 rounded-4 text-warning border border-warning border-opacity-20 shadow-glow-sm group-hover:scale-110 transition-all">
              <AlertCircle size={22} />
            </div>
            <div>
              <div className="text-muted small fw-black text-uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: '9px' }}>Pending Squad Tasks</div>
              <h2 className="fw-black text-main mb-0 tabular-nums" style={{ letterSpacing: '-1px' }}>
                {filteredTasks.filter(t => t.status === 'PENDING').length}
              </h2>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="premium-card p-4 shadow-lg border-0 d-flex align-items-center gap-4 group hover-active-card overflow-hidden" 
               style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px' }}>
            <div className="p-3 bg-success bg-opacity-10 rounded-4 text-success border border-success border-opacity-20 shadow-glow-sm group-hover:scale-110 transition-all">
              <CheckSquare size={22} />
            </div>
            <div>
              <div className="text-muted small fw-black text-uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: '9px' }}>Synchronization Success</div>
              <h2 className="fw-black text-main mb-0 tabular-nums" style={{ letterSpacing: '-1px' }}>
                {filteredTasks.filter(t => t.status === 'COMPLETED').length}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Search and Filter Bar - Conditionally Hidden */}
      {!hideFilters && (
        <div className="px-1 mb-2">
            <div className="row g-2 align-items-center">
                <div className="col-md-5">
                    <div className="input-group bg-white rounded-3 border border-light shadow-sm">
                        <span className="input-group-text border-0 bg-transparent text-muted ms-2"><Search size={16} /></span>
                        <input
                            type="text"
                            className="form-control border-0 bg-transparent shadow-none text-main py-2 fw-bold"
                            placeholder="Search tasks or intel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ fontSize: '14px' }}
                        />
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="d-flex gap-2">
                        <div className="input-group bg-white rounded-3 border border-light shadow-sm flex-grow-1">
                            <input
                                type="date"
                                className="form-control border-0 bg-transparent shadow-none text-main py-2 fw-bold"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                style={{ fontSize: '13px' }}
                            />
                        </div>
                        <select
                            className="form-select bg-white rounded-3 border border-light shadow-sm text-main py-2 fw-bold"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: '130px', fontSize: '13px' }}
                        >
                            <option value="ALL">ALL STATUS</option>
                            <option value="PENDING">ACTIVE</option>
                            <option value="COMPLETED">HISTORY</option>
                        </select>
                    </div>
                </div>

                <div className="col-md-3">
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-primary rounded-3 w-100 py-2 fw-bold text-uppercase d-flex align-items-center justify-content-center gap-2"
                            onClick={() => setShowTaskModal(true)}
                            style={{ fontSize: '12px' }}
                        >
                            <Plus size={16} /> ADD TASK
                        </button>
                        <button 
                            className="btn btn-light rounded-3 px-3 py-2 border border-light shadow-sm"
                            onClick={loadTasks}
                            disabled={loading}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Local search if filters are hidden */}
      {hideFilters && (
        <div className="px-1 d-flex justify-content-between align-items-center mb-1">
           <div className="d-flex align-items-center gap-2">
              <CheckSquare size={16} className="text-primary opacity-50" />
              <h6 className="fw-black text-main mb-0 small text-uppercase tracking-widest">Master Task Ledger</h6>
           </div>
           <div className="d-flex gap-2">
             <input
                type="text"
                className="bg-white border text-main py-1 px-4 rounded-pill"
                placeholder="Search metrics..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ fontSize: '11px', outline: 'none', width: '200px' }}
              />
              <button 
                className="btn btn-primary btn-sm rounded-pill px-4 fw-black text-uppercase shadow-glow"
                onClick={() => setShowTaskModal(true)}
                style={{ fontSize: '10px' }}
              >
                + NEW TASK
              </button>
           </div>
        </div>
      )}

      {/* Task Matrix - Table Layout as per sketch */}
      <div className="premium-card overflow-hidden shadow-lg border-0 animate-fade-in">
        <div className="table-responsive">
          <table className="table ui-table mb-0 align-middle">
            <thead className="bg-surface bg-opacity-30">
              <tr className="border-bottom border-white border-opacity-5">
                <th className="ps-4 text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px', width: '60px' }}>S/NO</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>NAME</th>
                <th className="text-center text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px', width: '60px' }}>CALL</th>
                <th className="text-center text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px', width: '60px' }}>MAIL</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>DUE DATE</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>STATUS</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>FOLLOWUP TYPE</th>
                <th className="pe-4 text-end text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>UPDATE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <RefreshCw size={24} className="text-primary animate-spin mb-2 opacity-50" />
                    <div className="text-muted small fw-black text-uppercase tracking-widest">Accessing Node Ledger...</div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 opacity-50">
                    <CheckSquare size={32} className="mb-2" />
                    <div className="small fw-black text-uppercase tracking-widest">Pipeline Clear - No Active Tasks</div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task, idx) => (
                  <tr key={task.id} className="border-bottom border-light hover-bg-light-subtle cursor-pointer" onClick={() => setSelectedLead(task)}>
                    <td className="ps-4">
                       <span className="text-muted small">{idx + 1}</span>
                    </td>
                    <td>
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-main small">{task.name}</span>
                        <span className="text-muted small opacity-50" style={{ fontSize: '10px' }}>{task.lead?.email || 'SYSTEM'}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <button 
                        className={`p-1 border-0 bg-transparent text-success hover-scale ${activeCall ? 'opacity-25' : ''}`}
                        disabled={isStartingCall || !!activeCall}
                        onClick={(e) => { e.stopPropagation(); handleStartCall(task.lead); }}
                        title="Start Interaction"
                      >
                        <Phone size={14} />
                      </button>
                    </td>
                    <td className="text-center">
                      <a href={`mailto:${task.lead?.email}`} className="text-primary p-1 d-inline-block hover-scale" onClick={e => e.stopPropagation()}><Mail size={14} /></a>
                    </td>
                    <td>
                      <div className={`small fw-bold ${task.isOverdue ? 'text-danger' : 'text-main'}`}>
                        {task.timeString}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`badge rounded-pill fw-bold ${task.status === 'COMPLETED' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`} style={{ fontSize: '9px' }}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <span className="text-muted small text-uppercase fw-bold" style={{ fontSize: '9px' }}>{task.taskType?.replace(/_/g, ' ') || 'FOLLOW UP'}</span>
                    </td>
                    <td className="pe-4 text-end">
                      <div className="d-flex align-items-center justify-content-end gap-2">
                        {task.status === 'PENDING' && (
                          <button 
                            className="btn btn-sm btn-outline-primary rounded-pill fw-bold py-1 px-3" 
                            style={{ fontSize: '10px' }}
                            onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, 'COMPLETED'); }}
                          >
                            Complete
                          </button>
                        )}
                        <button 
                          className="btn btn-sm btn-link text-muted p-1"
                          onClick={(e) => { e.stopPropagation(); setReschedulingTask(task); setShowTaskModal(true); }}
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reused Lead Detail Modal Workspace! */}
      <CallOutcomeModal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead?.lead || selectedLead}
        theme={theme}
        onSubmit={handleLogInteraction}
      />
      <ManualTaskModal
        show={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setReschedulingTask(null);
        }}
        onTaskCreated={() => {
          if (reschedulingTask) {
            handleUpdateTaskStatus(reschedulingTask.id, 'RESCHEDULED');
          }
          loadTasks();
        }}
        leads={leads}
        initialData={reschedulingTask ? {
          leadId: reschedulingTask.lead?.id || reschedulingTask.leadId,
          title: `RESCHEDULED: ${reschedulingTask.title}`,
          description: reschedulingTask.description,
          taskType: reschedulingTask.taskType
        } : null}
      />

      <style>{`
        .hover-bg-light-subtle:hover { background: #f8f9fa; }
        .hover-scale { transition: transform 0.2s; }
        .hover-scale:hover { transform: scale(1.1); }
        .fw-black { font-weight: 900; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default TaskBoard;
