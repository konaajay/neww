import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Printer, Share2, MessageCircle, Download, CreditCard, User, Mail, Calendar, IndianRupee } from 'lucide-react';
import axios from 'axios';

const PaymentPortal = () => {
  const { sessionId: orderId } = useParams(); // URL uses sessionId but it conveys orderId now
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoice();
  }, [orderId]);

  const fetchInvoice = async () => {
    try {
      const res = await axios.get(`/api/public/payments/invoice?order_id=${orderId}`);
      setPayment(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invoice not found or payment pending verification.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const shareWhatsApp = () => {
    const text = `Hello! Here is your payment receipt for ${payment.leadName}:\n\nAmount: ₹${payment.amount}\nStatus: ${payment.status}\nType: ${payment.paymentType}\n\nView Full Invoice: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen grid place-items-center bg-[#0d1117] text-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-secondary fw-bold text-uppercase tracking-widest small">Loading Secure Invoice...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen grid place-items-center bg-[#0d1117] text-white p-4">
      <div className="glass card p-8 text-center max-w-md border-danger border-opacity-20">
        <div className="bg-danger bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl text-danger">⚠️</span>
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight">Access Restricted</h2>
        <p className="text-secondary mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-outline-light rounded-pill px-5 py-2">Retry Loading</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] p-3 p-md-5 print-bg-white">
      <div className="container-md max-w-4xl mx-auto">
        
        {/* Action Header - Hidden in Print */}
        <div className="d-flex justify-content-between align-items-center mb-4 no-print flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-success bg-opacity-20 p-2 rounded-3 text-success">
               <CheckCircle size={20} />
            </div>
            <h5 className="mb-0 fw-black text-white tracking-tight">Payment Verified</h5>
          </div>
          <div className="d-flex gap-2">
             <button onClick={shareWhatsApp} className="btn btn-success border-0 rounded-pill d-flex align-items-center gap-2 px-4 py-2 fw-bold shadow-lg hover-scale">
                <MessageCircle size={18} /> Share
             </button>
             <button onClick={handlePrint} className="btn btn-dark border-secondary border-opacity-25 rounded-pill d-flex align-items-center gap-2 px-4 py-2 fw-bold shadow-lg hover-scale">
                <Printer size={18} /> Print
             </button>
          </div>
        </div>

        {/* The Invoice Document */}
        <div className="bg-white text-dark rounded-4 overflow-hidden shadow-2xl relative overflow-hidden" id="invoice-doc">
          {/* Branded Header */}
          <div className="bg-primary p-4 p-md-5 text-white d-flex justify-content-between align-items-start flex-wrap gap-4">
             <div>
                <h1 className="fw-black mb-1 tracking-tighter" style={{ fontSize: '2.5rem' }}>RECEIPT</h1>
                <p className="opacity-75 mb-0 fw-bold tracking-widest text-uppercase">Official Acknowledgment</p>
             </div>
             <div className="text-md-end">
                <h4 className="fw-black mb-1">GYNATRIX CRM</h4>
                <p className="opacity-75 small mb-0 fw-bold">Admission & Fee Management System</p>
                <div className="mt-3 badge bg-white text-primary px-3 py-2 fw-black">ID: {payment.paymentGatewayId || payment.id}</div>
             </div>
          </div>

          <div className="p-4 p-md-5">
            <div className="row g-5 mb-5">
               <div className="col-12 col-md-6 border-end border-light">
                  <p className="small fw-black text-secondary text-uppercase tracking-widest mb-3">Student Details</p>
                  <div className="d-flex align-items-center gap-3 mb-3">
                     <div className="bg-light p-3 rounded-circle text-primary"><User size={24} /></div>
                     <div>
                        <h5 className="fw-black mb-0">{payment.leadName}</h5>
                        <p className="text-muted small mb-0">{payment.leadEmail}</p>
                     </div>
                  </div>
                  <div className="d-flex align-items-center gap-2 text-muted small px-2">
                     <Mail size={14} /> Registered Communications ID
                  </div>
               </div>
               
               <div className="col-12 col-md-6 text-md-end">
                  <p className="small fw-black text-secondary text-uppercase tracking-widest mb-3">Transaction Info</p>
                  <div className="mb-3">
                     <p className="mb-1 text-muted small fw-bold">Date of Receipt</p>
                     <h6 className="fw-black">{new Date(payment.date || payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h6>
                  </div>
                  <div>
                     <p className="mb-1 text-muted small fw-bold">Payment Method</p>
                     <div className="d-flex align-items-center justify-content-md-end gap-2">
                        <CreditCard size={16} className="text-primary" />
                        <h6 className="fw-black mb-0">{payment.paymentMethod}</h6>
                     </div>
                  </div>
               </div>
            </div>

            {/* Amount Table */}
            <div className="table-responsive mb-5">
               <table className="table table-borderless">
                  <thead>
                     <tr className="border-bottom border-light">
                        <th className="py-3 small fw-black text-secondary text-uppercase tracking-wider">Description</th>
                        <th className="py-3 text-end small fw-black text-secondary text-uppercase tracking-wider">Amount</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr className="border-bottom border-light border-opacity-50">
                        <td className="py-4">
                           <h6 className="fw-black mb-1">Fee Collection - Admission Enrollment</h6>
                           <p className="text-muted small mb-0">Type: <span className="badge bg-primary bg-opacity-10 text-primary fw-black ms-2">{payment.paymentType}</span></p>
                        </td>
                        <td className="py-4 text-end align-middle">
                           <h5 className="fw-black mb-0">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</h5>
                        </td>
                     </tr>
                     <tr>
                        <td className="py-4 text-end">
                           <p className="fw-bold text-muted mb-0 tracking-widest uppercase small">Subtotal</p>
                           <p className="fw-black text-primary mb-0 tracking-widest uppercase small">Grand Total Paid</p>
                        </td>
                        <td className="py-4 text-end">
                           <p className="fw-bold text-muted mb-0">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</p>
                           <div className="d-flex align-items-center justify-content-end gap-2 text-primary">
                             <IndianRupee size={24} />
                             <h2 className="fw-black mb-0" style={{ fontSize: '2.5rem' }}>{parseFloat(payment.amount).toLocaleString('en-IN')}</h2>
                           </div>
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>

            {/* Footer Seal */}
            <div className="pt-5 border-top border-light d-flex justify-content-between align-items-center flex-wrap gap-4">
               <div>
                  <p className="fw-black mb-1 small">Assigned Coordinator</p>
                  <p className="text-muted small mb-0">{payment.assignedTlName || 'System Verified'}</p>
               </div>
               <div className="border border-success border-opacity-25 rounded-4 p-3 d-flex align-items-center gap-3 bg-success bg-opacity-5">
                  <div className="bg-success p-2 rounded-circle text-white shadow-sm"><CheckCircle size={32} /></div>
                  <div>
                    <h5 className="fw-black text-success mb-0 tracking-tighter">DIGITALLY SIGNED</h5>
                    <p className="text-secondary small mb-0 fw-bold fw-italic" style={{ fontSize: '10px' }}>Verified on {new Date().toLocaleTimeString()}</p>
                  </div>
               </div>
            </div>
          </div>
          
          {/* Safety Watermark */}
          <div className="position-absolute opacity-05 d-none d-md-block" style={{ bottom: '-50px', right: '-50px', transform: 'rotate(-15deg)' }}>
             <IndianRupee size={400} className="text-dark" />
          </div>
        </div>
        
        {/* Help Note */}
        <p className="text-secondary text-center mt-4 small fw-bold tracking-widest text-uppercase no-print">This is a computer-generated receipt and requires no physical signature.</p>
      </div>

      <style>{`
        .fw-black { font-weight: 900; }
        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .opacity-05 { opacity: 0.05; }
        .tracking-tighter { letter-spacing: -0.05em; }
        .hover-scale { transition: all 0.3s ease; }
        .hover-scale:hover { transform: translateY(-2px); filter: brightness(1.1); }
        
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0; }
          .min-h-screen { min-height: auto !important; height: auto !important; }
          .bg-white { background: #fff !important; }
          .container-md { max-width: 100% !important; margin: 0 !important; width: 100% !important; }
          .rounded-4 { border-radius: 0 !important; }
          .shadow-2xl { shadow: none !important; }
          .print-bg-white { background: #fff !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default PaymentPortal;

