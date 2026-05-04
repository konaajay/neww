import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Home, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import api from '../api/api';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [status, setStatus] = useState('loading');
    const [payment, setPayment] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 12;

    useEffect(() => {
        if (orderId) {
            verifyStatus();
        } else {
            setStatus('error');
        }
    }, [orderId]);

    // Auto-polling logic for PENDING state
    useEffect(() => {
        let interval;
        if (status === 'PENDING' && retryCount < MAX_RETRIES) {
            interval = setInterval(() => {
                setRetryCount(prev => prev + 1);
                verifyStatus();
            }, 3000); // Check every 3 seconds
        }
        return () => clearInterval(interval);
    }, [status, retryCount]);

    const verifyStatus = async () => {
        try {
            const res = await api.get(`/payments/status?order_id=${orderId}`);
            setPayment(res.data);
            setStatus(res.data.status);
        } catch (err) {
            console.error("Status check failed", err);
            if (status === 'loading') setStatus('error');
        }
    };

    const isSuccess = status === 'SUCCESS';
    const isFailed = status === 'FAILED' || (status === 'PENDING' && retryCount >= MAX_RETRIES);

    if (status === 'loading' || (status === 'PENDING' && !isFailed)) {
        return (
            <div className="min-h-screen d-flex flex-column align-items-center justify-content-center bg-dark text-white px-4">
                <div className="text-center max-w-sm">
                    <div className="position-relative d-inline-block mb-4">
                        <Loader2 size={80} className="animate-spin text-primary opacity-50" />
                        <div className="position-absolute top-50 start-50 translate-middle">
                            <span className="fw-bold text-primary">{retryCount + 1}</span>
                        </div>
                    </div>
                    <h2 className="h3 fw-bold mb-3">Verifying Transaction...</h2>
                    <p className="text-muted small">
                        We are syncing with the bank. This page will update automatically.
                        Please do not refresh or close this window.
                    </p>
                    <div className="mt-4 w-100 bg-secondary bg-opacity-20 rounded-pill h-1 overflow-hidden">
                        <div className="h-100 bg-primary animate-pulse" style={{ width: `${((retryCount + 1) / MAX_RETRIES) * 100}%` }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark p-4">
            <div className="card shadow-2xl border-0 overflow-hidden bg-secondary bg-opacity-10 border border-white border-opacity-10 rounded-2xl w-100" style={{ maxWidth: '440px' }}>
                {/* Header Section */}
                <div className={`p-5 text-center ${isSuccess ? 'bg-success bg-opacity-5' : 'bg-danger bg-opacity-5'}`}>
                    <div className={`d-inline-flex p-3 rounded-circle mb-4 ${isSuccess ? 'bg-success bg-opacity-20' : 'bg-danger bg-opacity-20'}`}>
                        {isSuccess ? (
                            <CheckCircle size={56} className="text-success" />
                        ) : (
                            <XCircle size={56} className="text-danger" />
                        )}
                    </div>
                    <h1 className="h2 fw-bold text-white mb-2">
                        {isSuccess ? 'Payment Success' : 'Payment Verification Delayed'}
                    </h1>
                    <p className="text-muted small px-3">
                        {isSuccess
                            ? "Congratulations! Your admission is confirmed. Check your email for login credentials."
                            : "We couldn't confirm your transaction instantly. If money was debited, it will sync automatically within 5-10 minutes."}
                    </p>
                </div>

                {/* Details Section */}
                <div className="p-4 pt-0">
                    <div className="bg-dark bg-opacity-30 rounded-3 p-4 mb-4 border border-white border-opacity-5">
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted small text-uppercase fw-bold">Order Reference</span>
                            <span className={`small fw-bold px-2 py-0.5 rounded ${isSuccess ? 'bg-success bg-opacity-20 text-success' : 'bg-warning bg-opacity-20 text-warning'}`}>
                                {status}
                            </span>
                        </div>
                        <p className="font-monospace small text-white opacity-75 mb-3 select-all">{orderId}</p>

                        {payment && (
                            <div className="d-flex justify-content-between align-items-center border-top border-white border-opacity-5 pt-3">
                                <div>
                                    <p className="text-muted small mb-0">Paid Amount</p>
                                    <p className="fw-bold mb-0 text-white">₹{payment.amount}</p>
                                </div>
                                <div className="text-end">
                                    <p className="text-muted small mb-0">Date</p>
                                    <p className="small mb-0 text-white">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="d-flex flex-column gap-3">
                        {isSuccess ? (
                            <>
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await api.get(`/public/payments/invoice?order_id=${orderId}`);
                                            // Handle download or print
                                            const printContent = `
                                                <div style="font-family: sans-serif; padding: 40px; border: 1px solid #eee; max-width: 600px; margin: auto;">
                                                    <h2 style="color: #4F46E5;">LMS PAYMENT RECEIPT</h2>
                                                    <hr/>
                                                    <p><b>Order ID:</b> ${res.data.gatewayOrderId}</p>
                                                    <p><b>Date:</b> ${new Date().toLocaleString()}</p>
                                                    <p><b>Student:</b> ${res.data.leadName || 'N/A'}</p>
                                                    <p><b>Amount:</b> ₹${res.data.amount}</p>
                                                    <p><b>Status:</b> SUCCESSFUL</p>
                                                    <hr/>
                                                    <p style="font-size: 10px; color: #666;">This is a computer-generated receipt.</p>
                                                </div>
                                            `;
                                            const win = window.open('', '_blank');
                                            win.document.write(printContent);
                                            win.print();
                                        } catch (e) {
                                            alert('Receipt currently unavailable. Please check your email.');
                                        }
                                    }}
                                    className="btn btn-outline-light btn-lg rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                                >
                                    <div className="p-1">📄</div> Download Receipt
                                </button>
                                <Link to="/login" className="btn btn-primary btn-lg rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2">
                                    <Home size={20} /> Back to Home
                                </Link>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { setRetryCount(0); verifyStatus(); }} className="btn btn-outline-primary py-3 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2">
                                    <RefreshCw size={20} /> Retry Verification
                                </button>
                                <Link to="/login" className="btn btn-link text-muted opacity-50 text-decoration-none small text-center mt-2 d-flex align-items-center justify-content-center gap-2">
                                    Return to Home <ArrowRight size={14} />
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default PaymentSuccess;
