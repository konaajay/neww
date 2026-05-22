import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, XCircle, ChevronRight, Shield, User, Loader2, Database } from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * High-Performance OldLeadsIngestion Terminal
 * Handles massive legacy data propagation with real-time validation feedback and instant React Query invalidation.
 */
const OldLeadsIngestion = ({ onSuccess }) => {
    const { user: currentUser } = useAuth();
    const { isDarkMode } = useTheme();

    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [apiError, setApiError] = useState(null);

    const handleFileChange = (e) => {
        setApiError(null);
        const selectedFile = e.target.files?.[0];
        if (selectedFile && (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv')) {
            setFile(selectedFile);
        } else if (selectedFile) {
            toast.error('Manifest must be in CSV format.');
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!file) { toast.warning('No validated manifest found'); return; }

        setUploading(true);
        setApiError(null);
        try {
            const response = await adminService.uploadOldLeads(file);
            const data = response?.data || response;
            setUploadResult(data);

            if (data && data.successfulImports > 0) {
                toast.success(`Successfully Ingested ${data.successfulImports} Old Leads`);
                onSuccess?.();
            } else if (data && data.failedImports > 0) {
                toast.warning(`Ingestion completed with ${data.failedImports} failures`);
            }
        } catch (err) {
            console.error('Old Leads Upload Error Context:', err);
            const errorMsg = err.response?.data?.message || err.message || 'System logic error during propagation';
            setApiError(errorMsg);
            toast.error('Upload Process Failed');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Payment dat Date,Student Name,Course Name,MAIL-ID,assignedTo,Total Fee,Paid Amount,Pending Amount,Payment Mode,Payment type,Follow-up Date = emi due date,Status,Remarks\n" +
            "3/5/2026,Kamadula sangeetha,HR,sangeethahosanna579@gmail.com,Arjun,3000,3000,0,Company Ink,Post payment,N/A,Paid,Completed\n" +
            "7/5/2026,Manda Sai Deepthi,FINANCE,deepthishiva23@gmail.com,Sai vardhan,5000,500,4500,Company Ink,prepayment,17-05-2026,Pending,required";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "old_leads_template_with_ids.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReset = () => {
        setFile(null);
        setUploadResult(null);
        setApiError(null);
    };

    if (uploadResult) {
        return (
            <div className={`p-4 p-md-5 h-100 animate-zoom-in ${isDarkMode ? 'bg-slate-900 border-white border-opacity-5' : 'bg-white border-dark border-opacity-5'} border-top`}>
                <div className="text-center mb-5">
                    <div className="d-inline-flex p-4 bg-success bg-opacity-10 text-success rounded-circle mb-4 shadow-glow scale-up">
                        <CheckCircle2 size={56} strokeWidth={1} />
                    </div>
                    <h3 className={`fw-black mb-2 text-uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-dark'}`}>Ingestion Report</h3>
                    <p className="text-muted small mb-0 fw-bold opacity-60">Batch ID: {uploadResult.batchId}</p>
                </div>

                <div className={`p-4 rounded-5 border mb-5 ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-10' : 'bg-light border-dark border-opacity-10'}`}>
                    <div className="row g-3">
                        <div className="col-12 col-md-4">
                            <div className={`p-3 rounded-4 h-100 ${isDarkMode ? 'bg-black bg-opacity-20' : 'bg-white border'}`}>
                                <p className="text-muted small mb-1 fw-black opacity-50">TOTAL ROWS</p>
                                <h4 className={`mb-0 fw-black ${isDarkMode ? 'text-white' : 'text-dark'}`}>{uploadResult.totalRows || 0}</h4>
                            </div>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className={`p-3 rounded-4 h-100 ${isDarkMode ? 'bg-black bg-opacity-20' : 'bg-white border'}`}>
                                <p className="text-success small mb-1 fw-black opacity-50">SUCCESSFUL</p>
                                <h4 className="mb-0 fw-black text-success">{uploadResult.successfulImports || 0}</h4>
                            </div>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className={`p-3 rounded-4 h-100 ${isDarkMode ? 'bg-black bg-opacity-20' : 'bg-white border'}`}>
                                <p className="text-danger small mb-1 fw-black opacity-50">FAILED</p>
                                <h4 className="mb-0 fw-black text-danger">{uploadResult.failedImports || 0}</h4>
                            </div>
                        </div>
                    </div>
                </div>

                {uploadResult.failedRows?.length > 0 && (
                    <div className={`p-4 rounded-5 border mb-5 ${isDarkMode ? 'bg-black bg-opacity-30 border-danger border-opacity-20' : 'bg-danger bg-opacity-10 border-danger border-opacity-10'}`}>
                        <div className="d-flex align-items-center gap-2 mb-3 text-danger fw-bold">
                            <AlertCircle size={18} />
                            <h6 className="mb-0 fw-black text-uppercase tracking-widest small">Failed Rows Log ({uploadResult.failedRows.length})</h6>
                        </div>
                        <div className="custom-scroll overflow-auto pr-2" style={{ maxHeight: '200px' }}>
                            {uploadResult.failedRows.map((err, i) => (
                                <div key={i} className={`p-2 mb-2 rounded-3 small ${isDarkMode ? 'bg-white bg-opacity-5 text-muted' : 'bg-white text-secondary shadow-sm'}`} style={{ fontSize: '11px' }}>
                                    <span className="fw-black text-danger me-2">[Row {err.rowNumber}]</span>
                                    {err.name && <span className="fw-bold me-2">{err.name} ({err.mobile}):</span>}
                                    <span>{err.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-center">
                    <button
                        className="ui-btn px-5 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-lg ui-btn-primary"
                        onClick={handleReset}
                    >
                        INGEST ANOTHER BATCH
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={`p-3 p-md-4 h-100 animate-fade-in ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            {apiError && (
                <div className="mb-5 animate-shake p-4 bg-danger bg-opacity-10 border border-danger border-opacity-20 rounded-5 d-flex align-items-center gap-4 text-danger shadow-lg">
                    <XCircle size={32} />
                    <div>
                        <h6 className="fw-black text-uppercase tracking-widest small mb-1">Transmission Error</h6>
                        <p className="mb-0 small fw-bold opacity-75">{apiError}</p>
                    </div>
                    <button type="button" className="btn-close btn-close-white ms-auto shadow-none" onClick={() => setApiError(null)}></button>
                </div>
            )}

            <div className="row g-3 justify-content-center">
                <div className="col-12 col-lg-8">
                    <div className={`p-3 p-md-4 rounded-5 border h-100 d-flex flex-column transition-all duration-300 ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-dark border-opacity-10'}`}>
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                <Database size={24} />
                            </div>
                            <div>
                                <h5 className={`fw-black mb-1 text-uppercase tracking-widest small ${isDarkMode ? 'text-white' : 'text-dark'}`}>Legacy Data Ingestion</h5>
                                <p className="text-muted small mb-0 fw-bold opacity-60">SELECT OLD LEADS CSV FILE</p>
                            </div>
                        </div>

                        <div
                            className={`flex-grow-1 border-2 border-dashed rounded-5 d-flex flex-column align-items-center justify-content-center p-5 transition-all duration-300 ${file ? 'border-success bg-success bg-opacity-10' :
                                isDarkMode ? 'border-white border-opacity-10 bg-black bg-opacity-20 hover:border-primary' : 'border-dark border-opacity-10 bg-white hover:border-primary'
                                }`}
                            style={{ cursor: file ? 'default' : 'pointer', minHeight: '180px' }}
                            onDragEnter={() => setDragActive(true)}
                            onDragLeave={() => setDragActive(false)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault(); setDragActive(false);
                                if (e.dataTransfer.files[0]) handleFileChange({ target: { files: e.dataTransfer.files } });
                            }}
                            onClick={() => !file && document.getElementById('old-leads-manifest-input').click()}
                        >
                            <input
                                type="file"
                                id="old-leads-manifest-input"
                                className="d-none"
                                accept=".csv"
                                onChange={handleFileChange}
                            />

                            {!file ? (
                                <div className="text-center group">
                                    <div className="p-3 bg-primary bg-opacity-10 rounded-circle mb-3 d-inline-block transition-transform group-hover:scale-110 shadow-glow border border-primary border-opacity-20">
                                        <FileText size={36} strokeWidth={1} className="text-primary" />
                                    </div>
                                    <h6 className={`fw-black mb-1 text-uppercase tracking-widest small ${isDarkMode ? 'text-white' : 'text-dark'}`}>Drop Old Leads CSV Here</h6>
                                    <p className="text-muted small opacity-50 mb-0 fw-bold">OR CLICK TO BROWSE</p>
                                </div>
                            ) : (
                                <div className="text-center animate-zoom-in">
                                    <div className="p-4 bg-success bg-opacity-10 text-success rounded-circle mb-4 d-inline-block shadow-glow">
                                        <CheckCircle2 size={48} strokeWidth={1} />
                                    </div>
                                    <h6 className={`fw-black mb-1 text-truncate px-3 mx-auto ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ maxWidth: '240px' }}>{file.name}</h6>
                                    <p className="text-success small fw-black text-uppercase tracking-widest opacity-75" style={{ fontSize: '9px' }}>{(file.size / 1024).toFixed(1)} KB DATA STREAM READY</p>
                                    <button type="button" className="btn btn-link btn-sm text-danger mt-4 text-decoration-none fw-black text-uppercase tracking-widest p-0 transition-opacity hover:opacity-100 opacity-60" style={{ fontSize: '9px' }} onClick={(e) => { e.stopPropagation(); setFile(null); setApiError(null); }}>Discard Ingest</button>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 text-center">
                            <button type="button" className={`btn btn-link text-info text-decoration-none btn-sm fw-black text-uppercase tracking-widest p-0 transition-all hover:scale-105 ${isDarkMode ? 'opacity-80' : 'opacity-100'}`} onClick={downloadTemplate} style={{ fontSize: '10px' }}>
                                <Download size={14} className="me-2" /> Download Old Leads CSV Template
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 d-flex justify-content-center">
                <button
                    type="submit"
                    className={`ui-btn px-5 rounded-pill fw-black text-uppercase tracking-widest shadow-glow py-3 border-0 transition-all hover:scale-105 active:scale-95 d-flex align-items-center justify-content-center gap-3 ${uploading || !file ? 'opacity-50 grayscale' : ''
                        } ui-btn-primary`}
                    disabled={uploading || !file}
                    style={{ fontSize: '11px', minWidth: '280px' }}
                >
                    {uploading ? (
                        <>
                            <Loader2 size={24} className="animate-spin" />
                            INGESTING LEGACY DATA...
                        </>
                    ) : (
                        <>
                            <Upload size={20} />
                            Start Ingestion
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default OldLeadsIngestion;
