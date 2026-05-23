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
    Check,
    Timer,
    Calendar,
    ChevronRight,
    ShieldCheck,
    RefreshCcw,
    Plus,
    FileText
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

const formatDate = (dateStr) => {
    if (!dateStr) return null;
    // If already in YYYY-MM-DD format, return as is to avoid timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
    const [sheetDate, setSheetDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [sheetRemarks, setSheetRemarks] = useState({});
    const [sheetPending, setSheetPending] = useState({});

    // Manual Attendance Marking States
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualUsers, setManualUsers] = useState([]);
    const [manualForm, setManualForm] = useState({
        userId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'AUTO',
        loginTime: '',
        logoutTime: '',
        workMinutes: '',
        breakMinutes: ''
    });
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);

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



    const fetchLogs = useCallback(async (signal) => {
        try {
            const isAdminOrManagerOrTL = role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER';

            if (isAdminOrManagerOrTL) {
                const params = cleanParams({
                    from: activeSubTab === 'sheet' ? sheetDate : filters.from,
                    to: activeSubTab === 'sheet' ? sheetDate : filters.to,
                    userId: activeSubTab === 'sheet' ? null : filters.userId,
                    teamId: activeSubTab === 'sheet' ? null : filters.teamId,
                    managerId: activeSubTab === 'sheet' ? null : filters.managerId
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
    }, [filters, role, activeSubTab, sheetDate]);

    const handleQuickMark = async (userId, status, note) => {
        setSheetPending(prev => ({ ...prev, [userId]: true }));
        try {
            const payload = {
                userId,
                date: sheetDate,
                status,
                note,
                loginTime: null,
                logoutTime: null,
                workMinutes: null,
                breakMinutes: null
            };
            await attendanceService.saveManualEntry(payload);
            toast.success(`Marked ${status} successfully`);
            
            // Re-fetch logs for this sheet date to update UI state immediately
            const params = cleanParams({
                from: sheetDate,
                to: sheetDate,
                userId: null,
                teamId: null,
                managerId: null
            });
            const res = await attendanceService.getDailySummaries(params);
            const data = res.data || res || [];
            setLogs(data);
        } catch (err) {
            console.error("Quick mark failed:", err);
            toast.error("Failed to update status");
        } finally {
            setSheetPending(prev => ({ ...prev, [userId]: false }));
        }
    };

    useEffect(() => {
        if (logs.length > 0) {
            const remarksMap = {};
            logs.forEach(log => {
                if (log.user?.id && log.note) {
                    remarksMap[log.user.id] = log.note;
                }
            });
            setSheetRemarks(prev => ({ ...remarksMap, ...prev }));
        }
    }, [logs]);

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

    useEffect(() => {
        if ((showManualModal || activeSubTab === 'sheet') && (!Array.isArray(manualUsers) || manualUsers.length === 0)) {
            adminService.fetchUsers()
                .then(res => {
                    console.log("fetchUsers response:", res);
                    let data = [];
                    if (res) {
                        if (Array.isArray(res)) {
                            data = res;
                        } else if (Array.isArray(res.content)) {
                            data = res.content;
                        } else if (res.data && Array.isArray(res.data.content)) {
                            data = res.data.content;
                        } else if (res.data && Array.isArray(res.data)) {
                            data = res.data;
                        }
                    }
                    data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    setManualUsers(data);
                })
                .catch(err => {
                    console.error("Failed to fetch users", err);
                    toast.error("Failed to load user list");
                });
        }
    }, [showManualModal, activeSubTab, manualUsers]);

    useEffect(() => {
        if (!showManualModal || !manualForm.userId || !manualForm.date) {
            setPreviewData(null);
            return;
        }

        const fetchPreview = async () => {
            setPreviewLoading(true);
            try {
                let loginTime = null;
                let logoutTime = null;
                if (manualForm.status !== 'ABSENT' && manualForm.status !== 'HOLIDAY' && manualForm.status !== 'LEAVE') {
                    if (manualForm.loginTime) {
                        loginTime = `${manualForm.date}T${manualForm.loginTime}:00`;
                    }
                    if (manualForm.logoutTime) {
                        logoutTime = `${manualForm.date}T${manualForm.logoutTime}:00`;
                    }
                }

                const payload = {
                    userId: parseInt(manualForm.userId),
                    date: manualForm.date,
                    loginTime,
                    logoutTime,
                    status: manualForm.status,
                    workMinutes: manualForm.workMinutes ? parseInt(manualForm.workMinutes) : null,
                    breakMinutes: manualForm.breakMinutes ? parseInt(manualForm.breakMinutes) : null
                };

                const res = await attendanceService.previewManualEntry(payload);
                setPreviewData(res.data || res);
            } catch (err) {
                console.error("Preview failed:", err);
            } finally {
                setPreviewLoading(false);
            }
        };

        const timer = setTimeout(fetchPreview, 400);
        return () => clearTimeout(timer);
    }, [manualForm, showManualModal]);

    const handleSaveManualEntry = async (e) => {
        e.preventDefault();
        if (!manualForm.userId) {
            toast.error("Please select an employee");
            return;
        }
        if (!manualForm.date) {
            toast.error("Please select a date");
            return;
        }

        try {
            let loginTime = null;
            let logoutTime = null;
            if (manualForm.status !== 'ABSENT' && manualForm.status !== 'HOLIDAY' && manualForm.status !== 'LEAVE') {
                if (manualForm.loginTime) {
                    loginTime = `${manualForm.date}T${manualForm.loginTime}:00`;
                }
                if (manualForm.logoutTime) {
                    logoutTime = `${manualForm.date}T${manualForm.logoutTime}:00`;
                }
            }

            const payload = {
                userId: parseInt(manualForm.userId),
                date: manualForm.date,
                loginTime,
                logoutTime,
                status: manualForm.status,
                workMinutes: manualForm.workMinutes ? parseInt(manualForm.workMinutes) : null,
                breakMinutes: manualForm.breakMinutes ? parseInt(manualForm.breakMinutes) : null
            };

            await attendanceService.saveManualEntry(payload);
            toast.success("Manual attendance logged successfully!");
            setShowManualModal(false);
            fetchLogs();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save manual attendance");
        }
    };

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
            case 'ON_SHORT_BREAK':
            case 'ON_LONG_BREAK':
            case 'AUTO_BREAK':
            case 'LATE': return 'warning';
            case 'PUNCHED_OUT':
            case 'SECONDARY': return 'secondary';
            case 'OUTSIDE':
            case 'ABSENT': return 'danger';
            case 'HOLIDAY':
            case 'LEAVE': return 'info';
            default: return 'primary';
        }
    };

    const summaryStats = useMemo(() => {
        const p = logs.filter(l => l.status && !l.status.toUpperCase().includes('ABSENT')).length;
        const a = logs.filter(l => l.status && l.status.toUpperCase().includes('ABSENT')).length;
        const l = logs.filter(l => l.lateMinutes > 0 || l.isLate).length;
        
        return { present: p, absent: a, late: l };
    }, [logs]);

    const handleDownloadCSV = () => {
        if (!filteredLogs || filteredLogs.length === 0) {
            toast.info("No logs available to download");
            return;
        }

        const headers = [
            "Date",
            "Employee",
            "Status",
            "Check-In Time",
            "Check-Out Time",
            "Work Time (min)",
            "Total Break (min)",
            "Short Break (min)",
            "Long Break (min)",
            "Idle Time (min)",
            "Late Minutes",
            "Note/Remarks"
        ];

        const rows = filteredLogs.map(log => {
            const formatTime = (timeStr) => {
                if (!timeStr) return '---';
                let d;
                if (Array.isArray(timeStr)) {
                    d = new Date(timeStr[0], timeStr[1] - 1, timeStr[2], timeStr[3], timeStr[4], timeStr[5] || 0);
                } else {
                    d = new Date(typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr);
                }
                return isNaN(d.getTime()) ? '---' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            const checkIn = formatTime(log.checkInTime || log.loginTime);
            const checkOut = formatTime(log.checkOutTime || log.logoutTime);

            return [
                log.date,
                log.userName || 'SYSTEM',
                log.status || '',
                checkIn,
                checkOut,
                log.totalWorkMinutes || 0,
                log.totalBreakMinutes || 0,
                log.shortBreakMinutes || 0,
                log.longBreakMinutes || 0,
                log.totalIdleMinutes || 0,
                log.lateMinutes || 0,
                log.note || ''
            ];
        });

        const csvRows = [headers.join(",")];
        rows.forEach(row => {
            csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
        });
        
        const blob = new Blob([csvRows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_Report_${filters?.from || 'start'}_to_${filters?.to || 'end'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                            className="cursor-pointer transition-all"
                            style={{ opacity: activeSubTab === 'logs' ? 1 : 0.4 }}
                            onClick={() => setActiveSubTab('logs')}
                        >
                            <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest" style={{ fontSize: 'min(14px, 3.5vw)' }}>Attendance Logs</h5>
                            <p className="text-muted small mb-0 opacity-50 fw-bold" style={{ fontSize: '9px' }}>{filters?.from} TO {filters?.to}</p>
                        </div>

                        {(role === 'ADMIN' || role === 'MANAGER') && (
                            <div
                                className="cursor-pointer transition-all"
                                style={{ opacity: activeSubTab === 'sheet' ? 1 : 0.4 }}
                                onClick={() => setActiveSubTab('sheet')}
                            >
                                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest" style={{ fontSize: 'min(14px, 3.5vw)' }}>Daily Sheet</h5>
                                <p className="text-muted small mb-0 opacity-50 fw-bold" style={{ fontSize: '9px' }}>Quick Bulk Mark</p>
                            </div>
                        )}

                        {(role === 'ADMIN' || role === 'MANAGER' || role === 'TEAM_LEADER') && (
                            <div
                                className="cursor-pointer transition-all"
                                style={{ opacity: activeSubTab === 'wfh' ? 1 : 0.4 }}
                                onClick={() => setActiveSubTab('wfh')}
                            >
                                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest" style={{ fontSize: 'min(14px, 3.5vw)' }}>WFH Requests</h5>
                                <p className="text-muted small mb-0 opacity-50 fw-bold" style={{ fontSize: '9px' }}>Review Approvals</p>
                            </div>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        {activeSubTab === 'logs' && (
                            <>
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
                                <button 
                                    className="ui-btn rounded-pill px-4 btn-sm shadow-glow-sm btn-success border-0 text-white" 
                                    style={{ 
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        fontSize: '10px',
                                        height: '36px'
                                    }}
                                    onClick={handleDownloadCSV}
                                >
                                    <FileText size={12} className="me-2" />
                                    DOWNLOAD CSV
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-4">
                    {activeSubTab === 'logs' && (
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
                    )}

                    {activeSubTab === 'wfh' && (
                        <WfhApprovalPanel role={role} />
                    )}

                    {activeSubTab === 'sheet' && (role === 'ADMIN' || role === 'MANAGER') && (
                        <div className="animate-fade-in">
                            <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
                                <label className="text-muted small fw-bold text-uppercase tracking-wider">Sheet Date:</label>
                                <input 
                                    type="date"
                                    className={`form-control border-0 bg-opacity-10 rounded-3 px-3 py-2 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                    style={{ width: '200px' }}
                                    value={sheetDate}
                                    onChange={(e) => {
                                        setSheetDate(e.target.value);
                                    }}
                                />
                                <span className="text-muted small">Select a date to view and mark attendance for all employees.</span>
                            </div>

                            <div className="table-responsive p-0">
                                <table className="table align-middle mb-0 border-0 bg-transparent text-main">
                                    <thead>
                                        <tr className="border-bottom border-white border-opacity-5">
                                            <th className="ps-4 py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Employee</th>
                                            <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Role</th>
                                            <th className="py-3 text-muted small fw-black text-uppercase tracking-widest text-center" style={{ fontSize: '9px', width: '320px' }}>Mark Status</th>
                                            <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Remarks</th>
                                            <th className="pe-4 py-3 text-end text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Last Logged Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(manualUsers) && manualUsers.map(user => {
                                            const userLog = logs.find(log => log.userId === user.id);
                                            const currentStatus = userLog ? userLog.status : 'ABSENT';
                                            const remarks = sheetRemarks[user.id] !== undefined ? sheetRemarks[user.id] : (userLog?.note || '');
                                            const isPending = sheetPending[user.id];

                                            return (
                                                <tr key={user.id} className="border-bottom border-white border-opacity-5">
                                                    <td className="ps-4 py-3">
                                                        <span className="fw-black text-main">{user.name}</span>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className="badge bg-secondary bg-opacity-10 text-muted border-0 small">
                                                            {user.role?.name?.replace('ROLE_', '') || 'STAFF'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <div className="d-flex justify-content-center gap-2">
                                                            <button 
                                                                className={`btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all border d-flex align-items-center gap-1 ${
                                                                    currentStatus === 'PRESENT' 
                                                                        ? 'btn-success text-white border-success' 
                                                                        : 'btn-outline-success border-success border-opacity-25'
                                                                }`}
                                                                style={{ fontSize: '10px' }}
                                                                onClick={() => handleQuickMark(user.id, 'PRESENT', remarks)}
                                                                disabled={isPending}
                                                            >
                                                                {currentStatus === 'PRESENT' && <Check size={10} />}
                                                                Present
                                                            </button>
                                                            <button 
                                                                className={`btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all border d-flex align-items-center gap-1 ${
                                                                    currentStatus === 'ABSENT' 
                                                                        ? 'btn-danger text-white border-danger' 
                                                                        : 'btn-outline-danger border-danger border-opacity-25'
                                                                }`}
                                                                style={{ fontSize: '10px' }}
                                                                onClick={() => handleQuickMark(user.id, 'ABSENT', remarks)}
                                                                disabled={isPending}
                                                            >
                                                                {currentStatus === 'ABSENT' && <X size={10} />}
                                                                Absent
                                                            </button>
                                                            <button 
                                                                className={`btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all border d-flex align-items-center gap-1 ${
                                                                    currentStatus === 'LATE' 
                                                                        ? 'btn-warning text-white border-warning' 
                                                                        : 'btn-outline-warning border-warning border-opacity-25'
                                                                }`}
                                                                style={{ fontSize: '10px' }}
                                                                onClick={() => handleQuickMark(user.id, 'LATE', remarks)}
                                                                disabled={isPending}
                                                            >
                                                                <Clock size={10} />
                                                                Late
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <input 
                                                            type="text"
                                                            className={`form-control form-control-sm border-0 bg-opacity-10 rounded-3 px-3 py-1 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                                            style={{ maxWidth: '250px', fontSize: '11px' }}
                                                            placeholder="Add remark (max 255)"
                                                            value={remarks}
                                                            onChange={(e) => setSheetRemarks(prev => ({ ...prev, [user.id]: e.target.value }))}
                                                            onBlur={() => {
                                                                if (remarks !== (userLog?.note || '')) {
                                                                    handleQuickMark(user.id, currentStatus, remarks);
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pe-4 py-3 text-end">
                                                        {userLog?.loginTime ? (
                                                            <span className="text-muted small">
                                                                {(() => {
                                                                    const timeStr = userLog.loginTime;
                                                                    let d;
                                                                    if (Array.isArray(timeStr)) {
                                                                        d = new Date(timeStr[0], timeStr[1] - 1, timeStr[2], timeStr[3], timeStr[4], timeStr[5] || 0);
                                                                    } else {
                                                                        d = new Date(typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr);
                                                                    }
                                                                    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                                })()}
                                                                {userLog.logoutTime && ` - ` + (() => {
                                                                    const timeStr = userLog.logoutTime;
                                                                    let d;
                                                                    if (Array.isArray(timeStr)) {
                                                                        d = new Date(timeStr[0], timeStr[1] - 1, timeStr[2], timeStr[3], timeStr[4], timeStr[5] || 0);
                                                                    } else {
                                                                        d = new Date(typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr);
                                                                    }
                                                                    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                                })()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted small opacity-50">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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

            {/* Manual Attendance Modal */}
            {showManualModal && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className={`premium-card p-4 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-95' : 'bg-card bg-opacity-95'}`} style={{ borderRadius: '32px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-black text-main text-uppercase mb-0 tracking-widest d-flex align-items-center gap-2" style={{ fontSize: '14px' }}>
                                <Clock size={20} className="text-warning animate-spin" /> Log Manual Attendance
                            </h5>
                            <button className="btn btn-link text-muted p-0 border-0" onClick={() => setShowManualModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveManualEntry} className="d-flex flex-column gap-3">
                            {/* Employee Selection */}
                            <div>
                                <label className="text-muted small fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Employee</label>
                                <select 
                                    className={`form-select border-0 bg-opacity-10 rounded-3 p-3 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                    value={manualForm.userId}
                                    onChange={(e) => setManualForm(prev => ({ ...prev, userId: e.target.value }))}
                                    required
                                >
                                    <option value="" disabled className={isDarkMode ? 'bg-dark' : 'bg-light'}>Select employee...</option>
                                    {Array.isArray(manualUsers) && manualUsers.map(u => (
                                        <option key={u.id} value={u.id} className={isDarkMode ? 'bg-dark' : 'bg-light'}>
                                            {u.name} ({u.role?.name?.replace('ROLE_', '') || 'STAFF'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="row g-3">
                                {/* Date Picker */}
                                <div className="col-md-6">
                                    <label className="text-muted small fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Date</label>
                                    <input 
                                        type="date"
                                        className={`form-control border-0 bg-opacity-10 rounded-3 p-3 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                        value={manualForm.date}
                                        onChange={(e) => setManualForm(prev => ({ ...prev, date: e.target.value }))}
                                        required
                                    />
                                </div>

                                {/* Status Option */}
                                <div className="col-md-6">
                                    <label className="text-muted small fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Status Option</label>
                                    <select 
                                        className={`form-select border-0 bg-opacity-10 rounded-3 p-3 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                        value={manualForm.status}
                                        onChange={(e) => setManualForm(prev => ({ ...prev, status: e.target.value }))}
                                        required
                                    >
                                        <option value="AUTO" className={isDarkMode ? 'bg-dark' : 'bg-light'}>Auto-calculate</option>
                                        <option value="PRESENT" className={isDarkMode ? 'bg-dark' : 'bg-light'}>Present</option>
                                        <option value="ABSENT" className={isDarkMode ? 'bg-dark' : 'bg-light'}>Absent</option>
                                        <option value="LATE" className={isDarkMode ? 'bg-dark' : 'bg-light'}>Late</option>
                                        <option value="HALF_DAY" className={isDarkMode ? 'bg-dark' : 'bg-light'}>Half Day</option>
                                        <option value="SHORT_DAY" className={isDarkMode ? 'bg-dark' : 'bg-light'}>Short Day</option>
                                        <option value="HOLIDAY" className={isDarkMode ? 'bg-dark' : 'bg-light'}>Holiday</option>
                                        <option value="LEAVE" className={isDarkMode ? 'bg-dark' : 'bg-light'}>Leave</option>
                                    </select>
                                </div>
                            </div>

                            {/* Conditionally show times if not absent/holiday/leave */}
                            {manualForm.status !== 'ABSENT' && manualForm.status !== 'HOLIDAY' && manualForm.status !== 'LEAVE' && (
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="text-muted small fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Login Time</label>
                                        <input 
                                            type="time"
                                            className={`form-control border-0 bg-opacity-10 rounded-3 p-3 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                            value={manualForm.loginTime}
                                            onChange={(e) => setManualForm(prev => ({ ...prev, loginTime: e.target.value }))}
                                            required={manualForm.status === 'AUTO'}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="text-muted small fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Logout Time</label>
                                        <input 
                                            type="time"
                                            className={`form-control border-0 bg-opacity-10 rounded-3 p-3 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                            value={manualForm.logoutTime}
                                            onChange={(e) => setManualForm(prev => ({ ...prev, logoutTime: e.target.value }))}
                                            required={manualForm.status === 'AUTO'}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Overrides section */}
                            {manualForm.status !== 'ABSENT' && manualForm.status !== 'HOLIDAY' && manualForm.status !== 'LEAVE' && (
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="text-muted small fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Work Minutes Override</label>
                                        <input 
                                            type="number"
                                            className={`form-control border-0 bg-opacity-10 rounded-3 p-3 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                            placeholder="Auto"
                                            value={manualForm.workMinutes}
                                            onChange={(e) => setManualForm(prev => ({ ...prev, workMinutes: e.target.value }))}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="text-muted small fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Break Minutes Override</label>
                                        <input 
                                            type="number"
                                            className={`form-control border-0 bg-opacity-10 rounded-3 p-3 text-main ${isDarkMode ? 'bg-dark' : 'bg-light'}`}
                                            placeholder="Auto"
                                            value={manualForm.breakMinutes}
                                            onChange={(e) => setManualForm(prev => ({ ...prev, breakMinutes: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Live Preview Panel */}
                            {previewLoading && (
                                <div className="p-3 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-10 text-center">
                                    <span className="small text-primary fw-bold">Calculating Live Preview...</span>
                                </div>
                            )}

                            {!previewLoading && previewData && (
                                <div className={`p-4 rounded-4 border ${isDarkMode ? 'bg-dark bg-opacity-50 border-white border-opacity-10' : 'bg-light border-black border-opacity-10'}`}>
                                    <h6 className="fw-black text-uppercase tracking-wider text-muted mb-3" style={{ fontSize: '9px' }}>Calculated Preview Results</h6>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <p className="text-muted small mb-1">Final Status</p>
                                            <span className={`badge rounded-1 px-2 py-1 text-uppercase fw-black bg-${getStatusColor(previewData.status)} bg-opacity-10 text-${getStatusColor(previewData.status)}`} style={{ fontSize: '9px' }}>
                                                {previewData.status}
                                            </span>
                                        </div>
                                        <div className="col-6">
                                            <p className="text-muted small mb-1">Lateness</p>
                                            <span className={`fw-black small ${previewData.late ? 'text-danger' : 'text-success'}`}>
                                                {previewData.late ? 'Late' : 'On Time'}
                                            </span>
                                        </div>
                                        {previewData.status !== 'ABSENT' && previewData.status !== 'HOLIDAY' && previewData.status !== 'LEAVE' && (
                                            <>
                                                <div className="col-6 mt-2">
                                                    <p className="text-muted small mb-1">Worked Time</p>
                                                    <span className="fw-black small text-main">{previewData.workedMinutes} minutes</span>
                                                </div>
                                                <div className="col-6 mt-2">
                                                    <p className="text-muted small mb-1">Break Time</p>
                                                    <span className="fw-black small text-main">{previewData.breakMinutes} minutes</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="d-flex gap-3 mt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowManualModal(false)}
                                    className={`w-50 py-3 rounded-pill border-0 fw-black text-uppercase tracking-wider transition-all hover-scale ${isDarkMode ? 'bg-dark text-muted' : 'bg-light text-muted'}`}
                                    style={{ fontSize: '11px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="w-50 py-3 rounded-pill bg-primary text-white border-0 shadow-glow fw-black text-uppercase tracking-wider transition-all hover-scale"
                                    style={{ fontSize: '11px' }}
                                >
                                    Save Entry
                                </button>
                            </div>
                        </form>
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
