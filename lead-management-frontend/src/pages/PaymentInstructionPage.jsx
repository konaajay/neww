import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IndianRupee, CheckCircle2, CreditCard, ShieldCheck, Info, ChevronRight, Lock, User, Mail, Hash } from 'lucide-react';
import axios from 'axios';
import { load } from '@cashfreepayments/cashfree-js';

const PaymentInstructionPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                // Prioritize local environment during development
                const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:8080'
                    : (import.meta.env.VITE_API_BASE_URL || 'http://54.84.148.176:8080');

                const url = `${baseURL}/api/public/payments/order/${orderId}`;
                const res = await axios.get(url);
                setOrderData(res.data);
            } catch (err) {
                setError("Payment details could not be retrieved. Please verify the link or contact support.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrderDetails();
    }, [orderId]);

    const startPayment = async () => {
        setPaymentError(null);
        setPaying(true);
        try {
            // Optimization: Use the session ID already provided by the order details
            const paymentSessionId = orderData?.payment_session_id;

            if (!paymentSessionId) {
                setPaymentError("Payment session missing or expired. Please refresh the page.");
                setPaying(false);
                return;
            }

            const isProd = orderData?.cashfreeEnvironment?.toUpperCase() === 'PROD';
            const mode = isProd ? "production" : "sandbox";
            const cashfree = await load({ mode });

            await cashfree.checkout({
                paymentSessionId: paymentSessionId,
                redirectTarget: "_self"
            });

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Gateway connection failed.";
            setPaymentError(`Gateway Error: ${errorMsg}`);
        } finally {
            setPaying(false);
        }
    };

    if (loading) return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f8fafc' }}>
            <div className="text-center">
                <div className="spinner-border text-primary mb-4" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                <p className="text-muted small fw-black tracking-widest text-uppercase">Initializing Secure Gateway</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ background: '#f8fafc' }}>
            <div className="bg-white p-5 text-center shadow-lg" style={{ maxWidth: '440px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
                <div className="mb-4 text-danger opacity-80"><Info size={48} /></div>
                <h3 className="text-dark fw-black mb-3 text-uppercase tracking-widest">Link Expired</h3>
                <p className="text-muted mb-4 small fw-medium">{error}</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest">Retry Connection</button>
            </div>
        </div>
    );

    const isPaid = ['PAID', 'SUCCESS'].includes(orderData.status?.toUpperCase());

    return (
        <div className="min-vh-100 py-4 px-3 d-flex align-items-center justify-content-center position-relative overflow-hidden" style={{ background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>
            {/* Ambient Background Elements */}
            <div className="position-absolute" style={{ width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.03) 0%, transparent 70%)', top: '-10%', left: '-10%' }} />
            <div className="position-absolute" style={{ width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.02) 0%, transparent 70%)', bottom: '-10%', right: '-10%' }} />

            <div className="container position-relative d-flex flex-column align-items-center" style={{ maxWidth: '440px', zIndex: 1 }}>
                {/* Integrated Branding Header */}
                <div className="text-center mb-4 animate-fade-in d-flex flex-column align-items-center">
                    <div className="d-flex align-items-center gap-3 mb-1">
                        <img src="/logo.png" alt="GYANTRIX" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                        <h2 className="text-dark fw-black tracking-widest text-uppercase mb-0" style={{ fontSize: '1.4rem', letterSpacing: '0.2em' }}>GYANTRIX</h2>
                    </div>
                    <p className="text-muted extra-small fw-bold tracking-widest text-uppercase" style={{ fontSize: '8px', letterSpacing: '0.4em' }}>Admissions Ecosystem</p>
                </div>

                <div className="bg-white w-100 overflow-hidden animate-slide-up shadow-lg" style={{ 
                    borderRadius: '32px',
                    border: '1px solid #e2e8f0',
                }}>
                    {/* Status Header */}
                    <div className="p-4 text-center border-bottom border-light">
                        {isPaid ? (
                            <div className="animate-zoom-in">
                                <div className="text-success mb-2"><CheckCircle2 size={32} strokeWidth={2} /></div>
                                <h3 className="text-dark fw-black mb-0 text-uppercase tracking-widest" style={{ fontSize: '0.9rem' }}>Admission Confirmed</h3>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-dark fw-black mb-0 text-uppercase tracking-widest" style={{ fontSize: '0.9rem' }}>Secure Checkout</h3>
                                <p className="text-muted extra-small fw-bold text-uppercase tracking-widest mb-0 mt-1" style={{ fontSize: '7px' }}>Finalize Your Enrollment</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4">
                        {/* Student Details Card */}
                        <div className="p-3 rounded-4 bg-light border border-light mb-3">
                            <div className="d-flex flex-column gap-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3"><User size={14} /></div>
                                    <div className="text-truncate">
                                        <p className="text-muted extra-small fw-black text-uppercase tracking-widest mb-0">Student Identity</p>
                                        <p className="text-dark fw-bold mb-0 text-truncate" style={{ fontSize: '0.9rem' }}>{orderData?.studentName || 'Unidentified'}</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-3 pt-2 border-top border-dark border-opacity-5">
                                    <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3"><Mail size={14} /></div>
                                    <div className="text-truncate">
                                        <p className="text-muted extra-small fw-black text-uppercase tracking-widest mb-0">Email Address</p>
                                        <p className="text-dark fw-bold mb-0 text-truncate" style={{ fontSize: '0.9rem' }}>{orderData?.studentEmail || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-3 pt-2 border-top border-dark border-opacity-5">
                                    <div className="p-2 bg-secondary bg-opacity-10 text-muted rounded-3"><Hash size={14} /></div>
                                    <div className="text-truncate">
                                        <p className="text-muted extra-small fw-black text-uppercase tracking-widest mb-0">Reference ID</p>
                                        <p className="text-muted small fw-bold mb-0 font-monospace text-truncate" style={{ fontSize: '0.75rem' }}>{orderId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Amount Section */}
                        <div className="text-center py-3 mb-4 rounded-4" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%)', border: '1px solid #e2e8f0' }}>
                            <p className="text-primary extra-small fw-black text-uppercase tracking-widest mb-1">Total Enrollment Fee</p>
                            <div className="d-flex align-items-center justify-content-center gap-1 text-dark">
                                <IndianRupee size={18} strokeWidth={3} className="text-primary opacity-80" />
                                <h1 className="fw-black mb-0 tracking-tighter" style={{ fontSize: '2.5rem', color: '#0f172a' }}>
                                    {Number(orderData?.amount || 0).toLocaleString('en-IN')}
                                </h1>
                            </div>
                            <p className="text-muted extra-small fw-bold text-uppercase mt-1">Certified Inclusive of Taxes</p>
                        </div>

                        {/* Action Area */}
                        {isPaid ? (
                            <div className="text-center">
                                <button 
                                    onClick={() => navigate(`/pay/${orderId}`)}
                                    className="btn btn-primary w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest shadow-sm d-flex align-items-center justify-content-center gap-2"
                                >
                                    View Digital Receipt <ChevronRight size={18} />
                                </button>
                                <p className="text-muted extra-small fw-bold mt-4 tracking-widest text-uppercase">Payment successfully verified via Cashfree</p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {paymentError && (
                                    <div className="p-3 rounded-3 bg-danger bg-opacity-10 border border-danger border-opacity-10 d-flex gap-2 align-items-center text-danger">
                                        <Info size={12} />
                                        <p className="extra-small fw-bold mb-0">{paymentError}</p>
                                    </div>
                                )}
                                <button 
                                    onClick={startPayment}
                                    disabled={paying}
                                    className="btn btn-primary w-100 py-3 rounded-4 fw-black text-uppercase tracking-widest d-flex align-items-center justify-content-center gap-2 hover-scale transition-all"
                                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', height: '56px', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}
                                >
                                    {paying ? <span className="spinner-border spinner-border-sm" /> : <CreditCard size={18} />}
                                    {paying ? 'Connecting...' : 'Pay with Cashfree'}
                                </button>
                                <div className="d-flex justify-content-center gap-4 opacity-40">
                                    <div className="d-flex align-items-center gap-2">
                                        <ShieldCheck size={12} className="text-dark" />
                                        <span className="extra-small fw-black text-dark text-uppercase tracking-widest">Secure Checkout</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <Lock size={12} className="text-dark" />
                                        <span className="extra-small fw-black text-dark text-uppercase tracking-widest">PCI-DSS Level 1</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center mt-4 opacity-30">
                    <p className="extra-small fw-black text-dark text-uppercase tracking-widest mb-0">GYANTRIX INTELLIGENCE &copy; 2026</p>
                </div>
            </div>

            <style>{`
                .extra-small { font-size: 8px; }
                .tracking-widest { letter-spacing: 0.15em; }
                .tracking-tighter { letter-spacing: -0.05em; }
                .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .animate-zoom-in { animation: zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                
                .hover-scale:hover:not(:disabled) { transform: scale(1.02); filter: brightness(1.1); }
            `}</style>
        </div>
    );
};

export default PaymentInstructionPage;

