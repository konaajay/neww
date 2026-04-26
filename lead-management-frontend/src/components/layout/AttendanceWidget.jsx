import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, LogIn, LogOut, Coffee, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import attendanceService from '../../services/attendanceService';
import { useTheme } from '../../context/ThemeContext';

const AttendanceWidget = ({ isCollapsed }) => {
  const { isDarkMode } = useTheme();
  const [status, setStatus] = useState(null); // AttendanceDTO
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);
  const [displayWorkHours, setDisplayWorkHours] = useState('0h 0m');
  const [displayBreakHours, setDisplayBreakHours] = useState('0h 0m');
  const heartbeatRef = useRef(null);
  const timerRef = useRef(null);
  const hasFetched = useRef(false);

  const fetchStatus = async () => {
    try {
      const data = await attendanceService.getStatus();
      if (data.success) {
        const payload = data.data.status === 'NOT_STARTED' || data.data.status === 'OUT' ? null : data.data;
        setStatus(payload);
        if (payload) {
          setDisplayWorkHours(payload.totalWorkHours || '0h 0m');
          setDisplayBreakHours(payload.totalBreakHours || '0h 0m');
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      fetchStatus();
      hasFetched.current = true;
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // Heartbeat logic for continuous tracking
  useEffect(() => {
    const activeStates = ['WORKING', 'ON_SHORT_BREAK', 'ON_LONG_BREAK', 'AUTO_BREAK'];
    if (status && activeStates.includes(status.status)) {
      const interval = (status.trackingIntervalSec || 300) * 1000;
      
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        sendLocationUpdate();
      }, interval);
      
      // LIVE TIMER LOGIC
      timerRef.current = setInterval(() => {
          if (!status.lastSeenTime) return;
          const now = new Date();
          const lastSync = new Date(status.lastSeenTime);
          const elapsedSec = Math.floor((now - lastSync) / 1000);
          
          if (status.status === 'WORKING') {
              const totalSec = (status.totalWorkMinutes * 60) + elapsedSec;
              const h = Math.floor(totalSec / 3600);
              const m = Math.floor((totalSec % 3600) / 60);
              const s = totalSec % 60;
              setDisplayWorkHours(`${h}h ${m}m ${s}s`);
              setDisplayBreakHours(status.totalBreakHours || '0h 0m');
          } else {
              const totalSec = (status.totalBreakMinutes * 60) + elapsedSec;
              const h = Math.floor(totalSec / 3600);
              const m = Math.floor((totalSec % 3600) / 60);
              const s = totalSec % 60;
              setDisplayBreakHours(`${h}h ${m}m ${s}s`);
              setDisplayWorkHours(status.totalWorkHours || '0h 0m');
          }
      }, 1000);
      
      return () => {
          clearInterval(heartbeatRef.current);
          clearInterval(timerRef.current);
      };
    } else {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayWorkHours('0h 0m');
      setDisplayBreakHours('0h 0m');
    }
  }, [status]);

  const sendLocationUpdate = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          // Heuristic: Some mock providers yield exactly 0 as altitude or accuracy
          const isMockLocation = position.mocked || false; 
          const data = await attendanceService.trackLocation(latitude, longitude, accuracy, 'WEB_BROWSER', isMockLocation);
          if (data.success) {
            console.log('[Attendance Debug] Tracking heartbeat:', {
                status: data.data.status,
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                time: new Date().toLocaleTimeString()
            });
            setStatus(data.data);
            setLastCheck(new Date());
            setError(null);
          }
        } catch (err) {
          setError(err.response?.data?.message || 'Tracking failed');
          if (err.response?.status === 401) {
             // Let api.js handle the redirect
             console.warn('[Attendance] Unauthorized - stopping heartbeat');
             if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          }
        }
      },
      (err) => {
        setError('GPS Permisson Denied');
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleClockIn = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          const isMockLocation = position.mocked || false;
          const data = await attendanceService.clockIn(latitude, longitude, accuracy, 'WEB_BROWSER', isMockLocation);
          if (data.success) {
            console.log('[Attendance Debug] Punch-In Success:', {
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                status: data.data.status
            });
            setStatus(data.data);
            setError(null);
          }
        } catch (err) {
          setError(err.response?.data?.message || 'Clock-in failed');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError('Location Access Required');
        setLoading(false);
      }
    );
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.clockOut();
      if (data.success) {
        setStatus(null);
        setError(null);
      }
    } catch (err) {
      setError('Clock-out failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async (type) => {
    try {
      setLoading(true);
      const data = await attendanceService.startBreak(type);
      if (data.success) {
        console.log(`[Attendance Debug] Break Started (${type})`, data.data);
        setStatus(data.data);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.endBreak();
      if (data.success) {
        console.log('[Attendance Debug] Break Ended', data.data);
        setStatus(data.data);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="d-flex flex-column align-items-center gap-2 py-3" style={{ width: 'var(--sidebar-collapsed-width)' }}>
        <div className={`rounded-circle p-2 shadow-sm border border-opacity-10 transition-all ${
          status ? (status.status === 'WORKING' ? 'bg-success bg-opacity-10 text-success border-success' : 'bg-warning bg-opacity-10 text-warning border-warning') : 'bg-muted bg-opacity-10 text-muted border-secondary'
        }`} 
        onClick={!status ? handleClockIn : (status.status === 'WORKING' ? handleClockOut : handleEndBreak)}
        style={{ cursor: 'pointer', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
          {status ? (status.status === 'WORKING' ? <LogOut size={18} /> : <CheckCircle size={18} />) : <LogIn size={18} />}
        </div>
        <div className="status-indicator">
            <div className={`pulse-dot ${status?.status === 'WORKING' ? 'bg-success' : (status ? 'bg-warning' : 'bg-muted opacity-50')}`} style={{ width: '8px', height: '8px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`attendance-widget px-3 py-2 mt-auto mb-3 mx-2 rounded-4 card border-0 premium-card glass-panel transition-all ${!isExpanded ? 'minimized' : ''}`}>
      <div className="card-body p-2">
        <div 
          className="d-flex justify-content-between align-items-center mb-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="d-flex align-items-center gap-2">
                <Clock size={14} className="text-primary" />
                <span className="small fw-bold opacity-75">ATTENDANCE</span>
            </div>
            <div className="d-flex align-items-center gap-2">
                {status && (
                    <div className={`badge rounded-pill small border border-opacity-25 ${
                        status.status === 'WORKING' ? 'bg-success bg-opacity-10 text-success border-success' :
                        status.status === 'ABSENT' ? 'bg-danger bg-opacity-10 text-danger border-danger' :
                        'bg-warning bg-opacity-10 text-warning border-warning'
                    }`} style={{fontSize: '0.6rem'}}>
                        {status.status.replace(/_/g, ' ')}
                    </div>
                )}
                {isExpanded ? <ChevronUp size={14} className="opacity-50" /> : <ChevronDown size={14} className="opacity-50" />}
            </div>
        </div>

        {isExpanded && (
          <div className="mt-2 animate-fade-in">
            {error && (
                <div className="alert alert-danger p-1 mb-2 d-flex align-items-center gap-1" style={{fontSize: '0.7rem'}}>
                    <AlertCircle size={10} />
                    <span>{error}</span>
                </div>
            )}

            {!status ? (
              <button 
                className="btn btn-primary w-100 btn-sm d-flex align-items-center justify-content-center gap-2 rounded-3 py-2 shadow-sm"
                onClick={handleClockIn}
                disabled={loading}
              >
                {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                ) : (
                    <><LogIn size={14} /> Punch In</>
                )}
              </button>
            ) : (
              <>
                <div className="location-info mb-2 p-2 bg-primary bg-opacity-5 rounded-3 border border-primary border-opacity-10">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-2">
                            <MapPin size={12} className="text-primary" />
                            <span className="small opacity-75" style={{fontSize: '0.7rem'}}>
                                {status.lastLat?.toFixed(3)}, {status.lastLng?.toFixed(3)}
                            </span>
                        </div>
                    </div>
                    <div className="d-flex flex-column gap-1">
                        <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={12} className={status.status === 'WORKING' ? 'text-success' : 'opacity-25'} />
                            <span className="small fw-bold opacity-90" style={{fontSize: '0.75rem'}}>
                                Work: {displayWorkHours}
                            </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Coffee size={12} className={status.status.includes('BREAK') ? 'text-warning' : 'opacity-25'} />
                            <span className="small fw-bold opacity-90" style={{fontSize: '0.75rem'}}>
                                Rest: {displayBreakHours}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2 mb-3">
                    <div className={`pulse-dot ${status.status === 'WORKING' ? 'bg-success' : 'bg-warning'}`} style={{width: 8, height: 8}}></div>
                    <span className="small opacity-50" style={{fontSize: '0.65rem'}}>
                        Last Sync: {lastCheck ? lastCheck.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </span>
                </div>
                
                <div className="d-grid gap-2">
                    {status.status === 'WORKING' ? (
                      <div className="d-flex gap-2 mb-1">
                        <button 
                          className="btn btn-outline-warning btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1 rounded-3 border-opacity-25"
                          onClick={() => handleStartBreak('SHORT')}
                          disabled={loading}
                        >
                          <Coffee size={12} /> Short
                        </button>
                        <button 
                          className="btn btn-outline-warning btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1 rounded-3 border-opacity-25"
                          onClick={() => handleStartBreak('LONG')}
                          disabled={loading}
                        >
                          <LogOut size={12} /> Long
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-success btn-sm w-100 d-flex align-items-center justify-content-center gap-2 rounded-3 mb-2 shadow-sm"
                        onClick={handleEndBreak}
                        disabled={loading}
                      >
                        <CheckCircle size={14} /> End Break
                      </button>
                    )}
                    <button 
                        className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 rounded-3 opacity-75 border-opacity-25"
                        onClick={handleClockOut}
                        disabled={loading}
                    >
                        <LogOut size={14} /> Punch Out
                    </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceWidget;
