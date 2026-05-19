import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import paymentService from '../services/paymentService';
import { Printer, Share2 } from 'lucide-react';
import { toast } from 'react-toastify';

// Number to Words Converter for Receipt Authenticity
const numberToWords = (num) => {
    if (!num || isNaN(num)) return '*** ZERO RUPEES ONLY ***';
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const g = ['', 'thousand', 'million', 'billion', 'trillion'];
    
    const helper = (n) => {
        let str = '';
        if (n >= 100) {
            str += a[Math.floor(n / 100)] + ' hundred ';
            n %= 100;
        }
        if (n >= 20) {
            str += b[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            str += a[n] + ' ';
        }
        return str.trim();
    };

    let n = Math.floor(num);
    if (n === 0) return '*** ZERO RUPEES ONLY ***';
    
    let parts = [];
    let i = 0;
    while (n > 0) {
        let rem = n % 1000;
        if (rem > 0) {
            let s = helper(rem);
            if (i > 0) s += ' ' + g[i];
            parts.unshift(s);
        }
        n = Math.floor(n / 1000);
        i++;
    }
    return '*** ' + parts.join(' ').toUpperCase() + ' RUPEES ONLY ***';
};

const InvoicePage = () => {
    const { leadId, paymentId } = useParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                setLoading(true);
                let res;
                if (paymentId) {
                    res = await paymentService.fetchInvoiceByPaymentId(paymentId);
                } else {
                    res = await paymentService.fetchInvoiceByLead(leadId);
                }
                setInvoiceData(res);
            } catch (err) {
                toast.error('Failed to retrieve invoice.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [leadId, paymentId]);

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        const element = document.getElementById('printable-invoice');
        if (!element) {
            toast.error("Invoice element not found.");
            return;
        }

        toast.info("Generating PDF receipt...", { autoClose: 2000 });

        try {
            // Dynamically load html2pdf from CDN if not already loaded
            if (!window.html2pdf) {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                document.body.appendChild(script);
                await new Promise((resolve) => {
                    script.onload = resolve;
                });
            }

            const cleanFileName = `Receipt_${(invoiceData.leadName || 'Record').replace(/\s+/g, '_')}.pdf`;
            const opt = {
                margin:       10,
                filename:     cleanFileName,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfBlob = await window.html2pdf().from(element).set(opt).outputPdf('blob');
            const pdfFile = new File([pdfBlob], cleanFileName, { type: 'application/pdf' });
            const shareText = `Receipt for ${invoiceData.leadName}\nAmount: ₹${invoiceData.amount.toLocaleString()}\nRef: ${invoiceData.paymentGatewayId || invoiceData.id}`;

            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: 'GYANTRIX RECEIPT',
                    text: shareText
                });
                toast.success("Receipt shared successfully!");
            } else {
                // Desktop fallback: Download locally and open WhatsApp Web instructions
                const downloadUrl = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = cleanFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                toast.success("Receipt PDF downloaded! Opening WhatsApp to share...");
                
                const formattedMobile = invoiceData.mobile ? invoiceData.mobile.replace(/[^0-9]/g, '') : '';
                const whatsappBase = formattedMobile.length >= 10 
                    ? `https://web.whatsapp.com/send?phone=${formattedMobile.length === 10 ? '91' + formattedMobile : formattedMobile}&text=`
                    : 'https://web.whatsapp.com/send?text=';

                const fullUrl = `${whatsappBase}${encodeURIComponent(shareText + "\n\n📄 (Please drag and drop the downloaded receipt PDF here to share it)")}`;
                window.open(fullUrl, '_blank');
            }
        } catch (err) {
            console.error("PDF generation or sharing failed:", err);
            toast.error("Failed to generate PDF receipt. Please use the Print option instead.");
        }
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

            <div
                id="printable-invoice"
                className="invoice-container mx-auto shadow-lg"
                style={{
                    width: '100%',
                    maxWidth: '720px',
                    background: '#fff',
                    color: '#000',
                    position: 'relative',
                    border: '2px solid #000',
                    padding: '24px',
                    fontFamily: '"Courier New", Courier, monospace',
                    marginBottom: '100px'
                }}
            >
                {/* Header / Brand Logo */}
                <div className="text-center mb-4">
                    <div className="fw-black fs-5 text-uppercase tracking-widest mb-2" style={{ letterSpacing: '2px', borderBottom: '2px solid #000', pb: '5px' }}>
                        ONLINE PAYMENT RECEIPT
                    </div>
                    <div className="d-flex justify-content-center align-items-center gap-2 mb-2 mt-2">
                        <img src="/logo.png" alt="Gyantrix Logo" style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
                    </div>
                    <div className="small fw-bold text-uppercase opacity-75">Gyantrix Academic Core Ecosystem</div>
                </div>

                {/* Candidate & Program Grid Table */}
                <table className="table table-bordered border-dark mb-0 text-start" style={{ tableLayout: 'fixed', width: '100%', fontSize: '12px' }}>
                    <tbody>
                        <tr>
                            <td className="w-50 py-2 px-3 border-dark">
                                <span className="text-muted fw-bold">Univ.Reg.Number :</span> <strong className="float-end">GY-{invoiceData.leadId || invoiceData.id}</strong>
                            </td>
                            <td className="w-50 py-2 px-3 border-dark">
                                <span className="text-muted fw-bold">Program :</span> <strong className="float-end">{(invoiceData.courseName || 'Professional Program').toUpperCase()}</strong>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-2 px-3 border-dark">
                                <span className="text-muted fw-bold">Name Of Candidate :</span> <strong>{(invoiceData.leadName || 'Unnamed Record').toUpperCase()}</strong>
                            </td>
                            <td className="py-2 px-3 border-dark">
                                <span className="text-muted fw-bold">Mobile No :</span> <strong className="float-end">{invoiceData.mobile}</strong>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Receipt and Date Metadata */}
                <table className="table table-bordered border-dark border-top-0 mb-0 text-start" style={{ tableLayout: 'fixed', width: '100%', fontSize: '12px' }}>
                    <tbody>
                        <tr className="bg-light">
                            <td className="w-50 py-2 px-3 border-dark">
                                <span className="fw-bold">Receipt No :</span> <strong>{invoiceData.paymentGatewayId || ('REC-' + invoiceData.id)}</strong>
                            </td>
                            <td className="w-50 py-2 px-3 border-dark text-end">
                                <span className="fw-bold">Date :</span> <strong>{new Date(invoiceData.date || invoiceData.createdAt).toLocaleDateString()}</strong>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Account Head Breakdown */}
                <table className="table table-bordered border-dark border-top-0 mb-0 text-center" style={{ width: '100%', fontSize: '12px' }}>
                    <thead>
                        <tr className="bg-light">
                            <th className="border-dark py-2" style={{ width: '10%' }}>S.NO</th>
                            <th className="border-dark py-2 text-start px-3" style={{ width: '60%' }}>Account Head</th>
                            <th className="border-dark py-2 text-end px-3" style={{ width: '30%' }}>Amount (INR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border-dark py-3">1</td>
                            <td className="border-dark py-3 text-start px-3">
                                <span className="fw-bold">{(invoiceData.paymentType || 'TUITION FEE SETTLEMENT').toUpperCase()}</span>
                                <div className="text-muted small mt-2" style={{ fontSize: '10px', lineHeight: '1.4' }}>
                                    <strong>Billing Invoicer:</strong> {invoiceData.businessName || 'Gyantrix'}<br />
                                    {invoiceData.businessAddress && <><strong>Address:</strong> {invoiceData.businessAddress}<br /></>}
                                    {invoiceData.taxId && <span className="text-primary fw-bold">{invoiceData.taxId}</span>}
                                </div>
                            </td>
                            <td className="border-dark py-3 text-end px-3 fw-bold">₹{invoiceData.amount.toLocaleString()}</td>
                        </tr>
                        <tr className="fw-bold bg-light">
                            <td colSpan="2" className="border-dark py-2 text-end px-3">Total :</td>
                            <td className="border-dark py-2 text-end px-3">₹{invoiceData.amount.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" className="border-dark py-3 text-start px-3 font-monospace" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                <span className="text-muted">In Words :</span> <strong>{numberToWords(invoiceData.amount)}</strong>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Terms and COMPUTER GENERATION Box */}
                <table className="table table-bordered border-dark border-top-0 mb-0 text-start" style={{ tableLayout: 'fixed', width: '100%', fontSize: '10px' }}>
                    <tbody>
                        <tr>
                            <td className="w-50 py-2 px-3 border-dark text-muted italic">*Terms & Conditions Apply</td>
                            <td className="w-50 py-2 px-3 border-dark text-end text-muted italic">*Payment subject to realization</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="py-2 px-3 border-dark text-center fw-bold bg-light" style={{ fontSize: '10px' }}>
                                This is a Computer Generated Receipt. No signature is Required . Generated On . {new Date().toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Account Summary (Fee Ledger) */}
                {invoiceData.totalPackageAmount && (
                    <table className="table table-bordered border-dark border-top-0 mb-0 text-start mt-3" style={{ tableLayout: 'fixed', width: '100%', fontSize: '11px' }}>
                        <tbody>
                            <tr className="bg-light">
                                <td colSpan="3" className="py-2 px-3 border-dark text-center fw-bold text-uppercase tracking-wider" style={{ fontSize: '10px' }}>
                                    Account Summary (Fee Ledger)
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 px-3 border-dark">
                                    <span className="text-muted">Total Package:</span> <strong className="float-end">₹{invoiceData.totalPackageAmount.toLocaleString()}</strong>
                                </td>
                                <td className="py-2 px-3 border-dark">
                                    <span className="text-muted">Paid So Far:</span> <strong className="float-end text-success">₹{invoiceData.paidAmountSoFar.toLocaleString()}</strong>
                                </td>
                                <td className="py-2 px-3 border-dark">
                                    <span className="text-muted">Balance Due:</span> <strong className="float-end text-danger">₹{invoiceData.balanceDue.toLocaleString()}</strong>
                                </td>
                            </tr>
                            {invoiceData.nextInstallmentDate && invoiceData.balanceDue > 0 && (
                                <tr className="bg-light bg-opacity-50">
                                    <td colSpan="3" className="py-2 px-3 border-dark text-center font-monospace">
                                        NEXT PLANNED INSTALLMENT DUE DATE: <strong className="text-primary">{new Date(invoiceData.nextInstallmentDate).toLocaleDateString()}</strong>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                @media print {
                    .no-print, .no-print * { display: none !important; }
                    body { background: #fff !important; margin: 0; padding: 0; }
                    #printable-invoice { 
                        display: block !important; 
                        box-shadow: none !important; 
                        border: 2px solid #000 !important; 
                        padding: 10mm !important; 
                        width: 100% !important; 
                        max-width: 100% !important; 
                        margin: 0 auto !important; 
                    }
                    .min-vh-100 { 
                        background: #fff !important; 
                        padding: 0 !important; 
                        min-height: auto !important; 
                        height: auto !important; 
                        overflow: visible !important; 
                    }
                }
                .fw-black { font-weight: 900 !important; }
            `}</style>
        </div>
    );
};

export default InvoicePage;
