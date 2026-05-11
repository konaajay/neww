import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit3, Save, X, DollarSign, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import api from '../api/api';

const CourseManagementPage = () => {
    const { isDarkMode } = useTheme();
    const [courses, setCourses] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        baseFee: '',
        minTokenAmount: '500',
        description: '',
        active: true
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/admin/attendance/courses');
            setCourses(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (err) {
            toast.error("Failed to load course protocols.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const url = editingId ? `/admin/attendance/courses/${editingId}` : '/admin/attendance/courses';
        const method = editingId ? 'put' : 'post';

        try {
            const res = await api[method](url, formData);

            if (res.data.success) {
                toast.success(editingId ? "Course Protocol Updated" : "New Course Deployed");
                setEditingId(null);
                setIsAdding(false);
                setFormData({ name: '', baseFee: '', minTokenAmount: '500', description: '', active: true });
                fetchCourses();
            }
        } catch (err) {
            toast.error("Deployment failed.");
        }
    };

    const handleEdit = (course) => {
        setEditingId(course.id);
        setFormData({
            name: course.name,
            baseFee: course.baseFee,
            minTokenAmount: course.minTokenAmount,
            description: course.description || '',
            active: course.active
        });
        setIsAdding(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Terminate this course protocol?")) return;
        try {
            await api.delete(`/admin/attendance/courses/${id}`);
            toast.warning("Protocol Terminated");
            fetchCourses();
        } catch (err) {
            toast.error("Termination failed.");
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="d-flex align-items-center justify-content-between mb-5 bg-card p-4 rounded-5 border border-main border-opacity-10 shadow-sm" style={{ backdropFilter: 'var(--glass-blur)' }}>
                    <div className="d-flex align-items-center gap-4">
                        <div className={`p-3 rounded-4 shadow-glow ${isDarkMode ? 'bg-primary bg-opacity-20 text-primary border border-primary border-opacity-20' : 'bg-primary text-white'}`}>
                            <BookOpen size={32} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="fw-black text-uppercase tracking-widest mb-1 text-main" style={{ letterSpacing: '4px', fontSize: '24px' }}>Strategic Course Hub</h2>
                            <div className="d-flex align-items-center gap-2">
                                <span className="p-1 bg-success rounded-circle animate-pulse" style={{ width: '8px', height: '8px' }}></span>
                                <small className="text-muted fw-bold opacity-50 tracking-tighter text-uppercase" style={{ fontSize: '10px' }}>Global Education Protocols Active</small>
                            </div>
                        </div>
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="ui-btn ui-btn-primary px-4 py-2 rounded-pill d-flex align-items-center gap-2 hover-scale shadow-glow"
                        >
                            <Plus size={18} />
                            <span className="fw-black text-uppercase" style={{ fontSize: '11px', letterSpacing: '2px' }}>Add Course</span>
                        </button>
                    )}
                </div>

                {/* Adding/Editing Form */}
                {isAdding && (
                    <div className="mb-5 p-5 rounded-5 border border-main border-opacity-10 bg-card shadow-2xl animate-slide-down" style={{ backdropFilter: 'var(--glass-blur)' }}>
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <h5 className="fw-black text-uppercase tracking-widest mb-0 text-main">{editingId ? 'Modify Protocol' : 'Deploy New Course'}</h5>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="btn btn-link text-muted p-0 border-0"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="row g-4">
                            <div className="col-md-6">
                                <label className="form-label text-muted small fw-bold text-uppercase tracking-widest opacity-50 ps-2" style={{ fontSize: '9px' }}>Course Designation</label>
                                <input
                                    className="form-control bg-surface border-main border-opacity-10 text-main py-3 px-3 rounded-4 shadow-none"
                                    placeholder="Enter Course Name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label text-muted small fw-bold text-uppercase tracking-widest opacity-50 ps-2" style={{ fontSize: '9px' }}>Global Fee (₹)</label>
                                <input
                                    type="number"
                                    className="form-control bg-surface border-main border-opacity-10 text-main py-3 px-3 rounded-4 shadow-none"
                                    placeholder="0.00"
                                    value={formData.baseFee}
                                    onChange={e => setFormData({ ...formData, baseFee: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label text-muted small fw-bold text-uppercase tracking-widest opacity-50 ps-2" style={{ fontSize: '9px' }}>Min Token (₹500+)</label>
                                <input
                                    type="number"
                                    className="form-control bg-surface border-main border-opacity-10 text-main py-3 px-3 rounded-4 shadow-none"
                                    placeholder="500"
                                    min="500"
                                    value={formData.minTokenAmount}
                                    onChange={e => setFormData({ ...formData, minTokenAmount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label text-muted small fw-bold text-uppercase tracking-widest opacity-50 ps-2" style={{ fontSize: '9px' }}>Strategic Description</label>
                                <textarea
                                    className="form-control bg-surface border-main border-opacity-10 text-main py-3 px-3 rounded-4 shadow-none"
                                    rows="2"
                                    placeholder="Program objectives and details..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="col-12 d-flex justify-content-end gap-3 pt-2">
                                <button type="submit" className="ui-btn ui-btn-primary px-5 py-3 rounded-pill d-flex align-items-center gap-3 hover-scale shadow-glow border-0">
                                    <Save size={18} />
                                    <span className="fw-black text-uppercase" style={{ letterSpacing: '2px', fontSize: '12px' }}>{editingId ? 'Synchronize' : 'Initialize'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Courses List */}
                <div className="row g-4">
                    {courses.map(course => (
                        <div key={course.id} className="col-md-6 col-lg-4 animate-slide-up">
                            <div
                                className="h-100 p-4 rounded-5 border border-main border-opacity-10 bg-card transition-all duration-300 hover-shadow-glow hover:translate-y-n1"
                                style={{ backdropFilter: 'var(--glass-blur)' }}
                            >
                                <div className="d-flex align-items-start justify-content-between mb-3">
                                    <div className={`p-2 rounded-3 ${isDarkMode ? 'bg-primary bg-opacity-10 text-primary' : 'bg-blue-50 text-primary'}`}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button onClick={() => handleEdit(course)} className="btn btn-link p-2 text-muted hover:text-blue-500 transition-colors border-0"><Edit3 size={16} /></button>
                                        <button onClick={() => handleDelete(course)} className="btn btn-link p-2 text-muted hover:text-danger transition-colors border-0"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <h5 className="fw-black text-uppercase tracking-widest mb-2 text-main" style={{ letterSpacing: '1px', fontSize: '16px' }}>{course.name}</h5>
                                <p className="text-muted small mb-4 line-clamp-2" style={{ fontSize: '11px', height: '32px', opacity: 0.7 }}>{course.description || 'No strategic description provided for this protocol.'}</p>

                                <div className="d-flex align-items-center justify-content-between pt-3 border-top border-main border-opacity-10">
                                    <div>
                                        <p className="text-muted small fw-bold text-uppercase mb-0 opacity-50" style={{ fontSize: '8px' }}>Program Fee</p>
                                        <p className="fw-black text-primary mb-0" style={{ fontSize: '20px' }}>₹{course.baseFee.toLocaleString()}</p>
                                    </div>
                                    <div className="text-end">
                                        <p className="text-muted small fw-bold text-uppercase mb-0 opacity-50" style={{ fontSize: '8px' }}>Min Token</p>
                                        <p className="fw-black mb-0 text-main" style={{ fontSize: '14px' }}>₹{course.minTokenAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {courses.length === 0 && !loading && (
                        <div className="col-12 text-center py-5 opacity-50">
                            <div className="mb-3 text-muted"><BookOpen size={48} strokeWidth={1} /></div>
                            <h6 className="fw-black text-uppercase tracking-widest text-muted">No Course Protocols Deployed</h6>
                            <p className="small fw-bold">Use the "New Protocol" button to initialize your curriculum hub.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseManagementPage;
