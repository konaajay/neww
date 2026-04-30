import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  MapPin, 
  Clock, 
  Target,
  Save,
  RotateCcw,
  AlertCircle,
  Building2,
  FileText,
  Timer,
  Layers,
  Edit2
} from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';
import PipelineStageManagement from './PipelineStageManagement';
import AttendanceGovernance from './AttendanceGovernance';

const SystemSettings = () => {
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('offices');
    const [loading, setLoading] = useState(false);
    const [offices, setOffices] = useState([]);
    const [editingOfficeId, setEditingOfficeId] = useState(null);
    
    // Office Form State
    const [officeData, setOfficeData] = useState({
        name: '',
        latitude: '',
        longitude: '',
        radius: '100'
    });

    useEffect(() => {
        if (activeTab === 'offices') fetchOffices();
    }, [activeTab]);

    const fetchOffices = async () => {
        setLoading(true);
        try {
            const res = await adminService.fetchOffices();
            setOffices(res.data || []);
        } catch (err) {
            console.error("Failed to load offices", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitOffice = async (e) => {
        e.preventDefault();
        if (!officeData.name || !officeData.latitude || !officeData.longitude) {
            toast.error("Please provide all branch coordinates");
            return;
        }

        try {
            if (editingOfficeId) {
                await adminService.updateOffice(editingOfficeId, {
                    name: officeData.name,
                    latitude: parseFloat(officeData.latitude),
                    longitude: parseFloat(officeData.longitude),
                    radius: parseInt(officeData.radius)
                });
                toast.success("Branch protocol updated");
            } else {
                await adminService.createOffice({
                    name: officeData.name,
                    latitude: parseFloat(officeData.latitude),
                    longitude: parseFloat(officeData.longitude),
                    radius: parseInt(officeData.radius)
                });
                toast.success("Branch protocol initialized");
            }
            
            setOfficeData({ name: '', latitude: '', longitude: '', radius: '100' });
            setEditingOfficeId(null);
            fetchOffices();
        } catch (err) {
            toast.error(editingOfficeId ? "Failed to update branch" : "Failed to initialize branch");
        }
    };

    const handleEditClick = (office) => {
        setOfficeData({
            name: office.name,
            latitude: office.latitude,
            longitude: office.longitude,
            radius: office.radius
        });
        setEditingOfficeId(office.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setOfficeData({ name: '', latitude: '', longitude: '', radius: '100' });
        setEditingOfficeId(null);
    };

    const tabs = [
        { id: 'offices', label: 'OFFICES', icon: Building2 },
        { id: 'governance', label: 'GOVERNANCE', icon: ShieldCheck },
        { id: 'stages', label: 'STAGES', icon: Layers },
    ];

    return (
        <div className="d-flex flex-column gap-4 animate-fade-in">
            {/* Top Navigation Tabs */}
            <div className="d-flex gap-3 p-1 bg-surface bg-opacity-10 rounded-pill border border-white border-opacity-5 overflow-auto custom-scroll" style={{ width: 'fit-content' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2.5 rounded-pill border-0 fw-black text-uppercase tracking-widest transition-all d-flex align-items-center gap-2 ${activeTab === tab.id ? 'bg-primary text-white shadow-glow' : 'bg-transparent text-muted opacity-50'}`}
                        style={{ fontSize: '10px', minWidth: '140px' }}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === 'offices' && (
                <div className="d-flex flex-column gap-4 animate-fade-in">
                    {/* Branch Architecture Form */}
                    <div className={`premium-card p-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '32px' }}>
                        <div className="d-flex align-items-center gap-3 mb-5">
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill shadow-glow">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Branch Architecture</h5>
                                <p className="text-muted small mb-0 opacity-50 fw-bold">DEFINE GEOGRAPHIC OPERATIONAL NODES</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitOffice} className="row g-4">

                            <div className="col-md-6">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Node Identifier</label>
                                <input 
                                    className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                                    placeholder="e.g. Hyderabad Global Hub"
                                    value={officeData.name}
                                    onChange={e => setOfficeData({...officeData, name: e.target.value})}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Latitude Coordination</label>
                                <input 
                                    className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                                    placeholder="e.g. 17.3850"
                                    value={officeData.latitude}
                                    onChange={e => setOfficeData({...officeData, latitude: e.target.value})}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Geofence Radius (Meters)</label>
                                <input 
                                    className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                                    value={officeData.radius}
                                    onChange={e => setOfficeData({...officeData, radius: e.target.value})}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Longitude Coordination</label>
                                <input 
                                    className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                                    placeholder="e.g. 78.4867"
                                    value={officeData.longitude}
                                    onChange={e => setOfficeData({...officeData, longitude: e.target.value})}
                                />
                            </div>
                            <div className="col-12 d-flex justify-content-end mt-4 gap-3">
                                {editingOfficeId && (
                                    <button type="button" onClick={cancelEdit} className="ui-btn bg-surface bg-opacity-10 text-muted px-4 py-3 rounded-4 fw-black text-uppercase tracking-widest">
                                        CANCEL
                                    </button>
                                )}
                                <button type="submit" className="ui-btn ui-btn-primary px-5 py-3 rounded-4 shadow-glow fw-black text-uppercase tracking-widest d-flex align-items-center gap-2">
                                    <ShieldCheck size={18} /> {editingOfficeId ? 'UPDATE PROTOCOL' : 'INITIALIZE PROTOCOL'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Registered Hubs List */}
                    <div className="row g-4">
                        {offices.map(office => (
                            <div key={office.id} className="col-md-6 col-xl-4">
                                <div className={`premium-card p-4 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '24px' }}>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-2.5 bg-info bg-opacity-10 text-info rounded-3">
                                                <MapPin size={18} />
                                            </div>
                                            <h6 className="fw-black text-main text-uppercase mb-0">{office.name}</h6>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button className="ui-btn-icon bg-primary bg-opacity-10 text-primary border-0 p-2 rounded-circle hover-scale" onClick={() => handleEditClick(office)}>
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="ui-btn-icon bg-danger bg-opacity-10 text-danger border-0 p-2 rounded-circle hover-scale" onClick={async () => {
                                                if (window.confirm("Purge hub?")) {
                                                    await adminService.deleteOffice(office.id);
                                                    fetchOffices();
                                                }
                                            }}>
                                                <RotateCcw size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="d-flex flex-column gap-2 border-top border-white border-opacity-5 pt-3">
                                        <div className="d-flex justify-content-between">
                                            <span className="text-muted small fw-black text-uppercase" style={{ fontSize: '8px' }}>Coordinates</span>
                                            <span className="text-info small fw-bold">{office.latitude}, {office.longitude}</span>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <span className="text-muted small fw-black text-uppercase" style={{ fontSize: '8px' }}>Geofence</span>
                                            <span className="text-primary small fw-bold">{office.radius} Meters</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'governance' && <AttendanceGovernance offices={offices} />}
            {activeTab === 'stages' && <PipelineStageManagement />}
        </div>
    );
};

export default SystemSettings;
