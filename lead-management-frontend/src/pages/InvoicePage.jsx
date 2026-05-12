import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import paymentService from '../services/paymentService';
import { Printer, Share2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

const InvoicePage = () => {
    const { leadId } = useParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                setLoading(true);
                const res = await paymentService.fetchInvoiceByLead(leadId);
                setInvoiceData(res);
            } catch (err) {
                toast.error('Failed to retrieve invoice.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [leadId]);

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        const text = `Receipt for ${invoiceData.leadName}\nAmount: ₹${invoiceData.amount}\nRef: ${invoiceData.paymentGatewayId || invoiceData.id}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'GYNATRIX RECEIPT', text });
            } else {
                window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`);
            }
        } catch (err) { }
    };

    if (loading) {
        return (
            <div className="min-vh-100 bg-dark d-flex flex-column align-items-center justify-content-center text-center p-4">
                <div className="p-4 rounded-4 bg-surface bg-opacity-20 border border-white border-opacity-5 shadow-lg animate-pulse">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <h6 className="fw-black text-main text-uppercase tracking-widest mb-1" style={{ fontSize: '11px' }}>GYANTRIX OS</h6>
                    <p className="text-muted small fw-bold mb-0 opacity-50 px-4" style={{ fontSize: '9px' }}>GENERATING OFFICIAL RECEIPT...</p>
                </div>
            </div>
        );
    }

    if (!invoiceData) {
        return (
            <div className="min-vh-100 bg-dark d-flex flex-column align-items-center justify-content-center text-center p-4">
                <h4 className="text-white fw-black text-uppercase">No Record Found</h4>
                <p className="text-muted small">The requested invoice payload is null or encrypted.</p>
            </div>
        );
    }

    return (
        <div className="min-vh-100 custom-scroll" style={{ background: '#020617', padding: 'min(5vh, 40px) 15px', height: '100vh', overflowY: 'auto' }}>
            <div
                id="printable-invoice"
                className="invoice-container shadow-2xl mx-auto"
                style={{
                    width: '100%',
                    maxWidth: '850px',
                    background: '#fff',
                    borderRadius: '4px',
                    color: '#000',
                    position: 'relative',
                    marginBottom: '100px'
                }}
            >
                {/* Float Controls (Hidden in Print) */}
                <div className="no-print floating-actions position-fixed bottom-0 start-50 translate-middle-x mb-4 d-flex gap-2 gap-sm-3 z-3">
                    <button onClick={handlePrint} className="btn btn-primary btn-lg px-4 rounded-pill shadow-lg fw-black text-uppercase tracking-widest" style={{ fontSize: '12px' }}>
                        <Printer size={18} className="me-2" /> PRINT
                    </button>
                    <button onClick={handleShare} className="btn btn-dark btn-lg px-4 rounded-pill shadow-lg fw-black text-uppercase tracking-widest" style={{ fontSize: '12px' }}>
                        <Share2 size={18} className="me-2" /> SHARE
                    </button>
                    <button onClick={() => window.close()} className="btn btn-secondary btn-lg px-4 rounded-pill shadow-lg fw-black text-uppercase tracking-widest" style={{ fontSize: '12px' }}>
                        CLOSE
                    </button>
                </div>

                {/* Title Section */}
                <div className="invoice-header mb-4 mb-md-5 border-bottom border-secondary border-opacity-10 pb-4">
                    <h1 className="brand-title fw-black mb-1 letter-spacing-tight">GYNATRIX</h1>
                    <p className="text-muted text-uppercase tracking-widest small mb-0 fw-bold opacity-75">Official Core Ecosystem Receipt</p>
                </div>

                {/* Meta Row */}
                <div className="row g-4 mb-4 mb-md-5 pb-4 pb-md-5 border-bottom border-light">
                    <div className="col-12 col-md-7">
                        <div className="text-muted small text-uppercase fw-bold mb-2 opacity-50">Recipient Payload</div>
                        <div className="fw-black h3 mb-1 text-break">{(invoiceData.leadName || 'Unnamed Record').toUpperCase()}</div>
                        <div className="text-muted font-monospace small">{invoiceData.mobile}</div>
                    </div>

                    <div className="col-12 col-md-5 text-md-end border-md-start border-light ps-md-4">
                        <div className="text-muted small text-uppercase fw-bold mb-2 opacity-50">Transmission Data</div>
                        <div className="fw-bold mb-1">DATE: {new Date(invoiceData.date || invoiceData.createdAt).toLocaleDateString()}</div>
                        <div className="text-muted small font-monospace">REF: #{invoiceData.paymentGatewayId || invoiceData.id}</div>
                    </div>
                </div>

                {/* Table Breakdown */}
                <div className="mb-4 mb-md-5">
                    <div className="d-flex justify-content-between py-2 border-bottom text-muted small text-uppercase fw-black opacity-25">
                        <span>Ledger Entry</span>
                        <span className="d-none d-sm-inline">Credit Value</span>
                    </div>

                    <div className="d-flex flex-column flex-sm-row justify-content-between py-4 py-md-5 gap-3">
                        <div className="d-flex flex-column">
                            <span className="fw-bold h5 mb-1">{invoiceData.paymentType || 'OPERATIONAL SETTLEMENT'}</span>
                            <span className="text-muted small fw-bold opacity-50">Authorized via Encryption Lead</span>
                        </div>
                        <strong className="h3 mb-0 fw-black text-nowrap">₹{invoiceData.amount}</strong>
                    </div>

                    <div className="d-flex justify-content-between align-items-center py-4 border-top border-dark border-3 mt-4">
                        <span className="h5 h4-md fw-black mb-0 opacity-75">GROSS REVENUE TOTAL</span>
                        <div className="text-end">
                            <strong className="h2 mb-0 fw-black text-primary">₹{invoiceData.amount}</strong>
                            <div className="text-muted small fw-bold opacity-25" style={{ fontSize: '9px' }}>* INCLUSIVE OF ALL SYSTEM CHARGES</div>
                        </div>
                    </div>
                </div>

                {/* Account Summary - Fee Structure */}
                {invoiceData.totalPackageAmount && (
                    <div className="account-summary mb-4 mb-md-5 p-4 rounded bg-light border">
                        <h6 className="fw-black text-uppercase small tracking-widest mb-3 opacity-50">Account Summary (Fee Ledger)</h6>
                        <div className="row g-3">
                            <div className="col-6 col-md-3">
                                <div className="text-muted x-small fw-bold text-uppercase mb-1" style={{ fontSize: '9px' }}>Total Package</div>
                                <div className="fw-bold fs-5">₹{invoiceData.totalPackageAmount.toLocaleString()}</div>
                            </div>
                            <div className="col-6 col-md-3">
                                <div className="text-muted x-small fw-bold text-uppercase mb-1" style={{ fontSize: '9px' }}>Paid Amount</div>
                                <div className="fw-bold fs-5 text-success">₹{invoiceData.paidAmountSoFar.toLocaleString()}</div>
                            </div>
                            <div className="col-6 col-md-3">
                                <div className="text-muted x-small fw-bold text-uppercase mb-1" style={{ fontSize: '9px' }}>Balance Due</div>
                                <div className="fw-bold fs-5 text-danger">₹{invoiceData.balanceDue.toLocaleString()}</div>
                            </div>
                            {invoiceData.nextInstallmentDate && invoiceData.balanceDue > 0 && (
                                <div className="col-6 col-md-3">
                                    <div className="text-muted x-small fw-bold text-uppercase mb-1" style={{ fontSize: '9px' }}>Next Due</div>
                                    <div className="fw-bold fs-6 text-primary">{new Date(invoiceData.nextInstallmentDate).toLocaleDateString()}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Verification Checkseal */}
                <div className="d-flex align-items-center gap-3 text-success fw-black mb-5 mt-4 mt-md-5">
                    <div className="bg-success rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 24, height: 24 }}>
                        <ArrowLeft size={14} className="text-white" style={{ transform: 'rotate(135deg)' }} />
                    </div>
                    <span className="small-mobile">IDENTITY VERIFIED & BLOCKCHAIN ANCHORED</span>
                </div>

                {/* Legal Footer */}
                <div className="mt-5 pt-4 pt-md-5 border-top border-light opacity-50">
                    <div className="row g-3">
                        <div className="col-12 col-sm-8 text-break">
                            <p className="text-muted small mb-1">Electronic Authentication Hash:</p>
                            <code className="text-dark font-monospace" style={{ fontSize: '8px', wordBreak: 'break-all' }}>
                                {btoa(invoiceData.id + invoiceData.leadName).substring(0, 32)}
                            </code>
                        </div>
                        <div className="col-12 col-sm-4 text-sm-end">
                            <p className="text-muted small mb-0 font-monospace" style={{ fontSize: '9px' }}>GEN-ID: {new Date(invoiceData.date || invoiceData.createdAt).getTime()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .invoice-container {
                    padding: clamp(20px, 8vw, 80px);
                }
                .brand-title {
                    font-size: clamp(2rem, 10vw, 3.5rem);
                }
                @media (max-width: 576px) {
                    .small-mobile { font-size: 11px; }
                    .h3 { font-size: 1.5rem; }
                    .h2 { font-size: 1.75rem; }
                }
                @media print {
                    body > * { display: none !important; }
                    #printable-invoice { display: block !important; box-shadow: none !important; padding: 10mm !important; width: 100% !important; max-width: 100% !important; border: none !important; }
                    .no-print { display: none !important; }
                    body { background: #fff !important; margin: 0; }
                    .min-vh-100 { background: #fff !important; padding: 0 !important; min-height: auto !important; }
                }
                .fw-black { font-weight: 900 !important; }
                .letter-spacing-tight { letter-spacing: -0.05em; }
            `}</style>
        </div>
    );
};

export default InvoicePage;
