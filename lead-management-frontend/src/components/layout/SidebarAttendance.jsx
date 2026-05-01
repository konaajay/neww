import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogIn, LogOut, Coffee, Timer, MapPin, CheckCircle2, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import attendanceService from '../../services/attendanceService';

const SidebarAttendance = ({ isCollapsed }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(null);
    const [elapsed, setElapsed] = useState({ h: 0, m: 0, s: 0 });
    const heartbeatRef = useRef(null);
    const timerRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(true);

    const isPunchedIn = !!(status?.checkInTime);
    const isOnBreak = status?.status === 'ON_SHORT_BREAK' || status?.status === 'ON_LONG_BREAK';

    const parseStatus = (res) => {
        // safeRequest returns res.data (axios wrapper stripped), so body = { success, data: DTO }
        const payload = res?.data ?? res;
        return payload;
    };

    const fetchStatus = useCallback(async () => {
        try {
            const res = await attendanceService.getStatus();
            const data = parseStatus(res);
            setStatus(data);
            setLastSync(new Date());
        } catch (err) {
            console.warn('Attendance status fetch failed', err?.response?.status);
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll status every 30 seconds
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // ── Real-time local timer ──────────────────────────────────────────────
    // Counts seconds elapsed since checkInTime, pauses during breaks.
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (!isPunchedIn || !status?.checkInTime) {
            setElapsed({ h: 0, m: 0, s: 0 });
            return;
        }

        const tick = () => {
            if (!status?.checkInTime) return;

            const checkIn = new Date(status.checkInTime);
            const lastSeen = status.lastSeenTime ? new Date(status.lastSeenTime) : checkIn;
            const now = new Date();

            // 1. Start with total work seconds confirmed by backend
            let totalSecs = (status.totalWorkMinutes || 0) * 60 + (status.totalWorkSeconds % 60 || 0);

            // 2. Add the "running" segment from lastSeen to now, but only if not on break
            if (now > lastSeen && !isOnBreak) {
                // Helper to calculate overlap with a time window
                const getOverlap = (targetStart, targetEnd) => {
                    if (!targetStart || !targetEnd) return 0;
                    const [h1, m1] = targetStart.split(':').map(Number);
                    const [h2, m2] = targetEnd.split(':').map(Number);
                    const tStart = new Date(now).setHours(h1, m1, 0, 0);
                    const tEnd = new Date(now).setHours(h2, m2, 0, 0);
                    
                    const overlapStart = Math.max(lastSeen.getTime(), tStart);
                    const overlapEnd = Math.min(now.getTime(), tEnd);
                    
                    return Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000));
                };

                const shiftStart = status.shiftStartTime || "09:30";
                const shiftEnd = status.shiftEndTime || "18:30";
                const billableOverlapSecs = getOverlap(shiftStart, shiftEnd);

                // Deduct automatic breaks in this segment
                const autoBreakSecs = getOverlap(status.shortBreakStartTime, status.shortBreakEndTime) +
                                    getOverlap(status.longBreakStartTime, status.longBreakEndTime);

                totalSecs += Math.max(0, billableOverlapSecs - autoBreakSecs);
            }

            totalSecs = Math.max(0, totalSecs);

            const h = Math.floor(totalSecs / 3600);
            const m = Math.floor((totalSecs % 3600) / 60);
            const s = totalSecs % 60;
            setElapsed({ h, m, s });
        };

        tick(); // run immediately
        timerRef.current = setInterval(tick, 1000);
        return () => clearInterval(timerRef.current);
    }, [isPunchedIn, status?.checkInTime, status?.totalBreakMinutes]);

    // ── Background heartbeat ───────────────────────────────────────────────
    useEffect(() => {
        if (!isPunchedIn) {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            return;
        }

        const sendHeartbeat = () => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        await attendanceService.trackLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            deviceId: 'WEB_OS_HEARTBEAT'
                        });
                        fetchStatus();
                    } catch (err) {
                        console.warn('Heartbeat ignored:', err?.response?.data?.message || err.message);
                    }
                },
                (geoErr) => console.warn('Geo unavailable for heartbeat:', geoErr.message),
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
        };

        sendHeartbeat();
        heartbeatRef.current = setInterval(sendHeartbeat, 120000);
        return () => clearInterval(heartbeatRef.current);
    }, [isPunchedIn, fetchStatus]);

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleClockIn = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    console.log("Latitude:", position.coords.latitude);
                    console.log("Longitude:", position.coords.longitude);
                    try {
                        const res = await attendanceService.clockIn({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            deviceId: 'WEB_OS_SIDEBAR'
                        });
                        const data = parseStatus(res);
                        setStatus(data);
                        toast.success('Punched in');
                    } catch (err) {
                        toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Clock-in failed');
                    }
                },
                (err) => {
                    console.error("Location Error:", err);
                    let msg = "Location access required.";
                    if (err.code === 1) msg = "Location Access Blocked! Please click the LOCK icon 🔒 in your browser address bar and set Location to 'Allow', then refresh the page.";
                    if (err.code === 2) msg = "Position unavailable. Please ensure your laptop's 'Location Services' are turned ON in Windows Settings.";
                    if (err.code === 3) msg = "Location request timed out. Please check your internet and try again.";
                    
                    toast.error(msg, { duration: 6000 });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert("Geolocation is not supported");
            toast.error('Location access required for clock-in');
        }
    };

    const handleClockOut = async () => {
        if (!window.confirm('Punch out and end your shift?')) return;
        try {
            await attendanceService.clockOut();
            setStatus(null);
            setElapsed({ h: 0, m: 0, s: 0 });
            toast.success('Punched out');
        } catch (err) {
            toast.error('Clock-out failed');
        }
    };

    const handleBreak = async (type) => {
        try {
            let res;
            if (isOnBreak) {
                res = await attendanceService.endBreak();
                toast.success('Break ended');
            } else {
                res = await attendanceService.startBreak(type);
                toast.info(`${type === 'SHORT' ? 'Short' : 'Long'} break started`);
            }
            const data = parseStatus(res);
            setStatus(data);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Break action failed');
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────
    const getStatusLabel = () => {
        if (!isPunchedIn) return 'OFF DUTY';
        switch (status?.status) {
            case 'WORKING': return 'WORKING';
            case 'ON_SHORT_BREAK': return 'BREAK';
            case 'ON_LONG_BREAK': return 'BREAK';
            case 'OUTSIDE_UNAUTHORIZED': return 'OUTSIDE';
            default: return status?.status || 'ACTIVE';
        }
    };

    const getStatusColor = () => {
        if (!isPunchedIn) return 'secondary';
        switch (status?.status) {
            case 'WORKING': return 'dark';
            case 'ON_SHORT_BREAK':
            case 'ON_LONG_BREAK': return 'warning';
            case 'OUTSIDE_UNAUTHORIZED': return 'danger';
            default: return 'secondary';
        }
    };

    const pad = (n) => String(n).padStart(2, '0');

    const formatSyncTime = () => {
        if (!lastSync) return 'Never';
        const diff = Math.floor((Date.now() - lastSync.getTime()) / 1000);
        if (diff < 10) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        return `${Math.floor(diff / 60)}m ago`;
    };

    if (loading && !status) return null;

    // ── Collapsed view ─────────────────────────────────────────────────────
    if (isCollapsed) {
        return (
            <div className="px-2 py-3 border-top border-white border-opacity-5 d-flex flex-column align-items-center gap-2">
                <button
                    onClick={isPunchedIn ? undefined : handleClockIn}
                    className={`p-2 rounded-circle border-0 transition-all ${isPunchedIn ? 'bg-success text-white' : 'bg-primary text-white'}`}
                    title={isPunchedIn ? getStatusLabel() : 'Punch In'}
                >
                    <LogIn size={18} />
                </button>
            </div>
        );
    }

    const color = getStatusColor();

    return (
        <div className="mx-3 mb-4 p-3 rounded-4 border animate-fade-in shadow-sm">
            {/* Header */}
            <div 
                className="d-flex align-items-center justify-content-between mb-3 cursor-pointer" 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: 'pointer' }}
            >
                <div className="d-flex align-items-center gap-2">
                    <div className={`p-1 rounded-pill bg-${color} bg-opacity-10 text-${color}`}>
                        <Timer size={13} />
                    </div>
                    <span className="fw-black tracking-widest text-main" style={{ fontSize: '10px' }}>PUNCH PANEL</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div
                        className={`px-2 rounded-pill bg-${color} bg-opacity-10 text-${color} border border-${color} border-opacity-10`}
                        style={{ fontSize: '8px', padding: '2px 6px' }}
                    >
                        <span className="fw-black">{getStatusLabel()}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                </div>
            </div>

            {isExpanded && (
                <>


            {!isPunchedIn ? (
                <button
                    id="punchIn"
                    onClick={handleClockIn}
                    className="ui-btn ui-btn-primary w-100 py-2 rounded-3 shadow-glow fw-black text-uppercase tracking-widest d-flex align-items-center justify-content-center gap-2"
                    style={{ fontSize: '10px' }}
                >
                    <LogIn size={14} /> Punch In
                </button>
            ) : (
                <div className="d-flex flex-column gap-2">
                    {/* Live timer + location box */}
                    <div className="p-3 border rounded-4 position-relative overflow-hidden mb-2 shadow-sm" style={{ backgroundColor: 'var(--bs-light)' }}>
                    <div className="position-absolute top-0 end-0 p-3 opacity-10" style={{ transform: 'translate(10%,-10%)' }}>
                        <MapPin size={24} />
                    </div>
                        <div className="d-flex flex-column position-relative" style={{ zIndex: 1 }}>
                            {status?.lastLat && (
                                <span className="fw-black text-main mb-2 d-block" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                                    {Number(status.lastLat).toFixed(4)}, {Number(status.lastLng).toFixed(4)}
                                </span>
                            )}

                            {/* Real-time running clock */}
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <Clock size={13} className="text-body" />
                                <span className="fw-black text-body" style={{ fontSize: '20px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
                                    {pad(elapsed.h)}:{pad(elapsed.m)}:{pad(elapsed.s)}
                                </span>
                            </div>

                            {/* Backend-confirmed work hours */}
                            <div className="d-flex align-items-center gap-3">
                                <span className="fw-bold text-muted" style={{ fontSize: '10px' }}>
                                    Work: {status?.totalWorkHours || '0h 0m'}
                                </span>
                                <span className="fw-bold text-muted d-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                                    <Coffee size={10} />
                                    Break: {status?.totalIdleHours || '0h 0m'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sync indicator */}
                    <div className="d-flex align-items-center gap-2 px-1 mb-2">
                        <CheckCircle2 size={9} className="text-muted" />
                        <span className="text-muted fw-bold" style={{ fontSize: '9px' }}>Synced: {formatSyncTime()}</span>
                    </div>

                    {/* Break buttons */}
                    <div className="row g-2">
                        <div className="col-6">
                            <button
                                onClick={() => handleBreak('SHORT')}
                                disabled={status?.status === 'ON_LONG_BREAK'}
                                className={`w-100 py-2 rounded-3 fw-black d-flex align-items-center justify-content-center gap-1 transition-all border ${
                                    status?.status === 'ON_SHORT_BREAK'
                                        ? 'bg-warning text-dark border-warning shadow-glow'
                                        : 'bg-transparent text-warning border-warning border-opacity-50'
                                }`}
                                style={{ fontSize: '10px' }}
                            >
                                <Coffee size={11} />
                                {status?.status === 'ON_SHORT_BREAK' ? 'Resume' : '↺ Short'}
                            </button>
                        </div>
                        <div className="col-6">
                            <button
                                onClick={() => handleBreak('LONG')}
                                disabled={status?.status === 'ON_SHORT_BREAK'}
                                className={`w-100 py-2 rounded-3 fw-black d-flex align-items-center justify-content-center gap-1 transition-all border ${
                                    status?.status === 'ON_LONG_BREAK'
                                        ? 'bg-warning text-dark border-warning shadow-glow'
                                        : 'bg-transparent text-warning border-warning border-opacity-50'
                                }`}
                                style={{ fontSize: '10px' }}
                            >
                                <LogOut size={11} style={{ transform: 'rotate(90deg)' }} />
                                {status?.status === 'ON_LONG_BREAK' ? 'Resume' : '↺ Long'}
                            </button>
                        </div>
                        <div className="col-12">
                            <button
                                onClick={handleClockOut}
                                className="w-100 py-2 rounded-3 bg-transparent text-danger border border-danger border-opacity-50 fw-black d-flex align-items-center justify-content-center gap-2 transition-all"
                                style={{ fontSize: '11px' }}
                            >
                                <LogOut size={13} /> PUNCH OUT
                            </button>
                        </div>
                    </div>
                </div>
            )}
                </>
            )}
        </div>
    );
};

export default SidebarAttendance;
