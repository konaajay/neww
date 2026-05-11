import React, { useState, useEffect } from 'react';
import { X, Calendar, TrendingUp, CheckCircle, AlertCircle, History, ArrowUpRight, User, Edit2 } from 'lucide-react';
import api, { safeRequest } from '../../../api/api';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';

const TargetHistoryModal = ({ isOpen, onClose, user, onEdit }) => {
    const { isDarkMode } = useTheme();
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
        <div className="ui-modal-overlay d-flex align-items-center justify-content-center p-3 animate-fade-in" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', position: 'fixed', inset: 0 }}>
            <div className={`ui-modal-surface animate-scale-in border-0 shadow-2xl overflow-hidden ${isDarkMode ? 'bg-surface' : 'bg-white'}`} style={{ width: '100%', maxWidth: '650px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                {/* Header */}
                <div className="p-4 d-flex align-items-center justify-content-between border-bottom border-light border-opacity-10">
                    <div className="d-flex align-items-center gap-3">
                        <div className={`p-2 rounded-3 ${isDarkMode ? 'bg-primary bg-opacity-10 text-primary' : 'bg-primary text-white'}`}>
                            <History size={18} />
                        </div>
                        <div>
                            <h6 className="fw-black text-main mb-0 text-uppercase tracking-wider">Performance Audit</h6>
                            <span className="text-muted small fw-bold text-uppercase opacity-50" style={{ fontSize: '9px' }}>{user?.name}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn p-2 rounded-circle hover-bg-surface transition-all border-0 text-muted">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary spinner-border-sm opacity-50" role="status"></div>
                            <p className="text-muted small fw-bold text-uppercase mt-2 tracking-widest" style={{fontSize: '9px'}}>Loading History...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-5 border border-dashed border-light border-opacity-10 rounded-4">
                            <AlertCircle size={24} className="text-muted opacity-20 mb-2" />
                            <p className="text-muted small fw-bold text-uppercase tracking-widest mb-0" style={{fontSize: '10px'}}>No records found</p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {history.map((entry, idx) => {
                                const isSuccessful = entry.achievementRate >= 100;
                                return (
                                    <div key={idx} className={`p-3 rounded-4 border ${isDarkMode ? 'border-white border-opacity-5 bg-white bg-opacity-[0.02]' : 'border-light bg-light bg-opacity-30'}`}>
                                        <div className="row align-items-center g-3">
                                            <div className="col-12 col-md-3">
                                                <div className="d-flex align-items-center gap-2 mb-0">
                                                    <Calendar size={12} className="text-primary opacity-60" />
                                                    <span className="text-main fw-black text-uppercase" style={{ fontSize: '11px' }}>
                                                        {new Date(0, entry.month - 1).toLocaleString('default', { month: 'short' }).toUpperCase()} {entry.year}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="col-6 col-md-3">
                                                <small className="text-muted fw-bold text-uppercase tracking-widest d-block opacity-50" style={{ fontSize: '8px' }}>Target</small>
                                                <h6 className="text-main fw-black mb-0">₹{entry.targetAmount.toLocaleString()}</h6>
                                            </div>

                                            <div className="col-6 col-md-3">
                                                <small className="text-muted fw-bold text-uppercase tracking-widest d-block opacity-50" style={{ fontSize: '8px' }}>Achieved</small>
                                                <h6 className={`fw-black mb-0 ${isSuccessful ? 'text-success' : 'text-main'}`}>₹{entry.achievedAmount.toLocaleString()}</h6>
                                            </div>

                                            <div className="col-12 col-md-3 d-flex align-items-center justify-content-md-end">
                                                <div className={`d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill ${isSuccessful ? 'bg-success bg-opacity-10 text-success' : 'bg-primary bg-opacity-10 text-primary'}`}>
                                                    <span className="fw-black" style={{ fontSize: '10px' }}>{entry.achievementRate?.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="progress mt-3 bg-dark bg-opacity-10" style={{ height: '3px', borderRadius: '2px' }}>
                                            <div 
                                                className={`progress-bar transition-all ${isSuccessful ? 'bg-success' : 'bg-primary'}`}
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
                <div className="p-4 border-top border-light border-opacity-10">
                    <button onClick={onClose} className="btn w-100 py-2 rounded-3 fw-black text-uppercase tracking-widest shadow-sm" style={{ fontSize: '10px', background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8f9fa', color: 'var(--text-main)' }}>
                        Close Audit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TargetHistoryModal;
