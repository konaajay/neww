import React from 'react';
import ReactDOM from 'react-dom';
import { X, Edit } from 'lucide-react';
import LeadForm from './LeadForm';
import { useTheme } from '../context/ThemeContext';

const LeadEditModal = ({ isOpen, onClose, lead, onUpdate, role }) => {
    const { isDarkMode } = useTheme();

    if (!isOpen || !lead) return null;

    const handleSubmit = async (formData) => {
        const success = await onUpdate(lead.id, formData);
        if (success) {
            onClose();
        }
        return success;
    };

    const modalContent = (
        <div
            className="opaque-overlay d-flex align-items-center justify-content-center p-3"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: isDarkMode ? '#020617' : '#f8fafc',
                zIndex: 9999999
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="modal-dialog modal-dialog-centered w-100"
                style={{
                    maxWidth: '650px',
                    pointerEvents: 'all',
                    zIndex: 10000000
                }}
                onClick={e => e.stopPropagation()}
            >
                <div 
                    className={`border rounded-5 shadow-2xl overflow-hidden flex-column d-flex p-0 transition-all duration-500`}
                    style={{
                        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                        border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.08)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div className={`p-4 border-bottom border-white border-opacity-10 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-light text-dark'}`}>
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-2 bg-warning bg-opacity-10 text-warning rounded-circle">
                                    <Edit size={20} />
                                </div>
                                <div>
                                    <h5 className={`fw-black mb-0 text-uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-dark'}`}>Edit Lead Details</h5>
                                    <p className="text-muted small mb-0 fw-bold opacity-50 text-uppercase" style={{ fontSize: '8px' }}>Updating Vector protocol: {lead.name}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-link text-muted p-2 rounded-circle hover:bg-white hover:bg-opacity-5 transition-colors border-0 outline-none shadow-none"
                                onClick={onClose}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className={`modal-body custom-scroll p-4 p-md-5 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <LeadForm
                            onSubmit={handleSubmit}
                            initialData={lead}
                            title=""
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default LeadEditModal;
