import React, { useState } from 'react';
import { TrendingUp, Shield, Edit, Target as TargetIcon, Search, Check, Save, Zap } from 'lucide-react';
import TargetModal from './TargetModal';

const RevenueStrategyHub = ({ users, onSync }) => {
    const [scope, setScope] = useState('PERSON');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

    const filteredUsers = users.filter(u => {
        const matchesScope = scope === 'TEAM' ? u.role === 'TEAM_LEADER' : u.role === 'ASSOCIATE';
        const matchesSearch = !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesScope && matchesSearch;
    });

    return (
        <div className="animate-fade-in p-1">
            <div className="premium-card p-5 border-0 shadow-lg position-relative overflow-hidden" 
                 style={{ borderRadius: '32px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(30px)' }}>
                
                {/* Background Character */}
                <div className="position-absolute" style={{ top: '-40px', right: '-40px', opacity: 0.03, zIndex: 0 }}>
                    <TargetIcon size={400} className="text-success" />
                </div>

                <div className="position-relative z-10">
                    <div className="d-flex align-items-center justify-content-between mb-5 pb-4 border-bottom border-white border-opacity-5">
                        <div className="d-flex align-items-center gap-4">
                            <div className="p-3.5 bg-success bg-opacity-10 rounded-circle text-success shadow-glow-sm">
                                <Zap size={28} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="fw-black text-main mb-1 tracking-tighter text-uppercase">Revenue Strategy Hub</h3>
                                <p className="text-muted small mb-0 opacity-75 fw-bold text-uppercase tracking-widest" style={{ fontSize: '10px' }}>
                                    Performance Alignment & Capital Deployment Lead
                                </p>
                            </div>
                        </div>

                        <div className="d-flex gap-2 p-1.5 bg-dark bg-opacity-40 rounded-pill border border-white border-opacity-5">
                            {['PERSON', 'TEAM'].map(s => (
                                <button 
                                    key={s}
                                    className={`ui-btn btn-sm px-5 py-2 rounded-pill border-0 fw-black text-uppercase tracking-widest transition-all ${scope === s ? 'bg-success text-white shadow-glow-sm' : 'text-muted opacity-50 hover:opacity-100'}`}
                                    style={{ fontSize: '10px' }}
                                    onClick={() => { setScope(s); setSelectedUserId(null); }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="row g-4">
                        <div className="col-12 col-xl-4">
                            <div className="d-flex flex-column gap-3">
                                <div className="p-4 bg-surface bg-opacity-40 rounded-5 border border-white border-opacity-5 shadow-sm">
                                    <h6 className="fw-black text-main small tracking-widest text-uppercase mb-4 d-flex align-items-center gap-2">
                                        <Search size={14} className="text-muted" />
                                        Lead Registry
                                    </h6>
                                    
                                    <div className="ui-input-group mb-4">
                                        <input 
                                            type="text" 
                                            className="ui-input w-100 bg-dark bg-opacity-30 border-white border-opacity-10 rounded-4 text-main fw-black p-3 h-auto"
                                            placeholder="SEARCH BY IDENTITY..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    <div className="custom-scroll overflow-auto" style={{ maxHeight: '450px', paddingRight: '5px' }}>
                                        {filteredUsers.map(u => (
                                            <div 
                                                key={u.id}
                                                className={`p-3.5 rounded-4 mb-2 cursor-pointer transition-all border ${selectedUserId === u.id ? 'bg-success bg-opacity-10 border-success border-opacity-30 shadow-glow-sm' : 'bg-white bg-opacity-5 border-white border-opacity-5 hover-bg-surface'}`}
                                                onClick={() => setSelectedUserId(u.id)}
                                            >
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className={`p-2 rounded-3 ${selectedUserId === u.id ? 'bg-success text-white' : 'bg-white bg-opacity-10 text-muted'}`}>
                                                        {scope === 'TEAM' ? <Shield size={14} /> : <Edit size={14} />}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="fw-black text-main text-uppercase mb-0 text-truncate" style={{ fontSize: '11px', letterSpacing: '-0.3px' }}>{u.name}</p>
                                                        <span className="text-muted fw-bold opacity-40 text-uppercase" style={{ fontSize: '8px' }}>LEAD {u.id.toString().slice(-6)} • {u.role}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <div className="py-5 text-center opacity-30">
                                                <Search size={40} className="mb-2" />
                                                <p className="small fw-black text-uppercase">No Leads Detected</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-8">
                            <div className="h-100 p-5 bg-surface bg-opacity-40 rounded-5 border border-white border-opacity-5 shadow-sm d-flex flex-column position-relative overflow-hidden">
                                {selectedUserId ? (
                                    <div className="animate-fade-in w-100">
                                        <div className="d-flex align-items-center gap-4 mb-5">
                                            <div className="p-4 bg-success bg-opacity-10 rounded-4 text-success shadow-glow-sm border border-success border-opacity-20 flex-shrink-0">
                                                {scope === 'TEAM' ? <Shield size={32} /> : <TrendingUp size={32} />}
                                            </div>
                                            <div>
                                                <h4 className="fw-black text-main text-uppercase mb-1 tracking-tighter" style={{ fontSize: '24px' }}>
                                                    {users.find(u => u.id === selectedUserId)?.name}
                                                </h4>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="ui-badge bg-success bg-opacity-10 text-success fw-black" style={{ fontSize: '9px' }}>ACTIVE LEAD</span>
                                                    <span className="text-muted small fw-bold opacity-40 text-uppercase">{scope === 'TEAM' ? 'Team Performance Cluster' : 'Individual Revenue Stream'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row g-4 mb-5">
                                            <div className="col-12 col-md-6">
                                                <div className="p-4 bg-dark bg-opacity-30 rounded-4 border border-white border-opacity-5">
                                                    <label className="text-muted fw-black text-uppercase mb-3 d-block" style={{ fontSize: '9px', opacity: 0.5 }}>Current Capacity</label>
                                                    <div className="d-flex align-items-baseline gap-2">
                                                        <span className="text-main fw-black fs-2 font-monospace">₹{users.find(u => u.id === selectedUserId)?.monthlyTarget?.toLocaleString() || 0}</span>
                                                        <span className="text-muted small fw-bold opacity-30">/MO</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <div className="p-4 bg-dark bg-opacity-30 rounded-4 border border-white border-opacity-5">
                                                    <label className="text-muted fw-black text-uppercase mb-3 d-block" style={{ fontSize: '9px', opacity: 0.5 }}>Operation Window</label>
                                                    <div className="d-flex align-items-baseline gap-2">
                                                        <span className="text-main fw-black fs-2">APRIL</span>
                                                        <span className="text-muted small fw-bold opacity-30">2026</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-success bg-opacity-5 rounded-5 border border-success border-opacity-20 d-flex align-items-center justify-content-between shadow-glow-sm mt-5">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="p-2 bg-success bg-opacity-20 rounded-circle text-success shadow-glow-sm">
                                                    <Check size={20} />
                                                </div>
                                                <div>
                                                    <h6 className="fw-black text-main text-uppercase mb-1" style={{ fontSize: '12px' }}>Operational Readiness</h6>
                                                    <p className="text-muted small fw-bold opacity-60 mb-0 px-1">Deploy new revenue trajectory for this lead</p>
                                                </div>
                                            </div>
                                            <button 
                                                className="ui-btn ui-btn-primary px-5 py-3 rounded-pill shadow-glow fw-black text-uppercase tracking-widest h-auto"
                                                onClick={() => setIsTargetModalOpen(true)}
                                            >
                                                Calibrate Goal 
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 opacity-40">
                                        <div className="p-5 bg-white bg-opacity-5 rounded-circle mb-4 border border-white border-opacity-5">
                                            <TargetIcon size={64} className="text-muted" />
                                        </div>
                                        <h5 className="fw-black text-muted text-uppercase tracking-widest small mb-2">Strategy Idle</h5>
                                        <p className="text-muted small fw-bold opacity-50 text-center px-5 mb-0">Select a staff lead from the registry to deploy revenue milestones</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TargetModal 
                isOpen={isTargetModalOpen}
                onClose={() => setIsTargetModalOpen(false)}
                userId={selectedUserId}
                onSuccess={() => { onSync(); setSelectedUserId(null); }}
            />
        </div>
    );
};

export default RevenueStrategyHub;
