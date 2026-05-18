import React, { useState, useMemo, useCallback } from 'react';
import { Search, Clock, AlertCircle, Calendar, CheckSquare, RefreshCw, Plus, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CallOutcomeModal from './CallOutcomeModal';
import ManualTaskModal from './ManualTaskModal';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../features/leads/hooks/useTasks';
import callApi from '../features/calls/api/callApi';
import { SystemStatGrid, SystemStatCard } from './SystemStatCard';

const TaskBoard = ({ leads = [], theme = 'light', onUpdateStatus, loadLeads, userId, managerId, teamId, startDate, endDate, initialFilter = 'ALL' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [selectedLead, setSelectedLead] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [reschedulingTask, setReschedulingTask] = useState(null);
  const [emiPromptTask, setEmiPromptTask] = useState(null);
  const { activeCall, startCall: logActiveCall } = useAuth();
  const [isStartingCall, setIsStartingCall] = useState(false);
  const navigate = useNavigate();

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
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const exactTime = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (diffMs < 0) {
          priority = 'High';
          priorityColor = 'danger';
          const absMins = Math.abs(diffMins);
          if (absMins < 60) {
            timeString = `Due ${absMins}m ago (${exactTime})`;
          } else {
            timeString = Math.abs(diffHours) < 24 
              ? `Due ${Math.abs(Math.round(diffHours))}h ago (${exactTime})` 
              : `Due ${Math.abs(Math.round(diffDays))}d ago (${due.toLocaleDateString()})`;
          }
        } else if (diffMins < 60) {
          priority = 'Medium';
          priorityColor = 'warning';
          timeString = `Due in ${Math.round(diffMins)}m (${exactTime})`;
        } else if (diffHours < 24) {
          priority = 'Medium';
          priorityColor = 'warning';
          timeString = `Due in ${Math.round(diffHours)}h (${exactTime})`;
        } else {
          priority = 'Low';
          priorityColor = 'success';
          timeString = `Due in ${Math.round(diffDays)}d (${due.toLocaleDateString()})`;
        }
      }

      return {
        ...t,
        name: t.lead?.name || 'System Task',
        title: t.title || (t.lead?.status === 'CONVERTED' ? 'EMI CALL-UP' : 'Follow-up'),
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
      // 1. Core Filter Logic
      // If a specific status filter is selected, we enforce it. 
      // If 'ALL' is selected, we show everything (including completed).

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
      if (statusFilter === 'ALL') {
        // Default: Show all pending/overdue/future, hide terminal states
        matchesStatus = task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
      } else {
        if (statusFilter === 'TODAY') {
          matchesStatus = task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && !task.isOverdue && isToday(task.dueDate);
        } else if (statusFilter === 'OVERDUE') {
          matchesStatus = task.isOverdue && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
        } else if (statusFilter === 'FUTURE') {
          matchesStatus = task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && !task.isOverdue && !isToday(task.dueDate);
        } else if (statusFilter === 'COMPLETED') {
          matchesStatus = task.status?.toUpperCase() === 'COMPLETED';
        } else {
          matchesStatus = task.priority && task.priority.toUpperCase() === statusFilter.toUpperCase();
        }
      }

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [processedTasks, searchTerm, dateFilter, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, statusFilter]);

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

  return (
    <div className="d-flex flex-column gap-3 animate-fade-in pb-5">
      <SystemStatGrid>
        {[
          { id: 'TODAY', label: "Pending (Today)", value: processedTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && !t.isOverdue && isToday(t.dueDate)).length, color: 'text-primary' },
          { id: 'OVERDUE', label: "Overdue Tasks", value: processedTasks.filter(t => t.isOverdue && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length, color: 'text-danger' },
          { id: 'FUTURE', label: "Future Tasks", value: processedTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && !t.isOverdue && !isToday(t.dueDate)).length, color: 'text-info' }
        ].map((stat, i) => (
          <SystemStatCard
            key={i}
            label={stat.label}
            value={stat.value}
            colorClass={stat.color}
            isActive={statusFilter === stat.id}
            onClick={() => setStatusFilter(prev => prev === stat.id ? 'ALL' : stat.id)}
          />
        ))}
      </SystemStatGrid>

      {/* Search & Actions */}
      <div className="px-1 d-flex justify-content-between align-items-center mb-1 mt-2">
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative" style={{ width: '320px' }}>
            <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted opacity-50" />
            <input
              type="text"
              className="form-control bg-surface border-white border-opacity-10 py-2 ps-5 rounded-pill transition-all fw-bold text-main"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '13px', background: 'rgba(255,255,255,0.03)' }}
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
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px', width: '60px' }}>S/NO</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>NAME</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>LEAD STATUS</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>TASK</th>
                <th className="text-center text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px', width: '60px' }}>CALL</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>DUE DATE</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>CREATED BY</th>
                <th className="text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>STATUS</th>
                <th className="pe-4 text-end text-muted small fw-black tracking-widest text-uppercase" style={{ fontSize: '9px' }}>UPDATE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center py-5"><RefreshCw size={24} className="text-primary animate-spin mb-2" /></td></tr>
              ) : filteredTasks.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-5 opacity-50"><CheckSquare size={32} className="mb-2" /></td></tr>
              ) : (
                currentTasks.map((task, idx) => (
                  <tr key={task.id} className="border-bottom border-light hover-bg-light-subtle cursor-pointer" onClick={() => setSelectedLead(task)}>
                    <td className="ps-4"><span className="text-muted small">{indexOfFirstItem + idx + 1}</span></td>
                    <td>
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-main small">{task.name}</span>
                        <span className="text-muted extra-small opacity-50">{task.lead?.email || 'SYSTEM'}</span>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const s = task.lead?.status?.toUpperCase() || 'N/A';
                        let colorClass = 'primary';
                        if (['CONVERTED', 'PAID', 'SUCCESS'].includes(s)) colorClass = 'success';
                        else if (['LOST', 'REJECTED', 'NOT_INTERESTED'].includes(s)) colorClass = 'danger';
                        else if (['FOLLOW_UP', 'EMI', 'BUSY'].includes(s)) colorClass = 'warning';
                        else if (['OPEN', 'CONTACTED'].includes(s)) colorClass = 'info';
                        
                        return (
                          <span className={`fw-black text-uppercase text-${colorClass}`} style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                            {s === 'CONVERTED' ? 'EMI' : s}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <span className="text-dark fw-bold small">{task.title || 'Follow-up'}</span>
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
                      <span className={`badge rounded-pill fw-bold bg-${
                        task.status === 'COMPLETED' ? 'success' : 
                        task.isOverdue ? 'danger' : 
                        isToday(task.dueDate) ? 'primary' : 'info'
                      } bg-opacity-10 text-${
                        task.status === 'COMPLETED' ? 'success' : 
                        task.isOverdue ? 'danger' : 
                        isToday(task.dueDate) ? 'primary' : 'info'
                      }`} style={{ fontSize: '9px' }}>
                        {task.status === 'COMPLETED' ? 'COMPLETED' : 
                         task.isOverdue ? 'OVERDUE' : 
                         isToday(task.dueDate) ? 'TODAY' : 'UPCOMING'}
                      </span>
                    </td>
                    <td className="pe-4 text-end">
                      {task.status !== 'COMPLETED' && (
                        <button 
                          className="btn btn-sm btn-outline-primary rounded-pill py-1 px-3" 
                          style={{ fontSize: '10px' }} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const isEmiOrPayment = 
                              task.taskType === 'EMI_COLLECTION' || 
                              task.title?.toUpperCase().includes('EMI') || 
                              task.title?.toUpperCase().includes('PAYMENT') || 
                              task.title?.toUpperCase().includes('INSTALLMENT') || 
                              task.description?.toUpperCase().includes('PAYMENT') || 
                              task.description?.toUpperCase().includes('INSTALLMENT') ||
                              task.lead?.status === 'PRE_PAYMENT' ||
                              task.lead?.status?.startsWith('POST_PAYMENT');
                            if (isEmiOrPayment && task.lead?.id) {
                              setEmiPromptTask(task);
                            } else if (task.lead?.id) {
                              navigate(`/leads/${task.lead.id}/status-update`);
                            } else {
                              handleUpdateTaskStatus(task.id, 'COMPLETED');
                            }
                          }}
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Task Pagination Footer */}
        <div className="px-4 py-4 bg-surface bg-opacity-10 border-top border-main border-opacity-10 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted fw-bold text-uppercase tracking-widest" style={{ fontSize: '10px' }}>
              Showing {filteredTasks.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, filteredTasks.length)}
            </small>
            <span className="text-muted opacity-25">|</span>
            <small className="text-primary fw-black text-uppercase tracking-widest" style={{ fontSize: '10px' }}>
              Total {filteredTasks.length} Scheduled Tasks
            </small>
          </div>
          
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex gap-1">
              <button 
                className={`ui-btn btn-sm rounded-pill px-3 py-2 d-flex align-items-center justify-content-center transition-all ${currentPage === 1 ? 'ui-btn-secondary opacity-25' : 'ui-btn-primary shadow-glow'}`}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="d-flex align-items-center px-3">
                <span className="text-main fw-black text-uppercase tracking-widest" style={{ fontSize: '11px' }}>
                  Page {currentPage} <span className="text-muted opacity-50 mx-1">/</span> {totalPages || 1}
                </span>
              </div>

              <button 
                className={`ui-btn btn-sm rounded-pill px-3 py-2 d-flex align-items-center justify-content-center transition-all ${currentPage >= totalPages ? 'ui-btn-secondary opacity-25' : 'ui-btn-primary shadow-glow'}`}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage >= totalPages || totalPages === 0}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>


      <CallOutcomeModal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} lead={selectedLead?.lead || selectedLead} theme={theme} onSubmit={handleLogInteraction} />
      <ManualTaskModal
        show={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onTaskCreated={() => { setShowTaskModal(false); loadTasks(); }}
        leads={leads}
      />
      {emiPromptTask && (
        <EmiTaskActionModal
          task={emiPromptTask}
          theme={theme}
          onClose={() => setEmiPromptTask(null)}
          onComplete={async (taskId) => {
            await updateStatus({ taskId, status: 'COMPLETED' });
            loadTasks();
          }}
          onReschedule={async (task, dueDate, note) => {
            await updateStatus({ taskId: task.id, status: 'COMPLETED' });
            const taskPayload = {
              title: task.title,
              description: note || (task.title?.toUpperCase().includes('EMI') ? `Rescheduled EMI collection: ${task.title}` : `Rescheduled follow-up: ${task.title}`),
              taskType: task.taskType || 'EMI_COLLECTION',
              dueDate: `${dueDate}T09:00:00`
            };
            await createTask({ leadId: task.lead.id, data: taskPayload });
            loadTasks();
          }}
        />
      )}

      <style>{`
        .extra-small { font-size: 8px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const EmiTaskActionModal = ({ task, onClose, onComplete, onReschedule, theme }) => {
  const isDarkMode = theme === 'dark';
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!task) return null;

  const handleComplete = async () => {
    setLoading(true);
    try {
      await onComplete(task.id);
      toast.success("Payment registered. Task marked as completed.");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete task");
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleDate) {
      toast.error("Please select a reschedule date");
      return;
    }
    setLoading(true);
    try {
      await onReschedule(task, rescheduleDate, rescheduleNote);
      toast.success("Payment follow-up rescheduled successfully.");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reschedule task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 11000 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
         <div className={`modal-content border-0 shadow-2xl rounded-4 overflow-hidden ${isDarkMode ? 'bg-dark border-secondary border-opacity-10 text-white' : 'bg-white text-dark'}`}>
          
          {/* Header */}
          <div className={`modal-header border-bottom p-4 d-flex align-items-center justify-content-between ${isDarkMode ? 'border-secondary border-opacity-10 bg-surface bg-opacity-30' : 'border-light bg-light'}`}>
            <div className="d-flex align-items-center gap-2">
              <Clock size={20} className="text-primary opacity-75" />
              <div>
                <h4 className={`fw-black mb-0 tracking-tight ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ fontSize: '1.25rem' }}>Payment Follow-up Action</h4>
                <p className="text-muted small fw-bold mb-0 text-uppercase tracking-widest" style={{ fontSize: '8px' }}>Task ID: L-{task.id}</p>
              </div>
            </div>
            <button 
              type="button" 
              className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`} 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            <div className="mb-4">
              <h6 className="text-muted text-uppercase tracking-widest small mb-1" style={{ fontSize: '10px' }}>Current Task</h6>
              <div className={`fw-black fs-5 ${isDarkMode ? 'text-white' : 'text-dark'}`}>{task.title}</div>
              <p className="text-muted small mt-1">{task.description || 'No description provided'}</p>
            </div>

            {!isRescheduling ? (
              <div className="d-flex flex-column gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={loading}
                  className="btn btn-success py-3 rounded-pill fw-black text-uppercase d-flex align-items-center justify-content-center gap-2 hover-scale transition-all border-0 shadow-sm"
                  style={{ letterSpacing: '2px', fontSize: '12px' }}
                >
                  <CheckSquare size={16} />
                  Payment Completed (Finish Task)
                </button>
                
                <button
                  type="button"
                  onClick={() => setIsRescheduling(true)}
                  disabled={loading}
                  className="btn btn-outline-info py-3 rounded-pill fw-black text-uppercase d-flex align-items-center justify-content-center gap-2 hover-scale transition-all shadow-sm"
                  style={{ letterSpacing: '2px', fontSize: '12px' }}
                >
                  <Calendar size={16} />
                  Reschedule Follow-up
                </button>
              </div>
            ) : (
              <form onSubmit={handleReschedule} className="d-flex flex-column gap-3 mt-3">
                <div>
                  <label className="form-label small fw-bold text-uppercase text-muted tracking-widest" style={{ fontSize: '10px' }}>Reschedule Due Date</label>
                  <input
                    type="date"
                    className={`form-control py-3 px-3 rounded-3 ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-50' : 'bg-light text-dark border-light'}`}
                    value={rescheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label small fw-bold text-uppercase text-muted tracking-widest" style={{ fontSize: '10px' }}>Reschedule Notes</label>
                  <textarea
                    className={`form-control py-3 px-3 rounded-3 ${isDarkMode ? 'bg-dark text-white border-secondary border-opacity-50' : 'bg-light text-dark'}`}
                    rows="3"
                    placeholder="Enter reason for reschedule..."
                    value={rescheduleNote}
                    onChange={(e) => setRescheduleNote(e.target.value)}
                  ></textarea>
                </div>

                <div className="d-flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className={`btn py-3 flex-fill rounded-pill fw-bold text-uppercase ${isDarkMode ? 'btn-outline-secondary text-white' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '11px' }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary py-3 flex-fill rounded-pill fw-black text-uppercase text-white border-0"
                    style={{ fontSize: '11px' }}
                  >
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBoard;
