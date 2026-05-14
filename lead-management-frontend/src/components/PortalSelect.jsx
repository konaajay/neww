import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const PortalSelect = ({ 
    options = [], 
    value, 
    onChange, 
    placeholder = "Select option...", 
    className = "",
    style = {},
    disabled = false
}) => {
    const { isDarkMode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const menuRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value) || null;

    useEffect(() => {
        if (isOpen) {
            const updateCoords = () => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const windowWidth = window.innerWidth;
                    const menuWidth = rect.width;
                    
                    // Boundary check: If menu would overflow right, shift it left
                    let left = rect.left + window.scrollX;
                    if (left + menuWidth > windowWidth - 20) {
                        left = windowWidth - menuWidth - 20;
                    }

                    setCoords({
                        top: rect.bottom + window.scrollY,
                        left: Math.max(20, left), // Ensure it doesn't overflow left either
                        width: rect.width
                    });
                }
            };

            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
            return () => {
                window.removeEventListener('scroll', updateCoords, true);
                window.removeEventListener('resize', updateCoords);
            };
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target) &&
                menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!disabled) setIsOpen(!isOpen);
    };

    const handleSelect = (option) => {
        onChange({ target: { value: option.value } });
        setIsOpen(false);
    };

    const dropdownMenu = isOpen && ReactDOM.createPortal(
        <div 
            ref={menuRef}
            className={`custom-portal-dropdown shadow-2xl animate-zoom-in ${isDarkMode ? 'bg-surface border-white border-opacity-10 text-white' : 'bg-white border-dark border-opacity-10 text-dark'}`}
            style={{
                position: 'absolute',
                top: `${coords.top + 5}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 2000000,
                borderRadius: '16px',
                border: '1px solid',
                overflow: 'hidden',
                maxHeight: '300px',
                overflowY: 'auto'
            }}
        >
            {options.map((opt, i) => (
                <div 
                    key={i}
                    className={`px-4 py-3 cursor-pointer d-flex align-items-center justify-content-between transition-all ${value === opt.value ? 'bg-primary bg-opacity-10 text-primary fw-black' : 'hover-bg-opacity opacity-80 hover-opacity-100'}`}
                    onClick={() => handleSelect(opt)}
                    style={{ fontSize: '12px' }}
                >
                    <span className="text-uppercase tracking-wider">{opt.label}</span>
                    {value === opt.value && <Check size={14} />}
                </div>
            ))}
            {options.length === 0 && (
                <div className="px-4 py-3 text-muted small text-center opacity-50">No options available</div>
            )}
        </div>,
        document.body
    );

    return (
        <div 
            ref={containerRef} 
            className={`position-relative ${className}`} 
            style={{ ...style }}
        >
            <div 
                onClick={handleToggle}
                className={`ui-input py-2 px-4 rounded-4 fw-bold d-flex align-items-center justify-content-between cursor-pointer transition-all ${isOpen ? 'border-primary' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ minHeight: style.minHeight || '40px', paddingTop: style.minHeight ? '20px' : '0' }}
            >
                <span className={`text-uppercase tracking-widest text-truncate ${!selectedOption ? 'opacity-40' : ''}`} style={{ fontSize: '11px' }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown 
                    size={16} 
                    className={`transition-all ${isOpen ? 'rotate-180 text-primary' : 'text-muted'}`} 
                />
            </div>
            {dropdownMenu}
        </div>
    );
};

export default PortalSelect;
