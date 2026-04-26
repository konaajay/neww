import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, XCircle, ChevronRight, Shield, User, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import managerService from '../services/managerService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * High-Performance BulkIngestion Terminal
 * Handles massive data propagation with real-time validation feedback.
 */
const BulkIngestion = ({ onSuccess, assignees = [] }) => {
    const { user: currentUser } = useAuth();
    const { isDarkMode } = useTheme();
    const isAssociate = currentUser?.role === 'ASSOCIATE';
    
    const [file, setFile] = useState(null);
    const [assignedToIds, setAssignedToIds] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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
            const idsString = assignedToIds.join(',');
            const response = await managerService.bulkUploadLeads(file, idsString || null);
            setUploadResult(response.data);
            
            if (response.data.successCount > 0) {
                onSuccess?.();
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Ingestion Failure: System logic error during propagation';
            setApiError(errorMsg);
            toast.error('Upload Failed');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,S.No,Name,Email,Mobile,College\n1,John Doe,john@example.com,9999999999,State University";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "registry_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReset = () => {
        setFile(null);
        setUploadResult(null);
        setAssignedToIds([]);
        setApiError(null);
    };

    if (uploadResult) {
        return (
            <div className={`p-4 p-md-5 h-100 animate-zoom-in ${isDarkMode ? 'bg-slate-900 border-white border-opacity-5' : 'bg-white border-dark border-opacity-5'} border-top`}>
                <div className="text-center mb-5">
                    <div className="d-inline-flex p-4 bg-success bg-opacity-10 text-success rounded-circle mb-4 shadow-glow scale-up">
                        <CheckCircle2 size={56} strokeWidth={1} />
                    </div>
                    <h3 className={`fw-black mb-2 text-uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-dark'}`}>Upload Complete</h3>
                    <p className="text-muted small mb-0 fw-bold opacity-60">Leads have been added successfully</p>
                </div>

                <div className={`p-4 rounded-5 border mb-5 ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-10' : 'bg-light border-dark border-opacity-10'}`}>
                    <div className="row g-3">
                        <div className="col-12 col-md-6">
                            <div className={`p-3 rounded-4 ${isDarkMode ? 'bg-black bg-opacity-20' : 'bg-white border'}`}>
                                <p className="text-muted small mb-1 fw-black opacity-50">RECORDS PROCESSED</p>
                                <h4 className={`mb-0 fw-black ${isDarkMode ? 'text-white' : 'text-dark'}`}>{uploadResult.total_rows || 0}</h4>
                            </div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className={`p-3 rounded-4 ${isDarkMode ? 'bg-black bg-opacity-20' : 'bg-white border'}`}>
                                <p className="text-muted small mb-1 fw-black opacity-50">STATUS NODE</p>
                                <h4 className="mb-0 fw-black text-success">READY</h4>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <button 
                        className={`ui-btn px-5 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-lg ${isDarkMode ? 'ui-btn-primary' : 'btn-dark'}`}
                        onClick={handleReset}
                    >
                        FINISH
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

            <div className="row g-3">
                {/* LEFT: UPLOAD CONTROL */}
                <div className="col-lg-6">
                    <div className={`p-3 p-md-4 rounded-5 border h-100 d-flex flex-column transition-all duration-300 ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-dark border-opacity-10'}`}>
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                <Upload size={24} />
                            </div>
                            <div>
                                <h5 className={`fw-black mb-1 text-uppercase tracking-widest small ${isDarkMode ? 'text-white' : 'text-dark'}`}>File Upload</h5>
                                <p className="text-muted small mb-0 fw-bold opacity-60">SELECT CSV FILE</p>
                            </div>
                        </div>

                        <div 
                            className={`flex-grow-1 border-2 border-dashed rounded-5 d-flex flex-column align-items-center justify-content-center p-5 transition-all duration-300 ${
                                file ? 'border-success bg-success bg-opacity-10' : 
                                isDarkMode ? 'border-white border-opacity-10 bg-black bg-opacity-20 hover:border-primary' : 'border-dark border-opacity-10 bg-white hover:border-primary'
                            }`}
                            style={{ cursor: file ? 'default' : 'pointer', minHeight: '160px' }}
                            onDragEnter={() => setDragActive(true)}
                            onDragLeave={() => setDragActive(false)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault(); setDragActive(false);
                                if (e.dataTransfer.files[0]) handleFileChange({ target: { files: e.dataTransfer.files } });
                            }}
                            onClick={() => !file && document.getElementById('manifest-input').click()}
                        >
                            <input 
                                type="file" 
                                id="manifest-input" 
                                className="d-none" 
                                accept=".csv" 
                                onChange={handleFileChange} 
                            />
                            
                            {!file ? (
                                <div className="text-center group">
                                    <div className="p-3 bg-primary bg-opacity-10 rounded-circle mb-3 d-inline-block transition-transform group-hover:scale-110 shadow-glow border border-primary border-opacity-20">
                                        <FileText size={36} strokeWidth={1} className="text-primary" />
                                    </div>
                                    <h6 className={`fw-black mb-1 text-uppercase tracking-widest small ${isDarkMode ? 'text-white' : 'text-dark'}`}>Drop File Here</h6>
                                    <p className="text-muted small opacity-50 mb-0 fw-bold">OR CLICK TO BROWSE</p>
                                </div>
                            ) : (
                                <div className="text-center animate-zoom-in">
                                    <div className="p-4 bg-success bg-opacity-10 text-success rounded-circle mb-4 d-inline-block shadow-glow">
                                        <CheckCircle2 size={48} strokeWidth={1} />
                                    </div>
                                    <h6 className={`fw-black mb-1 text-truncate px-3 mx-auto ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{maxWidth: '240px'}}>{file.name}</h6>
                                    <p className="text-success small fw-black text-uppercase tracking-widest opacity-75" style={{fontSize: '9px'}}>{(file.size / 1024).toFixed(1)} KB DATA STREAM READY</p>
                                    <button type="button" className="btn btn-link btn-sm text-danger mt-4 text-decoration-none fw-black text-uppercase tracking-widest p-0 transition-opacity hover:opacity-100 opacity-60" style={{fontSize: '9px'}} onClick={(e) => { e.stopPropagation(); setFile(null); setApiError(null); }}>Discard Ingest</button>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-2">
                             <button type="button" className={`btn btn-link text-info text-decoration-none btn-sm fw-black text-uppercase tracking-widest p-0 transition-all hover:scale-105 ${isDarkMode ? 'opacity-80' : 'opacity-100'}`} onClick={downloadTemplate} style={{fontSize: '9px'}}>
                                 <Download size={14} className="me-2" /> Retrieve Configuration Template
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: CONFIGURATION HUB */}
                {!isAssociate && (
                    <div className="col-lg-6">
                        <div className={`p-3 p-md-4 rounded-5 border h-100 d-flex flex-column transition-all duration-300 ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-5' : 'bg-light border-dark border-opacity-10'}`}>
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-4">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h5 className={`fw-black mb-1 text-uppercase tracking-widest small ${isDarkMode ? 'text-white' : 'text-dark'}`}>Assign To</h5>
                                    <p className="text-muted small mb-0 fw-bold opacity-60">CHOOSE RECIPIENTS</p>
                                </div>
                            </div>

                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <label className="text-muted small fw-bold text-uppercase tracking-widest opacity-75 mb-0">Choose Recipients</label>
                                    <button 
                                        type="button" 
                                        className="btn btn-link p-0 text-primary small fw-black text-decoration-none"
                                        onClick={() => {
                                            if (assignedToIds.length === assignees.length) setAssignedToIds([]);
                                            else setAssignedToIds(assignees.map(a => a.id));
                                        }}
                                    >
                                        {assignedToIds.length === assignees.length ? 'DESELECT ALL' : 'SELECT ALL'}
                                    </button>
                                </div>

                                <div className="mb-3">
                                    <div className="position-relative">
                                        <input 
                                            type="text"
                                            className={`form-control border-0 rounded-4 py-2 px-4 small ${isDarkMode ? 'bg-black bg-opacity-20 text-white' : 'bg-white border'}`}
                                            placeholder="Search people..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ fontSize: '12px' }}
                                        />
                                    </div>
                                </div>

                                <div className="row g-2 overflow-auto custom-scroll px-1" style={{ maxHeight: '200px' }}>
                                    {assignees.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                        <div className="col-12 py-5 text-center border-dashed border-opacity-10 rounded-5 opacity-40">
                                            <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
                                            <p className="small text-muted mb-0 fw-bold">NO MATCHES FOUND.</p>
                                        </div>
                                    ) : assignees.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                                        <div key={user.id} className="col-12">
                                            <div 
                                                className={`p-2 px-3 rounded-4 border transition-all cursor-pointer group d-flex align-items-center gap-3 ${
                                                    assignedToIds.includes(user.id) ? 
                                                    'border-primary bg-primary bg-opacity-10 shadow-glow-sm' : 
                                                    isDarkMode ? 'border-white border-opacity-5 bg-white bg-opacity-5 hover:bg-opacity-10' : 'border-dark border-opacity-5 bg-white hover:bg-light'
                                                }`}
                                                onClick={() => setAssignedToIds(prev => prev.includes(user.id) ? prev.filter(i => i !== user.id) : [...prev, user.id])}
                                            >
                                                <div className={`p-2 rounded-circle transition-all ${assignedToIds.includes(user.id) ? 'bg-primary text-white' : 'bg-primary bg-opacity-10 text-primary'}`}>
                                                    <User size={12} />
                                                </div>
                                                <div className="flex-grow-1 min-w-0">
                                                    <p className={`small mb-0 fw-black text-truncate ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{fontSize: '11px'}}>{user.name}</p>
                                                    <p className="text-muted fw-bold opacity-40 mb-0" style={{fontSize: '8px'}}>{user.role?.replace('ROLE_', '').replace('_', ' ')}</p>
                                                </div>
                                                {assignedToIds.includes(user.id) && (
                                                    <CheckCircle2 size={16} className="text-primary animate-zoom-in" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={`mt-4 p-3 rounded-4 border border-opacity-10 ${isDarkMode ? 'bg-black bg-opacity-20 border-white' : 'bg-white border-dark shadow-sm'}`}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted small fw-black opacity-50 tracking-widest">Selected:</span>
                                    <span className="text-primary fw-black small">{assignedToIds.length} People</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-3 d-flex justify-content-center">
                <button 
                    type="submit" 
                    className={`ui-btn px-5 rounded-pill fw-black text-uppercase tracking-widest shadow-glow py-3 border-0 transition-all hover:scale-105 active:scale-95 d-flex align-items-center justify-content-center gap-3 ${
                        uploading || !file ? 'opacity-50 grayscale' : ''
                    } ${isDarkMode ? 'ui-btn-primary' : 'btn-dark'}`} 
                    disabled={uploading || !file}
                    style={{fontSize: '11px', minWidth: '280px'}}
                >
                    {uploading ? (
                        <>
                            <Loader2 size={24} className="animate-spin" />
                            UPLOADING...
                        </>
                    ) : (
                        <>
                            <Upload size={20} />
                            Upload Leads
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default BulkIngestion;
