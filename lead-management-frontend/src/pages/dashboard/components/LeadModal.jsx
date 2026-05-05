import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, UserPlus, Upload, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import LeadForm from '../../../components/LeadForm';
import BulkIngestion from '../../../components/BulkIngestion';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

const LeadModal = ({ isOpen, onClose, onAddLead, onSuccess, associates = [] }) => {
    const { user } = useAuth();
    const [mode, setMode] = useState(null); // null = CHOICE, 'SINGLE', 'BULK'
    const [isTransitioning, setIsTransitioning] = useState(false);
    const getTerminalTitle = () => {
        return "Add New Leads";
    };

    // Dynamic Theme colors
    const { isDarkMode } = useTheme();

    useEffect(() => {
        if (isOpen) {
            console.log(">>> [TERMINAL] Initializing Ingestion for Role:", user?.role);
            console.log(">>> [TERMINAL] Current Mode State:", mode);
            setMode(null); // Force choice hub on every open
        } else {
            setMode(null);
            setIsTransitioning(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        setMode(null);
        onClose();
    };

    const handleBack = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setMode(null);
            setIsTransitioning(false);
        }, 200);
    };

    const handleModeChange = (newMode) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setMode(newMode);
            setIsTransitioning(false);
        }, 300);
    };

    const renderHeader = () => {
        let title = getTerminalTitle();
        let sub = "Select protocol for data propagation";

        if (mode === 'SINGLE') {
            title = "Add Lead";
            sub = "Add lead details manually";
        } else if (mode === 'BULK') {
            title = "Bulk Add";
            sub = "Upload excel/csv file";
        }

        return (
            <div className={`p-3 border-bottom border-white border-opacity-10 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-light text-dark'}`}>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        {mode && (
                            <button
                                onClick={handleBack}
                                className={`p-2 hover:bg-white hover:bg-opacity-5 rounded-circle border-0 transition-all ${isDarkMode ? 'text-muted' : 'text-secondary'}`}
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h5 className={`fw-black mb-0 text-uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-dark'}`}>{title}</h5>
                            <p className="text-muted small mb-0 fw-bold opacity-50" style={{ fontSize: '9px' }}>{sub}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-link text-muted p-2 rounded-circle hover:bg-white hover:bg-opacity-5 transition-colors border-0 outline-none shadow-none"
                        onClick={handleClose}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (isTransitioning) {
            return (
                <div className="d-flex align-items-center justify-content-center py-5">
                    <div className="text-center">
                        <Loader2 size={48} className="text-primary animate-spin mb-3 mx-auto" />
                        <p className="text-muted fw-black text-uppercase tracking-widest small">Loading...</p>
                    </div>
                </div>
            );
        }

        if (mode === 'SINGLE') {
            return (
                <div className={`p-4 p-md-5 animate-fade-in h-100 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className="mx-auto" style={{ maxWidth: '800px' }}>
                        <LeadForm
                            onSubmit={async (data) => {
                                // AUTO-ASSIGN TO SELF: Default assignedToId to current user if not specified
                                const finalData = { 
                                    ...data, 
                                    assignedToId: data.assignedToId || user?.id 
                                };
                                const success = await onAddLead(finalData);
                                if (success) handleClose();
                                return success;
                            }}
                            title=""
                        />
                    </div>
                </div>
            );
        }

        if (mode === 'BULK') {
            return (
                <div className={`animate-fade-in ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                    <BulkIngestion
                        onSuccess={() => {
                            onSuccess();
                            setTimeout(() => {
                                handleClose();
                            }, 1500);
                        }}
                        assignees={associates}
                    />
                </div>
            );
        }

        // CHOICE MODE (mode === null)
        return (
            <div className={`p-5 animate-fade-in h-100 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="row g-4 justify-content-center pb-4">
                    <div className="col-md-6">
                        <div
                            onClick={() => handleModeChange('SINGLE')}
                            className="p-5 rounded-4 border h-100 d-flex flex-column hover-lift cursor-pointer transition-all"
                            style={{ 
                                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                minHeight: '320px'
                            }}
                        >
                            <div className="p-4 bg-primary bg-opacity-10 text-primary rounded-4 d-inline-block mb-4 shadow-glow group-hover:scale-110 transition-all" style={{width: 'fit-content'}}>
                                <UserPlus size={48} strokeWidth={1.5} />
                            </div>
                            <h3 className={`fw-black mb-3 text-uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-dark'}`}>Manual Add</h3>
                            <p className="text-muted mb-4 opacity-75 fw-bold"> Enter lead details one by one </p>
                            <div className="d-flex align-items-center text-primary small tracking-widest gap-2 mt-auto fw-black">
                                OPEN FORM <ChevronRight size={18} />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div
                            onClick={() => handleModeChange('BULK')}
                            className="p-5 rounded-4 border h-100 d-flex flex-column hover-lift cursor-pointer transition-all"
                            style={{ 
                                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                minHeight: '320px'
                            }}
                        >
                            <div className="p-4 bg-success bg-opacity-10 text-success rounded-4 d-inline-block mb-4 shadow-glow group-hover:scale-110 transition-all" style={{width: 'fit-content'}}>
                                <Upload size={48} strokeWidth={1.5} />
                            </div>
                            <h3 className={`fw-black mb-3 text-uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-dark'}`}>Bulk Add</h3>
                            <p className="text-muted mb-4 opacity-75 fw-bold"> Upload an Excel or CSV file </p>
                            <div className="d-flex align-items-center text-success small tracking-widest gap-2 mt-auto fw-black">
                                OPEN UPLOAD <ChevronRight size={18} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const portalContent = (
        <div
            className="terminal-backdrop fade show d-flex align-items-center justify-content-center p-3"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isDarkMode ? '#020617' : 'rgba(248, 250, 252, 0.95)',
                backgroundImage: isDarkMode ? 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 100%)' : 'none',
                zIndex: 9999999,
                opacity: 1
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div
                className={`modal-dialog modal-dialog-centered w-100 h-auto transition-all duration-500`}
                style={{
                    maxWidth: !mode ? '600px' : '650px',
                    pointerEvents: 'all',
                    zIndex: 10000000
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className={`border rounded-5 shadow-2xl overflow-hidden flex-column d-flex p-0 transition-colors duration-500`} style={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.08)'
                }}>
                    {renderHeader()}
                    <div className={`modal-body custom-scroll p-0 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        {renderContent()}
                        <div className={`py-4 text-center opacity-0 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ height: '10px' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(portalContent, document.body);
};

export default LeadModal;