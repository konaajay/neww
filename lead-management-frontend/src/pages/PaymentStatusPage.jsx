import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, RefreshCw, LogOut, ShieldCheck, User, Hash } from 'lucide-react';
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
                const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:8080'
                    : (import.meta.env.VITE_API_BASE_URL || 'http://54.84.148.176:8080');
                    
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
                console.error("Status check failed:", err);
            }
        };

        checkStatus();
        pollInterval = setInterval(checkStatus, 3000);

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [orderId]);

    const renderContent = () => {
        switch (status) {
            case 'verifying':
                return (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary mb-5" style={{ width: '4rem', height: '4rem', borderWidth: '0.25em' }}></div>
                        <h4 className="text-white fw-black text-uppercase tracking-widest mb-3" style={{ fontSize: '1.1rem' }}>Verifying Transaction</h4>
                        <p className="text-white text-opacity-30 extra-small fw-bold tracking-widest px-5">SYNCING WITH GLOBAL BANKING GATEWAY...</p>
                    </div>
                );
            case 'success':
                return (
                    <div className="text-center animate-fade-in">
                        <div className="text-success mb-4 animate-zoom-in">
                            <CheckCircle2 size={72} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-white fw-black mb-2 tracking-widest text-uppercase" style={{ fontSize: '1.8rem' }}>Payment Successful</h2>
                        <p className="text-white text-opacity-40 mb-5 small fw-medium px-4">Your admission has been confirmed and enrollment credentials have been secured.</p>

                        <div className="glass-inner p-4 rounded-4 mb-5 text-start" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="d-flex align-items-center gap-2 opacity-40">
                                    <Hash size={14} className="text-white" />
                                    <span className="text-white extra-small fw-black tracking-widest">ORDER REFERENCE</span>
                                </div>
                                <code className="text-primary fw-bold small">{orderId}</code>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="d-flex align-items-center gap-2 opacity-40">
                                    <User size={14} className="text-white" />
                                    <span className="text-white extra-small fw-black tracking-widest">STUDENT NAME</span>
                                </div>
                                <span className="text-white fw-black small text-uppercase">{orderData?.studentName || 'VERIFIED'}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center pt-3 border-top border-white border-opacity-5">
                                <div className="d-flex align-items-center gap-2 opacity-40">
                                    <ShieldCheck size={14} className="text-white" />
                                    <span className="text-white extra-small fw-black tracking-widest">VERIFICATION</span>
                                </div>
                                <span className="badge bg-success bg-opacity-20 text-success rounded-pill px-3 py-2 fw-black tracking-widest" style={{ fontSize: '9px' }}>CERTIFIED</span>
                            </div>
                        </div>

                        <div className="d-flex flex-column gap-3">
                            <button onClick={() => window.close()} className="btn btn-primary w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center justify-content-center gap-2">
                                Close Secure Session <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                );
            case 'failed':
                return (
                    <div className="text-center animate-fade-in">
                        <div className="text-danger mb-4">
                            <XCircle size={72} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-white fw-black mb-2 tracking-widest text-uppercase" style={{ fontSize: '1.8rem' }}>Payment Failed</h2>
                        <p className="text-white text-opacity-40 mb-5 small fw-medium">The transaction was declined by your bank. Please try again or use a different method.</p>

                        <button onClick={() => navigate(`/payment-instruction/${orderId}`)} className="btn btn-primary w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest shadow-glow">
                            Retry Registration
                        </button>
                    </div>
                );
            case 'pending':
                return (
                    <div className="text-center animate-fade-in">
                        <div className="text-warning mb-4 animate-pulse">
                            <Clock size={72} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-white fw-black mb-2 tracking-widest text-uppercase" style={{ fontSize: '1.8rem' }}>Processing...</h2>
                        <p className="text-white text-opacity-40 mb-5 small fw-medium px-4">Awaiting confirmation from your bank. This typically takes a few moments.</p>

                        <div className="d-flex flex-column gap-3">
                            <button onClick={() => window.location.reload()} className="btn btn-primary w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center justify-content-center gap-2">
                                Refresh Status <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center p-4 position-relative overflow-hidden" style={{ background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>
            {/* Ambient Background Glows */}
            <div className="position-absolute" style={{ width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.03) 0%, transparent 70%)', top: '-10%', left: '-10%' }} />
            <div className="position-absolute" style={{ width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.03) 0%, transparent 70%)', bottom: '-10%', right: '-10%' }} />

            <div className="container position-relative d-flex flex-column align-items-center" style={{ maxWidth: '440px', zIndex: 1 }}>
                {/* Integrated Branding Header */}
                <div className="text-center mb-4 animate-fade-in d-flex flex-column align-items-center">
                    <div className="d-flex align-items-center gap-3 mb-1">
                        <img src="/logo.png" alt="GYANTRIX" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                        <h2 className="fw-black tracking-widest text-uppercase mb-0" style={{ fontSize: '1.4rem', color: '#1e293b', letterSpacing: '0.2em' }}>GYANTRIX</h2>
                    </div>
                    <p className="text-muted small fw-bold tracking-widest text-uppercase opacity-50" style={{ fontSize: '8px', letterSpacing: '0.4em' }}>Admissions Ecosystem</p>
                </div>

                <div className="premium-card w-100 p-4 p-md-5 animate-slide-up" style={{ 
                    background: '#ffffff', 
                    borderRadius: '40px',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)'
                }}>
                    {renderContent()}
                </div>

                <div className="text-center mt-4 opacity-20">
                    <p className="extra-small fw-black tracking-widest text-uppercase mb-0" style={{ color: '#1e293b' }}>
                        GYANTRIX INTELLIGENCE &copy; 2026
                    </p>
                </div>
            </div>

            <style>{`
                .extra-small { font-size: 8px; }
                .tracking-widest { letter-spacing: 0.2em; }
                .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .animate-zoom-in { animation: zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                
                /* Custom light mode overrides for content */
                .text-white { color: #1e293b !important; }
                .text-opacity-40 { opacity: 0.6 !important; }
                .text-opacity-30 { opacity: 0.4 !important; }
                .glass-inner { background: #f8fafc !important; border: 1px solid #f1f5f9 !important; }
                .btn-primary { background: #1e293b !important; border: none !important; }
                .shadow-glow { box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.1); }
            `}</style>
        </div>
    );
};

export default PaymentStatusPage;

