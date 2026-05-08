import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IndianRupee, ShieldCheck, CreditCard, Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';

const PaymentInstructionPage = () => {
    const { orderId } = useParams();
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                // Use a public endpoint to get order details
                const res = await axios.get(`http://${window.location.hostname}:8081/api/public/payments/order/${orderId}`);
                setOrderData(res.data);
            } catch (err) {
                setError("Payment details could not be retrieved. Please verify the link or contact support.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrderDetails();
    }, [orderId]);

    const handlePayment = () => {
        if (!orderData?.paymentSessionId) return;
        
        const cashfree = new window.Cashfree({
            mode: "sandbox" // Change to "production" for live
        });
        
        cashfree.checkout({
            paymentSessionId: orderData.paymentSessionId,
            redirectTarget: "_self" 
        });
    };

    if (loading) return (
        <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
            <div className="text-center">
                <div className="spinner-border text-primary mb-3"></div>
                <p className="text-muted fw-bold">Verifying Secure Payment Protocol...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-4">
            <div className="card shadow-lg border-0 rounded-4 p-5 text-center" style={{ maxWidth: '500px' }}>
                <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-block mb-4">
                    <AlertCircle size={48} />
                </div>
                <h3 className="fw-black mb-3">Link Invalid or Expired</h3>
                <p className="text-muted mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary rounded-pill px-4 fw-bold">Retry Verification</button>
            </div>
        </div>
    );

    return (
        <div className="min-vh-100 bg-light py-5 px-3">
            <div className="container" style={{ maxWidth: '800px' }}>
                <div className="card shadow-2xl border-0 rounded-4 overflow-hidden">
                    {/* Header */}
                    <div className="bg-primary p-4 p-md-5 text-white text-center">
                        <h2 className="fw-black mb-2 tracking-tighter" style={{ fontSize: '2rem' }}>ENROLLMENT PROTOCOL</h2>
                        <p className="opacity-75 mb-0 fw-bold tracking-widest text-uppercase" style={{ fontSize: '10px' }}>Secure Payment Gateway</p>
                    </div>

                    <div className="p-4 p-md-5 bg-white">
                        <div className="row g-4 mb-5">
                            <div className="col-12 col-md-6">
                                <div className="p-4 rounded-4 bg-light h-100">
                                    <p className="small fw-black text-muted text-uppercase tracking-widest mb-3">Student Identity</p>
                                    <h5 className="fw-black mb-1">{orderData.studentName}</h5>
                                    <p className="text-muted small mb-0">{orderData.studentEmail}</p>
                                    <div className="mt-3 pt-3 border-top border-secondary border-opacity-10">
                                        <p className="small mb-1 text-muted fw-bold">Reference ID</p>
                                        <code className="text-primary fw-bold">{orderId}</code>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-md-6">
                                <div className="p-4 rounded-4 bg-primary bg-opacity-5 h-100 border border-primary border-opacity-10 d-flex flex-column justify-content-center text-center">
                                    <p className="small fw-black text-primary text-uppercase tracking-widest mb-2">Commitment Amount</p>
                                    <div className="d-flex align-items-center justify-content-center gap-2 text-primary">
                                        <IndianRupee size={32} strokeWidth={3} />
                                        <h1 className="fw-black mb-0" style={{ fontSize: '3.5rem' }}>{orderData.amount}</h1>
                                    </div>
                                    <p className="text-muted small mb-0 mt-2 fw-bold">All inclusive of taxes</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Button or Success Message */}
                        <div className="text-center mb-5">
                            {['PAID', 'SUCCESS'].includes(orderData.status?.toUpperCase()) ? (
                                <div className="p-4 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-20 animate-fade-in">
                                    <div className="bg-success text-white p-3 rounded-circle d-inline-block mb-3 shadow-glow">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <h3 className="fw-black text-success mb-2">PAYMENT COMPLETED</h3>
                                    <p className="text-muted small fw-bold text-uppercase tracking-widest mb-4">Transaction Reference: {orderData.paymentGatewayId || orderId}</p>
                                    <button 
                                        onClick={() => window.location.href = `/pay/${orderId}`}
                                        className="btn btn-outline-success rounded-pill px-4 fw-black text-uppercase tracking-widest"
                                        style={{ fontSize: '11px' }}
                                    >
                                        View Digital Receipt
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button 
                                        onClick={handlePayment}
                                        className="btn btn-primary btn-lg rounded-pill px-5 py-3 fw-black text-uppercase tracking-widest shadow-lg hover-scale w-100"
                                        style={{ fontSize: '14px' }}
                                    >
                                        <CreditCard size={20} className="me-2" />
                                        Authorize Payment Now
                                    </button>
                                    <div className="d-flex align-items-center justify-content-center gap-4 mt-4 opacity-50">
                                        <div className="d-flex align-items-center gap-1 small fw-bold">
                                            <ShieldCheck size={14} /> SECURE 256-BIT SSL
                                        </div>
                                        <div className="d-flex align-items-center gap-1 small fw-bold">
                                            <Clock size={14} /> EXPIRES IN 48H
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Note */}
                        <div className="p-3 bg-light rounded-3 small text-muted border text-center">
                            <strong>Note:</strong> By clicking the button above, you will be redirected to the secure Cashfree checkout page to complete your transaction via UPI, Card, or Net Banking.
                        </div>
                    </div>
                </div>
                
                <p className="text-center text-muted mt-4 small fw-bold tracking-widest text-uppercase">
                    GYNATRIX CRM &copy; 2026 | Automated Payment Services
                </p>
            </div>

            <style>{`
                .fw-black { font-weight: 900; }
                .tracking-widest { letter-spacing: 0.1em; }
                .tracking-tighter { letter-spacing: -0.05em; }
                .hover-scale { transition: all 0.3s ease; }
                .hover-scale:hover { transform: translateY(-3px); box-shadow: 0 1rem 3rem rgba(0,0,0,0.175) !important; }
                .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); }
            `}</style>
        </div>
    );
};

export default PaymentInstructionPage;
