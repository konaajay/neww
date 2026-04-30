import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Trash2,
  Edit2,
  Activity,
  Timer,
  Save
} from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';

const AttendancePolicyManagement = ({ offices = [] }) => {
    const { isDarkMode } = useTheme();
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [policyData, setPolicyData] = useState({
        officeId: '',
        gracePeriodMinutes: 2,
        minimumWorkMinutes: 240,
        shortBreakStartTime: '17:00',
        shortBreakEndTime: '17:10',
        longBreakStartTime: '13:00',
        longBreakEndTime: '14:00',
        trackingIntervalSec: 300,
        maxAccuracyMeters: 100,
        maxIdleMinutes: 30
    });

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const res = await adminService.fetchPolicies();
            setPolicies(res.data || []);
        } catch (err) {
            console.error("Failed to load policies", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!policyData.officeId) {
            toast.error("Please select a target office node");
            return;
        }

        try {
            await adminService.createPolicy(policyData);
            toast.success("Attendance protocol synchronized");
            fetchPolicies();
        } catch (err) {
            toast.error("Failed to synchronize policy");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge this governance protocol?")) return;
        try {
            await adminService.deletePolicy(id);
            toast.success("Protocol purged");
            fetchPolicies();
        } catch (err) {
            toast.error("Failed to purge protocol");
        }
    };

    return (
        <div className="d-flex flex-column gap-4 animate-fade-in">
            {/* Policy Configuration Form */}
            <div className={`premium-card p-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '32px' }}>
                <div className="d-flex align-items-center gap-3 mb-5">
                    <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill shadow-glow">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Attendance Policy</h5>
                        <p className="text-muted small mb-0 opacity-50 fw-bold">DEFINE GOVERNANCE PARAMETERS PER BRANCH</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="row g-4">
                    <div className="col-md-4">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Select Office</label>
                        <select 
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                            value={policyData.officeId}
                            onChange={e => setPolicyData({...policyData, officeId: e.target.value})}
                        >
                            <option value="">Select a location...</option>
                            {offices.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Location Grace (Min)</label>
                        <input 
                            type="number"
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                            value={policyData.gracePeriodMinutes}
                            onChange={e => setPolicyData({...policyData, gracePeriodMinutes: e.target.value})}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Full Day (Min)</label>
                        <input 
                            type="number"
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                            value={policyData.minimumWorkMinutes}
                            onChange={e => setPolicyData({...policyData, minimumWorkMinutes: e.target.value})}
                        />
                    </div>

                    <div className="col-12 mt-4">
                        <h6 className="text-primary fw-black text-uppercase tracking-widest mb-4" style={{ fontSize: '11px' }}>Break Times</h6>
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className={`p-4 rounded-4 border ${isDarkMode ? 'border-white border-opacity-5 bg-white bg-opacity-5' : 'border-light bg-light bg-opacity-50'}`}>
                                    <span className="text-muted small fw-black text-uppercase tracking-widest mb-3 d-block" style={{ fontSize: '9px' }}>Short Break</span>
                                    <div className="d-flex gap-3 align-items-center">
                                        <div className="flex-fill">
                                            <label className="text-muted mb-1" style={{ fontSize: '8px' }}>START</label>
                                            <input 
                                                type="time" 
                                                className="ui-input w-100 py-2 px-3 rounded-3 fw-bold text-center"
                                                value={policyData.shortBreakStartTime}
                                                onChange={e => setPolicyData({...policyData, shortBreakStartTime: e.target.value})}
                                            />
                                        </div>
                                        <div className="text-muted opacity-30 mt-3">→</div>
                                        <div className="flex-fill">
                                            <label className="text-muted mb-1" style={{ fontSize: '8px' }}>END</label>
                                            <input 
                                                type="time" 
                                                className="ui-input w-100 py-2 px-3 rounded-3 fw-bold text-center"
                                                value={policyData.shortBreakEndTime}
                                                onChange={e => setPolicyData({...policyData, shortBreakEndTime: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className={`p-4 rounded-4 border ${isDarkMode ? 'border-white border-opacity-5 bg-white bg-opacity-5' : 'border-light bg-light bg-opacity-50'}`}>
                                    <span className="text-muted small fw-black text-uppercase tracking-widest mb-3 d-block" style={{ fontSize: '9px' }}>Long Break / Lunch</span>
                                    <div className="d-flex gap-3 align-items-center">
                                        <div className="flex-fill">
                                            <label className="text-muted mb-1" style={{ fontSize: '8px' }}>START</label>
                                            <input 
                                                type="time" 
                                                className="ui-input w-100 py-2 px-3 rounded-3 fw-bold text-center"
                                                value={policyData.longBreakStartTime}
                                                onChange={e => setPolicyData({...policyData, longBreakStartTime: e.target.value})}
                                            />
                                        </div>
                                        <div className="text-muted opacity-30 mt-3">→</div>
                                        <div className="flex-fill">
                                            <label className="text-muted mb-1" style={{ fontSize: '8px' }}>END</label>
                                            <input 
                                                type="time" 
                                                className="ui-input w-100 py-2 px-3 rounded-3 fw-bold text-center"
                                                value={policyData.longBreakEndTime}
                                                onChange={e => setPolicyData({...policyData, longBreakEndTime: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 d-flex justify-content-start mt-5">
                        <button type="submit" className="ui-btn ui-btn-primary px-5 py-3 rounded-4 shadow-glow fw-black text-uppercase tracking-widest d-flex align-items-center gap-2">
                            <Save size={18} /> SAVE SETTINGS
                        </button>
                    </div>
                </form>
            </div>

            {/* Registered Policies List */}
            <div className={`premium-card p-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '32px' }}>
                <div className="d-flex align-items-center gap-3 mb-5">
                    <div className="p-3 bg-info bg-opacity-10 text-info rounded-pill shadow-glow">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Active Governance Registry</h5>
                        <p className="text-muted small mb-0 opacity-50 fw-bold">CURRENT OPERATIONAL PROTOCOLS</p>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-borderless align-middle">
                        <thead>
                            <tr>
                                <th className="text-muted small fw-black text-uppercase py-3" style={{ fontSize: '9px' }}>Target Node</th>
                                <th className="text-muted small fw-black text-uppercase py-3" style={{ fontSize: '9px' }}>Latency Matrix</th>
                                <th className="text-muted small fw-black text-uppercase py-3 text-center" style={{ fontSize: '9px' }}>Break Windows</th>
                                <th className="text-muted small fw-black text-uppercase py-3 text-center" style={{ fontSize: '9px' }}>Load</th>
                                <th className="text-muted small fw-black text-uppercase py-3 text-end" style={{ fontSize: '9px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policies.map(policy => (
                                <tr key={policy.id} className="border-top border-white border-opacity-5">
                                    <td className="py-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <MapPin size={14} className="text-primary" />
                                            <span className="fw-black text-main small">{policy.officeName?.toUpperCase() || 'UNKNOWN'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column">
                                            <span className="fw-bold small">{policy.gracePeriodMinutes} MIN GRACE</span>
                                            <span className="text-muted" style={{ fontSize: '10px' }}>{policy.trackingIntervalSec}S SYNC</span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex justify-content-center gap-4">
                                            <div className="d-flex flex-column">
                                                <span className="text-muted mb-1" style={{ fontSize: '8px' }}>SHORT</span>
                                                <span className="badge bg-surface text-primary border border-primary border-opacity-25 rounded-pill px-3 py-2 fw-black" style={{ fontSize: '10px' }}>
                                                    {policy.shortBreakStartTime} - {policy.shortBreakEndTime}
                                                </span>
                                            </div>
                                            <div className="d-flex flex-column">
                                                <span className="text-muted mb-1" style={{ fontSize: '8px' }}>LONG</span>
                                                <span className="badge bg-surface text-primary border border-primary border-opacity-25 rounded-pill px-3 py-2 fw-black" style={{ fontSize: '10px' }}>
                                                    {policy.longBreakStartTime} - {policy.longBreakEndTime}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex flex-column align-items-center">
                                            <Timer size={14} className="text-muted mb-1" />
                                            <span className="fw-bold small">{policy.minimumWorkMinutes} MIN</span>
                                        </div>
                                    </td>
                                    <td className="text-end">
                                        <div className="d-flex justify-content-end gap-2">
                                            <button className="ui-btn-icon bg-danger bg-opacity-10 text-danger border-0 p-2 rounded-3" onClick={() => handleDelete(policy.id)}>
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

export default AttendancePolicyManagement;
