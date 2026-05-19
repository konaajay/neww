import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Clock,
    MapPin,
    Coffee,
    LogIn,
    LogOut,
    MessageSquare,
    Save,
    X,
    History,
    AlertCircle,
    CheckCircle2,
    Timer,
    Calendar,
    ChevronRight,
    ShieldCheck,
    RefreshCcw
} from 'lucide-react';
import { toast } from 'react-toastify';
import attendanceService from '../../../services/attendanceService';
import adminService from '../../../services/adminService';
import { useAuth } from '../../../context/AuthContext';
import WfhApprovalPanel from './WfhApprovalPanel';
import { useTheme } from '../../../context/ThemeContext';
import { MetricSkeletonRow, TableSkeleton } from './DashboardSkeletons';
import { SystemStatGrid, SystemStatCard } from '../../../components/SystemStatCard';
import { cleanParams } from '../../../api/api';

const AttendanceDashboard = ({ filters, role }) => {
    const { isDarkMode } = useTheme();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [noteModal, setNoteModal] = useState(null); // { userId, date, note }
    const [noteValue, setNoteValue] = useState('');
    const [activeSubTab, setActiveSubTab] = useState('logs');
    const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('ALL');

    const fetchStatus = useCallback(async (signal) => {
        try {
            const res = await attendanceService.getStatus({ signal });
            setStatus(res.data || res);
        } catch (err) {
            if (err.name !== 'CanceledError' && err.message !== 'Operation canceled by the user.') {
                console.error("Failed to fetch attendance status", err);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        // If already in YYYY-MM-DD format, return as is to avoid timezone shifts
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const fetchLogs = useCallback(async (signal) => {
        try {
            const isAdminOrManagerOrTL = role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER';

            if (isAdminOrManagerOrTL) {
                const params = cleanParams({
                    from: filters.from,
                    to: filters.to,
                    userId: filters.userId,
                    teamId: filters.teamId,
                    managerId: filters.managerId
                });
                const res = await attendanceService.getDailySummaries(params, { signal });
                const data = res.data || res || [];
                setLogs(data);
            } else {
                const params = {
                    from: formatDate(filters.from),
                    to: formatDate(filters.to)
                };
                const res = await attendanceService.getMyLogs(params, { signal });
                const data = res.data || res || [];
                setLogs(data);
            }
        } catch (err) {
            if (err.name !== 'CanceledError' && err.message !== 'Operation canceled by the user.') {
                console.error("Attendance fetch failed:", err);
            }
        }
    }, [filters, role]);

    useEffect(() => {
        const controller = new AbortController();
        fetchStatus(controller.signal);
        fetchLogs(controller.signal);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            controller.abort();
            clearInterval(timer);
        };
    }, [fetchStatus, fetchLogs]);

    const handleUpdateNote = async () => {
        try {
            // Robust local date formatting (YYYY-MM-DD)
            let formattedDate = noteModal.date;
            if (typeof formattedDate !== 'string' || !formattedDate.includes('-')) {
                const d = new Date(noteModal.date);
                formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }

            await adminService.updateAttendanceNote(noteModal.userId, formattedDate, noteValue);
            toast.success("Note Saved");
            setNoteModal(null);
            fetchLogs();
        } catch (err) {
            toast.error("Could not save note");
        }
    };

    const handleClockIn = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const data = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            deviceId: "WEB_OS_CLIENT"
                        };
                        await attendanceService.clockIn(data);
                        toast.success("Punched in");
                        fetchStatus();
                        fetchLogs();
                    } catch (err) {
                        toast.error(err.response?.data?.message || "Punch in failed");
                    }
                },
                (error) => {
                    console.error("Error:", error.message);
                    toast.error("Location access denied. Please enable GPS.");
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            alert("Geolocation is not supported");
            toast.error("Geolocation is not supported by your browser");
        }
    };

    const handleClockOut = async () => {
        if (!window.confirm("Do you want to punch out?")) return;
        try {
            await attendanceService.clockOut();
            toast.success("Punched out");
            fetchStatus();
            fetchLogs();
        } catch (err) {
            toast.error("Punch out failed");
        }
    };

    const handleBreak = async (type) => {
        try {
            if (status?.status?.includes('BREAK')) {
                await attendanceService.endBreak();
                toast.success("Break ended");
            } else {
                await attendanceService.startBreak(type);
                toast.info(`Started ${type} break`);
            }
            fetchStatus();
        } catch (err) {
            toast.error("Break failed");
        }
    };

    const getStatusColor = (s) => {
        switch (s) {
            case 'WORKING':
            case 'PRESENT': return 'success';
            case 'ON_BREAK':
            case 'AUTO_BREAK':
            case 'LATE': return 'warning';
            case 'PUNCHED_OUT':
            case 'SECONDARY': return 'secondary';
            case 'OUTSIDE':
            case 'ABSENT': return 'danger';
            default: return 'primary';
        }
    };

    const summaryStats = useMemo(() => {
        const p = logs.filter(l => l.status && !l.status.toUpperCase().includes('ABSENT')).length;
        const a = logs.filter(l => l.status && l.status.toUpperCase().includes('ABSENT')).length;
        const l = logs.filter(l => l.lateMinutes > 0 || l.isLate).length;
        
        return { present: p, absent: a, late: l };
    }, [logs]);

    if (loading) {
        return (
            <div className="animate-fade-in d-flex flex-column gap-4">
                <MetricSkeletonRow count={3} />
                <div className="mt-4">
                    <TableSkeleton rows={8} />
                </div>
            </div>
        );
    }

    const filteredLogs = logs.filter(log => {
        if (attendanceStatusFilter === 'ALL') return true;
        if (attendanceStatusFilter === 'PRESENT') return ['PRESENT', 'WORKING', 'PUNCHED_OUT'].includes(log.status);
        if (attendanceStatusFilter === 'ABSENT') return log.status === 'ABSENT';
        if (attendanceStatusFilter === 'LATE') return log.lateMinutes > 0;
        return true;
    });

    return (
        <div className="d-flex flex-column gap-4 animate-fade-in">
            {/* Summary Stats Row - Optimized Stable Grid */}
            <SystemStatGrid>
                {[
                    { id: 'PRESENT', label: 'PRESENT', value: summaryStats.present, color: 'text-success' },
                    { id: 'ABSENT', label: 'ABSENT', value: summaryStats.absent, color: 'text-danger' },
                    { id: 'LATE', label: 'LATE', value: summaryStats.late, color: 'text-warning' }
                ].map((s, i) => (
                    <SystemStatCard 
                        key={i}
                        label={s.label}
                        value={s.value}
                        colorClass={s.color}
                        isActive={attendanceStatusFilter === s.id}
                        onClick={() => setAttendanceStatusFilter(prev => prev === s.id ? 'ALL' : s.id)}
                    />
                ))}
            </SystemStatGrid>

            <div className={`premium-card border-0 shadow-lg overflow-hidden ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-card shadow-sm'}`} style={{ borderRadius: '32px' }}>
                <div className="p-3 p-sm-5 border-bottom border-white border-opacity-5 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
                    <div className="d-flex align-items-center gap-4">
                        <div
                            className={`cursor-pointer transition-all ${activeSubTab === 'logs' ? 'opacity-100' : 'opacity-40'}`}
                            onClick={() => setActiveSubTab('logs')}
                        >
                            <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest" style={{ fontSize: 'min(14px, 3.5vw)' }}>Attendance Logs</h5>
                            <p className="text-muted small mb-0 opacity-50 fw-bold" style={{ fontSize: '9px' }}>{filters?.from} TO {filters?.to}</p>
                        </div>

                        {(role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER') && (
                            <div
                                className={`cursor-pointer transition-all ${activeSubTab === 'wfh' ? 'opacity-100' : 'opacity-40'}`}
                                onClick={() => setActiveSubTab('wfh')}
                            >
                                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest" style={{ fontSize: 'min(14px, 3.5vw)' }}>WFH Requests</h5>
                                <p className="text-muted small mb-0 opacity-50 fw-bold" style={{ fontSize: '9px' }}>Review Approvals</p>
                            </div>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        {activeSubTab === 'logs' && (
                            <button 
                                className="ui-btn ui-btn-primary rounded-pill px-4 btn-sm shadow-glow-sm" 
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)',
                                    fontSize: '10px',
                                    height: '36px'
                                }}
                                onClick={fetchLogs}
                            >
                                <RefreshCcw size={12} className="me-2" />
                                UPDATE
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-4">
                    {activeSubTab === 'logs' ? (
                        <div className="table-responsive p-0">
                            <table className="table table-hover align-middle mb-0 border-0 bg-transparent text-main">
                                <thead>
                                    <tr className="border-bottom border-white border-opacity-5">
                                        <th className="ps-5 py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>DATE</th>
                                        {(role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER') && (
                                            <th className="py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>EMPLOYEE</th>
                                        )}
                                        <th className="py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>STATUS</th>
                                        <th className="py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>START</th>
                                        <th className="py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>END</th>
                                        <th className="py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>WORK TIME</th>
                                        <th className="py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>BREAKS</th>
                                        <th className="py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>IDLE</th>
                                        <th className="py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>LATE</th>
                                        <th className="pe-5 py-4 text-end text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log, idx) => (
                                        <tr key={idx} className="border-bottom border-white border-opacity-5 transition-all">
                                            <td className="ps-5 py-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <Calendar size={14} className="text-primary" />
                                                    <span className="fw-black small">{new Date(log.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                            </td>
                                            {(role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER') && (
                                                <td className="py-4">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="p-1 bg-primary bg-opacity-10 text-primary rounded-circle">
                                                            <LogIn size={10} />
                                                        </div>
                                                        <span className="fw-bold small text-main">{log.userName || 'SYSTEM'}</span>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="py-4">
                                                <span className={`badge rounded-1 px-2 py-1 text-uppercase fw-black bg-${getStatusColor(log.status)} bg-opacity-10 text-${getStatusColor(log.status)}`} style={{ fontSize: '8px' }}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-muted small fw-bold">
                                                {(() => {
                                                    const timeStr = log.checkInTime || log.loginTime;
                                                    if (!timeStr) return '---';

                                                    let d;
                                                    if (Array.isArray(timeStr)) {
                                                        // Handle Jackson [YYYY, MM, DD, HH, mm, ss]
                                                        d = new Date(timeStr[0], timeStr[1] - 1, timeStr[2], timeStr[3], timeStr[4], timeStr[5] || 0);
                                                    } else {
                                                        d = new Date(typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr);
                                                    }

                                                    return isNaN(d.getTime()) ? '---' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                            </td>
                                            <td className="py-4 text-muted small fw-bold">
                                                {(() => {
                                                    const timeStr = log.checkOutTime || log.logoutTime;
                                                    if (!timeStr) return '---';

                                                    let d;
                                                    if (Array.isArray(timeStr)) {
                                                        d = new Date(timeStr[0], timeStr[1] - 1, timeStr[2], timeStr[3], timeStr[4], timeStr[5] || 0);
                                                    } else {
                                                        d = new Date(typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr);
                                                    }

                                                    return isNaN(d.getTime()) ? '---' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                            </td>
                                            <td className="py-4">
                                                <span className="fw-black text-main small">{log.totalWorkMinutes || 0}m</span>
                                            </td>
                                            <td className="py-4">
                                                <div className="d-flex flex-column">
                                                    <span className="fw-black text-warning small">{log.totalBreakMinutes || 0}m</span>
                                                    <span className="text-muted extra-small fw-bold" style={{ fontSize: '7px' }}>
                                                        S: {log.shortBreakMinutes || 0}m | L: {log.longBreakMinutes || 0}m
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className={`fw-black small ${log.totalIdleMinutes > 0 ? 'text-danger' : 'text-muted opacity-50'}`}>{log.totalIdleMinutes || 0}m</span>
                                            </td>
                                            <td className="py-4">
                                                {log.lateMinutes > 0 ? (
                                                    <span className="fw-black text-danger small">{log.lateMinutes}m</span>
                                                ) : (
                                                    <span className="fw-black text-muted small opacity-50">0m</span>
                                                )}
                                            </td>
                                            <td className="pe-5 py-4 text-end">
                                                <div className="d-flex align-items-center justify-content-end gap-2">
                                                    {log.note && (
                                                        <div className="d-flex align-items-center gap-2 px-3 py-2 bg-primary bg-opacity-10 text-primary rounded-pill border border-primary border-opacity-10 shadow-sm" style={{ fontSize: '10px', maxWidth: '180px' }}>
                                                            <MessageSquare size={10} className="flex-shrink-0" />
                                                            <span className="fw-black text-uppercase tracking-tighter text-truncate">{log.note}</span>
                                                        </div>
                                                    )}
                                                    {(role === 'ADMIN' || role === 'MANAGER') && (
                                                        <button
                                                            className="btn btn-link text-primary p-0 border-0 hover-scale"
                                                            onClick={() => {
                                                                setNoteModal({ userId: log.userId, date: log.date, note: log.note });
                                                                setNoteValue(log.note || '');
                                                            }}
                                                        >
                                                            <MessageSquare size={16} />
                                                        </button>
                                                    )}
                                                    <button className="btn btn-link text-muted p-0 border-0 hover-scale opacity-30">
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan={(role === 'ADMIN' || role === 'MANAGER') ? 10 : 9} className="text-center py-5 opacity-30 fw-black text-uppercase tracking-widest small">
                                                NO LOGS FOUND
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <WfhApprovalPanel role={role} />
                    )}
                </div>
            </div>

            {/* Note Modal */}
            {noteModal && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className={`premium-card p-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface' : 'bg-card'}`} style={{ borderRadius: '32px', width: '400px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-black text-main text-uppercase mb-0 tracking-widest">
                                {noteModal.note ? 'Edit Note/Permission' : 'Add Note/Permission'}
                            </h5>
                            <button className="btn btn-link text-muted p-0 border-0" onClick={() => setNoteModal(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <p className="text-muted small fw-bold mb-0">DATE: {new Date(noteModal.date).toLocaleDateString()}</p>
                                {noteModal.note && <span className="badge bg-warning bg-opacity-10 text-warning fw-black" style={{ fontSize: '8px' }}>EDIT NOTE</span>}
                            </div>
                            <textarea
                                className={`form-control bg-opacity-10 border-0 rounded-4 p-3 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                rows="4"
                                value={noteValue}
                                onChange={(e) => setNoteValue(e.target.value)}
                                placeholder="Enter permission details or administrative note..."
                                style={{ resize: 'none' }}
                            ></textarea>
                        </div>
                        <button
                            onClick={handleUpdateNote}
                            className="w-100 py-3 rounded-pill bg-primary text-white border-0 shadow-glow fw-black d-flex align-items-center justify-content-center gap-2 transition-all hover-scale"
                        >
                            <Save size={18} /> SAVE
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .premium-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                .ui-btn { transition: all 0.3s ease; border: 0; }
                .shadow-glow { box-shadow: 0 0 15px currentColor; }
                .hover-scale:hover { transform: scale(1.1); }
                .custom-scroll::-webkit-scrollbar { width: 4px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default AttendanceDashboard;
