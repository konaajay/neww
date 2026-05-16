import React, { useState, useRef } from 'react';
import { 
    Upload, FileText, CheckCircle, AlertCircle, 
    RefreshCw, IndianRupee, User, Calendar, Clock, 
    Smartphone, Search, Eye, Edit3
} from 'lucide-react';
import { toast } from 'react-toastify';
import leadsApi from '../features/leads/api/leadsApi';
import { useTheme } from '../context/ThemeContext';

const PaymentOcrUpload = ({ onDataExtracted, currentFile, setCurrentFile }) => {
    const { isDarkMode } = useTheme();
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            toast.error("Invalid File Type: Only JPG/PNG screenshots are accepted.");
            return;
        }

        if (typeof setCurrentFile === 'function') {
            setCurrentFile(file);
        }
        setPreviewUrl(URL.createObjectURL(file));
        processOcr(file);
    };

    const processOcr = async (file) => {
        setIsProcessing(true);
        setExtractedData(null);
        try {
            toast.info("Analyzing screenshot... please wait.");
            const res = await leadsApi.extractPaymentOcr(file);
            
            if (res.success) {
                setExtractedData(res);
                onDataExtracted(res);
                toast.success("Extraction Complete!");
            } else {
                toast.warning("Extraction partial: " + (res.errorMessage || "Could not read all fields"));
            }
        } catch (err) {
            console.error("OCR Error:", err);
            toast.error("OCR Analysis Failed. Please enter data manually.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFieldChange = (field, value) => {
        const newData = { ...extractedData, [field]: value };
        setExtractedData(newData);
        onDataExtracted(newData);
    };

    const reset = () => {
        setExtractedData(null);
        setPreviewUrl(null);
        if (typeof setCurrentFile === 'function') {
            setCurrentFile(null);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className={`p-4 rounded-4 border animate-fade-in ${isDarkMode ? 'bg-surface bg-opacity-40 border-white border-opacity-10' : 'bg-light border-secondary border-opacity-10'}`}>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-2">
                    <Search size={18} className="text-primary" />
                    <h6 className="mb-0 fw-black text-uppercase tracking-wider text-main" style={{ fontSize: '12px' }}>Smart Payment Extraction</h6>
                </div>
                {previewUrl && (
                    <button 
                        onClick={reset} 
                        className="btn btn-sm btn-link text-danger text-decoration-none fw-bold p-0"
                        style={{ fontSize: '10px' }}
                    >
                        <RefreshCw size={12} className="me-1" /> RESET
                    </button>
                )}
            </div>

            {!previewUrl ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-5 rounded-4 border-dashed border-2 text-center cursor-pointer transition-all hover-border-primary hover-bg-opacity-5 ${isDarkMode ? 'border-white border-opacity-10 bg-black bg-opacity-20' : 'border-secondary border-opacity-20 bg-white'}`}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="d-none" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                    />
                    <div className="mx-auto mb-3 p-3 rounded-circle bg-primary bg-opacity-10 text-primary d-inline-flex shadow-glow-sm">
                        <Upload size={24} />
                    </div>
                    <h6 className="fw-black text-uppercase tracking-widest mb-1" style={{ fontSize: '11px' }}>Upload Payment Screenshot</h6>
                    <p className="text-muted small fw-bold mb-0 opacity-75">Click to browse JPG or PNG</p>
                </div>
            ) : (
                <div className="row g-4">
                    {/* Preview Column */}
                    <div className="col-12 col-md-5">
                        <div className="position-relative rounded-4 overflow-hidden border border-white border-opacity-10 shadow-lg group">
                            <img 
                                src={previewUrl} 
                                alt="Payment Preview" 
                                className="w-100 object-fit-contain bg-black" 
                                style={{ maxHeight: '300px' }}
                            />
                            {isProcessing && (
                                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                                    <RefreshCw size={32} className="text-primary animate-spin mb-2" />
                                    <span className="fw-black text-uppercase tracking-widest text-white small">Scanning Text...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Extracted Data Column */}
                    <div className="col-12 col-md-7">
                        {extractedData ? (
                            <div className="d-flex flex-column gap-2 animate-slide-up">
                                <div className="p-3 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-20 mb-2">
                                    <div className="d-flex align-items-center gap-2 text-success fw-black text-uppercase small">
                                        <CheckCircle size={14} /> Extraction Successful
                                    </div>
                                    <p className="small text-success opacity-75 mb-0 fw-bold mt-1">Please verify the fields below against the image.</p>
                                </div>

                                <div className="row g-2">
                                    <DataField 
                                        icon={<IndianRupee size={12}/>} 
                                        label="Amount" 
                                        value={extractedData.amount} 
                                        onChange={(val) => handleFieldChange('amount', val)}
                                        isDarkMode={isDarkMode} 
                                    />
                                    <DataField 
                                        icon={<FileText size={12}/>} 
                                        label="UTR Number" 
                                        value={extractedData.utrNumber} 
                                        onChange={(val) => handleFieldChange('utrNumber', val)}
                                        isDarkMode={isDarkMode} 
                                    />
                                    <DataField 
                                        icon={<User size={12}/>} 
                                        label="Payer Name" 
                                        value={extractedData.payerName} 
                                        onChange={(val) => handleFieldChange('payerName', val)}
                                        isDarkMode={isDarkMode} 
                                    />
                                    <DataField 
                                        icon={<Calendar size={12}/>} 
                                        label="Date" 
                                        type="date"
                                        value={extractedData.paymentDate} 
                                        onChange={(val) => handleFieldChange('paymentDate', val)}
                                        isDarkMode={isDarkMode} 
                                    />
                                    <DataField 
                                        icon={<Clock size={12}/>} 
                                        label="Time" 
                                        value={extractedData.paymentTime} 
                                        onChange={(val) => handleFieldChange('paymentTime', val)}
                                        isDarkMode={isDarkMode} 
                                    />
                                    <DataField 
                                        icon={<Smartphone size={12}/>} 
                                        label="Payment App" 
                                        value={extractedData.paymentApp} 
                                        onChange={(val) => handleFieldChange('paymentApp', val)}
                                        isDarkMode={isDarkMode} 
                                    />
                                </div>

                                <details className="mt-3">
                                    <summary className="text-muted fw-bold small cursor-pointer opacity-50 hover-opacity-100">Show Raw OCR Data</summary>
                                    <div className={`mt-2 p-3 rounded-3 small font-monospace break-all ${isDarkMode ? 'bg-black text-success' : 'bg-white text-dark'}`} style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '9px' }}>
                                        {extractedData.rawText}
                                    </div>
                                </details>
                            </div>
                        ) : isProcessing ? (
                            <div className="h-100 d-flex flex-column align-items-center justify-content-center gap-3">
                                <div className="spinner-border text-primary border-4" style={{ width: '40px', height: '40px' }}></div>
                                <div className="text-center">
                                    <h6 className="fw-black text-uppercase tracking-widest text-muted small mb-1">OCR Protocol Engaged</h6>
                                    <p className="text-muted fw-bold small opacity-50">Mapping fields using dynamic regex...</p>
                                </div>
                            </div>
                        ) : (
                             <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center opacity-50">
                                <AlertCircle size={32} className="mb-2" />
                                <span className="fw-black text-uppercase small tracking-widest">Awaiting Analysis</span>
                             </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const DataField = ({ icon, label, value, onChange, isDarkMode, type = "text" }) => {
    const inputRef = useRef(null);
    const isMissing = !value || value === 'NOT FOUND';
    
    // Helper to ensure date inputs get YYYY-MM-DD
    const formatDateForInput = (val) => {
        if (!val || val === 'NOT FOUND') return '';
        if (type !== 'date') return val;
        
        // If it's already YYYY-MM-DD, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        
        try {
            const date = new Date(val);
            if (isNaN(date.getTime())) return ''; // Invalid date
            return date.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    const displayValue = value === 'NOT FOUND' ? '' : (value || '');
    const finalValue = type === 'date' ? formatDateForInput(displayValue) : displayValue;

    return (
        <div className="col-6">
            <div 
                className={`p-2 rounded-3 border transition-all cursor-text d-flex flex-column justify-content-center ${!isMissing ? 'border-primary' : 'border-dashed border-secondary border-opacity-30'}`}
                style={{ 
                    minHeight: '52px',
                    background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)'
                }}
                onClick={() => inputRef.current?.focus()}
            >
                <div className="d-flex align-items-center justify-content-between mb-1" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                    <label className="text-muted fw-black text-uppercase tracking-widest mb-0" style={{ fontSize: '7px' }}>
                        <span className="me-1">{icon}</span> {label}
                    </label>
                    {isMissing && <Edit3 size={8} className="text-muted" />}
                </div>
                <input 
                    ref={inputRef}
                    type={type}
                    className={`bg-transparent border-0 p-0 w-100 fw-black text-uppercase tracking-tight transition-all ${!isMissing ? 'text-primary' : 'text-muted small italic font-monospace'}`}
                    style={{ 
                        fontSize: '11px', 
                        outline: 'none', 
                        lineHeight: '1.2',
                        colorScheme: isDarkMode ? 'dark' : 'light'
                    }}
                    value={finalValue}
                    placeholder="CLICK TO EDIT"
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default PaymentOcrUpload;
