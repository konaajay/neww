import React, { useState, useEffect } from 'react';
import { X, CreditCard, IndianRupee, Send, AlertCircle, CheckCircle2, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';

const GeneratePaymentLinkModal = ({ show, onClose, lead, role, onConfirm }) => {
    const { isDarkMode } = useTheme();
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (show && lead) {
            // Default amount or logic if needed
            setAmount('');
            setNotes('');
        }
    }, [show, lead]);

    if (!show || !lead) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirm(lead.id, {
                amount: parseFloat(amount),
                paymentMethod,
                note: notes,
                type: 'MANUAL_LINK'
            });
            toast.success('Manual payment instruction generated');
            onClose();
        } catch (err) {
            console.error('Failed to generate payment instruction:', err);
            toast.error('Failed to generate instruction');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay d-flex align-items-center justify-content-center p-3" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9999
        }}>
            <div className={`modal-content shadow-2xl rounded-4 border overflow-hidden animate-zoom-in ${isDarkMode ? 'bg-dark border-white border-opacity-10' : 'bg-white border-light'}`} style={{ maxWidth: '500px', width: '100%' }}>
                {/* Header */}
                <div className="p-4 d-flex justify-content-between align-items-center border-bottom border-light border-opacity-10">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h5 className="mb-0 fw-black text-uppercase tracking-widest text-main" style={{ fontSize: '14px' }}>Generate Manual Request</h5>
                            <p className="mb-0 text-muted small fw-bold opacity-50">LEAD: {lead.name?.toUpperCase()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-link p-2 text-muted hover-scale border-0 shadow-none">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4">
                    <form onSubmit={handleSubmit}>
                        {/* Status Ribbon */}
                        <div className="mb-4 p-3 bg-warning bg-opacity-10 border border-warning border-opacity-20 rounded-3 d-flex align-items-start gap-3">
                            <AlertCircle size={18} className="text-warning mt-1" />
                            <div>
                                <p className="mb-0 text-warning fw-bold small">Manual Payment Mode Active</p>
                                <p className="mb-0 text-muted small opacity-75" style={{ fontSize: '11px' }}>Cashfree integration is restricted. You are generating a manual payment entry for tracking.</p>
                            </div>
                        </div>

                        <div className="row g-4">
                            <div className="col-12">
                                <label className="form-label text-muted fw-black small text-uppercase tracking-widest mb-2" style={{ fontSize: '10px' }}>Requested Amount (₹)</label>
                                <div className="input-group input-group-lg border rounded-3 overflow-hidden transition-all focus-within:border-primary">
                                    <span className="input-group-text bg-transparent border-0 text-primary">
                                        <IndianRupee size={20} />
                                    </span>
                                    <input
                                        type="number"
                                        className="form-control bg-transparent border-0 text-main fw-black shadow-none"
                                        placeholder="Enter amount to collect"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="col-12">
                                <label className="form-label text-muted fw-black small text-uppercase tracking-widest mb-2" style={{ fontSize: '10px' }}>Preferred Collection Channel</label>
                                <div className="d-flex gap-2 flex-wrap">
                                    {['UPI', 'BANK', 'CASH', 'CARD'].map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={`px-3 py-2 rounded-pill small fw-black tracking-widest border transition-all ${
                                                paymentMethod === method 
                                                ? 'bg-primary text-white border-primary shadow-glow' 
                                                : 'bg-surface bg-opacity-20 text-muted border-white border-opacity-10 hover:bg-opacity-30'
                                            }`}
                                            style={{ fontSize: '10px' }}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="col-12">
                                <label className="form-label text-muted fw-black small text-uppercase tracking-widest mb-2" style={{ fontSize: '10px' }}>Collection Notes / Instructions</label>
                                <textarea
                                    className="form-control bg-surface bg-opacity-20 border border-white border-opacity-10 text-main shadow-none p-3 rounded-3 small"
                                    rows="3"
                                    placeholder="Add payment specifics, installment details, or reference IDs..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-top border-light border-opacity-10 d-flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="ui-btn ui-btn-secondary w-100 py-3 rounded-pill fw-black text-uppercase tracking-widest"
                                style={{ fontSize: '11px' }}
                            >
                                Abort
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="ui-btn ui-btn-primary w-100 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-glow d-flex align-items-center justify-content-center gap-2"
                                style={{ fontSize: '11px' }}
                            >
                                {isSubmitting ? (
                                    <div className="spinner-border spinner-border-sm" role="status" />
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Authorize Request
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="p-3 bg-primary bg-opacity-5 text-center border-top border-primary border-opacity-10">
                    <div className="d-flex align-items-center justify-content-center gap-2 text-primary opacity-75">
                        <ShieldCheck size={14} />
                        <span className="fw-bold small text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Manual Ledger Protocol Enforced</span>
                    </div>
                </div>
            </div>

            <style>{`
                .animate-zoom-in { animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .focus-within\\:border-primary:focus-within { border-color: var(--primary-color) !important; }
                .text-main { color: ${isDarkMode ? '#ffffff' : '#1e293b'}; }
                .bg-dark { background-color: #0f172a; }
                .bg-surface { background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'}; }
                .shadow-glow { box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.3); }
            `}</style>
        </div>
    );
};

export default GeneratePaymentLinkModal;
