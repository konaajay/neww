import React, { useState, useEffect } from 'react';
import { 
  Timer, 
  MapPin, 
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Plus,
  Play
} from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';

const ShiftManagement = ({ offices = [] }) => {
    const { isDarkMode } = useTheme();
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [shiftData, setShiftData] = useState({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        graceMinutes: 15,
        minHalfDayMinutes: 240,
        minFullDayMinutes: 480,
        officeId: ''
    });

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        setLoading(true);
        try {
            const res = await adminService.fetchAttendanceShifts();
            setShifts(res.data || []);
        } catch (err) {
            console.error("Failed to load shifts", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!shiftData.name || !shiftData.officeId) {
            toast.error("Please provide shift nomenclature and target node");
            return;
        }

        try {
            // Find the selected office object for the backend structure
            const selectedOffice = offices.find(o => o.id === parseInt(shiftData.officeId));
            
            await adminService.createShift({
                ...shiftData,
                office: selectedOffice
            });
            toast.success("Shift registry initialized");
            setShiftData({
                name: '',
                startTime: '09:00',
                endTime: '18:00',
                graceMinutes: 15,
                minHalfDayMinutes: 240,
                minFullDayMinutes: 480,
                officeId: ''
            });
            fetchShifts();
        } catch (err) {
            toast.error("Failed to initialize shift cycle");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Terminate this operational cycle?")) return;
        try {
            await adminService.deleteShift(id);
            toast.success("Cycle terminated");
            fetchShifts();
        } catch (err) {
            toast.error("Failed to terminate cycle");
        }
    };

    return (
        <div className="d-flex flex-column gap-4 animate-fade-in">
            {/* Shift Configuration Form */}
            <div className={`premium-card p-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '32px' }}>
                <div className="d-flex align-items-center gap-3 mb-5">
                    <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill shadow-glow">
                        <Timer size={24} />
                    </div>
                    <div>
                        <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Shift Registry</h5>
                        <p className="text-muted small mb-0 opacity-50 fw-bold">DEFINE SYSTEM OPERATIONAL CYCLES</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="row g-4">
                    <div className="col-md-6">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Shift Nomenclature</label>
                        <input 
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                            placeholder="e.g. ALPHA DAY ROTATION"
                            value={shiftData.name}
                            onChange={e => setShiftData({...shiftData, name: e.target.value})}
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Full Day (Min)</label>
                        <input 
                            type="number"
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100 text-center"
                            value={shiftData.minFullDayMinutes}
                            onChange={e => setShiftData({...shiftData, minFullDayMinutes: e.target.value})}
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Half Day (Min)</label>
                        <input 
                            type="number"
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100 text-center"
                            value={shiftData.minHalfDayMinutes}
                            onChange={e => setShiftData({...shiftData, minHalfDayMinutes: e.target.value})}
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Break (Min)</label>
                        <input 
                            type="number"
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100 text-center"
                            placeholder="0"
                        />
                    </div>

                    <div className="col-md-6">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Operational Branch (Office)</label>
                        <select 
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                            value={shiftData.officeId}
                            onChange={e => setShiftData({...shiftData, officeId: e.target.value})}
                        >
                            <option value="">Link to global hub (optional)...</option>
                            {offices.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-6">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Arrival Grace Limit (Mins)</label>
                        <input 
                            type="number"
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                            value={shiftData.graceMinutes}
                            onChange={e => setShiftData({...shiftData, graceMinutes: e.target.value})}
                        />
                    </div>

                    <div className="col-md-6 mt-4">
                        <div className={`p-4 rounded-4 border ${isDarkMode ? 'border-white border-opacity-5 bg-white bg-opacity-5' : 'border-light bg-light bg-opacity-50'}`}>
                            <div className="row g-3">
                                <div className="col-6">
                                    <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '8px' }}>Inauguration</label>
                                    <input 
                                        type="time" 
                                        className="ui-input w-100 py-3 px-4 rounded-3 fw-bold text-center"
                                        value={shiftData.startTime}
                                        onChange={e => setShiftData({...shiftData, startTime: e.target.value})}
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '8px' }}>Termination</label>
                                    <input 
                                        type="time" 
                                        className="ui-input w-100 py-3 px-4 rounded-3 fw-bold text-center"
                                        value={shiftData.endTime}
                                        onChange={e => setShiftData({...shiftData, endTime: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 d-flex align-items-end justify-content-end mb-2">
                        <button type="submit" className="ui-btn ui-btn-primary px-5 py-3 rounded-4 shadow-glow fw-black text-uppercase tracking-widest d-flex align-items-center gap-2">
                            <Play size={18} /> INITIALIZE CYCLE
                        </button>
                    </div>
                </form>
            </div>

            {/* Registered Shifts Grid */}
            <div className="row g-4 mt-2">
                {shifts.map(shift => (
                    <div key={shift.id} className="col-md-6 col-xl-4">
                        <div className={`premium-card p-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20 shadow-none' : 'bg-white shadow-sm'}`} style={{ borderRadius: '32px' }}>
                            <div className="d-flex align-items-center justify-content-between mb-4">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="p-2.5 bg-primary bg-opacity-10 text-primary rounded-circle">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <h6 className="fw-black text-main text-uppercase mb-0" style={{ fontSize: '13px' }}>{shift.name}</h6>
                                        <span className="text-muted fw-bold" style={{ fontSize: '9px' }}>NODE ID: {shift.id}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-4 rounded-4 mb-4 d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-white bg-opacity-5' : 'bg-light'}`}>
                                <div className="text-center flex-fill border-end border-white border-opacity-10">
                                    <span className="text-muted small fw-black text-uppercase d-block mb-1" style={{ fontSize: '8px' }}>Start</span>
                                    <span className="fw-black text-main" style={{ fontSize: '15px' }}>{shift.startTime}</span>
                                </div>
                                <div className="text-center flex-fill">
                                    <span className="text-muted small fw-black text-uppercase d-block mb-1" style={{ fontSize: '8px' }}>End</span>
                                    <span className="fw-black text-main" style={{ fontSize: '15px' }}>{shift.endTime}</span>
                                </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center mb-4 px-2">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="p-1.5 bg-info bg-opacity-10 text-info rounded-2" style={{ fontSize: '10px', fontWeight: '900' }}>
                                        {shift.graceMinutes}M GRACE
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className="ui-btn-icon bg-info bg-opacity-10 text-info border-0 p-2 rounded-3" title="Edit Cycle">
                                        <Edit2 size={14} />
                                    </button>
                                    <button className="ui-btn-icon bg-danger bg-opacity-10 text-danger border-0 p-2 rounded-3" title="Terminate Cycle" onClick={() => handleDelete(shift.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShiftManagement;
