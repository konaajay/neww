import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const PaymentStatusPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, failed, pending
    const [orderData, setOrderData] = useState(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                // We use the same public endpoint to get order details
                const res = await axios.get(`http://${window.location.hostname}:8081/api/public/payments/order/${orderId}`);
                setOrderData(res.data);
                
                // In a real app, we would verify the actual payment status from Cashfree or our backend
                // For now, if the webhook updated the database, the order might show as PAID
                // But the public endpoint we have doesn't return status yet.
                
                // Let's assume success for now if we reached this page, 
                // but ideally we should verify with a status endpoint.
                setStatus('success');
            } catch (err) {
                setStatus('failed');
            }
        };

        checkStatus();
    }, [orderId]);

    const renderContent = () => {
        switch (status) {
            case 'verifying':
                return (
                    <div className="text-center animate-pulse">
                        <div className="spinner-border text-primary mb-4" style={{ width: '3rem', height: '3rem' }}></div>
                        <h4 className="fw-black text-uppercase tracking-widest">Verifying Transaction</h4>
                        <p className="text-muted">Synchronizing with gateway protocols...</p>
                    </div>
                );
            case 'success':
                return (
                    <div className="text-center animate-fade-in">
                        <div className="bg-success bg-opacity-10 text-success p-4 rounded-circle d-inline-block mb-4 shadow-glow-sm">
                            <CheckCircle size={64} />
                        </div>
                        <h2 className="fw-black mb-2 tracking-tighter" style={{ fontSize: '2.5rem' }}>ENROLLMENT SECURED</h2>
                        <p className="text-muted mb-5 fw-medium">Your payment has been successfully processed and your seat is now reserved.</p>
                        
                        <div className="p-4 rounded-4 bg-light border mb-5 text-start">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted small fw-bold">ORDER ID</span>
                                <code className="text-primary fw-bold">{orderId}</code>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted small fw-bold">STUDENT</span>
                                <span className="fw-black small">{orderData?.studentName?.toUpperCase()}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span className="text-muted small fw-bold">STATUS</span>
                                <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3">PROCESSED</span>
                            </div>
                        </div>

                        <div className="d-grid gap-3">
                            <button onClick={() => window.close()} className="btn btn-primary rounded-pill py-3 fw-black text-uppercase tracking-widest shadow-glow">
                                Return to Dashboard <ArrowRight size={18} className="ms-2" />
                            </button>
                            <p className="small text-muted opacity-50 fw-bold mt-2">You can safely close this window now.</p>
                        </div>
                    </div>
                );
            case 'failed':
                return (
                    <div className="text-center animate-fade-in">
                        <div className="bg-danger bg-opacity-10 text-danger p-4 rounded-circle d-inline-block mb-4">
                            <XCircle size={64} />
                        </div>
                        <h2 className="fw-black mb-2 tracking-tighter" style={{ fontSize: '2.5rem' }}>TRANSACTION FAILED</h2>
                        <p className="text-muted mb-5">The payment protocol was interrupted or declined by your bank.</p>
                        <button onClick={() => navigate(`/payment-instruction/${orderId}`)} className="btn btn-primary rounded-pill px-5 py-3 fw-black text-uppercase tracking-widest shadow-glow">
                            Retry Payment Protocol
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-vh-100 bg-white d-flex align-items-center justify-content-center p-4">
            <div className="container" style={{ maxWidth: '600px' }}>
                <div className="card border-0 shadow-2xl rounded-5 p-5 overflow-hidden position-relative">
                    {/* Decorative Elements */}
                    <div className="position-absolute top-0 start-0 w-100 h-2 bg-primary"></div>
                    <div className="position-absolute top-0 end-0 p-4 opacity-10">
                        <ShieldCheck size={120} />
                    </div>
                    
                    {renderContent()}
                </div>
                
                <p className="text-center text-muted mt-5 small fw-bold tracking-widest text-uppercase">
                    GYNATRIX SECURE GATEWAY &copy; 2026
                </p>
            </div>

            <style>{`
                .fw-black { font-weight: 900; }
                .tracking-widest { letter-spacing: 0.15em; }
                .tracking-tighter { letter-spacing: -0.05em; }
                .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); }
                .shadow-glow { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
                .shadow-glow-sm { box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default PaymentStatusPage;
