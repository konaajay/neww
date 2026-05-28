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
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';
import { useQueryClient } from '@tanstack/react-query';

const PipelineStageManagement = () => {
    const { isDarkMode } = useTheme();
    const queryClient = useQueryClient();
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingStage, setEditingStage] = useState(null);
    
    const [formData, setFormData] = useState({
        label: '',
        requireNote: false,
        requireDate: false,
        createTask: false,
        orderIndex: 0
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
        const label = formData.label.trim();
        if (!label) return;

        // Duplicate Check
        const isDuplicate = stages.some(s => 
            s.label?.toUpperCase() === label.toUpperCase() && 
            (!editingStage || s.id !== editingStage.id)
        );

        if (isDuplicate) {
            toast.warning(`Duplicate status detected: "${label}" is already in your architecture.`);
            return;
        }

        try {
            const payload = {
                ...formData,
                require_note: formData.requireNote,
                require_date: formData.requireDate,
                create_task: formData.createTask,
                statusValue: formData.label.trim().toUpperCase().replace(/\s+/g, '_'),
                analyticBucket: 'FOLLOW_UP', 
                color: 'primary',           
                orderIndex: formData.orderIndex || (editingStage ? editingStage.orderIndex : stages.length + 1),
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
            queryClient.invalidateQueries({ queryKey: ['pipelineStages'] });
            fetchStages();
        } catch (err) {
            const errorMessage = err.response?.data?.message || "Process failed - system sync error";
            toast.error(errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({ label: '', requireNote: false, requireDate: false, createTask: false, orderIndex: 0 });
        setIsAdding(false);
        setEditingStage(null);
    };

    const startEdit = (stage) => {
        setEditingStage(stage);
        setFormData({
            label: stage.label,
            requireNote: stage.requireNote,
            requireDate: stage.requireDate,
            createTask: stage.createTask,
            orderIndex: stage.orderIndex
        });
        setIsAdding(true);
    };

    const handleAutoSetup = async () => {
        if (!window.confirm("Initialize strategic sales funnel? This will add standard stages (Open, Switch Off, Out of Coverage, Wrong Number, Not Responding, Follow-up, Follow-up 1, Interested, Converted, Lost).")) return;
        
        const standardStages = [
            { label: 'Open', requireNote: false, requireDate: false, createTask: false, analyticBucket: 'OPEN', color: 'primary' },
            { label: 'Switch Off', requireNote: false, requireDate: false, createTask: false, analyticBucket: 'DNP', color: 'warning' },
            { label: 'Out of Coverage', requireNote: false, requireDate: false, createTask: false, analyticBucket: 'DNP', color: 'warning' },
            { label: 'Wrong Number', requireNote: false, requireDate: false, createTask: false, analyticBucket: 'DNP', color: 'warning' },
            { label: 'Not Responding', requireNote: false, requireDate: false, createTask: false, analyticBucket: 'DNP', color: 'warning' },
            { label: 'Follow-up', requireNote: true, requireDate: true, createTask: true, analyticBucket: 'FOLLOW_UP', color: 'warning' },
            { label: 'Follow-up 1', requireNote: true, requireDate: true, createTask: true, analyticBucket: 'FOLLOW_UP', color: 'warning' },
            { label: 'Interested', requireNote: false, requireDate: true, createTask: true, analyticBucket: 'FOLLOW_UP', color: 'primary' },
            { label: 'Converted', requireNote: false, requireDate: true, createTask: true, analyticBucket: 'CONVERTED', color: 'success' },
            { label: 'Lost', requireNote: false, requireDate: false, createTask: false, analyticBucket: 'LOST', color: 'danger' },
        ];

        setLoading(true);
        try {
            for (let i = 0; i < standardStages.length; i++) {
                const stage = standardStages[i];
                // Check if already exists to avoid duplicates
                if (stages.some(s => s.label?.toUpperCase() === stage.label.toUpperCase())) continue;
                
                await adminService.createPipelineStage({
                    ...stage,
                    statusValue: stage.label.toUpperCase().replace(/\s+/g, '_'),
                    orderIndex: stages.length + i + 1,
                    active: true
                });
            }
            toast.success("Strategic funnel initialized");
            queryClient.invalidateQueries({ queryKey: ['pipelineStages'] });
            fetchStages();
        } catch (err) {
            toast.error("Partial failure during initialization");
        } finally {
            setLoading(false);
        }
    };

    const handleReorder = async (id, direction) => {
        try {
            await adminService.reorderPipelineStage(id, direction);
            queryClient.invalidateQueries({ queryKey: ['pipelineStages'] });
            fetchStages();
        } catch (err) {
            toast.error("Reorder synchronization failed");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("PURGE WARNING: Permanently decommission this status lead?")) return;
        try {
            await adminService.deletePipelineStage(id);
            toast.success("Status lead purged successfully");
            queryClient.invalidateQueries({ queryKey: ['pipelineStages'] });
            fetchStages();
        } catch (err) {
            toast.error("Failed to purge lead");
        }
    };

    return (
        <div className="d-flex flex-column gap-3 animate-fade-in">
            {/* Header / Command Panel */}
            <div className={`premium-card p-3 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '20px' }}>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill shadow-glow">
                            <Layers size={22} />
                        </div>
                        <div>
                            <h5 className="fw-black mb-0 text-main text-uppercase tracking-widest">Pipeline Architecture</h5>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button 
                            onClick={handleAutoSetup}
                            className="ui-btn ui-btn-outline text-primary px-4 py-2 rounded-pill fw-black text-uppercase tracking-widest d-flex align-items-center gap-2"
                            style={{ fontSize: '10px', borderColor: 'rgba(var(--primary-rgb), 0.2)' }}
                            disabled={loading}
                        >
                            <Zap size={14} className="text-warning" /> AUTO-SETUP FUNNEL
                        </button>
                        <button 
                            onClick={() => isAdding ? resetForm() : setIsAdding(true)}
                            className={`ui-btn ${isAdding ? 'ui-btn-outline' : 'ui-btn-primary'} px-4 py-2 rounded-pill fw-black text-uppercase tracking-widest d-flex align-items-center gap-2`}
                            style={{ fontSize: '10px' }}
                        >
                            {isAdding ? <RotateCcw size={14} /> : <Plus size={14} />}
                            {isAdding ? 'CANCEL' : 'ADD STATUS'}
                        </button>
                    </div>
                </div>

                {isAdding && (
                    <div className="mt-2 pt-3 border-top border-white border-opacity-5 animate-scale-in">
                        <form onSubmit={handleSave} className="row g-2 align-items-end">
                            <div className="col-md-12 col-lg-3">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Status Label</label>
                                <input 
                                    className="ui-input py-3 px-4 rounded-4 fw-bold"
                                    placeholder="e.g., FOLLOW-UP..."
                                    value={formData.label}
                                    onChange={e => setFormData({...formData, label: e.target.value})}
                                    autoFocus
                                />
                            </div>

                            <div className="col-md-12 col-lg-1">
                                <label className="text-muted small fw-black text-uppercase tracking-widest mb-2 d-block ps-2" style={{ fontSize: '9px' }}>Order</label>
                                <input 
                                    type="number"
                                    className="ui-input py-3 px-2 rounded-4 fw-bold text-center"
                                    value={formData.orderIndex}
                                    onChange={e => setFormData({...formData, orderIndex: parseInt(e.target.value) || 0})}
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

                                    <button type="submit" className="ui-btn ui-btn-primary ms-auto px-4 py-2 rounded-4 shadow-glow fw-black text-uppercase tracking-widest d-flex align-items-center gap-2" style={{ fontSize: '10px' }}>
                                        <Save size={14} /> {editingStage ? 'SYNC LEAD' : 'INITIALIZE'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
                
                <style>{`
                    .tab-checkbox { 
                        width: 20px; height: 20px; border-radius: 6px; 
                        border: 2px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}; 
                        display: flex; align-items: center; justify-content: center;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        background: ${isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
                        cursor: pointer;
                    }
                    .tab-checkbox.active { background: var(--primary); border-color: var(--primary); color: white; box-shadow: 0 0 10px var(--primary-glow); }
                    .tab-checkbox:not(.active):hover { border-color: var(--primary); opacity: 0.8; }
                `}</style>
            </div>

            {/* Status Table */}
            <div className={`premium-card overflow-hidden border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`} style={{ borderRadius: '20px' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 text-nowrap">
                        <thead>
                            <tr className={isDarkMode ? 'border-bottom border-white border-opacity-5' : 'border-bottom'}>
                                <th className="ps-4 text-secondary small fw-black text-uppercase tracking-widest py-3" style={{ fontSize: '9px', width: '60px' }}>#</th>
                                <th className="text-secondary small fw-black text-uppercase tracking-widest py-3" style={{ fontSize: '9px' }}>Status Lead</th>
                                <th className="text-secondary small fw-black text-uppercase tracking-widest py-3 text-center" style={{ fontSize: '9px' }}>Note Req.</th>
                                <th className="text-secondary small fw-black text-uppercase tracking-widest py-3 text-center" style={{ fontSize: '9px' }}>Date Req.</th>
                                <th className="text-secondary small fw-black text-uppercase tracking-widest py-3 text-center" style={{ fontSize: '9px' }}>Task</th>
                                <th className="pe-4 text-end text-secondary small fw-black text-uppercase tracking-widest py-3" style={{ fontSize: '9px', width: '120px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5">
                                        <div className="spinner-border text-primary spinner-border-sm opacity-25"></div>
                                    </td>
                                </tr>
                            ) : stages.length === 0 ? (
                                <tr>
                                  <td colSpan="6" className="text-center py-5 text-secondary small fw-bold">NO STATUS LEADS FOUND</td>
                                </tr>
                            ) : stages.map((stage, idx) => (
                                <tr key={stage.id} className="transition-all hover:bg-white hover:bg-opacity-5">
                                    <td className="ps-4">
                                        <span className="text-muted fw-bold font-monospace extra-small opacity-50">#{idx + 1}</span>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className={`p-2 rounded-3 bg-${stage.color || 'primary'} bg-opacity-10 text-${stage.color || 'primary'} shadow-sm`}>
                                                <Zap size={14} />
                                            </div>
                                            <span className="fw-black text-main text-uppercase tracking-tighter" style={{ fontSize: '13px' }}>
                                                {stage.label}
                                            </span>
                                            {stage.statusValue === 'OPEN' && (
                                                <span className="px-2 py-0.5 rounded-pill bg-success bg-opacity-10 text-success fw-black" style={{ fontSize: '7px', letterSpacing: '0.5px' }}>ROOT PROTOCOL</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className={`d-inline-flex p-1 rounded-circle ${stage.requireNote ? 'bg-primary bg-opacity-10 text-primary shadow-glow-sm' : 'bg-surface bg-opacity-20 text-muted opacity-25'}`}>
                                            <ShieldCheck size={14} />
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className={`d-inline-flex p-1 rounded-circle ${stage.requireDate ? 'bg-primary bg-opacity-10 text-primary shadow-glow-sm' : 'bg-surface bg-opacity-20 text-muted opacity-25'}`}>
                                            <Calendar size={14} />
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className={`d-inline-flex p-1 rounded-circle ${stage.createTask ? 'bg-primary bg-opacity-10 text-primary shadow-glow-sm' : 'bg-surface bg-opacity-20 text-muted opacity-25'}`}>
                                            <CheckSquare size={14} />
                                        </div>
                                    </td>

                                    <td className="pe-4 text-end">
                                        <div className="d-flex justify-content-end gap-2">
                                            <button 
                                                onClick={() => startEdit(stage)}
                                                className="ui-btn-icon bg-surface text-muted border-0 p-2 rounded-circle hover-scale shadow-sm"
                                                title="Edit Protocol"
                                            >
                                                <Settings size={14} />
                                            </button>
                                            {stage.statusValue !== 'OPEN' && (
                                                <button 
                                                    onClick={() => handleDelete(stage.id)}
                                                    className="ui-btn-icon bg-danger bg-opacity-10 text-danger border-0 p-2 rounded-circle hover-scale shadow-sm"
                                                    title="Purge"
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
