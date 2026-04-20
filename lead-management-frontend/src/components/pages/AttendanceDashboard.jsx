import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Filter,
  Search,
  Download,
  Clock,
  Coffee,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import attendanceService from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';

const AttendanceDashboard = ({ role, userId: externalUserId, startDate: externalStartDate, endDate: externalEndDate, refreshTrigger }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [date, setDate] = useState(externalStartDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(externalEndDate || new Date().toISOString().split('T')[0]);
  const [userId, setUserId] = useState(externalUserId || '');
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  // Sync with external props
  useEffect(() => {
    if (externalStartDate) setDate(externalStartDate);
    if (externalEndDate) setEndDate(externalEndDate);
  }, [externalStartDate, externalEndDate]);

  useEffect(() => {
    if (externalUserId !== undefined) setUserId(externalUserId || '');
  }, [externalUserId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let response;
      const isPersonalMode = role === 'ASSOCIATE' || (externalUserId && externalUserId === 'self');

      if (isPersonalMode) {
        response = await attendanceService.getMyLogs();
        if (response.success) {
          setLogs(response.data.map(log => ({
            ...log,
            userName: 'Me',
            date: log.checkInTime ? log.checkInTime.split('T')[0] : 'Today',
            status: log.totalWorkMinutes >= 480 ? 'PRESENT' : (log.totalWorkMinutes >= 240 ? 'HALF_DAY' : 'ABSENT')
          })));
          setError(null);
        }
      } else {
        const sanitizeDate = (d) => {
          if (!d) return '';
          const s = String(d);
          return s.includes('T') ? s.split('T')[0] : s;
        };

        const cleanStartDate = sanitizeDate(date);
        const cleanEndDate = sanitizeDate(endDate);

        response = await attendanceService.getAdminSummaries(cleanStartDate, userId, cleanEndDate);
        if (response.success) {
          // Normalize the data for consistent display
          setLogs((response.data || []).map(log => ({
            ...log,
            displayDate: log.date || (log.checkInTime ? log.checkInTime.split('T')[0] : 'TODAY')
          })));
          setError(null);
        }
      }
    } catch (err) {
      setError('Failed to fetch attendance logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHistory = async (user) => {
    if (!user || (!user.id && !user.userId)) return;
    try {
      setLoadingHistory(true);
      setSelectedUser(user);
      setShowModal(true);
      const response = await attendanceService.getAdminSummaries(null, user.id || user.userId);
      if (response.success) {
        setUserHistory(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch user history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [date, endDate, userId, refreshTrigger]);


  const formatMinutes = (mins) => {
    if (mins === null || mins === undefined || isNaN(mins)) return "0h 0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className={`container-fluid animate-fade-in ${externalUserId || externalStartDate ? 'p-0' : 'p-4'}`}>
      {/* Header Area */}
      {(!externalUserId && !externalStartDate) && (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-black text-main mb-1 text-uppercase tracking-widest">Attendance Activity</h4>
            <p className="text-muted small fw-bold opacity-75 mb-0">Monitor team productivity and daily work sessions</p>
          </div>
          <button className="btn btn-primary d-flex align-items-center gap-2 rounded-pill shadow-glow px-4 fw-black text-uppercase small">
            <Download size={18} /> Export Logs
          </button>
        </div>
      )}

      {/* Filter Bar */}
      {(!externalUserId && !externalStartDate) && (
        <div className="premium-card mb-4 border-0 shadow-lg">
          <div className="card-body p-4">
            <div className="row g-4 align-items-end">
              <div className="col-md-4">
                <label className="small fw-black text-muted text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '10px' }}>Filter by Date Range</label>
                <div className="input-group">
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center bg-surface bg-opacity-50 p-1 px-3 rounded-pill border border-white border-opacity-10">
                      <Calendar size={14} className="text-primary me-2" />
                      <input
                        type="date"
                        className="bg-transparent border-0 text-main fw-black small text-uppercase outline-none py-1"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ fontSize: '10px' }}
                      />
                      <span className="mx-2 text-muted fw-bold small opacity-25">TO</span>
                      <input
                        type="date"
                        className="bg-transparent border-0 text-main fw-black small text-uppercase outline-none py-1"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ fontSize: '10px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <label className="small fw-black text-muted text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '10px' }}>Staff ID Search</label>
                <div className="input-group">
                  <span className="input-group-text bg-surface border-0 text-primary rounded-start-4">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-control bg-surface border-0 text-main shadow-none rounded-end-4 py-2.5"
                    placeholder="Enter User ID..."
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4 text-end">
                <div className="d-flex align-items-center justify-content-end gap-3 text-muted small fw-bold opacity-50 mb-1">
                  <div className="d-flex align-items-center gap-1"><div className="bg-success rounded-circle" style={{ width: 8, height: 8 }}></div> PRESENT</div>
                  <div className="d-flex align-items-center gap-1"><div className="bg-warning rounded-circle" style={{ width: 8, height: 8 }}></div> HALF DAY</div>
                  <div className="d-flex align-items-center gap-1"><div className="bg-danger rounded-circle" style={{ width: 8, height: 8 }}></div> ABSENT</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="premium-card border-0 shadow-lg overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-surface bg-opacity-30 border-bottom border-white border-opacity-5">
              <tr>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Date</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-center" style={{ fontSize: '10px' }}>Emp ID</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Name</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-center" style={{ fontSize: '10px' }}>Status</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-center" style={{ fontSize: '10px' }}>Working Hours</th>
                {(role === 'ADMIN' || role === 'MANAGER') && (
                  <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-end" style={{ fontSize: '10px' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    <span className="text-muted fw-bold small opacity-75">POLING ATTENDANCE PROTOCOL...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="d-flex flex-column align-items-center gap-3 opacity-25">
                      <AlertCircle size={48} className="text-muted" />
                      <span className="fw-black text-muted text-uppercase small tracking-widest">No nodes found for the selected temporal coordinates</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={`${log.userId}-${log.displayDate || log.date || index}`} className="border-bottom border-white border-opacity-5 transition-smooth hover-bg-surface">
                    <td className="px-4 py-3 fw-bold small text-muted">
                      {log.displayDate}
                    </td>
                    <td className="px-4 py-3 text-center small text-primary fw-black">
                      #{log.userId || log.user?.id || '???'}
                    </td>
                    <td className="px-4 py-4">
                      <div
                        className="d-flex align-items-center gap-3"
                        style={{ cursor: 'pointer' }}
                        onClick={() => fetchUserHistory(log.user || { id: log.userId, name: log.userName })}
                      >
                        <div className="p-1 rounded-circle bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 shadow-glow">
                          <Users size={12} />
                        </div>
                        <div>
                          <div className="fw-black text-main d-flex align-items-center gap-2" style={{ fontSize: '12px' }}>
                            {log.userName || log.user?.name || `Emp #${log.userId || '?'}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className={`ui-badge ${log.status === 'PRESENT' ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-20' :
                        log.status === 'HALF_DAY' ? 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-20' :
                          'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20'
                        }`} style={{ fontSize: '9px' }}>
                        {log.status === 'PRESENT' ? 'PRESENT' : log.status === 'HALF_DAY' ? 'HALF DAY' : 'ABSENT'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 bg-surface text-main rounded-pill small border border-white border-opacity-5 fw-black" style={{ fontSize: '11px' }}>
                        <Clock size={12} className="text-primary" />
                        {formatMinutes(log.totalWorkMinutes)}
                      </div>
                    </td>
                    {(role === 'ADMIN' || role === 'MANAGER') && (
                      <td className="px-4 py-3 text-end">
                        <button
                          className="btn btn-link text-danger p-0 border-0 opacity-50 hover-opacity-100 transition-all"
                          title="Force Punch Out (Close Session)"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Force close current attendance session for ${log.userName || log.userId}?`)) {
                              try {
                                await attendanceService.forceClockOut(log.userId);
                                toast.success('Session closed successfully');
                                fetchLogs();
                              } catch (err) {
                                toast.error('Failed to close session - user may already be offline');
                              }
                            }
                          }}
                        >
                          <XCircle size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail History Modal */}
      {showModal && selectedUser && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="card border-0 shadow-lg bg-dark text-white rounded-4 w-100 mx-3" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="card-header border-bottom border-white border-opacity-10 p-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-1">Attendance History: {selectedUser.name}</h5>
                <p className="text-white opacity-50 small mb-0">Detailed activity log and monthly performance</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-link text-white opacity-50 p-0 border-0">
                <X size={24} />
              </button>
            </div>

            <div className="card-body p-4 overflow-auto">
              {loadingHistory ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3"></div>
                  <p className="opacity-50">Calculating monthly performance...</p>
                </div>
              ) : (
                <>
                  {/* Monthly Stats Summary */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-3">
                      <div className="p-3 bg-white bg-opacity-5 rounded-4 border border-white border-opacity-5">
                        <div className="small text-white opacity-50 mb-1">Monthly Work</div>
                        <div className="h4 fw-bold text-success mb-0">
                          {formatMinutes(userHistory.reduce((acc, log) => acc + (log.totalWorkMinutes || 0), 0))}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 bg-white bg-opacity-5 rounded-4 border border-white border-opacity-5">
                        <div className="small text-white opacity-50 mb-1">Presents</div>
                        <div className="h4 fw-bold text-primary mb-0">
                          {userHistory.filter(h => h.status === 'PRESENT').length} Days
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 bg-white bg-opacity-5 rounded-4 border border-white border-opacity-5">
                        <div className="small text-white opacity-50 mb-1">Half Days</div>
                        <div className="h4 fw-bold text-warning mb-0">
                          {userHistory.filter(h => h.status === 'HALF_DAY').length} Days
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 bg-white bg-opacity-5 rounded-4 border border-white border-opacity-5">
                        <div className="small text-white opacity-50 mb-1">Geofence Exits</div>
                        <div className="h4 fw-bold text-info mb-0">
                          {userHistory.reduce((acc, log) => acc + (log.outsideCount || 0), 0)} Total
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive rounded-3">
                    <table className="table table-dark table-hover table-sm border-white border-opacity-5 small">
                      <thead className="bg-white bg-opacity-5">
                        <tr>
                          <th className="p-2 opacity-50">DATE</th>
                          <th className="p-2 opacity-50 text-center">WORK</th>
                          <th className="p-2 opacity-50 text-center">BREAK</th>
                          <th className="p-2 opacity-50 text-center">EXITS</th>
                          <th className="p-2 opacity-50 text-end">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userHistory.map((h) => (
                          <tr key={h.id}>
                            <td className="p-2">{h.date}</td>
                            <td className="p-2 text-center text-success fw-bold">{formatMinutes(h.totalWorkMinutes)}</td>
                            <td className="p-2 text-center opacity-75">{formatMinutes(h.totalBreakMinutes)}</td>
                            <td className="p-2 text-center text-info">{h.outsideCount || 0}</td>
                            <td className="p-2 text-end">
                              <span className={`badge rounded-pill ${h.status === 'PRESENT' ? 'bg-success text-success' :
                                h.status === 'HALF_DAY' ? 'bg-warning text-warning' : 'bg-danger text-danger'
                                } bg-opacity-10 border border-current border-opacity-10`}>
                                {h.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
