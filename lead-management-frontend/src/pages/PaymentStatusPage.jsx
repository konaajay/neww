import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight, ShieldCheck, ChevronRight, RefreshCw, LogOut } from 'lucide-react';
import axios from 'axios';

const PaymentStatusPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, failed, pending
    const [orderData, setOrderData] = useState(null);

    useEffect(() => {
        let pollInterval;

        const checkStatus = async () => {
            try {
                const baseURL = import.meta.env.VITE_API_BASE_URL ||
                    (window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'http://52.87.168.111:8080');
                const url = `${baseURL}/api/public/payments/order/${orderId}`;
                const res = await axios.get(url);
                setOrderData(res.data);

                const backendStatus = res.data.status?.toUpperCase();
                if (backendStatus === 'PAID' || backendStatus === 'SUCCESS' || backendStatus === 'COMPLETED') {
                    setStatus('success');
                    if (pollInterval) clearInterval(pollInterval);
                } else if (backendStatus === 'FAILED' || backendStatus === 'CANCELLED') {
                    setStatus('failed');
                    if (pollInterval) clearInterval(pollInterval);
                } else {
                    setStatus('pending');
                }
            } catch (err) {
                // Keep checking unless it's a permanent failure
                console.error("Status check failed:", err);
            }
        };

        checkStatus();

        // Polling logic for pending status
        pollInterval = setInterval(checkStatus, 3000);

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [orderId]);

    const renderContent = () => {
        switch (status) {
            case 'verifying':
                return (
                    <div className="text-center animate-pulse py-5">
                        <div className="spinner-border text-primary mb-5" style={{ width: '4rem', height: '4rem', borderWidth: '0.25em' }}></div>
                        <h4 className="fw-black text-main text-uppercase tracking-widest mb-3">Verifying Hash</h4>
                        <p className="text-muted small fw-bold opacity-50 px-5">SYNCHRONIZING WITH GATEWAY DECENTRALIZED PROTOCOLS...</p>
                    </div>
                );
            case 'success':
                return (
                    <div className="text-center animate-fade-in">
                        <div className="p-4 bg-success bg-opacity-10 text-success rounded-circle d-inline-block mb-4 shadow-glow-sm animate-zoom-in">
                            <CheckCircle size={64} strokeWidth={1.5} />
                        </div>
                        <h2 className="fw-black text-main mb-2 tracking-widest text-uppercase" style={{ fontSize: '2rem' }}>Protocol Authorized</h2>
                        <p className="text-muted mb-5 small fw-semibold opacity-70">Enrollment credentials secured. Your strategic seat has been reserved in the master database.</p>

                        <div className="p-4 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5 mb-5 text-start transition-smooth hover-bg-surface">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="text-muted small fw-black tracking-widest opacity-40">PROTOCOL ID</span>
                                <code className="text-primary fw-bold small">{orderId}</code>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="text-muted small fw-black tracking-widest opacity-40">PERSONNEL</span>
                                <span className="text-main fw-black small text-uppercase">{orderData?.studentName || 'UNIDENTIFIED'}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center pt-3 border-top border-white border-opacity-5">
                                <span className="text-muted small fw-black tracking-widest opacity-40">STATUS</span>
                                <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-black tracking-widest" style={{ fontSize: '9px' }}>VERIFIED</span>
                            </div>
                        </div>

                        <div className="d-flex flex-column gap-3">
                            <button onClick={() => window.close()} className="ui-btn ui-btn-primary rounded-pill py-3 fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center justify-content-center gap-2">
                                Terminate Session <LogOut size={18} />
                            </button>
                            <p className="small text-muted opacity-40 fw-bold mt-2 tracking-tighter">You may safely disconnect from the secure gateway.</p>
                        </div>
                    </div>
                );
            case 'failed':
                return (
                    <div className="text-center animate-fade-in">
                        <div className="p-4 bg-danger bg-opacity-10 text-danger rounded-circle d-inline-block mb-4 shadow-glow-sm">
                            <XCircle size={64} strokeWidth={1.5} />
                        </div>
                        <h2 className="fw-black text-main mb-2 tracking-widest text-uppercase" style={{ fontSize: '2rem' }}>Protocol Denied</h2>
                        <p className="text-muted mb-5 small fw-semibold opacity-70">Authorization was rejected by the banking vector. Error Code: BANK_REJECTION_01</p>

                        <button onClick={() => navigate(`/payment-instruction/${orderId}`)} className="ui-btn ui-btn-primary rounded-pill px-5 py-3 w-100 fw-black text-uppercase tracking-widest shadow-glow transition-smooth hover-scale">
                            Re-Initiate Protocol
                        </button>
                    </div>
                );
            case 'pending':
                return (
                    <div className="text-center animate-fade-in">
                        <div className="p-4 bg-warning bg-opacity-10 text-warning rounded-circle d-inline-block mb-4 shadow-glow-sm animate-pulse-slow">
                            <Clock size={64} strokeWidth={1.5} />
                        </div>
                        <h2 className="fw-black text-main mb-2 tracking-widest text-uppercase" style={{ fontSize: '2rem' }}>Pending Sync</h2>
                        <p className="text-muted mb-5 small fw-semibold opacity-70">Awaiting confirmation from the banking vector. This usually resolves within 180 seconds.</p>

                        <div className="d-flex flex-column gap-3">
                            <div className="d-flex align-items-center justify-content-center gap-2 mb-3 opacity-50">
                                <span className="dot bg-primary animate-pulse"></span>
                                <span className="small fw-black text-primary text-uppercase tracking-widest" style={{ fontSize: '8px' }}>Live Sync Active - Verifying Hash</span>
                            </div>
                            <button onClick={() => window.location.reload()} className="ui-btn ui-btn-primary rounded-pill py-3 fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center justify-content-center gap-2">
                                Force Sync Status <RefreshCw size={18} className="ms-1" />
                            </button>
                            <button onClick={() => window.close()} className="btn btn-link text-muted fw-black small text-decoration-none tracking-widest opacity-40 hover:opacity-100 transition-all">
                                I'LL CHECK BACK LATER
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-vh-100 bg-main d-flex align-items-center justify-content-center p-4 position-relative overflow-hidden">
            <div className="container position-relative z-index-1" style={{ maxWidth: '600px' }}>
                <div className="premium-card border-0 shadow-2xl rounded-5 p-4 p-md-5 overflow-hidden position-relative animate-fade-in">
                    {/* Top Accent Bar */}
                    <div className={`position-absolute top-0 start-0 w-100 h-1px ${status === 'success' ? 'bg-success' : status === 'failed' ? 'bg-danger' : 'bg-primary'} opacity-50 shadow-glow`}></div>

                    {renderContent()}
                </div>

                <div className="d-flex align-items-center justify-content-center gap-3 mt-5 opacity-40">
                    <div className="h-1px bg-white bg-opacity-10 flex-grow-1"></div>
                    <p className="text-muted small fw-black tracking-widest text-uppercase mb-0" style={{ fontSize: '8px' }}>
                        GYANTRIX &copy; 2025 | Automated Financial Gateway
                    </p>
                    <div className="h-1px bg-white bg-opacity-10 flex-grow-1"></div>
                </div>
            </div>

            <style>{`
                .z-index-1 { z-index: 1; }
                .tracking-widest { letter-spacing: 0.15em !important; }
                .tracking-tighter { letter-spacing: -0.05em !important; }
                .animate-zoom-in { animation: zoomIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
                @keyframes zoomIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            `}</style>
        </div>
    );
};

export default PaymentStatusPage;

