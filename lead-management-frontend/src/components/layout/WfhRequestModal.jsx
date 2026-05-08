import React, { useState, useEffect } from 'react';
import { Calendar, Send, X, Clock, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import wfhService from '../../services/wfhService';

const WfhRequestModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(null);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-wfh-modal', handleOpen);
        return () => window.removeEventListener('open-wfh-modal', handleOpen);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchMyStatus();
        }
    }, [isOpen]);

    const fetchMyStatus = async () => {
        try {
            const res = await wfhService.getMyWfhStatus();
            setCurrentStatus(res.data);
        } catch (err) {
            console.error('Failed to fetch WFH status');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.warning('Please provide a reason for WFH');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast.warning('Start date cannot be after end date');
            return;
        }

        setLoading(true);
        try {
            await wfhService.requestWfh(startDate, endDate, reason);
            toast.success('WFH Request submitted for approval');
            setIsOpen(false);
            setReason('');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Request failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop d-flex align-items-center justify-content-center" style={{ zIndex: 9999 }}>
            <div className="premium-card p-4 rounded-4 shadow-lg animate-scale-in" style={{ width: '400px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)' }}>
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <div className="p-2 bg-primary bg-opacity-10 rounded-pill text-primary">
                            <Calendar size={20} />
                        </div>
                        <h5 className="mb-0 fw-black tracking-wider text-uppercase text-main" style={{ fontSize: '14px' }}>Work From Home Request</h5>
                    </div>
                    <button type="button" onClick={() => setIsOpen(false)} className="btn btn-link p-0 text-muted hover-text-danger transition-all">
                        <X size={20} />
                    </button>
                </div>

                {currentStatus?.wfhStatus === 'PENDING' ? (
                    <div className="alert alert-info border-0 rounded-4 p-3 mb-0">
                        <div className="d-flex gap-3">
                            <Clock size={20} className="flex-shrink-0" />
                            <div>
                                <h6 className="small fw-bold text-uppercase mb-1">Request Pending</h6>
                                <p className="small mb-0 opacity-75">
                                    You already have a pending request from {currentStatus.startDate} to {currentStatus.endDate}. 
                                    Please wait for Manager/Admin approval.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3 mb-4">
                            <div className="col-6">
                                <label htmlFor="wfh-start-date" className="form-label small fw-black text-muted text-uppercase tracking-widest mb-2" style={{ fontSize: '9px' }}>Start Date</label>
                                <input 
                                    id="wfh-start-date"
                                    type="text" 
                                    placeholder="YYYY-MM-DD"
                                    autoComplete="off"
                                    className="form-control border-0 bg-light rounded-3 fw-bold"
                                    value={startDate}
                                    onFocus={(e) => e.target.type = 'date'}
                                    onBlur={(e) => { if(!e.target.value) e.target.type = 'text'; }}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="col-6">
                                <label htmlFor="wfh-end-date" className="form-label small fw-black text-muted text-uppercase tracking-widest mb-2" style={{ fontSize: '9px' }}>End Date</label>
                                <input 
                                    id="wfh-end-date"
                                    type="text" 
                                    placeholder="YYYY-MM-DD"
                                    autoComplete="off"
                                    className="form-control border-0 bg-light rounded-3 fw-bold"
                                    value={endDate}
                                    onFocus={(e) => e.target.type = 'date'}
                                    onBlur={(e) => { if(!e.target.value) e.target.type = 'text'; }}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="wfh-reason" className="form-label small fw-black text-muted text-uppercase tracking-widest mb-2" style={{ fontSize: '9px' }}>Reason for Remote Work</label>
                            <textarea
                                id="wfh-reason"
                                autoComplete="off"
                                className="form-control border-0 bg-light rounded-4 p-3 small fw-bold"
                                rows="3"
                                placeholder="e.g. Family emergency, feeling unwell, or office commute issue..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                onFocus={(e) => e.stopPropagation()}
                            ></textarea>
                        </div>

                        <div className="alert alert-primary bg-primary bg-opacity-5 border-0 rounded-4 p-3 mb-4">
                            <div className="d-flex gap-2 align-items-center">
                                <Info size={14} className="text-primary" />
                                <span className="small fw-bold opacity-75" style={{ fontSize: '10px' }}>Approvals are handled by Admin or Manager.</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center justify-content-center gap-2"
                            style={{ fontSize: '12px' }}
                        >
                            {loading ? <span className="spinner-border spinner-border-sm"></span> : <><Send size={18} /> Submit Protocol</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default WfhRequestModal;
