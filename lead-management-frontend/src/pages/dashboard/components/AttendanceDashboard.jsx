import React, { useState, useEffect, useCallback } from 'react';
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
    ShieldCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import attendanceService from '../../../services/attendanceService';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';

const AttendanceDashboard = ({ filters, role }) => {
    const { isDarkMode } = useTheme();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [noteModal, setNoteModal] = useState(null); // { userId, date, note }
    const [noteValue, setNoteValue] = useState('');

    const fetchStatus = useCallback(async () => {
        try {
            const res = await attendanceService.getStatus();
            setStatus(res.data || res);
        } catch (err) {
            console.error("Failed to fetch attendance status", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            // Determine which user to fetch logs for (Associate > TL > Manager)
            const targetUserId = filters?.userId || filters?.teamId || filters?.managerId;

            if (targetUserId && (role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER')) {
                const res = await attendanceService.getDailySummaries({
                    startDate: filters.from,
                    endDate: filters.to,
                    userId: targetUserId
                });
                setLogs(res.data || res || []);
            } else {
                const res = await attendanceService.getMyLogs();
                setLogs(res.data || res || []);
            }
        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    }, [filters, role]);

    useEffect(() => {
        fetchStatus();
        fetchLogs();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchStatus, fetchLogs]);

    const handleUpdateNote = async () => {
        try {
            // Robust local date formatting (YYYY-MM-DD)
            let formattedDate = noteModal.date;
            if (typeof formattedDate !== 'string' || !formattedDate.includes('-')) {
                const d = new Date(noteModal.date);
                formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            
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
                    console.log("Latitude:", position.coords.latitude);
                    console.log("Longitude:", position.coords.longitude);
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
            case 'WORKING': return 'success';
            case 'ON_SHORT_BREAK':
            case 'ON_LONG_BREAK': return 'warning';
            case 'PUNCHED_OUT': return 'secondary';
            case 'OUTSIDE_UNAUTHORIZED': return 'danger';
            default: return 'primary';
        }
    };

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
            </div>
        );
    }

    const summaryStats = {
        present: logs.filter(l => l.status === 'PRESENT' || l.status === 'WORKING' || l.status === 'PUNCHED_OUT').length,
        absent: logs.filter(l => l.status === 'ABSENT').length,
        late: logs.filter(l => l.lateMinutes > 0).length
    };

    return (
        <div className="d-flex flex-column gap-4 animate-fade-in">
            {/* Summary Stats Row */}
            <div className="row g-4">
                {[
                    { label: 'PRESENT', value: summaryStats.present, icon: CheckCircle2, color: 'success' },
                    { label: 'ABSENT', value: summaryStats.absent, icon: X, color: 'danger' },
                    { label: 'LATE', value: summaryStats.late, icon: AlertCircle, color: 'info' }
                ].map((s, i) => (
                    <div key={i} className="col-md-4">
                        <div className={`premium-card p-4 d-flex align-items-center gap-4 transition-smooth ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '24px' }}>
                            <div className={`p-3 bg-${s.color} bg-opacity-10 text-${s.color} rounded-4 shadow-glow`} style={{ boxShadow: `0 0 20px -5px var(--bs-${s.color})` }}>
                                <s.icon size={24} />
                            </div>
                            <div>
                                <h4 className="fw-black mb-0 text-main fs-4">{s.value}</h4>
                                <p className="text-muted small mb-0 fw-black text-uppercase tracking-widest opacity-50" style={{ fontSize: '9px' }}>{s.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>



            <div className={`premium-card border-0 shadow-lg overflow-hidden ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '32px' }}>
                <div className="p-5 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill shadow-glow">
                            <History size={20} />
                        </div>
                        <div>
                            <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Attendance Logs</h5>
                            <p className="text-muted small mb-0 opacity-50 fw-bold">PAST 30 DAYS</p>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="ui-btn ui-btn-outline rounded-pill px-4 btn-sm" onClick={fetchLogs}>UPDATE</button>
                    </div>
                </div>

                <div className="table-responsive p-0">
                    <table className="table table-hover align-middle mb-0 border-0 bg-transparent text-main">
                        <thead>
                            <tr className="border-bottom border-white border-opacity-5">
                                <th className="ps-5 py-4 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>DATE</th>
                                {(role === 'ADMIN' || role === 'MANAGER') && (
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
                            {logs.map((log, idx) => (
                                <tr key={idx} className="border-bottom border-white border-opacity-5 transition-all">
                                    <td className="ps-5 py-4">
                                        <div className="d-flex align-items-center gap-3">
                                            <Calendar size={14} className="text-primary" />
                                            <span className="fw-black small">{new Date(log.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </td>
                                    {(role === 'ADMIN' || role === 'MANAGER') && (
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
                                        {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                    </td>
                                    <td className="py-4 text-muted small fw-bold">
                                        {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                    </td>
                                    <td className="py-4">
                                        <span className="fw-black text-main small">{log.totalWorkMinutes || 0}m</span>
                                    </td>
                                    <td className="py-4">
                                        <span className="fw-black text-warning small">{log.totalBreakMinutes || 0}m</span>
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
            </div>

            {/* Note Modal */}
            {noteModal && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className={`premium-card p-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface' : 'bg-white'}`} style={{ borderRadius: '32px', width: '400px' }}>
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
