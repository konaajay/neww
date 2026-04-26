import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import managerService from '../../../services/managerService';
import tlService from '../../../services/tlService';
import associateService from '../../../services/associateService';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { Phone, PhoneOutgoing, Clock, User, Calendar, Search, Play, FileText, Upload } from 'lucide-react';
import BulkUploadCallModal from './BulkUploadCallModal';
import { toast } from 'react-toastify';

import FiltersBar from './FiltersBar';
import CallAnalyticsGrid from './CallAnalyticsGrid';

const CallLogDashboard = ({ userId: externalUserId, hideHeader = false, filters: propsFilters, onChange: onPropsFiltersChange, refreshTrigger }) => {
    const { user } = useAuth();
    const { isDarkMode, theme } = useTheme();
    const role = user?.role;
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const [audioObj, setAudioObj] = useState(null);
    
    const [internalFilters, setInternalFilters] = useState({
        from: new Date().toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        userId: externalUserId || ''
    });

    // Use external filters if provided, otherwise fall back to internal
    const filters = propsFilters || internalFilters;
    const setFilters = onPropsFiltersChange || setInternalFilters;

    useEffect(() => {
        if (externalUserId !== undefined && !propsFilters) {
            setFilters(prev => ({ ...prev, userId: externalUserId || '' }));
        }
    }, [externalUserId, propsFilters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const activeFilters = { 
                ...filters,
                from: filters.from.split('T')[0],
                to: filters.to.split('T')[0]
            };
            const statsFilters = { from: activeFilters.from, to: activeFilters.to, userId: activeFilters.userId };

            let logsCall, usersCall, statsCall;

            if (role === 'ADMIN') {
                logsCall = adminService.fetchCallLogsAdmin(activeFilters);
                usersCall = adminService.fetchUsers();
                statsCall = adminService.fetchGlobalCallStats(statsFilters);
            } else if (role === 'MANAGER') {
                logsCall = adminService.fetchCallLogsAdmin(activeFilters); 
                usersCall = managerService.fetchTeamLeaders(); 
                statsCall = adminService.fetchGlobalCallStats(statsFilters);
            } else if (role === 'TEAM_LEADER') {
                logsCall = tlService.fetchCallLogs ? tlService.fetchCallLogs(activeFilters) : adminService.fetchCallLogsAdmin(activeFilters);
                usersCall = tlService.fetchSubordinates();
                statsCall = tlService.fetchGlobalCallStats ? tlService.fetchGlobalCallStats(statsFilters) : adminService.fetchGlobalCallStats(statsFilters);
            } else if (role === 'ASSOCIATE') {
                logsCall = associateService.fetchMyLogs(activeFilters);
                usersCall = Promise.resolve({ data: [] }); 
                statsCall = associateService.fetchCallStats(statsFilters);
            } else {
                logsCall = adminService.fetchCallLogsAdmin(activeFilters);
                usersCall = adminService.fetchUsers();
                statsCall = adminService.fetchGlobalCallStats(statsFilters);
            }

            const [logsRes, usersRes, statsRes] = await Promise.all([logsCall, usersCall, statsCall]);

            const logsPayload = logsRes.data;
            setLogs(Array.isArray(logsPayload) ? logsPayload : (logsPayload?.data || []));

            const usersPayload = usersRes.data;
            setUsers(usersPayload?.content || (Array.isArray(usersPayload) ? usersPayload : []));

            const statsPayload = statsRes.data;
            setStats(statsPayload?.data || statsPayload || null);
        } catch (err) {
            toast.error('Failed to sync call logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.from, filters.to, filters.userId, refreshTrigger]);

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const toggleAudio = (id) => {
        if (playingId === id) {
            audioObj.pause();
            setPlayingId(null);
            setAudioObj(null);
        } else {
            if (audioObj) audioObj.pause();
            const token = localStorage.getItem('token');
            const url = `${import.meta.env.VITE_API_BASE_URL || ''}/api/call-records/${id}/audio?token=${token}`;
            const audio = new Audio(url);
            audio.play().catch(err => toast.error("Could not play audio"));
            audio.onended = () => setPlayingId(null);
            setAudioObj(audio);
            setPlayingId(id);
        }
    };

    return (
        <div className="container-fluid p-0 animate-fade-in mt-2">
            {!hideHeader && (
                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h4 className="fw-black text-main mb-0 tracking-tighter">Interaction Intelligence</h4>
                            <p className="text-muted small fw-bold opacity-60 mb-0" style={{ fontSize: '10px' }}>CONVERSATIONAL ANALYTICS & ARCHIVE</p>
                        </div>
                        <button 
                            className="ui-btn ui-btn-primary px-4 rounded-pill shadow-glow py-2 fw-black d-flex align-items-center gap-2"
                            onClick={() => setIsUploadModalOpen(true)}
                            style={{ fontSize: '11px' }}
                        >
                            <Upload size={14} /> IMPORT CALL DATA
                        </button>
                    </div>

                    <FiltersBar 
                        filters={filters}
                        onChange={setFilters}
                        onSync={fetchData}
                        title="INTERACTION HUB"
                        role={role}
                        currentUserId={user?.id}
                    />
                </div>
            )}

            <div className="mb-4">
                <CallAnalyticsGrid stats={stats} loading={loading} isDarkMode={isDarkMode} />
            </div>

            {/* Table Area */}
            <div className="premium-card overflow-hidden shadow-lg border-0 bg-surface bg-opacity-20">
                <div className="card-header bg-transparent border-bottom border-white border-opacity-5 p-4 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-primary bg-opacity-10 rounded-circle text-primary">
                           <FileText size={18} />
                        </div>
                        <div>
                            <h6 className="fw-black text-main mb-0 small text-uppercase tracking-widest">Interaction Archive</h6>
                            <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '8px' }}>MASTER CALL LEDGER</p>
                        </div>
                    </div>
                </div>

                <div className="table-responsive p-0">
                    <table className="table table-hover align-middle mb-0 border-0 bg-transparent text-main">
                        <thead>
                            <tr className="border-bottom border-white border-opacity-5">
                                <th className="ps-4 py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>SNo</th>
                                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Name</th>
                                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Phone</th>
                                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Email</th>
                                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Status</th>
                                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Emp Name</th>
                                <th className="py-3 text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Duration</th>
                                <th className="pe-4 py-3 text-end text-muted small fw-black text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Call Log</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, index) => {
                                const isConnected = log.status === 'CONNECTED' || log.status === 'PAID';
                                const isFailed = log.status === 'NOT_INTERESTED' || log.status === 'PAYMENT_FAILED';

                                return (
                                    <tr key={log.id} className="border-bottom border-white border-opacity-5 transition-all">
                                        <td className="ps-4 py-3 text-muted small fw-bold">
                                            {index + 1}
                                        </td>
                                        <td className="py-3 text-main fw-black small">
                                            {log.lead?.name || "MANUAL ENTRY"}
                                        </td>
                                        <td className="py-3 text-primary font-monospace small fw-bold">
                                            {log.phoneNumber}
                                        </td>
                                        <td className="py-3 text-muted small opacity-75">
                                            {log.lead?.email || "—"}
                                        </td>
                                        <td className="py-3">
                                            <span className={`badge rounded-1 px-2 py-1 text-uppercase fw-black ${isConnected ? 'bg-success bg-opacity-10 text-success' : isFailed ? 'bg-danger bg-opacity-10 text-danger' : 'bg-warning bg-opacity-10 text-warning'}`} style={{ fontSize: '8px', width: 'fit-content' }}>
                                                {log.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="p-1 rounded-circle bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10">
                                                    <User size={10} />
                                                </div>
                                                <span className="fw-black text-main small" style={{ fontSize: '11px' }}>{log.user?.name || "SYSTEM"}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-muted fw-black" style={{ fontSize: '11px' }}>
                                            <Clock size={12} className="me-1 opacity-50" /> {formatDuration(log.duration)}
                                        </td>
                                        <td className="pe-4 py-3 text-end">
                                            {log.recordingPath ? (
                                                <button 
                                                    className={`ui-btn btn-sm rounded-pill px-3 fw-black shadow-glow d-flex align-items-center gap-1 ms-auto ${
                                                        playingId === log.id ? 'ui-btn-primary' : 'ui-btn-secondary'
                                                    }`}
                                                    onClick={() => toggleAudio(log.id)}
                                                    style={{ fontSize: '10px' }}
                                                >
                                                    {playingId === log.id ? "PAUSE" : "PLAY"}
                                                </button>
                                            ) : (
                                                <span className="text-muted fw-black opacity-25" style={{ fontSize: '9px' }}>NO RECORD</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {logs.length === 0 && !loading && (
                        <div className="text-center py-5 d-flex flex-column align-items-center opacity-20">
                            <div className="mb-2 p-4 bg-surface rounded-circle">
                               <Search size={32} className="text-muted" />
                            </div>
                            <p className="fw-black text-muted text-uppercase mb-0 tracking-widest small">DATA TRANSMISSION NULL</p>
                        </div>
                    )}
                </div>
            </div>

            {isUploadModalOpen && (
                <BulkUploadCallModal onClose={() => setIsUploadModalOpen(false)} onUploadSuccess={() => { setIsUploadModalOpen(false); fetchData(); }} />
            )}
        </div>
    );
};

export default CallLogDashboard;
