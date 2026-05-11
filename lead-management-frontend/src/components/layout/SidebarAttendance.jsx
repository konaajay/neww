import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogIn, LogOut, Coffee, Timer, MapPin, CheckCircle2, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import attendanceService from '../../services/attendanceService';
import wfhService from '../../services/wfhService';
import { useTheme } from '../../context/ThemeContext';

const SidebarAttendance = ({ isCollapsed }) => {
    const { isDarkMode } = useTheme();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(null);
    const [elapsed, setElapsed] = useState({ h: 0, m: 0, s: 0 });
    const heartbeatRef = useRef(null);
    const timerRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [distanceToOffice, setDistanceToOffice] = useState(null);

    const isPunchedIn = !!(status?.checkInTime);
    const isOnBreak = status?.status === 'ON_BREAK' || status?.status === 'AUTO_BREAK';

    const parseStatus = (res) => {
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

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

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

            let totalSecs = (status.totalWorkMinutes || 0) * 60 + (status.totalWorkSeconds % 60 || 0);

            if (now > lastSeen && !isOnBreak) {
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

                const shiftStart = status.shiftStartTime || "00:00";
                const shiftEnd = status.shiftEndTime || "23:59";
                const billableOverlapSecs = getOverlap(shiftStart, shiftEnd);
                const rawSegmentSecs = Math.max(0, Math.floor((now.getTime() - lastSeen.getTime()) / 1000));

                const autoBreakSecs = getOverlap(status.shortBreakStartTime, status.shortBreakEndTime) +
                    getOverlap(status.longBreakStartTime, status.longBreakEndTime);

                const billableSegment = (status.shiftStartTime ? billableOverlapSecs : rawSegmentSecs);
                totalSecs += Math.max(0, billableSegment - autoBreakSecs);
            }

            totalSecs = Math.max(0, totalSecs);

            const h = Math.floor(totalSecs / 3600);
            const m = Math.floor((totalSecs % 3600) / 60);
            const s = totalSecs % 60;
            setElapsed({ h, m, s });
        };

        tick();
        timerRef.current = setInterval(tick, 1000);
        return () => clearInterval(timerRef.current);
    }, [isPunchedIn, status?.checkInTime, status?.totalBreakMinutes]);

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

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    useEffect(() => {
        if (!status?.officeLat) {
            setDistanceToOffice(null);
            return;
        }

        const checkDistance = () => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition((pos) => {
                const dist = calculateDistance(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    status.officeLat,
                    status.officeLng
                );
                setDistanceToOffice(dist);
            }, null, { enableHighAccuracy: false, timeout: 5000 });
        };

        checkDistance();
        const interval = setInterval(checkDistance, 10000);
        return () => clearInterval(interval);
    }, [isPunchedIn, status?.officeLat, status?.officeLng]);

    const handleClockIn = () => {
        const radius = status?.officeRadius || 150; 
        const isWfh = status?.isWfhApproved || status?.wfhStatus === 'APPROVED';

        if (distanceToOffice !== null && distanceToOffice > radius && !isWfh) {
            const distStr = distanceToOffice > 1000 ? `${(distanceToOffice / 1000).toFixed(2)} km` : `${Math.round(distanceToOffice)}m`;
            toast.error(`PUNCH DENIED: You are ${distStr} away from the office. Please be within ${radius}m of the office or request WFH approval.`, {
                position: "bottom-center",
                autoClose: 5000
            });
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const res = await attendanceService.clockIn({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            deviceId: 'WEB_OS_SIDEBAR'
                        });
                        const data = parseStatus(res);
                        setStatus(data);
                        toast.success('Punched in successfully');
                    } catch (err) {
                        toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Clock-in failed');
                    }
                },
                (err) => {
                    let msg = "Location access required.";
                    if (err.code === 1) msg = "Location Access Blocked! Please click the LOCK icon 🔒 in your browser address bar and set Location to 'Allow', then refresh the page.";
                    if (err.code === 2) msg = "Position unavailable. Please ensure your laptop's 'Location Services' are turned ON in Windows Settings.";
                    if (err.code === 3) msg = "Location request timed out. Please check your internet and try again.";
                    toast.error(msg, { duration: 6000 });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
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

    const getStatusLabel = () => {
        if (!isPunchedIn) return 'OFF DUTY';
        const suffix = (status?.isWfhApproved || status?.wfhStatus === 'APPROVED') ? ' (WFH)' : '';
        switch (status?.status) {
            case 'WORKING': return 'WORKING' + suffix;
            case 'ON_BREAK':
            case 'AUTO_BREAK': return 'BREAK';
            case 'OUTSIDE': return 'OUTSIDE';
            default: return (status?.status || 'ACTIVE') + suffix;
        }
    };

    const getStatusColor = () => {
        if (!isPunchedIn) return 'secondary';
        switch (status?.status) {
            case 'WORKING': return 'dark';
            case 'ON_BREAK':
            case 'AUTO_BREAK': return 'warning';
            case 'OUTSIDE': return 'danger';
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

    if (isCollapsed && window.innerWidth >= 992) {
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
        <div className={`mx-3 mb-4 p-3 rounded-4 border animate-fade-in shadow-sm ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-light bg-opacity-50'}`} style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
            <div
                className="d-flex align-items-center justify-content-between mb-3 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
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
                        <div className="d-flex flex-column gap-2">
                            <button
                                id="punchIn"
                                onClick={handleClockIn}
                                disabled={distanceToOffice !== null && distanceToOffice > (status?.officeRadius || 150)}
                                className={`ui-btn w-100 py-2 rounded-3 fw-black text-uppercase tracking-widest d-flex align-items-center justify-content-center gap-2 ${distanceToOffice !== null && distanceToOffice > (status?.officeRadius || 150) ? 'btn-secondary opacity-50' : 'ui-btn-primary shadow-glow'}`}
                                style={{ fontSize: '10px' }}
                            >
                                <LogIn size={14} /> 
                                {status?.isWfhApproved || status?.wfhStatus === 'APPROVED' 
                                    ? 'Punch In (WFH)' 
                                    : (distanceToOffice !== null && distanceToOffice > (status?.officeRadius || 150) ? 'Outside Radius' : 'Punch In')}
                            </button>
                            {!isPunchedIn && (
                                <button 
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-wfh-modal'))}
                                    className="btn btn-link text-primary p-0 mt-1 fw-bold" 
                                    style={{ fontSize: '9px', textDecoration: 'none' }}
                                >
                                    Need to work from home? Request Approval
                                </button>
                            )}
                             {/* Distance tracking active in background */}
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-2">
                            <div className="d-flex align-items-center gap-2 px-1 mb-3 mt-1 justify-content-center">
                                <CheckCircle2 size={10} className="text-success" />
                                <span className="text-muted fw-bold" style={{ fontSize: '9px' }}>Synced: {formatSyncTime()}</span>
                            </div>

                            <div className="row g-2">
                                <div className="col-6">
                                    <button
                                        onClick={() => handleBreak('SHORT')}
                                        disabled={status?.status === 'ON_LONG_BREAK'}
                                        className={`w-100 py-2 rounded-3 fw-black d-flex align-items-center justify-content-center gap-1 transition-all border ${status?.status === 'ON_SHORT_BREAK'
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
                                        className={`w-100 py-2 rounded-3 fw-black d-flex align-items-center justify-content-center gap-1 transition-all border ${status?.status === 'ON_LONG_BREAK'
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
