import React, { useState, useEffect, useCallback } from 'react';
import {
    GraduationCap, Plus, Search, Edit2, Trash2, Power,
    CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight, X, Save
} from 'lucide-react';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';

// ─── Confirmation Modal ───────────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="premium-card p-5 shadow-lg border-0" style={{ borderRadius: '24px', maxWidth: '420px', width: '90%' }}>
                <h5 className="fw-black text-main text-uppercase tracking-widest mb-3" style={{ fontSize: '13px' }}>Confirm Action</h5>
                <p className="text-muted fw-bold mb-5" style={{ fontSize: '14px' }}>{message}</p>
                <div className="d-flex gap-3 justify-content-end mt-4">
                    <button className="btn px-4 py-2 rounded-pill fw-bold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none' }} onClick={onCancel}>Cancel</button>
                    <button className="btn px-4 py-2 rounded-pill fw-bold text-uppercase shadow-sm" style={{ fontSize: '11px', letterSpacing: '0.5px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none' }} onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    );
};

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
const CollegeFormModal = ({ isOpen, onClose, onSave, editing }) => {
    const [collegeName, setCollegeName] = useState('');
    const [status, setStatus] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCollegeName(editing ? editing.collegeName : '');
            setStatus(editing ? editing.status : true);
        }
    }, [isOpen, editing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!collegeName.trim()) { toast.error('College name is required'); return; }
        setSaving(true);
        try {
            await onSave({ collegeName: collegeName.trim(), status });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="premium-card p-5 shadow-lg border-0" style={{ borderRadius: '28px', maxWidth: '520px', width: '90%', animation: 'slideUp 0.25s ease' }}>
                {/* Header */}
                <div className="d-flex align-items-center justify-content-between mb-5">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill">
                            <GraduationCap size={22} />
                        </div>
                        <div>
                            <h5 className="fw-black text-main text-uppercase tracking-widest mb-0" style={{ fontSize: '13px' }}>
                                {editing ? 'Edit College' : 'Add College'}
                            </h5>
                            <p className="text-muted mb-0 fw-bold" style={{ fontSize: '10px' }}>
                                {editing ? 'Update college details' : 'Register a new college'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-link text-muted p-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
                    <div>
                        <label className="text-main small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '10px' }}>
                            College Name *
                        </label>
                        <input
                            className="ui-input py-3 px-4 rounded-4 fw-bold w-100"
                            placeholder="e.g. Miracle Educational Society"
                            value={collegeName}
                            onChange={e => setCollegeName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-main small fw-black text-uppercase tracking-widest mb-2 d-block" style={{ fontSize: '10px' }}>
                            Status
                        </label>
                        <div className="d-flex gap-3">
                            {[{ val: true, label: 'Active' }, { val: false, label: 'Inactive' }].map(opt => (
                                <button
                                    key={String(opt.val)}
                                    type="button"
                                    onClick={() => setStatus(opt.val)}
                                    className={`d-flex align-items-center gap-2 px-4 py-2 rounded-pill fw-black text-uppercase border-0 transition-all ${status === opt.val
                                        ? (opt.val ? 'bg-success text-white shadow-sm' : 'bg-danger text-white shadow-sm')
                                        : 'bg-surface bg-opacity-10 text-muted'}`}
                                    style={{ fontSize: '11px' }}
                                >
                                    {opt.val ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="d-flex gap-3 justify-content-end mt-4">
                        <button type="button" onClick={onClose}
                            className="btn px-5 py-3 rounded-pill fw-bold text-uppercase"
                            style={{ fontSize: '11px', letterSpacing: '0.5px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="btn px-5 py-3 rounded-pill shadow-sm fw-bold text-uppercase d-flex align-items-center gap-2"
                            style={{ fontSize: '11px', letterSpacing: '0.5px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none' }}>
                            {saving ? <Loader2 size={16} className="spin-anim" /> : <Save size={16} />}
                            {editing ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(24px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .spin-anim { animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

// ─── Main CollegeManagement Component ────────────────────────────────────────
const CollegeManagement = () => {
    const { isDarkMode } = useTheme();

    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

    // Pagination
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;

    // Modals
    const [formModal, setFormModal] = useState(false);
    const [editingCollege, setEditingCollege] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchColleges = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                search,
                page,
                size: PAGE_SIZE,
                ...(statusFilter !== 'all' && { status: statusFilter === 'active' })
            };
            const data = await adminService.fetchColleges(params);
            // safeRequest already unwraps res.data, so `data` IS the response body
            setColleges(data?.content || []);
            setTotalPages(data?.totalPages || 1);
            setTotalElements(data?.totalElements || 0);
        } catch {
            toast.error('Failed to load colleges');
        } finally {
            setLoading(false);
        }
    }, [search, page, statusFilter]);

    useEffect(() => { fetchColleges(); }, [fetchColleges]);

    // Reset to page 0 when filters change
    useEffect(() => { setPage(0); }, [search, statusFilter]);

    // ── Save (Create / Update) ─────────────────────────────────────────────────
    const handleSave = async (payload) => {
        try {
            if (editingCollege) {
                await adminService.updateCollege(editingCollege.id, payload);
                toast.success('College updated successfully');
            } else {
                await adminService.createCollege(payload);
                toast.success('College added successfully');
            }
            fetchColleges();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Operation failed';
            toast.error(msg);
            throw err;
        }
    };

    // ── Toggle Status ──────────────────────────────────────────────────────────
    const handleToggleStatus = (college) => {
        const action = college.status ? 'deactivate' : 'activate';
        setConfirmModal({
            open: true,
            message: `Are you sure you want to ${action} "${college.collegeName}"?`,
            onConfirm: async () => {
                setConfirmModal({ open: false });
                try {
                    await adminService.toggleCollegeStatus(college.id);
                    toast.success(`College ${action}d`);
                    fetchColleges();
                } catch {
                    toast.error('Status update failed');
                }
            }
        });
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = (college) => {
        setConfirmModal({
            open: true,
            message: `Permanently delete "${college.collegeName}"? This cannot be undone.`,
            onConfirm: async () => {
                setConfirmModal({ open: false });
                try {
                    await adminService.deleteCollege(college.id);
                    toast.success('College deleted');
                    fetchColleges();
                } catch {
                    toast.error('Delete failed');
                }
            }
        });
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="d-flex flex-column gap-4 animate-fade-in">

            {/* Header Card */}
            <div className={`premium-card p-5 border-0 shadow-lg ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`}
                style={{ borderRadius: '32px' }}>
                <div className="d-flex align-items-start justify-content-between flex-wrap gap-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-pill shadow-glow">
                            <GraduationCap size={26} />
                        </div>
                        <div>
                            <h5 className="fw-black text-main text-uppercase tracking-widest mb-1" style={{ fontSize: '14px' }}>
                                College Registry
                            </h5>
                            <p className="text-muted mb-0 fw-bold" style={{ fontSize: '11px' }}>
                                MANAGE INSTITUTIONAL AFFILIATIONS · {totalElements} TOTAL
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setEditingCollege(null); setFormModal(true); }}
                        className="btn px-5 py-3 rounded-pill shadow-sm fw-bold text-uppercase d-flex align-items-center gap-2"
                        style={{ fontSize: '12px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none' }}
                    >
                        <Plus size={16} /> Add College
                    </button>
                </div>

                {/* Filters Row */}
                <div className="d-flex flex-wrap gap-3 mt-5">
                    {/* Search */}
                    <div className="position-relative flex-grow-1" style={{ maxWidth: '340px' }}>
                        <Search size={14} className="position-absolute top-50 translate-middle-y ms-3 text-muted opacity-50" style={{ left: 0 }} />
                        <input
                            className="ui-input py-3 ps-5 pe-4 rounded-pill fw-bold w-100"
                            placeholder="Search colleges..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ fontSize: '13px' }}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="d-flex gap-2">
                        {[
                            { val: 'all', label: 'All' },
                            { val: 'active', label: 'Active' },
                            { val: 'inactive', label: 'Inactive' }
                        ].map(opt => (
                            <button key={opt.val}
                                onClick={() => setStatusFilter(opt.val)}
                                className={`px-4 py-2 rounded-pill border-0 fw-black text-uppercase transition-all ${statusFilter === opt.val
                                    ? 'bg-primary text-white shadow-glow'
                                    : 'bg-surface bg-opacity-10 text-muted'}`}
                                style={{ fontSize: '11px' }}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className={`premium-card border-0 shadow-lg overflow-hidden ${isDarkMode ? 'bg-surface bg-opacity-20' : 'bg-white shadow-sm'}`}
                style={{ borderRadius: '28px' }}>
                {loading ? (
                    <div className="d-flex align-items-center justify-content-center py-5">
                        <Loader2 size={28} className="spin-anim text-primary" />
                    </div>
                ) : colleges.length === 0 ? (
                    <div className="text-center py-5">
                        <GraduationCap size={48} className="text-muted opacity-20 mb-3" />
                        <p className="text-muted fw-black text-uppercase" style={{ fontSize: '12px' }}>No colleges found</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ minWidth: '600px' }}>
                            <thead>
                                <tr className="border-0 border-bottom border-white border-opacity-5">
                                    <th className="text-muted fw-black text-uppercase px-5 py-4" style={{ fontSize: '10px', background: 'transparent' }}>#</th>
                                    <th className="text-muted fw-black text-uppercase py-4" style={{ fontSize: '10px', background: 'transparent' }}>College Name</th>
                                    <th className="text-muted fw-black text-uppercase py-4 text-center" style={{ fontSize: '10px', background: 'transparent' }}>Status</th>
                                    <th className="text-muted fw-black text-uppercase py-4 text-center" style={{ fontSize: '10px', background: 'transparent' }}>Added On</th>
                                    <th className="text-muted fw-black text-uppercase py-4 text-center pe-5" style={{ fontSize: '10px', background: 'transparent' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {colleges.map((col, idx) => (
                                    <tr key={col.id} className="border-0 border-bottom border-white border-opacity-5"
                                        style={{ transition: 'background 0.15s' }}>
                                        <td className="px-5 py-4 text-muted fw-black" style={{ fontSize: '12px' }}>
                                            {page * PAGE_SIZE + idx + 1}
                                        </td>
                                        <td className="py-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
                                                    <GraduationCap size={16} />
                                                </div>
                                                <span className="fw-black text-main" style={{ fontSize: '13px' }}>{col.collegeName}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="badge rounded-pill px-3 py-2 fw-black text-uppercase"
                                                style={{ 
                                                    fontSize: '10px',
                                                    color: col.status ? '#10b981' : '#ef4444',
                                                    backgroundColor: col.status ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                                                }}>
                                                {col.status ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-center text-muted fw-bold" style={{ fontSize: '12px' }}>
                                            {col.createdAt ? new Date(col.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td className="py-4 pe-5">
                                            <div className="d-flex gap-2 justify-content-center">
                                                {/* Edit */}
                                                <button title="Edit"
                                                    onClick={() => { setEditingCollege(col); setFormModal(true); }}
                                                    className="ui-btn-icon bg-primary bg-opacity-10 text-primary border-0 p-2 rounded-circle hover-scale transition-all">
                                                    <Edit2 size={14} />
                                                </button>
                                                {/* Toggle Status */}
                                                <button title={col.status ? 'Deactivate' : 'Activate'}
                                                    onClick={() => handleToggleStatus(col)}
                                                    className={`ui-btn-icon border-0 p-2 rounded-circle hover-scale transition-all ${col.status
                                                        ? 'bg-warning bg-opacity-10 text-warning'
                                                        : 'bg-success bg-opacity-10 text-success'}`}>
                                                    <Power size={14} />
                                                </button>
                                                {/* Delete */}
                                                <button title="Delete"
                                                    onClick={() => handleDelete(col)}
                                                    className="ui-btn-icon bg-danger bg-opacity-10 text-danger border-0 p-2 rounded-circle hover-scale transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="d-flex align-items-center justify-content-between px-5 py-4 border-top border-white border-opacity-5">
                        <p className="text-muted fw-black mb-0" style={{ fontSize: '11px' }}>
                            Page {page + 1} of {totalPages} · {totalElements} records
                        </p>
                        <div className="d-flex gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                                className="ui-btn-icon bg-surface bg-opacity-10 text-muted border-0 p-2 rounded-circle disabled:opacity-30 hover-scale">
                                <ChevronLeft size={16} />
                            </button>
                            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                                className="ui-btn-icon bg-surface bg-opacity-10 text-muted border-0 p-2 rounded-circle hover-scale">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CollegeFormModal
                isOpen={formModal}
                onClose={() => setFormModal(false)}
                onSave={handleSave}
                editing={editingCollege}
            />
            <ConfirmModal
                isOpen={confirmModal.open}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ open: false })}
            />

            <style>{`
                .spin-anim { animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .hover-scale:hover { transform: scale(1.12); }
            `}</style>
        </div>
    );
};

export default CollegeManagement;
