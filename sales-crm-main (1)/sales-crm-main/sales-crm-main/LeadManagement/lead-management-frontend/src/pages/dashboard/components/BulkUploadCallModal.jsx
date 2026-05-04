import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Download, PhoneCall } from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';

const BulkUploadCallModal = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv')) {
            setFile(selectedFile);
        } else {
            toast.error('Please select a valid CSV file');
        }
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange({ target: { files: e.dataTransfer.files } });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { toast.warning('No file selected'); return; }

        setUploading(true);
        try {
            const response = await adminService.bulkUploadCallLogs(file);
            setUploadResult(response.data.data);
            if (response.data.success) {
                toast.success(`${response.data.data.successCount} call records imported`);
                onSuccess();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Mobile,Type,Status,Duration,Note,Timestamp\n919999999999,OUTGOING,CONNECTED,45,Quality Discussion,2026-03-30 10:30";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "calls_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReset = () => {
        setFile(null);
        setUploadResult(null);
    };

    return (
        <div className="modal-backdrop fade show d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(2, 6, 17, 0.95)', backdropFilter: 'blur(12px)', zIndex: 2000 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered w-100 p-3">
                <div className="modal-content border border-white border-opacity-10 rounded-4 shadow-lg overflow-hidden bg-dark">
                    <div className="card-header border-0 p-4 bg-transparent d-flex justify-content-between align-items-center border-bottom border-white border-opacity-5">
                        <div className="d-flex align-items-center gap-3">
                            <div className="p-2 bg-info bg-opacity-10 text-info rounded-3">
                                <PhoneCall size={24} />
                            </div>
                            <div>
                                <h5 className="fw-bold text-white mb-0">Call Log Ingestion</h5>
                                <p className="text-muted small mb-0">Import historical call connections</p>
                            </div>
                        </div>
                        <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="card-body p-4">
                        {!uploadResult ? (
                            <form onSubmit={handleSubmit}>
                                <div 
                                    className={`p-5 rounded-4 border-2 border-dashed d-flex flex-column align-items-center justify-content-center transition-smooth mb-4 ${
                                        dragActive ? 'border-info bg-info bg-opacity-10' : 'border-white border-opacity-10 bg-black bg-opacity-20'
                                    }`}
                                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                                    style={{ minHeight: '250px' }}
                                >
                                    <input type="file" className="d-none" id="callCsvFile" accept=".csv" onChange={handleFileChange} />
                                    {!file ? (
                                        <div className="text-center">
                                            <div className="p-3 bg-white bg-opacity-5 rounded-circle mb-3 d-inline-block shadow-sm">
                                                <Upload size={42} className="text-muted" />
                                            </div>
                                            <h6 className="text-white fw-bold mb-1">Upload Call History (CSV)</h6>
                                            <p className="text-muted small mb-3">Target format: Mobile, Type, Status...</p>
                                            <label htmlFor="callCsvFile" className="btn btn-info btn-sm px-4 rounded-pill fw-bold text-white">Browse Files</label>
                                        </div>
                                    ) : (
                                        <div className="text-center animate-fade-in">
                                            <div className="p-3 bg-success bg-opacity-10 rounded-circle mb-3 d-inline-block">
                                                <CheckCircle2 size={42} className="text-success" />
                                            </div>
                                            <h6 className="text-white fw-bold mb-1">{file.name}</h6>
                                            <p className="text-muted small mb-3">{(file.size / 1024).toFixed(2)} KB - Ready for import</p>
                                            <button type="button" className="btn btn-link btn-sm text-danger text-decoration-none" onClick={() => setFile(null)}>Remove</button>
                                        </div>
                                    )}
                                </div>

                                <div className="alert bg-info bg-opacity-5 border-info border-opacity-10 rounded-4 d-flex gap-3 mb-4">
                                    <AlertCircle size={20} className="text-info flex-shrink-0" />
                                    <div className="small text-info opacity-75">
                                        Columns required: <strong>Mobile, Type, Status, Duration, Note, Timestamp</strong><br/>
                                        Format for Timestamp: <code>YYYY-MM-DD HH:mm</code>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center">
                                    <button type="button" className="btn btn-link text-muted text-decoration-none d-flex align-items-center gap-2 small fw-bold" onClick={downloadTemplate}>
                                        <Download size={14} /> Download Sample
                                    </button>
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-outline-white btn-sm px-4 rounded-pill fw-bold" onClick={onClose} disabled={uploading}>Cancel</button>
                                        <button type="submit" className="btn btn-info btn-sm px-5 rounded-pill fw-bold d-flex align-items-center gap-2 shadow-glow text-white" disabled={uploading || !file}>
                                            {uploading ? <span className="spinner-border spinner-border-sm"></span> : <Upload size={16} />}
                                            {uploading ? 'Processing...' : 'Run Import'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center py-4">
                                <div className="p-4 bg-success bg-opacity-10 text-success rounded-circle d-inline-block mb-4 mx-auto">
                                    <CheckCircle2 size={56} />
                                </div>
                                <h4 className="text-white fw-bold mb-2">Import Complete</h4>
                                <p className="text-muted mb-4">The call records have been synchronized with your lead database.</p>

                                <div className="row g-3 mb-5 justify-content-center">
                                    <div className="col-md-4">
                                        <div className="bg-black bg-opacity-20 p-3 rounded-4 border border-success border-opacity-20">
                                            <h4 className="text-success fw-black mb-0">{uploadResult.successCount}</h4>
                                            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '9px' }}>Imported</small>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="bg-black bg-opacity-20 p-3 rounded-4 border border-danger border-opacity-20">
                                            <h4 className="text-danger fw-black mb-0">{uploadResult.failureCount}</h4>
                                            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '9px' }}>Errors</small>
                                        </div>
                                    </div>
                                </div>

                                {uploadResult.errors.length > 0 && (
                                    <div className="text-start bg-danger bg-opacity-5 p-3 rounded-4 mb-4 border border-danger border-opacity-10 overflow-auto" style={{maxHeight: '150px'}}>
                                        <p className="text-danger small fw-bold mb-2">Error Log:</p>
                                        {uploadResult.errors.map((err, i) => <div key={i} className="text-muted small mb-1">• {err}</div>)}
                                    </div>
                                )}

                                <div className="d-flex gap-3 justify-content-center mt-4">
                                    <button className="btn btn-outline-white px-5 rounded-pill fw-bold" onClick={handleReset}>New Import</button>
                                    <button className="btn btn-info px-5 rounded-pill fw-bold text-white shadow-glow" onClick={onClose}>Close</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkUploadCallModal;
