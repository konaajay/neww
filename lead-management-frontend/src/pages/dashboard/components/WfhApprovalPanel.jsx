import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Search, Filter, ShieldCheck, User } from 'lucide-react';
import { toast } from 'react-toastify';
import wfhService from '../../../services/wfhService';

const WfhApprovalPanel = ({ role }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [actionModal, setActionModal] = useState(null); // { id, action, notes }

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await wfhService.getRequests(statusFilter);
            setRequests(res.data || []);
        } catch (err) {
            console.error('Failed to fetch WFH requests');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAction = async () => {
        if (!actionModal) return;
        const { id, action, notes } = actionModal;
        setActionLoading(id);
        try {
            await wfhService.handleRequest(id, action, notes);
            toast.success(`WFH Request ${action} successful`);
            setActionModal(null);
            fetchRequests();
        } catch (err) {
            toast.error('Failed to process request');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAction = (id, action) => {
        setActionModal({ id, action, notes: '' });
    };

    const [actionLoading, setActionLoading] = useState(null);
    const canApprove = role === 'ADMIN' || role === 'MANAGER';

    useEffect(() => {
        fetchRequests();
    }, [statusFilter]);

    const filteredRequests = requests.filter(r => 
        r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            {/* Action Confirmation Modal */}
            {actionModal && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 10000, background: 'rgba(3, 7, 18, 0.9)', backdropFilter: 'blur(10px)' }}>
                    <div className="premium-card p-4 border-0 shadow-2xl bg-surface" style={{ borderRadius: '28px', width: '400px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className={`p-2 rounded-circle ${actionModal.action === 'APPROVED' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                                {actionModal.action === 'APPROVED' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                            </div>
                            <div>
                                <h6 className="fw-black text-main text-uppercase tracking-widest mb-0">{actionModal.action} WFH REQUEST</h6>
                                <p className="text-muted small mb-0 fw-bold">Add optional administrative notes</p>
                            </div>
                        </div>

                        <textarea 
                            className="form-control bg-dark border-white border-opacity-10 rounded-4 p-3 text-main mb-4"
                            rows="3"
                            placeholder="Type administrative notes here (optional)..."
                            value={actionModal.notes}
                            onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                            style={{ resize: 'none', fontSize: '12px' }}
                        ></textarea>

                        <div className="d-flex gap-2">
                            <button 
                                className="btn flex-grow-1 py-2.5 rounded-pill fw-black text-uppercase tracking-widest border-0 opacity-50 hover-opacity-100" 
                                style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                                onClick={() => setActionModal(null)}
                            >
                                Cancel
                            </button>
                            <button 
                                className={`btn flex-grow-1 py-2.5 rounded-pill fw-black text-uppercase tracking-widest border-0 shadow-glow ${actionModal.action === 'APPROVED' ? 'bg-success' : 'bg-danger'}`}
                                style={{ fontSize: '10px', color: '#fff' }}
                                onClick={handleConfirmAction}
                                disabled={actionLoading === actionModal.id}
                            >
                                {actionLoading === actionModal.id ? 'Processing...' : `Confirm ${actionModal.action.toLowerCase()}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h5 className="fw-black text-uppercase tracking-wider mb-1">WFH Approval Center</h5>
                    <p className="text-muted small mb-0">Review and authorize remote work protocols for associates.</p>
                </div>
                <div className="d-flex gap-2">
                    <select 
                        className="form-select form-select-sm border border-white border-opacity-10 bg-surface text-main rounded-pill px-3 fw-bold"
                        style={{ width: '130px', fontSize: '11px' }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="ALL">All History</option>
                    </select>
                    <div className="position-relative">
                        <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search associates..." 
                            className="form-control ps-5 border border-white border-opacity-10 bg-surface text-main rounded-pill small fw-bold"
                            style={{ width: '200px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-5 bg-surface bg-opacity-40 rounded-4 border border-dashed border-main border-opacity-10 shadow-sm animate-pulse-slow">
                    <ShieldCheck size={48} className="text-primary opacity-20 mb-3" />
                    <h6 className="fw-black text-muted text-uppercase tracking-widest small">All clear! No {statusFilter.toLowerCase()} WFH requests found.</h6>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover align-middle custom-table border-0">
                        <thead>
                            <tr className="bg-surface bg-opacity-30">
                                <th className="border-0 small fw-black text-muted text-uppercase tracking-widest ps-4">Associate</th>
                                <th className="border-0 small fw-black text-muted text-uppercase tracking-widest">Duration</th>
                                <th className="border-0 small fw-black text-muted text-uppercase tracking-widest">Status</th>
                                <th className="border-0 small fw-black text-muted text-uppercase tracking-widest">Submitted</th>
                                <th className="border-0 small fw-black text-muted text-uppercase tracking-widest text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.map(req => (
                                <tr key={req.id} className="border-bottom border-light">
                                    <td className="ps-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="p-2 bg-primary bg-opacity-10 rounded-circle text-primary">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <div className="fw-bold text-main">{req.userName}</div>
                                                <div className="text-muted" style={{ fontSize: '10px' }}>{req.userRole}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column">
                                            <span className="fw-black text-main" style={{ fontSize: '11px' }}>{req.startDate}</span>
                                            <div className="d-flex align-items-center gap-1 opacity-50">
                                                <div style={{ width: 4, height: 1, background: 'currentColor' }}></div>
                                                <span className="fw-bold text-muted" style={{ fontSize: '9px' }}>{req.endDate}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={`badge rounded-pill px-2 py-1 fw-bold border ${
                                            req.status === 'APPROVED' ? 'bg-success bg-opacity-10 text-success border-success' :
                                            req.status === 'REJECTED' ? 'bg-danger bg-opacity-10 text-danger border-danger' :
                                            'bg-warning bg-opacity-10 text-warning border-warning'
                                        }`} style={{ fontSize: '10px' }}>
                                            {req.status}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center gap-1 text-muted small">
                                            <Clock size={12} />
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="text-end pe-4">
                                        <div className="d-flex justify-content-end gap-2">
                                            {req.status === 'PENDING' ? (
                                                canApprove ? (
                                                    <>
                                                        <button 
                                                            disabled={actionLoading === req.id}
                                                            onClick={() => handleAction(req.id, 'APPROVED')}
                                                            className="btn btn-sm btn-success rounded-pill px-3 fw-bold d-flex align-items-center gap-1 shadow-sm"
                                                        >
                                                            {actionLoading === req.id ? <span className="spinner-border spinner-border-sm"></span> : <><CheckCircle size={14} /> Approve</>}
                                                        </button>
                                                        <button 
                                                            disabled={actionLoading === req.id}
                                                            onClick={() => handleAction(req.id, 'REJECTED')}
                                                            className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="badge bg-surface bg-opacity-50 text-muted rounded-pill px-3 py-2 border border-white border-opacity-10 fw-black" style={{ fontSize: '9px' }}>
                                                        Pending Authorization
                                                    </span>
                                                )
                                            ) : (
                                                <div className="text-muted small opacity-50 fw-bold italic" style={{ fontSize: '10px' }}>
                                                    {req.adminNotes || 'No notes'}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WfhApprovalPanel;
