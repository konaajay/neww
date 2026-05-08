import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/common/Components';

const TodayTaskList = ({ leads = [], theme = 'light' }) => {
    const navigate = useNavigate();
    const isDarkMode = theme === 'dark';

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const todayTasks = leads.filter(lead => {
        if (!lead.nextFollowUp) return false;
        return lead.nextFollowUp.startsWith(today);
    }).sort((a, b) => new Date(a.nextFollowUp) - new Date(b.nextFollowUp));

    const extra = (
        <div className="badge rounded-pill px-3 py-2 bg-primary bg-opacity-10 text-primary fw-black" style={{ fontSize: '10px' }}>
            PRIORITY
        </div>
    );

    return (
        <Card 
            title="Today's Focus" 
            subtitle={`${todayTasks.length} LEADS TO CONTACT`}
            extra={extra}
            className="h-100"
        >
            <div className="px-1 pt-2 pb-2" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {todayTasks.length === 0 ? (
                    <div className="h-100 d-flex flex-column align-items-center justify-content-center py-5 opacity-40">
                        <div style={{ fontSize: '40px' }}>🎯</div>
                        <p className="fw-bold mb-0">All caught up!</p>
                        <small>No tasks scheduled for today.</small>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-2">
                        {todayTasks.map((lead) => (
                            <div 
                                key={lead.id}
                                onClick={() => navigate(`/leads/${lead.id}`)}
                                className={`p-3 rounded-4 d-flex align-items-center justify-content-between transition-all cursor-pointer ${
                                    isDarkMode ? 'bg-white bg-opacity-5 hover-bg-opacity-10' : 'bg-light hover-bg-white border'
                                }`}
                                style={{ transition: '0.2s ease' }}
                            >
                                <div className="d-flex align-items-center gap-3">
                                    <div className="premium-avatar-sm rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm" 
                                         style={{ 
                                            width: '42px', 
                                            height: '42px', 
                                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                            fontSize: '14px'
                                         }}>
                                        {lead.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="d-flex flex-column">
                                        <span className="fw-black text-main mb-0" style={{ fontSize: '14px' }}>{lead.name}</span>
                                        <div className="d-flex align-items-center gap-2">
                                            <small className="text-muted fw-bold" style={{ fontSize: '11px' }}>
                                                {new Date(lead.nextFollowUp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </small>
                                            <span className="opacity-20">•</span>
                                            <small className={`fw-black text-uppercase tracking-wider ${
                                                lead.status === 'HOT' ? 'text-danger' : 
                                                lead.status === 'WARM' ? 'text-warning' : 'text-primary'
                                            }`} style={{ fontSize: '9px' }}>
                                                {lead.status}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-icon btn-sm rounded-circle bg-primary bg-opacity-10 text-primary border-0">
                                        <i className="bi bi-telephone-fill" style={{ fontSize: '12px' }}></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default TodayTaskList;
