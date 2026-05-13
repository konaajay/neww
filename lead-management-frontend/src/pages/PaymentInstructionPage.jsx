import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IndianRupee, ShieldCheck, CreditCard, Clock, AlertCircle, Zap, Shield, ChevronRight, Fingerprint } from 'lucide-react';
import axios from 'axios';
import { load } from '@cashfreepayments/cashfree-js';

const PaymentInstructionPage = () => {
    const { orderId } = useParams();
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const baseURL = import.meta.env.VITE_API_BASE_URL || '';
                const url = `${baseURL}/api/public/payments/order/${orderId}`;
                console.log('[Payment] Fetching order from:', url);
                const res = await axios.get(url);
                console.log('[Payment] Order data received:', res.data);
                setOrderData(res.data);
            } catch (err) {
                console.error('[Payment] Failed to fetch order:', err);
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
            const baseURL = import.meta.env.VITE_API_BASE_URL || '';
            
            // 1. Fetch exact session ID for this order
            const sessionUrl = `${baseURL}/api/public/payments/session/${orderId}`;
            console.log('[Payment] Requesting session from:', sessionUrl);
            
            const sessionRes = await axios.get(sessionUrl, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            const paymentSessionId = sessionRes.data.payment_session_id;

            if (!paymentSessionId) {
                setPaymentError("Payment session missing. Please contact admin to regenerate the link.");
                setPaying(false);
                return;
            }

            // 2. Initialize SDK
            const isProd = orderData?.cashfreeEnvironment?.toUpperCase() === 'PROD';
            const mode = isProd ? "production" : "sandbox";
            console.log('[Payment] Initializing Cashfree checkout | Mode:', mode);

            const cashfree = await load({ mode });

            // 3. Launch Checkout Protocol
            await cashfree.checkout({
                paymentSessionId: paymentSessionId,
                redirectTarget: "_self"
            });

        } catch (err) {
            console.error('[Payment] Protocol Exception:', err);
            const errorMsg = err.response?.data?.message || err.message || "Gateway connection failed.";
            setPaymentError(`PAYMENT_INIT_ERROR: ${errorMsg}`);
        } finally {
            setPaying(false);
        }
    };

    const handlePayment = () => startPayment();

    if (loading) return (
        <div className="min-vh-100 bg-main d-flex align-items-center justify-content-center">
            <div className="p-5 rounded-4 bg-surface bg-opacity-20 border border-white border-opacity-5 shadow-lg animate-pulse text-center" style={{maxWidth: '400px'}}>
                 <div className="spinner-border text-primary mb-4" role="status" style={{width: '3rem', height: '3rem'}}></div>
                 <h6 className="fw-black text-main text-uppercase tracking-widest mb-2">Synchronizing Protocol</h6>
                 <p className="text-muted small fw-bold mb-0 opacity-50 px-4" style={{fontSize: '10px'}}>ESTABLISHING SECURE GATEWAY CONNECTION...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-vh-100 bg-main d-flex align-items-center justify-content-center p-4">
            <div className="premium-card p-5 text-center animate-fade-in" style={{ maxWidth: '500px' }}>
                <div className="p-4 bg-danger bg-opacity-10 text-danger rounded-circle d-inline-block mb-4 shadow-glow-sm">
                    <AlertCircle size={48} />
                </div>
                <h3 className="fw-black text-main mb-3 text-uppercase tracking-widest">Protocol Invalid</h3>
                <p className="text-muted mb-4 small fw-semibold px-4">{error}</p>
                <button onClick={() => window.location.reload()} className="ui-btn ui-btn-primary rounded-pill px-5 py-3 w-100 fw-black text-uppercase tracking-widest">Retry Verification</button>
            </div>
        </div>
    );

    const isPaid = ['PAID', 'SUCCESS'].includes(orderData.status?.toUpperCase());

    return (
        <div className="min-vh-100 bg-main py-5 px-3 d-flex align-items-center justify-content-center position-relative overflow-hidden">
            <div className="container position-relative z-index-1" style={{ maxWidth: '850px' }}>
                <div className="premium-card border-0 overflow-hidden shadow-2xl animate-fade-in">
                    {/* Header Protocol Area */}
                    <div className="p-4 p-md-5 border-bottom border-white border-opacity-5 d-flex flex-column align-items-center text-center">
                        <div className="p-3 bg-primary bg-opacity-10 rounded-4 text-primary mb-4 shadow-glow animate-zoom-in">
                            <Shield size={32} strokeWidth={1.5} />
                        </div>
                        <h2 className="fw-black text-main mb-2 tracking-widest text-uppercase" style={{ fontSize: '1.5rem' }}>Secure Enrollment Protocol</h2>
                        <div className="d-flex align-items-center gap-3 opacity-50">
                            <span className="dot bg-success animate-pulse"></span>
                            <p className="small mb-0 fw-black tracking-widest text-uppercase text-muted" style={{ fontSize: '9px' }}>Automated Billing System v4.0</p>
                        </div>
                    </div>

                    <div className="p-4 p-md-5 bg-surface bg-opacity-10">
                        <div className="row g-4 mb-5">
                            <div className="col-12 col-md-6">
                                <div className="p-4 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5 h-100 transition-smooth hover-bg-surface">
                                    <div className="d-flex align-items-center gap-2 mb-4 opacity-40">
                                        <Fingerprint size={14} className="text-primary" />
                                        <p className="small fw-black text-muted text-uppercase tracking-widest mb-0" style={{fontSize: '9px'}}>Personnel Identity</p>
                                    </div>
                                    <h4 className="fw-black text-main mb-1 text-uppercase">{orderData?.studentName || 'Protocol Subject Unidentified'}</h4>
                                    <p className="text-muted small mb-0 fw-bold">{orderData?.studentEmail || 'Contact Protocol Missing'}</p>
                                    
                                    <div className="mt-4 pt-4 border-top border-white border-opacity-5">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <p className="small mb-1 text-muted fw-black text-uppercase tracking-widest" style={{fontSize: '8px'}}>Protocol Reference</p>
                                                <code className="text-primary fw-bold small opacity-80">{orderId}</code>
                                            </div>
                                            <div className="p-2 bg-primary bg-opacity-5 rounded-2 border border-primary border-opacity-20">
                                                <ShieldCheck size={16} className="text-primary" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-md-6">
                                <div className="p-4 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-20 h-100 d-flex flex-column justify-content-center text-center shadow-glow-sm transition-smooth">
                                    <p className="small fw-black text-primary text-uppercase tracking-widest mb-3" style={{fontSize: '9px'}}>Strategic Commitment</p>
                                    <div className="d-flex align-items-center justify-content-center gap-2 text-primary">
                                        <IndianRupee size={28} strokeWidth={3} className="opacity-80" />
                                        <h1 className="fw-black mb-0 tracking-tighter" style={{ fontSize: '3rem' }}>
                                            {Number(String(orderData?.amount || '0').replace(/[^0-9.-]+/g,"")).toLocaleString('en-IN')}
                                        </h1>
                                    </div>
                                    <div className="mt-3 d-flex align-items-center justify-content-center gap-2">
                                        <span className="p-1 bg-primary rounded-circle" style={{width: '4px', height: '4px'}}></span>
                                        <p className="text-primary small mb-0 fw-black text-uppercase tracking-widest opacity-60" style={{fontSize: '8px'}}>Certified Inclusive of Taxes</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Aware Interaction Zone */}
                        <div className="mb-5 animate-slide-up">
                            {isPaid ? (
                                <div className="p-5 rounded-4 bg-success bg-opacity-5 border border-success border-opacity-20 text-center glass-morphism">
                                    <div className="p-4 bg-success bg-opacity-10 text-success rounded-circle d-inline-block mb-4 shadow-glow-sm">
                                        <ShieldCheck size={48} />
                                    </div>
                                    <h3 className="fw-black text-main mb-2 text-uppercase tracking-widest">Protocol Authorized</h3>
                                    <p className="text-muted small fw-bold text-uppercase tracking-widest mb-5 opacity-50" style={{fontSize: '9px'}}>Reference Hash: {orderData.paymentGatewayId || orderId}</p>
                                    
                                    <button 
                                        onClick={() => window.location.href = `/pay/${orderId}`}
                                        className="ui-btn ui-btn-primary rounded-pill px-5 py-3 w-100 fw-black text-uppercase tracking-widest shadow-glow"
                                    >
                                        Access Digital Credential <ChevronRight size={18} className="ms-2" />
                                    </button>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-4">
                                    {paymentError && (
                                        <div className="p-4 rounded-4 bg-danger bg-opacity-10 border border-danger border-opacity-20 d-flex gap-3 align-items-start">
                                            <AlertCircle size={18} className="text-danger mt-1 flex-shrink-0" />
                                            <div>
                                                <p className="small fw-black text-danger text-uppercase tracking-widest mb-1" style={{fontSize: '9px'}}>Session Error</p>
                                                <p className="small text-danger mb-0 fw-semibold" style={{opacity: 0.8}}>{paymentError}</p>
                                            </div>
                                        </div>
                                    )}
                                    <button 
                                        onClick={handlePayment}
                                        disabled={paying}
                                        className="ui-btn ui-btn-primary btn-lg rounded-pill px-5 py-4 fw-black text-uppercase tracking-widest shadow-glow w-100 d-flex align-items-center justify-content-center gap-3 transition-smooth hover-scale"
                                        style={{ fontSize: '15px', letterSpacing: '4px', opacity: paying ? 0.7 : 1 }}
                                    >
                                        {paying ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status" />
                                                Connecting to Gateway...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard size={22} strokeWidth={2.5} />
                                                Authorize Payment Now
                                            </>
                                        )}
                                    </button>

                                    
                                    <div className="row g-3">
                                        <div className="col-6">
                                            <div className="p-3 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5 d-flex align-items-center justify-content-center gap-2">
                                                <ShieldCheck size={14} className="text-success" />
                                                <span className="small fw-black text-muted text-uppercase tracking-widest" style={{fontSize: '8px'}}>256-BIT SSL SECURE</span>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="p-3 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5 d-flex align-items-center justify-content-center gap-2">
                                                <Clock size={14} className="text-warning" />
                                                <span className="small fw-black text-muted text-uppercase tracking-widest" style={{fontSize: '8px'}}>EXPIRES IN 48H</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* System Disclaimer */}
                        <div className="p-4 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5 d-flex gap-3">
                            <div className="mt-1">
                                <Zap size={16} className="text-primary opacity-50" />
                            </div>
                            <p className="small text-muted mb-0 fw-semibold opacity-70" style={{lineHeight: '1.6'}}>
                                <strong className="text-main fw-black text-uppercase tracking-widest me-2" style={{fontSize: '9px'}}>NOTICE:</strong> 
                                By initiating authorization, you will be securely routed to the Cashfree gateway protocol. Multiple payment vectors including UPI, Cards, and Net Banking are supported for immediate transaction finalization.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="d-flex align-items-center justify-content-center gap-3 mt-5 opacity-40">
                    <div className="h-1px bg-white bg-opacity-10 flex-grow-1"></div>
                    <p className="text-muted small fw-black tracking-widest text-uppercase mb-0" style={{fontSize: '8px'}}>
                        GYNATRIX OS &copy; 2026 | Automated Financial Protocol
                    </p>
                    <div className="h-1px bg-white bg-opacity-10 flex-grow-1"></div>
                </div>
            </div>

            <style>{`
                .z-index-1 { z-index: 1; }
                .tracking-widest { letter-spacing: 0.15em !important; }
                .tracking-tighter { letter-spacing: -0.05em !important; }
                .dot { width: 8px; height: 8px; border-radius: 50%; }
                .animate-zoom-in { animation: zoomIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
                @keyframes zoomIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default PaymentInstructionPage;

