import React, { useState, useEffect } from 'react';
import { X, Calendar, TrendingUp, CheckCircle, AlertCircle, History, ArrowUpRight, User, Edit2 } from 'lucide-react';
import api, { safeRequest } from '../../../api/api';
import { toast } from 'react-toastify';

const TargetHistoryModal = ({ isOpen, onClose, user, onEdit }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user?.id) {
            const fetchHistory = async () => {
                setLoading(true);
                try {
                    const res = await safeRequest(api.get(`/targets/history/${user.id}`));
                    const data = Array.isArray(res) ? res : (res?.data || res || []);
                    setHistory(data);
                } catch (err) {
                    toast.error("Failed to fetch target history");
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }
    }, [isOpen, user?.id]);

    if (!isOpen) return null;

    return (
        <div className="ui-modal-overlay d-flex align-items-center justify-content-center p-3 animate-fade-in" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', position: 'fixed', inset: 0 }}>
            <div className="ui-modal-surface animate-scale-in border-0 shadow-2xl overflow-hidden" style={{ width: '100%', maxWidth: '700px', borderRadius: '32px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                {/* Header */}
                <div className="p-5 d-flex align-items-center justify-content-between border-bottom border-white border-opacity-5">
                    <div className="d-flex align-items-center gap-4">
                        <div className="p-3 rounded-4 bg-primary bg-opacity-10 text-primary shadow-glow-sm">
                            <History size={24} />
                        </div>
                        <div>
                            <h4 className="fw-black text-main mb-1 text-uppercase tracking-tighter" style={{ fontSize: '20px' }}>Performance Audit</h4>
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted small fw-black text-uppercase tracking-widest opacity-60" style={{ fontSize: '9px' }}>Track Record</span>
                                <span className="text-muted opacity-30">•</span>
                                <span className="text-primary small fw-black text-uppercase" style={{ fontSize: '10px' }}>{user?.name}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn p-2 rounded-circle bg-white bg-opacity-5 text-muted hover-bg-danger hover-text-white transition-all border-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary opacity-25" role="status"></div>
                            <p className="text-muted small fw-bold text-uppercase mt-3 tracking-widest">Retrieving intelligence...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-5 border border-dashed border-white border-opacity-10 rounded-4">
                            <AlertCircle size={32} className="text-muted opacity-20 mb-3" />
                            <p className="text-muted small fw-black text-uppercase tracking-widest">No historical objectives found</p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-4">
                            {history.map((entry, idx) => {
                                const isSuccessful = entry.achievementRate >= 100;
                                return (
                                    <div key={idx} className="p-4 rounded-4 border border-white border-opacity-5 bg-white bg-opacity-[0.02] transition-all hover-bg-white-2">
                                        <div className="row align-items-center g-3">
                                            <div className="col-12 col-md-3">
                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                    <Calendar size={14} className="text-primary opacity-75" />
                                                    <span className="text-main fw-black text-uppercase" style={{ fontSize: '13px' }}>
                                                        {new Date(0, entry.month - 1).toLocaleString('default', { month: 'short' }).toUpperCase()}
                                                    </span>
                                                </div>
                                                <small className="text-muted fw-bold tracking-widest" style={{ fontSize: '9px' }}>YEAR {entry.year}</small>
                                            </div>

                                            <div className="col-6 col-md-3">
                                                <small className="text-muted fw-bold text-uppercase tracking-widest d-block mb-1" style={{ fontSize: '8px', opacity: 0.5 }}>Target Goal</small>
                                                <h6 className="text-main fw-black mb-0 font-monospace">₹{entry.targetAmount.toLocaleString()}</h6>
                                            </div>

                                            <div className="col-6 col-md-3 border-start border-white border-opacity-5">
                                                <small className="text-muted fw-bold text-uppercase tracking-widest d-block mb-1" style={{ fontSize: '8px', opacity: 0.5 }}>Net Achievement</small>
                                                <h6 className={`fw-black mb-0 font-monospace ${isSuccessful ? 'text-success' : 'text-main'}`}>₹{entry.achievedAmount.toLocaleString()}</h6>
                                            </div>

                                            <div className="col-12 col-md-3 d-flex align-items-center justify-content-md-end gap-3">
                                                <div className={`d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill ${isSuccessful ? 'bg-success bg-opacity-10 text-success' : 'bg-primary bg-opacity-10 text-primary'}`}>
                                                    {isSuccessful ? <CheckCircle size={12} /> : <TrendingUp size={12} />}
                                                    <span className="fw-black" style={{ fontSize: '11px' }}>{entry.achievementRate?.toFixed(1)}%</span>
                                                </div>
                                                <button 
                                                    onClick={() => onEdit?.(entry)}
                                                    className="btn btn-sm btn-outline-light border-0 p-2 text-muted hover-text-primary transition-all rounded-circle"
                                                    title="Modify this target"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="progress mt-4 bg-white bg-opacity-5" style={{ height: '4px', borderRadius: '2px' }}>
                                            <div 
                                                className={`progress-bar transition-all ${isSuccessful ? 'bg-success shadow-glow-success' : 'bg-primary shadow-glow'}`}
                                                style={{ width: `${Math.min(100, entry.achievementRate)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 bg-white bg-opacity-[0.02] border-top border-white border-opacity-5">
                    <button onClick={onClose} className="ui-btn ui-btn-outline w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest" style={{ fontSize: '11px' }}>
                        Dismiss Audit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TargetHistoryModal;
