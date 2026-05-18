import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Trash2,
  Activity,
  Timer,
  Save,
  Plus,
  Play,
  Settings2,
  Calendar,
  Edit2
} from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';
import PortalSelect from '../../../components/PortalSelect';

const AttendanceGovernance = ({ offices = [] }) => {
    const { isDarkMode } = useTheme();
    const queryClient = useQueryClient();
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingShiftId, setEditingShiftId] = useState(null);
    
    const officeOptions = useMemo(() => 
        offices.map(o => ({ value: o.id.toString(), label: o.name })),
    [offices]);

    // Unified Governance State
    const [govData, setGovData] = useState({
        officeId: '',
        shiftName: 'STANDARD SHIFT',
        shiftStartTime: '11:00',
        shiftEndTime: '20:00',
        gracePeriodMinutes: 15,
        minimumWorkMinutes: 480,
        halfDayMinutes: 240,
        shortBreakStartTime: '17:00',
        shortBreakEndTime: '17:10',
        longBreakStartTime: '13:00',
        longBreakEndTime: '14:00',
        trackingIntervalSec: 300,
        maxAccuracyMeters: 100,
        maxIdleMinutes: 30
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await adminService.fetchPolicies();
            setPolicies(res.data || []);
        } catch (err) {
            console.error("Failed to load governance data", err);
        } finally {
            setLoading(false);
        }
    };

    // Live Calculation Logic
    const stats = useMemo(() => {
        try {
            const start = new Date(`2000-01-01T${govData.shiftStartTime}`);
            const end = new Date(`2000-01-01T${govData.shiftEndTime}`);
            if (end < start) end.setDate(end.getDate() + 1);
            
            const totalShiftMins = (end - start) / 60000;
            
            const sStart = new Date(`2000-01-01T${govData.shortBreakStartTime}`);
            const sEnd = new Date(`2000-01-01T${govData.shortBreakEndTime}`);
            const shortMins = (sEnd - sStart) / 60000;

            const lStart = new Date(`2000-01-01T${govData.longBreakStartTime}`);
            const lEnd = new Date(`2000-01-01T${govData.longBreakEndTime}`);
            const longMins = (lEnd - lStart) / 60000;

            const totalBreakMins = Math.max(0, shortMins) + Math.max(0, longMins);
            const workingMins = totalShiftMins - totalBreakMins;

            return { totalShiftMins, totalBreakMins, workingMins };
        } catch (e) {
            return { totalShiftMins: 0, totalBreakMins: 0, workingMins: 0 };
        }
    }, [govData.shiftStartTime, govData.shiftEndTime, govData.shortBreakStartTime, govData.shortBreakEndTime, govData.longBreakStartTime, govData.longBreakEndTime]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!govData.officeId) {
            toast.error("Please select a target office node");
            return;
        }
        try {
            if (editingId) {
                // UPDATE Mode
                await adminService.updatePolicy(editingId, {
                    ...govData,
                    shiftStartTime: govData.shiftStartTime
                });

                if (editingShiftId) {
                    const selectedOffice = offices.find(o => o.id === parseInt(govData.officeId));
                    await adminService.updateShift(editingShiftId, {
                        name: govData.shiftName,
                        startTime: govData.shiftStartTime,
                        endTime: govData.shiftEndTime,
                        graceMinutes: govData.gracePeriodMinutes,
                        minFullDayMinutes: govData.minimumWorkMinutes,
                        minHalfDayMinutes: govData.halfDayMinutes,
                        office: selectedOffice
                    });
                }
                toast.success("Governance protocol updated");
            } else {
                // CREATE Mode
                await adminService.createPolicy({
                    ...govData,
                    shiftStartTime: govData.shiftStartTime
                });

                const selectedOffice = offices.find(o => o.id === parseInt(govData.officeId));
                await adminService.createShift({
                    name: govData.shiftName,
                    startTime: govData.shiftStartTime,
                    endTime: govData.shiftEndTime,
                    graceMinutes: govData.gracePeriodMinutes,
                    minFullDayMinutes: govData.minimumWorkMinutes,
                    minHalfDayMinutes: govData.halfDayMinutes,
                    office: selectedOffice
                });
                toast.success("Governance protocol synchronized");
            }
            
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['offices'] });

            setEditingId(null);
            setEditingShiftId(null);
            setGovData({
                officeId: '',
                shiftName: 'STANDARD SHIFT',
                shiftStartTime: '11:00',
                shiftEndTime: '20:00',
                gracePeriodMinutes: 15,
                minimumWorkMinutes: 480,
                halfDayMinutes: 240,
                shortBreakStartTime: '17:00',
                shortBreakEndTime: '17:10',
                longBreakStartTime: '13:00',
                longBreakEndTime: '14:00',
                trackingIntervalSec: 300,
                maxAccuracyMeters: 100,
                maxIdleMinutes: 30
            });
            fetchData();
        } catch (err) {
            toast.error("Failed to synchronize governance");
        }
    };

    const handleEdit = async (policy) => {
        setEditingId(policy.id);
        
        // Find matching shift to get its ID and nomenclature
        try {
            const shiftsRes = await adminService.fetchAttendanceShifts();
            const matchingShift = (shiftsRes.data || []).find(s => s.office?.id === policy.officeId);
            
            if (matchingShift) {
                setEditingShiftId(matchingShift.id);
                setGovData({
                    officeId: policy.officeId.toString(),
                    shiftName: matchingShift.name,
                    shiftStartTime: policy.shiftStartTime || matchingShift.startTime || '11:00',
                    shiftEndTime: matchingShift.endTime || '20:00',
                    gracePeriodMinutes: policy.gracePeriodMinutes,
                    minimumWorkMinutes: policy.minimumWorkMinutes,
                    halfDayMinutes: policy.halfDayMinutes,
                    shortBreakStartTime: policy.shortBreakStartTime,
                    shortBreakEndTime: policy.shortBreakEndTime,
                    longBreakStartTime: policy.longBreakStartTime,
                    longBreakEndTime: policy.longBreakEndTime,
                    trackingIntervalSec: policy.trackingIntervalSec,
                    maxAccuracyMeters: policy.maxAccuracyMeters,
                    maxIdleMinutes: policy.maxIdleMinutes
                });
            } else {
                setGovData({
                    ...govData,
                    ...policy,
                    officeId: policy.officeId.toString()
                });
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error("Failed to fetch shifts for edit", err);
            setGovData({
                ...govData,
                ...policy,
                officeId: policy.officeId.toString()
            });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge this governance protocol?")) return;
        try {
            await adminService.deletePolicy(id);
            toast.success("Protocol purged");
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            fetchData();
        } catch (err) {
            toast.error("Failed to purge protocol");
        }
    };

    return (
        <div className="d-flex flex-column gap-4 animate-fade-in">
            {/* Unified Governance Form */}
            <div className={`premium-card p-4 p-lg-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '32px', backdropFilter: 'var(--glass-blur)' }}>
                <div className="d-flex align-items-center justify-content-between mb-4 mb-lg-5">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill shadow-glow animate-pulse-slow">
                            <Settings2 size={24} />
                        </div>
                        <div>
                            <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Governance Protocol</h5>
                            <p className="text-muted small mb-0 opacity-50 fw-bold">OPERATIONAL ARCHITECTURE ENFORCEMENT</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="row g-4">
                    {/* Header: Office & Nomenclature */}
                    <div className="col-md-6">
                        <div className="form-group">
                            <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Target Office Node</label>
                            <PortalSelect 
                                options={officeOptions}
                                value={govData.officeId}
                                onChange={(e) => setGovData({...govData, officeId: e.target.value})}
                                placeholder="Select location hub..."
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Shift Nomenclature</label>
                            <input className="ui-input py-3 px-4 rounded-4 fw-black w-100 text-uppercase tracking-wider" style={{ fontSize: '12px' }} value={govData.shiftName || ''} onChange={e => setGovData({...govData, shiftName: e.target.value})} />
                        </div>
                    </div>

                    {/* Section 1: Shift Timing & Grace */}
                    <div className="col-12 mt-5">
                        <h6 className="text-primary fw-black text-uppercase tracking-widest mb-4 d-flex align-items-center gap-2" style={{ fontSize: '11px' }}>
                            <Clock size={14} className="animate-spin-slow" style={{ animationDuration: '8s' }} /> Operational Timing
                        </h6>
                        <div className="row g-4">
                            <div className="col-md-4">
                                <div className="p-4 rounded-4 border border-white border-opacity-5 shadow-inner" style={{ background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                                    <div className="row g-3">
                                        <div className="col-6 text-center">
                                            <label className="text-muted small fw-black mb-2 d-block tracking-widest" style={{ fontSize: '8px' }}>START</label>
                                            <input type="time" className="ui-input w-100 py-2 rounded-3 fw-black text-center text-primary" style={{ fontSize: '13px' }} value={govData.shiftStartTime || ''} onChange={e => setGovData({...govData, shiftStartTime: e.target.value})} />
                                        </div>
                                        <div className="col-6 text-center">
                                            <label className="text-muted small fw-black mb-2 d-block tracking-widest" style={{ fontSize: '8px' }}>END</label>
                                            <input type="time" className="ui-input w-100 py-2 rounded-3 fw-black text-center text-primary" style={{ fontSize: '13px' }} value={govData.shiftEndTime || ''} onChange={e => setGovData({...govData, shiftEndTime: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '9px' }}>Grace (Min)</label>
                                <input type="number" className="ui-input py-3 px-4 rounded-4 fw-black w-100 text-center" value={govData.gracePeriodMinutes || 0} onChange={e => setGovData({...govData, gracePeriodMinutes: e.target.value})} />
                            </div>
                            <div className="col-md-3">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '9px' }}>Full Day (Min)</label>
                                <input type="number" className="ui-input py-3 px-4 rounded-4 fw-black w-100 text-center text-success" value={govData.minimumWorkMinutes || 0} onChange={e => setGovData({...govData, minimumWorkMinutes: e.target.value})} />
                            </div>
                            <div className="col-md-3">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '9px' }}>Half Day (Min)</label>
                                <input type="number" className="ui-input py-3 px-4 rounded-4 fw-black w-100 text-center text-warning" value={govData.halfDayMinutes || 0} onChange={e => setGovData({...govData, halfDayMinutes: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Break Windows */}
                    <div className="col-12 mt-4">
                        <h6 className="text-primary fw-black text-uppercase tracking-widest mb-4 d-flex align-items-center gap-2" style={{ fontSize: '11px' }}>
                            <Timer size={14} /> Break Windows
                        </h6>
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="p-4 rounded-4 border border-white border-opacity-5 shadow-inner" style={{ background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                                    <span className="text-muted small fw-black text-uppercase mb-3 d-block tracking-widest" style={{ fontSize: '9px', opacity: 0.6 }}>Short Break Protocol</span>
                                    <div className="d-flex gap-3 align-items-center">
                                        <input type="time" className="ui-input flex-fill py-2 rounded-3 fw-black text-center" value={govData.shortBreakStartTime || ''} onChange={e => setGovData({...govData, shortBreakStartTime: e.target.value})} />
                                        <div className="text-muted opacity-30 fw-black">→</div>
                                        <input type="time" className="ui-input flex-fill py-2 rounded-3 fw-black text-center" value={govData.shortBreakEndTime || ''} onChange={e => setGovData({...govData, shortBreakEndTime: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="p-4 rounded-4 border border-white border-opacity-5 shadow-inner" style={{ background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                                    <span className="text-muted small fw-black text-uppercase mb-3 d-block tracking-widest" style={{ fontSize: '9px', opacity: 0.6 }}>Long Break / Lunch Protocol</span>
                                    <div className="d-flex gap-3 align-items-center">
                                        <input type="time" className="ui-input flex-fill py-2 rounded-3 fw-black text-center" value={govData.longBreakStartTime || ''} onChange={e => setGovData({...govData, longBreakStartTime: e.target.value})} />
                                        <div className="text-muted opacity-30 fw-black">→</div>
                                        <input type="time" className="ui-input flex-fill py-2 rounded-3 fw-black text-center" value={govData.longBreakEndTime || ''} onChange={e => setGovData({...govData, longBreakEndTime: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Advanced Tracking Matrix */}
                    <div className="col-12 mt-4">
                        <h6 className="text-primary fw-black text-uppercase tracking-widest mb-4 d-flex align-items-center gap-2" style={{ fontSize: '11px' }}>
                            <Activity size={14} /> Tracking Precision
                        </h6>
                        <div className="row g-4">
                            <div className="col-md-4">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '9px' }}>Accuracy Threshold (Meters)</label>
                                <input type="number" className="ui-input py-3 px-4 rounded-4 fw-black w-100 text-center" value={govData.maxAccuracyMeters || 0} onChange={e => setGovData({...govData, maxAccuracyMeters: e.target.value})} />
                            </div>
                            <div className="col-md-4">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '9px' }}>Sync Interval (Seconds)</label>
                                <input type="number" className="ui-input py-3 px-4 rounded-4 fw-black w-100 text-center" value={govData.trackingIntervalSec || 0} onChange={e => setGovData({...govData, trackingIntervalSec: e.target.value})} />
                            </div>
                            <div className="col-md-4">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '9px' }}>Max Idle (Minutes)</label>
                                <input type="number" className="ui-input py-3 px-4 rounded-4 fw-black w-100 text-center text-danger" value={govData.maxIdleMinutes || 0} onChange={e => setGovData({...govData, maxIdleMinutes: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Summary & Submission */}
                    <div className="col-12 mt-5 pt-2">
                        <div className="p-4 rounded-4 d-flex flex-wrap gap-4 align-items-center justify-content-between glass-morphism shadow-glow-sm" style={{ background: isDarkMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                            <div className="d-flex gap-5 flex-wrap">
                                <div>
                                    <span className="text-muted small fw-black text-uppercase d-block mb-1 tracking-widest" style={{ fontSize: '8px', opacity: 0.6 }}>Total Shift</span>
                                    <span className="fw-black text-main" style={{ fontSize: '15px' }}>{Math.floor(stats.totalShiftMins / 60)}h {Math.round(stats.totalShiftMins % 60)}m</span>
                                </div>
                                <div>
                                    <span className="text-muted small fw-black text-uppercase d-block mb-1 tracking-widest" style={{ fontSize: '8px', opacity: 0.6 }}>Total Breaks</span>
                                    <span className="fw-black text-danger" style={{ fontSize: '15px' }}>{Math.floor(stats.totalBreakMins / 60)}h {Math.round(stats.totalBreakMins % 60)}m</span>
                                </div>
                                <div className="border-start border-white border-opacity-10 ps-4">
                                    <span className="text-muted small fw-black text-uppercase d-block mb-1 tracking-widest" style={{ fontSize: '8px', opacity: 0.6 }}>Net Working Load</span>
                                    <span className="fw-black text-success" style={{ fontSize: '20px' }}>{Math.floor(stats.workingMins / 60)}h {Math.round(stats.workingMins % 60)}m</span>
                                </div>
                            </div>
                            <div className="d-flex gap-2">
                                {editingId && (
                                    <button type="button" className="ui-btn ui-btn-outline px-4 py-3 rounded-pill fw-black text-uppercase tracking-widest" onClick={() => {
                                        setEditingId(null);
                                        setEditingShiftId(null);
                                        setGovData({
                                            officeId: '',
                                            shiftName: 'STANDARD SHIFT',
                                            shiftStartTime: '11:00',
                                            shiftEndTime: '20:00',
                                            gracePeriodMinutes: 15,
                                            minimumWorkMinutes: 480,
                                            halfDayMinutes: 240,
                                            shortBreakStartTime: '17:00',
                                            shortBreakEndTime: '17:10',
                                            longBreakStartTime: '13:00',
                                            longBreakEndTime: '14:00',
                                            trackingIntervalSec: 300,
                                            maxAccuracyMeters: 100,
                                            maxIdleMinutes: 30
                                        });
                                    }}>CANCEL</button>
                                )}
                                <button type="submit" className="ui-btn ui-btn-primary px-5 py-3 rounded-pill shadow-glow fw-black text-uppercase tracking-widest d-flex align-items-center gap-2 transition-all hover-scale">
                                    <Save size={18} /> {editingId ? 'UPDATE PROTOCOL' : 'SYNC PROTOCOL'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* List of Registered Protocols */}
            <div className={`premium-card p-3 p-lg-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '32px' }}>
                <div className="d-flex align-items-center gap-3 mb-4 mb-lg-5">
                    <div className="p-3 bg-info bg-opacity-10 text-info rounded-pill shadow-glow">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Active Hub Protocols</h5>
                        <p className="text-muted small mb-0 opacity-50 fw-bold">CURRENTLY ENFORCED OPERATIONAL RULES</p>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-borderless align-middle mb-0">
                        <thead>
                            <tr>
                                <th className="text-muted small fw-black text-uppercase py-3" style={{ fontSize: '9px' }}>Office Node</th>
                                <th className="text-muted small fw-black text-uppercase py-3" style={{ fontSize: '9px' }}>Timing Matrix</th>
                                <th className="text-muted small fw-black text-uppercase py-3 text-center" style={{ fontSize: '9px' }}>Net Load</th>
                                <th className="text-muted small fw-black text-uppercase py-3 text-end" style={{ fontSize: '9px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policies.map(p => (
                                <tr key={p.id} className="border-top border-white border-opacity-5">
                                    <td className="py-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <MapPin size={14} className="text-primary" />
                                            <span className="fw-black text-main small">{p.officeName?.toUpperCase()}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column gap-1">
                                            <span className="fw-bold small">{p.shiftStartTime || '09:30'} - {p.shiftEndTime || '18:30'} (Logic Hub)</span>
                                            <div className="d-flex gap-2">
                                                <span className="badge bg-surface border border-info border-opacity-25 text-info fw-black" style={{ fontSize: '8px' }}>Grace: {p.gracePeriodMinutes}m</span>
                                                <span className="badge bg-surface border border-success border-opacity-25 text-success fw-black" style={{ fontSize: '8px' }}>Full: {p.minimumWorkMinutes}m</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex flex-column align-items-center">
                                            <Activity size={14} className="text-success mb-1" />
                                            <span className="fw-black text-success small">{p.minimumWorkMinutes} MIN</span>
                                        </div>
                                    </td>
                                    <td className="text-end">
                                        <div className="d-flex justify-content-end gap-2">
                                            <button className="ui-btn-icon bg-primary bg-opacity-10 text-primary border-0 p-2 rounded-3" onClick={() => handleEdit(p)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="ui-btn-icon bg-danger bg-opacity-10 text-danger border-0 p-2 rounded-3" onClick={() => handleDelete(p.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceGovernance;
