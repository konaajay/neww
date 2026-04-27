import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Coffee, AlertCircle, Save, Calendar, ArrowRight } from 'lucide-react';
import attendanceService from '../../../services/attendanceService';
import { toast } from 'react-toastify';

const AttendanceManualEntry = ({ userId, onSave, onCancel, initialData = {} }) => {
    const [formData, setFormData] = useState({
        date: initialData.date || new Date().toISOString().split('T')[0],
        loginTime: initialData.loginTime || '09:00',
        logoutTime: initialData.logoutTime || '18:00',
        longBreakStart: initialData.longBreakStart || '13:00',
        longBreakEnd: initialData.longBreakEnd || '14:00',
        shortBreakStart: initialData.shortBreakStart || '17:00',
        shortBreakEnd: initialData.shortBreakEnd || '17:10',
        minFullDayMinutes: initialData.minFullDayMinutes || 480,
        minHalfDayMinutes: initialData.minHalfDayMinutes || 240,
        shiftStart: initialData.shiftStart || '09:00',
        graceMinutes: initialData.graceMinutes || 15
    });

    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState(null);

    const validate = useCallback(() => {
        const { loginTime, logoutTime, longBreakStart, longBreakEnd, shortBreakStart, shortBreakEnd } = formData;
        
        if (logoutTime <= loginTime) return "Logout time must be after login time";
        
        // Break validation
        if (longBreakEnd <= longBreakStart) return "Long break end must be after start";
        if (shortBreakEnd <= shortBreakStart) return "Short break end must be after start";
        
        // Overlap check for breaks themselves
        if (shortBreakStart < longBreakEnd && shortBreakEnd > longBreakStart) return "Breaks cannot overlap each other";
        
        return null;
    }, [formData]);

    const fetchPreview = useCallback(async () => {
        const error = validate();
        setValidationError(error);
        if (error) {
            setPreview(null);
            return;
        }

        try {
            setLoading(true);
            const payload = {
                userId,
                loginTime: `${formData.date}T${formData.loginTime}:00`,
                logoutTime: `${formData.date}T${formData.logoutTime}:00`,
                longBreakStart: `${formData.longBreakStart}:00`,
                longBreakEnd: `${formData.longBreakEnd}:00`,
                shortBreakStart: `${formData.shortBreakStart}:00`,
                shortBreakEnd: `${formData.shortBreakEnd}:00`,
                minFullDayMinutes: formData.minFullDayMinutes,
                minHalfDayMinutes: formData.minHalfDayMinutes,
                shiftStart: `${formData.shiftStart}:00`,
                graceMinutes: formData.graceMinutes
            };

            const res = await attendanceService.getPreview(payload);
            if (res.success) {
                setPreview(res.data);
            }
        } catch (err) {
            console.error('Preview error:', err);
        } finally {
            setLoading(false);
        }
    }, [formData, userId, validate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPreview();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchPreview]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formatMins = (m) => {
        const h = Math.floor(m / 60);
        const mins = m % 60;
        return `${h}h ${mins}m`;
    };

    const getStatusBadgeClass = (status, isLate) => {
        if (isLate && status === 'PRESENT') return 'bg-warning text-warning'; // Late but present
        if (status === 'PRESENT') return 'bg-success text-success';
        if (status === 'HALF_DAY') return 'bg-warning text-warning';
        return 'bg-danger text-danger';
    };

    return (
        <div className="attendance-manual-entry animate-fade-in">
            <div className="row g-4">
                {/* Date Selection */}
                <div className="col-12">
                    <div className="premium-card p-4 border-0 bg-surface bg-opacity-20 rounded-4 shadow-sm">
                        <label className="small fw-black text-muted text-uppercase tracking-widest mb-3 d-block" style={{ fontSize: '10px' }}>Attendance Date</label>
                        <div className="d-flex align-items-center bg-dark bg-opacity-20 p-2 px-3 rounded-3 border border-white border-opacity-10">
                            <Calendar size={18} className="text-primary me-3" />
                            <input
                                type="date"
                                name="date"
                                className="bg-transparent border-0 text-main fw-black outline-none w-100"
                                value={formData.date}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Duty Cycle */}
                <div className="col-md-6">
                    <div className="premium-card p-4 border-0 bg-surface bg-opacity-20 rounded-4 shadow-sm h-100">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Clock size={16} className="text-primary" />
                            <h6 className="fw-black text-main mb-0 text-uppercase tracking-widest small">Duty Cycle</h6>
                        </div>
                        
                        <div className="row g-3">
                            <div className="col-6">
                                <label className="text-muted fw-bold mb-2 d-block" style={{ fontSize: '9px' }}>LOGIN TIME</label>
                                <input
                                    type="time"
                                    name="loginTime"
                                    className={`ui-input bg-dark bg-opacity-20 border-white border-opacity-10 rounded-3 text-main p-2 ${validationError && validationError.includes('Logout') ? 'border-danger' : ''}`}
                                    value={formData.loginTime}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="col-6">
                                <label className="text-muted fw-bold mb-2 d-block" style={{ fontSize: '9px' }}>LOGOUT TIME</label>
                                <input
                                    type="time"
                                    name="logoutTime"
                                    className={`ui-input bg-dark bg-opacity-20 border-white border-opacity-10 rounded-3 text-main p-2 ${validationError && validationError.includes('Logout') ? 'border-danger' : ''}`}
                                    value={formData.logoutTime}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breaks */}
                <div className="col-md-6">
                    <div className="premium-card p-4 border-0 bg-surface bg-opacity-20 rounded-4 shadow-sm h-100">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Coffee size={16} className="text-warning" />
                            <h6 className="fw-black text-main mb-0 text-uppercase tracking-widest small">Defined Breaks</h6>
                        </div>

                        <div className="d-flex flex-column gap-3">
                            <div className="p-3 bg-dark bg-opacity-20 rounded-3 border border-white border-opacity-5">
                                <span className="small text-muted fw-bold d-block mb-2" style={{ fontSize: '8px' }}>LONG BREAK / LUNCH</span>
                                <div className="d-flex align-items-center gap-2">
                                    <input type="time" name="longBreakStart" className="ui-input p-1.5 border-0 bg-transparent text-center text-main" value={formData.longBreakStart} onChange={handleChange} />
                                    <ArrowRight size={12} className="text-muted opacity-20" />
                                    <input type="time" name="longBreakEnd" className="ui-input p-1.5 border-0 bg-transparent text-center text-main" value={formData.longBreakEnd} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="p-3 bg-dark bg-opacity-20 rounded-3 border border-white border-opacity-5">
                                <span className="small text-muted fw-bold d-block mb-2" style={{ fontSize: '8px' }}>SHORT BREAK</span>
                                <div className="d-flex align-items-center gap-2">
                                    <input type="time" name="shortBreakStart" className="ui-input p-1.5 border-0 bg-transparent text-center text-main" value={formData.shortBreakStart} onChange={handleChange} />
                                    <ArrowRight size={12} className="text-muted opacity-20" />
                                    <input type="time" name="shortBreakEnd" className="ui-input p-1.5 border-0 bg-transparent text-center text-main" value={formData.shortBreakEnd} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="col-12 mt-2">
                    <div className={`premium-card p-4 border-0 rounded-4 shadow-lg overflow-hidden position-relative ${validationError ? 'bg-danger bg-opacity-10 border border-danger border-opacity-20' : 'bg-primary bg-opacity-5 border border-primary border-opacity-10'}`}>
                        {loading && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50" style={{ zIndex: 5 }}>
                                <div className="spinner-border spinner-border-sm text-primary"></div>
                            </div>
                        )}

                        {validationError ? (
                            <div className="d-flex align-items-center gap-3 text-danger animate-fade-in">
                                <AlertCircle size={24} />
                                <div>
                                    <h6 className="fw-black mb-1 text-uppercase small">Logic Violation</h6>
                                    <p className="small mb-0 opacity-75">{validationError}</p>
                                </div>
                            </div>
                        ) : preview ? (
                            <div className="row align-items-center animate-fade-in">
                                <div className="col-md-8">
                                    <div className="row g-4">
                                        <div className="col-4">
                                            <div className="text-muted fw-black text-uppercase mb-1" style={{ fontSize: '8px' }}>Worked Time</div>
                                            <div className="fw-black text-main h5 mb-0">{formatMins(preview.workedMinutes)}</div>
                                        </div>
                                        <div className="col-4">
                                            <div className="text-muted fw-black text-uppercase mb-1" style={{ fontSize: '8px' }}>Break Overlap</div>
                                            <div className="fw-black text-warning h5 mb-0">{formatMins(preview.breakMinutes)}</div>
                                        </div>
                                        <div className="col-4">
                                            <div className="text-muted fw-black text-uppercase mb-1" style={{ fontSize: '8px' }}>Effective Time</div>
                                            <div className="fw-black text-success h5 mb-0">{formatMins(preview.effectiveMinutes)}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 text-end">
                                    <div className={`ui-badge p-3 px-4 rounded-4 fw-black text-uppercase shadow-glow d-inline-flex flex-column align-items-center gap-1 ${getStatusBadgeClass(preview.status, preview.isLate)}`}>
                                        <span style={{ fontSize: '11px' }}>{preview.status}</span>
                                        {preview.isLate && <span className="opacity-75" style={{ fontSize: '8px' }}>(LATE ARRIVAL)</span>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-3 opacity-50">
                                <p className="small fw-bold mb-0">Adjust timing to see live productivity preview</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="col-12 d-flex justify-content-end gap-3 mt-4 pt-4 border-top border-white border-opacity-5">
                    <button
                        onClick={onCancel}
                        className="btn btn-link text-muted fw-bold text-uppercase small text-decoration-none"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ ...formData, ...preview })}
                        disabled={!!validationError || loading || !preview}
                        className="ui-btn ui-btn-primary px-5 rounded-pill shadow-glow py-2.5 fw-black text-uppercase tracking-widest"
                        style={{ fontSize: '11px' }}
                    >
                        <Save size={16} className="me-2" />
                        Synchronize Entry
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceManualEntry;
