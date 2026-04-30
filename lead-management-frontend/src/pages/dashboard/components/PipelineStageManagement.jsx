import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Trash2, 
  Plus, 
  Layers, 
  ShieldCheck,
  Save,
  RotateCcw,
  MessageSquare,
  Calendar,
  CheckSquare,
  Settings
} from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';

const PipelineStageManagement = () => {
    const { isDarkMode } = useTheme();
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingStage, setEditingStage] = useState(null);
    
    const [formData, setFormData] = useState({
        label: '',
        requireNote: false,
        requireDate: false,
        createTask: false
    });

    useEffect(() => {
        fetchStages();
    }, []);

    const fetchStages = async () => {
        setLoading(true);
        try {
            const res = await adminService.fetchPipelineStages();
            const sorted = (res.data || []).sort((a, b) => (a.orderIndex - b.orderIndex) || (a.id - b.id));
            setStages(sorted);
        } catch (err) {
            toast.error("Failed to load status ledger");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.label.trim()) return;

        try {
            const payload = {
                ...formData,
                statusValue: formData.label.trim().toUpperCase().replace(/\s+/g, '_'),
                analyticBucket: 'CONTACTED', 
                color: 'primary',           
                orderIndex: editingStage ? editingStage.orderIndex : stages.length + 1,
                active: true
            };

            if (editingStage) {
                await adminService.updatePipelineStage(editingStage.id, payload);
                toast.success("Status configuration synchronized");
            } else {
                await adminService.createPipelineStage(payload);
                toast.success("New status lead initialized");
            }
            
            resetForm();
            fetchStages();
        } catch (err) {
            toast.error("Process failed - system sync error");
        }
    };

    const resetForm = () => {
        setFormData({ label: '', requireNote: false, requireDate: false, createTask: false });
        setIsAdding(false);
        setEditingStage(null);
    };

    const startEdit = (stage) => {
        setEditingStage(stage);
        setFormData({
            label: stage.label,
            requireNote: stage.requireNote,
            requireDate: stage.requireDate,
            createTask: stage.createTask
        });
        setIsAdding(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("PURGE WARNING: Permanently decommission this status lead?")) return;
        try {
            await adminService.deletePipelineStage(id);
            toast.success("Status lead purged successfully");
            fetchStages();
        } catch (err) {
            toast.error("Failed to purge lead");
        }
    };

    return (
        <div className="d-flex flex-column gap-4 animate-fade-in">
            {/* Header / Command Panel */}
            <div className={`premium-card p-4 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '24px' }}>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill shadow-glow">
                            <Layers size={22} />
                        </div>
                        <div>
                            <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Pipeline Architecture</h5>
                        </div>
                    </div>
                    <button 
                        onClick={() => isAdding ? resetForm() : setIsAdding(true)}
                        className={`ui-btn ${isAdding ? 'ui-btn-outline' : 'ui-btn-primary'} px-4 py-2 rounded-pill fw-black text-uppercase tracking-widest d-flex align-items-center gap-2`}
                        style={{ fontSize: '10px' }}
                    >
                        {isAdding ? <RotateCcw size={14} /> : <Plus size={14} />}
                        {isAdding ? 'CANCEL' : 'ADD STATUS'}
                    </button>
                </div>

                {isAdding && (
                    <div className="mt-4 pt-4 border-top border-white border-opacity-5 animate-scale-in">
                        <form onSubmit={handleSave} className="row g-4 align-items-end">
                            <div className="col-md-12 col-lg-4">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Status Label</label>
                                <input 
                                    className="ui-input py-3 px-4 rounded-4 fw-bold"
                                    placeholder="e.g., FOLLOW-UP, INTERESTED..."
                                    value={formData.label}
                                    onChange={e => setFormData({...formData, label: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            
                            <div className="col-md-12 col-lg-8">
                                <div className="d-flex flex-wrap gap-4 pt-2">
                                    <label className="d-flex align-items-center gap-2 cursor-pointer group">
                                        <div className={`tab-checkbox ${formData.requireNote ? 'active' : ''}`} onClick={() => setFormData({...formData, requireNote: !formData.requireNote})}>
                                            {formData.requireNote && <ShieldCheck size={12} />}
                                        </div>
                                        <div className="text-start">
                                            <span className={`fw-black text-uppercase tracking-widest mb-0 d-block ${formData.requireNote ? 'text-primary' : 'text-muted opacity-50'}`} style={{fontSize: '9px'}}>Require Note</span>
                                            <span className="text-muted opacity-30 fw-bold" style={{fontSize: '7px'}}>Force comment submission</span>
                                        </div>
                                    </label>

                                    <label className="d-flex align-items-center gap-2 cursor-pointer group">
                                        <div className={`tab-checkbox ${formData.requireDate ? 'active' : ''}`} onClick={() => setFormData({...formData, requireDate: !formData.requireDate})}>
                                            {formData.requireDate && <ShieldCheck size={12} />}
                                        </div>
                                        <div className="text-start">
                                            <span className={`fw-black text-uppercase tracking-widest mb-0 d-block ${formData.requireDate ? 'text-primary' : 'text-muted opacity-50'}`} style={{fontSize: '9px'}}>Require Date</span>
                                            <span className="text-muted opacity-30 fw-bold" style={{fontSize: '7px'}}>Force follow-up scheduling</span>
                                        </div>
                                    </label>

                                    <label className="d-flex align-items-center gap-2 cursor-pointer group">
                                        <div className={`tab-checkbox ${formData.createTask ? 'active' : ''}`} onClick={() => setFormData({...formData, createTask: !formData.createTask})}>
                                            {formData.createTask && <ShieldCheck size={12} />}
                                        </div>
                                        <div className="text-start">
                                            <span className={`fw-black text-uppercase tracking-widest mb-0 d-block ${formData.createTask ? 'text-primary' : 'text-muted opacity-50'}`} style={{fontSize: '9px'}}>Auto-Task</span>
                                            <span className="text-muted opacity-30 fw-bold" style={{fontSize: '7px'}}>Create system follow-up task</span>
                                        </div>
                                    </label>

                                    <button type="submit" className="ui-btn ui-btn-primary ms-auto px-4 py-3 rounded-4 shadow-glow fw-black text-uppercase tracking-widest d-flex align-items-center gap-2" style={{ fontSize: '10px' }}>
                                        <Save size={14} /> {editingStage ? 'SYNC LEAD' : 'INITIALIZE'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
                
                <style>{`
                    .tab-checkbox { 
                        width: 18px; height: 18px; border-radius: 6px; 
                        border: 2px solid rgba(255,255,255,0.1); 
                        display: flex; align-items: center; justify-content: center;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        background: rgba(255,255,255,0.02);
                        cursor: pointer;
                    }
                    .tab-checkbox.active { background: var(--primary); border-color: var(--primary); color: white; box-shadow: 0 0 10px var(--primary-glow); }
                    .tab-checkbox:not(.active):hover { border-color: rgba(255,255,255,0.2); }
                `}</style>
            </div>

            {/* Status Table */}
            <div className={`premium-card overflow-hidden border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '24px' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 text-nowrap">
                        <thead>
                            <tr className={isDarkMode ? 'border-bottom border-white border-opacity-5' : 'border-bottom'}>
                                <th className="ps-4 text-muted small fw-black text-uppercase tracking-widest py-4" style={{ fontSize: '9px', width: '80px' }}># ID</th>
                                <th className="text-muted small fw-black text-uppercase tracking-widest py-4" style={{ fontSize: '9px' }}>Status Lead</th>

                                <th className="pe-4 text-end text-muted small fw-black text-uppercase tracking-widest py-4" style={{ fontSize: '9px', width: '120px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-5">
                                        <div className="spinner-border text-primary spinner-border-sm opacity-25"></div>
                                    </td>
                                </tr>
                            ) : stages.length === 0 ? (
                                <tr>
                                  <td colSpan="4" className="text-center py-5 text-muted small fw-bold opacity-50">NO STATUS LEADS FOUND</td>
                                </tr>
                            ) : stages.map(stage => (
                                <tr key={stage.id} className="transition-all hover:bg-white hover:bg-opacity-5">
                                    <td className="ps-4">
                                        <span className="text-muted fw-bold font-monospace small">#{stage.id}</span>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className={`p-2 rounded-3 bg-${stage.color || 'primary'} bg-opacity-10 text-${stage.color || 'primary'}`}>
                                                <Zap size={14} />
                                            </div>
                                            <span className="fw-black text-main text-uppercase tracking-wider small">
                                                {stage.label}
                                            </span>
                                            {stage.statusValue === 'NEW' && (
                                                <span className="px-2 py-0.5 rounded-pill bg-success bg-opacity-10 text-success fw-black" style={{ fontSize: '7px' }}>ROOT</span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="pe-4 text-end">
                                        <div className="d-flex justify-content-end gap-2">
                                            <button 
                                                onClick={() => startEdit(stage)}
                                                className="ui-btn-icon bg-surface text-muted border-0 p-2 rounded-circle hover-scale"
                                            >
                                                <Settings size={14} />
                                            </button>
                                            {stage.statusValue !== 'NEW' && (
                                                <button 
                                                    onClick={() => handleDelete(stage.id)}
                                                    className="ui-btn-icon bg-danger bg-opacity-10 text-danger border-0 p-2 rounded-circle hover-scale"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
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

export default PipelineStageManagement;
