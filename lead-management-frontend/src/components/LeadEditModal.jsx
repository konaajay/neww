import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
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
            className="modal-backdrop fade show d-flex align-items-center justify-content-center p-3 p-md-0"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(20px)',
                zIndex: 1060
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="modal-dialog modal-dialog-centered w-100"
                style={{
                    maxWidth: '850px',
                    pointerEvents: 'all'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div 
                    className={`ui-modal-content border ${isDarkMode ? 'border-white border-opacity-10' : 'border-dark border-opacity-5'} rounded-5 shadow-2xl overflow-hidden flex-column d-flex p-1`}
                    style={{
                        backgroundColor: isDarkMode ? '#030712' : '#ffffff',
                        backgroundImage: isDarkMode 
                            ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, #030712 100%)' 
                            : 'none',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div className="position-absolute top-0 end-0 p-4" style={{ zIndex: 10 }}>
                        <button
                            type="button"
                            className="btn btn-link text-muted p-2 rounded-circle hover:bg-surface transition-colors border-0 outline-none shadow-none"
                            onClick={onClose}
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="modal-body custom-scroll p-0" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="p-4 p-md-5">
                            <LeadForm
                                onSubmit={handleSubmit}
                                initialData={lead}
                                title="Edit Vector Lead"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default LeadEditModal;
