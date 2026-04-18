import React, { useState, useEffect } from 'react';
import adminService from '../../../services/adminService';
import { MapPin, Shield, Clock, Plus, Trash2, Save, RefreshCw, Edit, Target as TargetIcon, Zap, ArrowRight, TrendingUp, IndianRupee } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import TargetModal from './TargetModal';

const AttendanceSettings = () => {
    const { isDarkMode } = useTheme();
    const [offices, setOffices] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('offices');
    const [editingPolicyId, setEditingPolicyId] = useState(null);
    const [editingShiftId, setEditingShiftId] = useState(null);
    const [globalTargets, setGlobalTargets] = useState(null);
    const [isSavingTargets, setIsSavingTargets] = useState(false);

    const [userSearchQuery, setUserSearchQuery] = useState('PERSON');
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

    const [newOffice, setNewOffice] = useState({ name: '', latitude: 0, longitude: 0, radius: 100 });
    const [newShift, setNewShift] = useState({ name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, minHalfDayMinutes: 240, minFullDayMinutes: 480, officeId: '' });
    const [newPolicy, setNewPolicy] = useState({ 
        officeId: '', 
        trackingIntervalSec: 300, 
        shortBreakStartTime: '17:00', 
        shortBreakEndTime: '17:10', 
        longBreakStartTime: '13:00', 
        longBreakEndTime: '14:00', 
        gracePeriodMinutes: 2,
        maxAccuracyMeters: 100, 
        minimumWorkMinutes: 240,
        maxIdleMinutes: 30
    });


    const fetchData = async () => {
        setLoading(true);
        try {
            const [officesRes, policiesRes, shiftsRes, targetsRes, usersRes] = await Promise.all([
                adminService.fetchOffices(),
                adminService.fetchPolicies(),
                adminService.fetchAttendanceShifts(),
                adminService.fetchGlobalTargets(),
                adminService.fetchUsers()
            ]);
            
            setGlobalTargets(targetsRes.data.data);
            
            const userData = usersRes.data.data;
            setUsers(Array.isArray(userData) ? userData : (userData?.content || []));

            const offData = officesRes.data.data;
            setOffices(Array.isArray(offData) ? offData : (offData?.content || []));
            
            const polData = policiesRes.data.data;
            setPolicies(Array.isArray(polData) ? polData : (polData?.content || []));
            
            const shiftData = shiftsRes.data.data;
            setShifts(Array.isArray(shiftData) ? shiftData : (shiftData?.content || []));
        } catch (err) {
            toast.error('Failed to load attendance settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateOffice = async (e) => {
        e.preventDefault();
        try {
            await adminService.createOffice(newOffice);
            toast.success('Office location added');
            setNewOffice({ name: '', latitude: 0, longitude: 0, radius: 100 });
            fetchData();
        } catch (err) {
            toast.error('Failed to create office');
        }
    };

    const handleDeleteOffice = async (id) => {
        if (!window.confirm('Delete this office location? This may affect existing policies.')) return;
        try {
            await adminService.deleteOffice(id);
            toast.success('Office removed');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete office');
        }
    };

    const handleDeletePolicy = async (id) => {
        if (!window.confirm('Delete this compliance policy?')) return;
        try {
            await adminService.deletePolicy(id);
            toast.success('Policy removed');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete policy');
        }
    };

    const handleCreateShift = async (e) => {
        e.preventDefault();
        const payload = {
            ...newShift,
            office: newShift.officeId ? { id: parseInt(newShift.officeId) } : null
        };
        try {
            if (editingShiftId) {
                await adminService.updateShift(editingShiftId, payload);
                toast.success('Work shift updated');
            } else {
                await adminService.createShift(payload);
                toast.success('Work shift created');
            }
            setEditingShiftId(null);
            setNewShift({ name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, minHalfDayMinutes: 240, minFullDayMinutes: 480, officeId: '' });
            fetchData();
        } catch (err) {
            toast.error(editingShiftId ? 'Failed to update shift' : 'Failed to create shift');
        }
    };

    const handleCreatePolicy = async (e) => {
        e.preventDefault();
        if (!newPolicy.officeId) return toast.warning('Select an office first');
        try {
            if (editingPolicyId) {
                await adminService.updatePolicy(editingPolicyId, newPolicy);
                toast.success('Policy updated successfully');
            } else {
                await adminService.createPolicy(newPolicy);
                toast.success('Policy active');
            }
            setEditingPolicyId(null);
            setNewPolicy({ 
                officeId: '', 
                trackingIntervalSec: 300, 
                shortBreakStartTime: '17:00', 
                shortBreakEndTime: '17:10', 
                longBreakStartTime: '13:00', 
                longBreakEndTime: '14:00', 
                gracePeriodMinutes: 2,
                maxAccuracyMeters: 100, 
                minimumWorkMinutes: 240,
                maxIdleMinutes: 30
            });
            fetchData();
        } catch (err) {
            toast.error(editingPolicyId ? 'Failed to update policy' : 'Failed to create policy');
        }
    };
    
    const handleEditPolicy = (policy) => {
        setEditingPolicyId(policy.id);
        setNewPolicy({
            officeId: policy.officeId,
            trackingIntervalSec: policy.trackingIntervalSec,
            shortBreakStartTime: policy.shortBreakStartTime,
            shortBreakEndTime: policy.shortBreakEndTime,
            longBreakStartTime: policy.longBreakStartTime,
            longBreakEndTime: policy.longBreakEndTime,
            gracePeriodMinutes: policy.gracePeriodMinutes,
            maxAccuracyMeters: policy.maxAccuracyMeters || 100,
            minimumWorkMinutes: policy.minimumWorkMinutes,
            maxIdleMinutes: policy.maxIdleMinutes || 30
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleEditShift = (shift) => {
        setEditingShiftId(shift.id);
        setNewShift({
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            graceMinutes: shift.graceMinutes,
            minHalfDayMinutes: shift.minHalfDayMinutes,
            minFullDayMinutes: shift.minFullDayMinutes,
            officeId: shift.office ? shift.office.id.toString() : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdateGlobalTargets = async (targets) => {
        setIsSavingTargets(true);
        try {
            await adminService.updateGlobalTargets(targets);
            toast.success('Global operational milestones synchronized');
            setGlobalTargets(targets);
        } catch (err) {
            toast.error('Failed to update global targets');
        } finally {
            setIsSavingTargets(false);
        }
    };

    const handleDeleteShift = async (id) => {
        if (!window.confirm('Delete this shift?')) return;
        try {
            await adminService.deleteShift(id);
            toast.success('Shift removed');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete shift');
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center p-5">
            <RefreshCw className="animate-spin text-primary" size={32} />
        </div>
    );

    return (
        <div className="container-fluid p-0 animate-fade-in">
            <div className="row g-4">
                {/* Sidebar Navigation - Futuristic Node Console */}
                <div className="col-12 col-lg-3">
                    <div className={`premium-card p-4 border-0 ${isDarkMode ? 'bg-surface bg-opacity-40 backdrop-blur' : 'bg-white shadow-sm'} d-flex flex-column gap-4`} style={{ borderRadius: '32px' }}>
                        <div>
                           <h6 className={`fw-black ${isDarkMode ? 'text-main' : 'text-dark'} small tracking-widest text-uppercase opacity-40 mb-1`} style={{ fontSize: '9px' }}>System Control</h6>
                           <p className="text-muted small fw-bold mb-0 opacity-30" style={{ fontSize: '8px' }}>IDENTITY NODES & PROTOCOLS</p>
                        </div>

                        <div className="d-flex flex-column gap-2">
                            {[
                                { id: 'offices', label: 'OFFICE LOCATIONS', icon: MapPin, color: 'primary' },
                                { id: 'policies', label: 'COMPLIANCE POLICIES', icon: Shield, color: 'info' },
                                { id: 'shifts', label: 'WORK SHIFTS', icon: Clock, color: 'warning' },
                                 // { id: 'incentives', label: 'INCENTIVE FLOW', icon: Zap, color: 'primary' },
                            ].map(btn => {
                                const Icon = btn.icon;
                                const isActive = activeSection === btn.id;
                                return (
                                    <button 
                                        key={btn.id}
                                        onClick={() => setActiveSection(btn.id)}
                                        className={`p-3 d-flex align-items-center gap-3 rounded-4 border transition-all ${isActive ? 'bg-primary border-primary shadow-glow translate-x-1' : `${isDarkMode ? 'bg-dark bg-opacity-20 border-white border-opacity-5' : 'bg-light border-0'} text-muted hover-bg-surface`}`}
                                        style={{ outline: 'none' }}
                                    >
                                        <div className={`p-2 rounded-3 ${isActive ? 'bg-white bg-opacity-20 text-white' : `bg-${btn.color} ${isDarkMode ? 'bg-opacity-10' : 'bg-opacity-20'} text-${btn.color}`}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="text-start">
                                            <p className={`fw-black text-uppercase mb-0 tracking-widest ${isActive ? 'text-white' : (isDarkMode ? 'text-main' : 'text-dark')}`} style={{ fontSize: '10px' }}>{btn.label}</p>
                                            <span className="text-muted fw-bold opacity-30 text-uppercase" style={{ fontSize: '7px' }}>PROTOCOL ACTIVE</span>
                                        </div>
                                        {isActive && <div className="ms-auto w-1 h-4 bg-white rounded-pill opacity-50" style={{ width: '3px', height: '16px' }}></div>}
                                    </button>
                                );
                            })}
                        </div>

                         {/* <div className="mt-auto p-4 bg-primary bg-opacity-5 rounded-5 border border-primary border-opacity-10 d-none d-lg-block">
                              <p className="text-muted small fw-bold mb-0 opacity-50" style={{ fontSize: '9px' }}>CORE ENGINE v4.2</p>
                              <div className="h-1 bg-primary bg-opacity-20 mt-2 rounded-pill overflow-hidden">
                                  <div className="h-100 bg-primary animate-pulse" style={{ width: '65%' }}></div>
                              </div>
                         </div> */}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="col-12 col-lg-9">
                    {activeSection === 'offices' && (
                        <div className="d-flex flex-column gap-4 animate-fade-in">
                            <div className={`premium-card p-4 border-0 shadow-lg ${isDarkMode ? '' : 'bg-white'}`}>
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h5 className={`fw-black ${isDarkMode ? 'text-main' : 'text-dark'} mb-0 text-uppercase tracking-widest`}>Branch Architecture</h5>
                                        <p className="text-muted small fw-bold opacity-50 mb-0" style={{ fontSize: '9px' }}>DEFINE GEOGRAPHIC OPERATIONAL NODES</p>
                                    </div>
                                </div>
                                <form onSubmit={handleCreateOffice} className={`${isDarkMode ? 'bg-surface bg-opacity-20 border-white border-opacity-5' : 'bg-light border-0'} p-4 rounded-4 border`}>
                                    <div className="row g-4">
                                        <div className="col-md-6 border-end border-opacity-5 pe-md-4" style={{ borderColor: isDarkMode ? 'white' : 'rgba(0,0,0,0.1)' }}>
                                            <div className="mb-4">
                                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Node Identifier</label>
                                                <input 
                                                    type="text" className={`ui-input py-2 rounded-3 ${isDarkMode ? '' : 'bg-white border text-dark'}`} 
                                                    value={newOffice.name} onChange={e => setNewOffice({...newOffice, name: e.target.value})}
                                                    placeholder="e.g. Hyderabad Global Hub" required
                                                />
                                            </div>
                                            <div className="mb-0">
                                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Geofence Radius (meters)</label>
                                                <input 
                                                    type="number" className={`ui-input py-2 rounded-3 ${isDarkMode ? '' : 'bg-white border text-dark'}`} 
                                                    value={newOffice.radius || 100} onChange={e => setNewOffice({...newOffice, radius: parseInt(e.target.value) || 0})}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6 ps-md-4">
                                            <div className="mb-4">
                                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Latitude Coordination</label>
                                                <input 
                                                    type="number" step="any" className="ui-input py-2 rounded-3" 
                                                    value={newOffice.latitude || 0} onChange={e => setNewOffice({...newOffice, latitude: parseFloat(e.target.value) || 0})}
                                                    required
                                                />
                                            </div>
                                            <div className="mb-0">
                                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Longitude Coordination</label>
                                                <input 
                                                    type="number" step="any" className="ui-input py-2 rounded-3" 
                                                    value={newOffice.longitude || 0} onChange={e => setNewOffice({...newOffice, longitude: parseFloat(e.target.value) || 0})}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-end mt-4 pt-3 border-top border-white border-opacity-5">
                                        <button type="submit" className="ui-btn ui-btn-primary px-5 rounded-pill shadow-glow py-2 fw-black text-uppercase tracking-widest" style={{ fontSize: '11px' }}>
                                            <Save size={16} className="me-2" />
                                            Initialize Protocol
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="row g-3">
                                {offices.map(office => (
                                    <div key={office.id} className="col-md-6 col-xl-4">
                                        <div className={`premium-card h-100 p-4 hover-lift border-0 ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '20px' }}>
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
                                                        <MapPin size={14} />
                                                    </div>
                                                    <h6 className={`mb-0 fw-black ${isDarkMode ? 'text-main' : 'text-dark'} text-uppercase small tracking-wider`}>{office.name}</h6>
                                                </div>
                                                <button onClick={() => handleDeleteOffice(office.id)} className="ui-btn btn-sm text-danger h-auto p-2 rounded-circle hover-bg-danger bg-opacity-10 border-0 shadow-none">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="bg-surface bg-opacity-30 p-3 rounded-3 border border-white border-opacity-5">
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span className="text-muted fw-bold" style={{ fontSize: '8px' }}>COORDINATES</span>
                                                    <span className="text-main fw-black font-monospace" style={{ fontSize: '9px' }}>{office.latitude}, {office.longitude}</span>
                                                </div>
                                                <div className="d-flex justify-content-between pt-2 border-top border-white border-opacity-5">
                                                    <span className="text-muted fw-bold" style={{ fontSize: '8px' }}>GEOFENCE</span>
                                                    <span className="text-primary fw-black" style={{ fontSize: '9px' }}>{office.radius} Meters</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {offices.length === 0 && !loading && (
                                   <div className="col-12 py-5 text-center bg-surface bg-opacity-20 rounded-4 border border-dashed border-white border-opacity-10">
                                      <MapPin size={48} className="text-muted opacity-20 mb-3" />
                                      <h6 className="fw-black text-muted text-uppercase tracking-widest small">Binary Hub Not Detected</h6>
                                      <p className="text-muted small opacity-50 fw-bold mb-0">No office locations configured in local registry</p>
                                   </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'policies' && (
                        <div className="d-flex flex-column gap-4 animate-fade-in">
                            <div className={`premium-card p-4 border-0 shadow-lg ${isDarkMode ? '' : 'bg-white'}`}>
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h5 className={`fw-black ${isDarkMode ? 'text-main' : 'text-dark'} mb-0 text-uppercase tracking-widest`}>{editingPolicyId ? 'Modify Strategy' : 'Policy Engine'}</h5>
                                        <p className="text-muted small fw-bold opacity-50 mb-0" style={{ fontSize: '9px' }}>CONFIGURE OPERATIONAL COMPLIANCE GATEWAY</p>
                                    </div>
                                </div>
                                <form onSubmit={handleCreatePolicy} className={`${isDarkMode ? 'bg-surface bg-opacity-20 border-white border-opacity-5' : 'bg-light border-0'} p-4 rounded-4 border`}>
                                    <div className="row g-4">
                                        <div className="col-lg-4 border-end border-white border-opacity-5 pe-lg-4">
                                            <div className="mb-4">
                                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Branch Target</label>
                                                <select 
                                                    className="ui-input py-2 rounded-3" 
                                                    value={newPolicy.officeId} onChange={e => setNewPolicy({...newPolicy, officeId: e.target.value})}
                                                    required
                                                >
                                                    <option value="" className="text-dark">Select hub...</option>
                                                    {offices.map(o => (
                                                        <option key={o.id} value={o.id} className="text-dark">{o.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-12">
                                                    <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Out-of-Range Grace (m)</label>
                                                    <input 
                                                        type="number" className="ui-input py-2 rounded-3" 
                                                        value={newPolicy.gracePeriodMinutes || 0} onChange={e => setNewPolicy({...newPolicy, gracePeriodMinutes: parseInt(e.target.value) || 0})}
                                                        placeholder="2" required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="col-lg-5 border-end border-white border-opacity-5 px-lg-4">
                                            <label className="text-primary small fw-black text-uppercase mb-3 d-block" style={{fontSize: '0.65rem'}}>Intermission Parameters</label>
                                            <div className="row g-3">
                                                <div className="col-12">
                                                    <div className="p-3 bg-surface rounded-4 border border-white border-opacity-5">
                                                        <span className="small text-muted fw-bold d-block mb-3 opacity-75" style={{fontSize: '0.65rem'}}>RECREATION WINDOW</span>
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="flex-grow-1">
                                                                <label className="text-muted fs-xs fw-black d-block mb-1" style={{fontSize: '7px'}}>START</label>
                                                                <input type="time" className="ui-input px-3 border-0 bg-dark bg-opacity-50 text-center rounded-3" 
                                                                   value={newPolicy.shortBreakStartTime} onChange={e => setNewPolicy({...newPolicy, shortBreakStartTime: e.target.value})} />
                                                            </div>
                                                            <ArrowRight size={14} className="text-muted opacity-20 mt-4" />
                                                            <div className="flex-grow-1">
                                                                <label className="text-muted fs-xs fw-black d-block mb-1" style={{fontSize: '7px'}}>END</label>
                                                                <input type="time" className="ui-input px-3 border-0 bg-dark bg-opacity-50 text-center rounded-3" 
                                                                   value={newPolicy.shortBreakEndTime} onChange={e => setNewPolicy({...newPolicy, shortBreakEndTime: e.target.value})} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="p-3 bg-surface rounded-4 border border-white border-opacity-5 shadow-sm">
                                                        <span className="small text-muted fw-bold d-block mb-3 opacity-75" style={{fontSize: '0.65rem'}}>LUNCHEON WINDOW</span>
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="flex-grow-1">
                                                                <label className="text-muted fs-xs fw-black d-block mb-1" style={{fontSize: '7px'}}>START</label>
                                                                <input type="time" className="ui-input px-3 border-0 bg-dark bg-opacity-50 text-center rounded-3" 
                                                                   value={newPolicy.longBreakStartTime} onChange={e => setNewPolicy({...newPolicy, longBreakStartTime: e.target.value})} />
                                                            </div>
                                                            <ArrowRight size={14} className="text-muted opacity-20 mt-4" />
                                                            <div className="flex-grow-1">
                                                                <label className="text-muted fs-xs fw-black d-block mb-1" style={{fontSize: '7px'}}>END</label>
                                                                <input type="time" className="ui-input px-3 border-0 bg-dark bg-opacity-50 text-center rounded-3" 
                                                                   value={newPolicy.longBreakEndTime} onChange={e => setNewPolicy({...newPolicy, longBreakEndTime: e.target.value})} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="col-lg-3 d-flex flex-column justify-content-between ps-lg-4">
                                            <div className="d-flex flex-column gap-3">
                                                <div>
                                                    <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Active Threshold (min)</label>
                                                    <input 
                                                        type="number" className="ui-input py-2 rounded-3" 
                                                        value={newPolicy.minimumWorkMinutes || 0} onChange={e => setNewPolicy({...newPolicy, minimumWorkMinutes: parseInt(e.target.value) || 0})}
                                                        placeholder="240" required
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 d-flex flex-column gap-2">
                                                <button type="submit" className="ui-btn ui-btn-primary w-100 rounded-pill shadow-glow py-2 fw-black text-uppercase tracking-widest" style={{ fontSize: '10px' }}>
                                                    <Save size={16} className="me-2" />
                                                    {editingPolicyId ? 'SYNC ENGINE' : 'ACTIVATE ENGINE'}
                                                </button>
                                                {editingPolicyId && (
                                                    <button 
                                                        type="button" 
                                                        className="ui-btn ui-btn-outline w-100 rounded-pill py-2 fw-black text-uppercase tracking-widest" 
                                                        style={{ fontSize: '10px' }}
                                                        onClick={() => {
                                                            setEditingPolicyId(null);
                                                            setNewPolicy({ officeId: '', trackingIntervalSec: 300, shortBreakStartTime: '17:00', shortBreakEndTime: '17:10', longBreakStartTime: '13:00', longBreakEndTime: '14:00', gracePeriodMinutes: 2, maxAccuracyMeters: 100, minimumWorkMinutes: 240, maxIdleMinutes: 30});
                                                        }}
                                                    >ABORT</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                         <div className={`premium-card p-0 overflow-hidden shadow-lg border-0 ${isDarkMode ? '' : 'bg-white mt-4'}`} style={{ borderRadius: '24px' }}>
                                <div className={`card-header bg-transparent p-4 border-0 d-flex justify-content-between align-items-center border-bottom ${isDarkMode ? 'border-white border-opacity-5' : 'border-dark border-opacity-5'}`}>
                                   <div className="d-flex align-items-center gap-2">
                                      <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
                                         <Shield size={18} />
                                      </div>
                                      <h6 className={`fw-black mb-0 ${isDarkMode ? 'text-main' : 'text-dark'} text-uppercase small tracking-widest`}>Active Governance Registry</h6>
                                   </div>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0 border-0 bg-transparent">
                                        <thead>
                                            <tr className={`${isDarkMode ? 'bg-surface bg-opacity-40 border-white border-opacity-5' : 'bg-light border-dark border-opacity-5'} border-bottom`}>
                                                <th className="ps-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Target Node</th>
                                                <th className="py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '9px' }}>Latency Matrix</th>
                                                <th className="py-3 small fw-black text-muted text-uppercase tracking-widest text-center" style={{ fontSize: '9px' }}>Break Windows</th>
                                                <th className="py-3 small fw-black text-muted text-uppercase tracking-widest text-end" style={{ fontSize: '9px' }}>Load</th>
                                                <th className="pe-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-end" style={{ fontSize: '9px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {policies.map(p => (
                                                <tr key={p.id} className={`${isDarkMode ? 'border-white border-opacity-5' : 'border-dark border-opacity-5'} border-bottom transition-all`}>
                                                    <td className="ps-4 py-3">
                                                       <div className={`fw-black ${isDarkMode ? 'text-main' : 'text-dark'} text-uppercase small tracking-tighter`}>{p.officeName || `Node: ${p.officeId}`}</div>
                                                       <div className="text-muted fw-bold" style={{ fontSize: '8px' }}>IDENTITY: {p.id.slice(-8)}</div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column">
                                                            <div className="small fw-black text-primary tabular-nums">{p.gracePeriodMinutes || 0}M GRACE</div>
                                                            <div className="text-muted fw-bold" style={{ fontSize: '8px' }}>TIMEOUT BUFFER</div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex align-items-center justify-content-center gap-2">
                                                           <span className="ui-badge bg-info bg-opacity-10 text-info fw-black" style={{ fontSize: '8px' }}>SHORT: {p.shortBreakStartTime}</span>
                                                           <span className="ui-badge bg-primary bg-opacity-10 text-primary fw-black" style={{ fontSize: '8px' }}>LONG: {p.longBreakStartTime}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-end">
                                                        <span className={`fw-black ${isDarkMode ? 'text-main' : 'text-dark'} tabular-nums small`}>{p.minimumWorkMinutes}M</span>
                                                        <div className="text-muted fw-bold" style={{ fontSize: '8px' }}>ACTIVE THRESHOLD</div>
                                                    </td>
                                                    <td className="pe-4 text-end">
                                                        <div className="d-flex justify-content-end gap-1">
                                                            <button 
                                                                onClick={() => handleEditPolicy(p)}
                                                                className="ui-btn btn-sm p-2 rounded-circle border-0 text-primary hover-bg-primary bg-opacity-10 transition-all shadow-none"
                                                                title="Configure"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeletePolicy(p.id)}
                                                                className="ui-btn btn-sm p-2 rounded-circle border-0 text-danger hover-bg-danger bg-opacity-10 transition-all shadow-none"
                                                                title="Purge"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {policies.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5">
                                                        <div className="d-flex flex-column align-items-center opacity-20">
                                                            <Shield size={48} className="mb-3 text-muted" />
                                                            <p className="mb-0 fw-black text-uppercase small tracking-widest">Compliance Registry Null</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'shifts' && (
                        <div className="d-flex flex-column gap-4 animate-fade-in">
                             <div className={`premium-card p-4 border-0 shadow-lg ${isDarkMode ? '' : 'bg-white'}`}>
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <h5 className={`fw-black ${isDarkMode ? 'text-main' : 'text-dark'} mb-0 text-uppercase tracking-widest`}>{editingShiftId ? 'Edit Rotation' : 'Shift Registry'}</h5>
                                        <p className="text-muted small fw-bold opacity-50 mb-0" style={{ fontSize: '9px' }}>DEFINE SYSTEM OPERATIONAL CYCLES</p>
                                    </div>
                                </div>
                                <form onSubmit={handleCreateShift} className={`${isDarkMode ? 'bg-surface bg-opacity-20 border-white border-opacity-5' : 'bg-light border-0'} p-4 rounded-4 border`}>
                                    <div className="row g-4">
                                        <div className="col-md-6 border-end border-white border-opacity-5 pe-md-4">
                                            <div className="mb-4">
                                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Shift nomenclature</label>
                                                <input 
                                                    type="text" className="ui-input py-2 rounded-3" 
                                                    value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})}
                                                    placeholder="e.g. ALPHA DAY ROTATION" required
                                                />
                                            </div>
                                            <div className="mb-4">
                                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Operational Branch (Office)</label>
                                                <select 
                                                    className="ui-input py-2 rounded-3" 
                                                    value={newShift.officeId} onChange={e => setNewShift({...newShift, officeId: e.target.value})}
                                                >
                                                    <option value="">Link to global hub (optional)...</option>
                                                    {offices.map(o => (
                                                        <option key={o.id} value={o.id}>{o.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-6">
                                                    <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Inauguration</label>
                                                    <input 
                                                        type="time" className="ui-input py-2 rounded-3" 
                                                        value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                                <div className="col-6">
                                                    <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Termination</label>
                                                    <input 
                                                        type="time" className="ui-input py-2 rounded-3" 
                                                        value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6 ps-md-4 d-flex flex-column justify-content-between">
                                            <div className="mb-4">
                                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block" style={{fontSize: '0.65rem'}}>Arrival Grace Limit (mins)</label>
                                                <input 
                                                    type="number" className="ui-input py-2 rounded-3" 
                                                    value={newShift.graceMinutes} onChange={e => setNewShift({...newShift, graceMinutes: parseInt(e.target.value)})}
                                                    required
                                                />
                                            </div>
                                            <div className="d-flex flex-column gap-2 mt-auto">
                                                <button type="submit" className="ui-btn ui-btn-primary w-100 rounded-pill shadow-glow py-2 fw-black text-uppercase tracking-widest" style={{ fontSize: '11px' }}>
                                                    <Save size={16} className="me-2" />
                                                    {editingShiftId ? 'SYNC CYCLE' : 'INITIALIZE CYCLE'}
                                                </button>
                                                {editingShiftId && (
                                                    <button 
                                                        type="button" 
                                                        className="ui-btn ui-btn-outline w-100 rounded-pill py-2 fw-black text-uppercase tracking-widest"
                                                        style={{ fontSize: '11px' }}
                                                        onClick={() => {
                                                            setEditingShiftId(null);
                                                            setNewShift({ name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, minHalfDayMinutes: 240, minFullDayMinutes: 480 });
                                                        }}
                                                    >ABORT</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="row g-3">
                                 {shifts.map(shift => (
                                     <div key={shift.id} className="col-md-6 col-xl-4">
                                        <div className={`premium-card h-100 p-4 hover-lift border-0 ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '24px' }}>
                                            <div className="d-flex align-items-center gap-3 mb-4">
                                                <div className="p-3 bg-primary bg-opacity-10 rounded-pill text-primary shadow-glow">
                                                    <Clock size={20} />
                                                </div>
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <h6 className={`mb-0 fw-black ${isDarkMode ? 'text-main' : 'text-dark'} text-uppercase small tracking-wider text-truncate`}>{shift.name}</h6>
                                                    <span className="text-muted fw-bold opacity-50" style={{fontSize: '8px'}}>NODE ID: {shift.id.toString().slice(-6)}</span>
                                                </div>
                                            </div>
                                            <div className={`d-flex justify-content-between ${isDarkMode ? 'bg-surface bg-opacity-30 border-white border-opacity-5' : 'bg-light border-0'} p-3 rounded-4 border mb-4 mt-2`}>
                                                <div className="text-center px-2 flex-grow-1 border-end border-white border-opacity-5">
                                                    <p className="text-muted fw-black mb-1" style={{fontSize: '7px'}}>START</p>
                                                    <span className="fw-black text-main font-monospace">{shift.startTime.slice(0, 5)}</span>
                                                </div>
                                                <div className="text-center px-2 flex-grow-1">
                                                    <p className="text-muted fw-black mb-1" style={{fontSize: '7px'}}>END</p>
                                                    <span className="fw-black text-main font-monospace">{shift.endTime.slice(0, 5)}</span>
                                                </div>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center pt-2">
                                                <span className="ui-badge bg-primary bg-opacity-10 text-primary fw-black" style={{fontSize: '8px'}}>{shift.graceMinutes}M GRACE</span>
                                                <div className="d-flex gap-1">
                                                     <button onClick={() => handleEditShift(shift)} className="ui-btn btn-sm p-1.5 rounded-circle border-0 text-primary hover-bg-primary bg-opacity-10 shadow-none"><Edit size={12} /></button>
                                                     <button onClick={() => handleDeleteShift(shift.id)} className="ui-btn btn-sm p-1.5 rounded-circle border-0 text-danger hover-bg-danger bg-opacity-10 shadow-none"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {shifts.length === 0 && !loading && (
                                   <div className="col-12 py-5 text-center bg-surface bg-opacity-20 rounded-4 border border-dashed border-white border-opacity-10">
                                      <Clock size={48} className="text-muted opacity-20 mb-3" />
                                      <h6 className="fw-black text-muted text-uppercase tracking-widest small">Synchronized Cycles Unavailable</h6>
                                      <p className="text-muted small opacity-50 fw-bold mb-0">No active work rotations found in system registry</p>
                                   </div>
                                )}
                            </div>
                        </div>
                    )}



                    {/* {activeSection === 'incentives' && (
                        <div className="d-flex flex-column gap-4 animate-fade-in">
                            <div className={`premium-card p-5 border-0 shadow-lg position-relative overflow-hidden ${isDarkMode ? '' : 'bg-white'}`} 
                                 style={{ borderRadius: '32px', background: isDarkMode ? 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, transparent 100%)' : 'white' }}>
                                <div className="position-absolute" style={{ top: '-20px', right: '-20px', opacity: 0.03, zIndex: 0 }}>
                                    <Zap size={350} className="text-warning" />
                                </div>
                                <div className="position-relative z-10 w-100">
                                    <div className={`d-flex align-items-center gap-4 mb-5 pb-4 border-bottom ${isDarkMode ? 'border-white border-opacity-5' : 'border-dark border-opacity-5'}`}>
                                        <div className="d-inline-flex p-3 bg-warning bg-opacity-10 rounded-circle text-warning shadow-glow" style={{ borderRadius: '18px' }}>
                                            <Zap size={32} />
                                        </div>
                                        <div>
                                            <h3 className={`fw-black ${isDarkMode ? 'text-main' : 'text-dark'} mb-1 tracking-tighter text-uppercase`}>Incentive Acceleration Engine</h3>
                                            <p className="text-muted small mb-0 opacity-75 fw-bold text-uppercase tracking-widest" style={{ fontSize: '10px' }}>
                                                Configure Revenue-Linked Reward Prototypes
                                            </p>
                                        </div>
                                    </div>

                                    {globalTargets ? (
                                        <div className="row g-4 text-start">
                                            <div className="col-12 col-xl-6">
                                                <div className="p-4 bg-surface bg-opacity-40 rounded-4 border border-white border-opacity-5 h-100 shadow-sm">
                                                    <h6 className="fw-black text-main small tracking-widest text-uppercase mb-4 d-flex align-items-center gap-2">
                                                        <TrendingUp size={14} className="text-primary" />
                                                        Tiered Incentives
                                                     </h6>
                                                    <div className="d-flex flex-column gap-4">
                                                        <div className="ui-input-group">
                                                            <label className="text-muted fw-black text-uppercase mb-2 d-block" style={{ fontSize: '9px' }}>BASE INCENTIVE AMOUNT (₹)</label>
                                                            <input 
                                                                type="number" 
                                                                className="ui-input w-100 bg-dark bg-opacity-20 border-white border-opacity-10 rounded-3 text-main fw-black font-monospace p-3 h-auto"
                                                                value={globalTargets.baseIncentiveAmount || 0}
                                                                onChange={(e) => setGlobalTargets({ ...globalTargets, baseIncentiveAmount: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                        <div className="ui-input-group">
                                                            <label className="text-muted fw-black text-uppercase mb-2 d-block" style={{ fontSize: '9px' }}>TARGET MILESTONE INCENTIVE (₹)</label>
                                                            <input 
                                                                type="number" 
                                                                className="ui-input w-100 bg-dark bg-opacity-20 border-white border-opacity-10 rounded-3 text-main fw-black font-monospace p-3 h-auto"
                                                                value={globalTargets.targetIncentiveAmount || 0}
                                                                onChange={(e) => setGlobalTargets({ ...globalTargets, targetIncentiveAmount: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12 col-xl-6 d-flex flex-column justify-content-end">
                                                <div className="p-4 bg-primary bg-opacity-5 rounded-4 border border-primary border-opacity-10 h-100 d-flex flex-column justify-content-center">
                                                    <div className="text-center">
                                                        <div className="p-2 d-inline-block bg-primary bg-opacity-10 rounded-circle text-primary mb-3">
                                                           <Save size={24} />
                                                        </div>
                                                        <h6 className="fw-black text-main text-uppercase mb-2">Sync Incentive Protocols</h6>
                                                        <p className="text-muted small fw-bold opacity-50 mb-4 px-3" style={{fontSize: '9px'}}>Deploy these incentive values across all staff nodes to activate revenue-linked rewards.</p>
                                                        <button 
                                                            className="ui-btn ui-btn-primary py-3 rounded-pill shadow-glow d-flex align-items-center justify-content-center gap-2 fw-black text-uppercase tracking-widest h-auto mx-auto px-5"
                                                            onClick={() => handleUpdateGlobalTargets(globalTargets)}
                                                            disabled={isSavingTargets}
                                                        >
                                                            {isSavingTargets ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                                            {isSavingTargets ? 'SYNCHRONIZING...' : 'UPDATE FLOW'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-5 text-center">
                                            <RefreshCw size={48} className="text-muted opacity-20 animate-spin mb-3" />
                                            <p className="text-muted fw-black text-uppercase tracking-widest small">Calibrating Incentive Access...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )} */}
                </div>
            </div>
        </div>
    );
};

export default AttendanceSettings;
