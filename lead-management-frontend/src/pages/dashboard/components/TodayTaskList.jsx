import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/common/Components';

const TodayTaskList = ({ leads = [], tasks = [], theme = 'light' }) => {
    const navigate = useNavigate();
    const isDarkMode = theme === 'dark';

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    // Merge logic: Prioritize actual Task entities, fallback to Lead follow-up dates
    const todayTasks = useMemo(() => {
        // 1. Process explicit Tasks
        const processedTasks = tasks.filter(t => {
            if (t.status === 'COMPLETED' || !t.dueDate) return false;
            const taskDate = String(t.dueDate).split('T')[0].split(' ')[0];
            return taskDate === today;
        }).map(t => ({
            id: t.lead?.id || t.id,
            name: t.lead?.name || 'Unknown Lead',
            status: t.lead?.status || 'NEW',
            followUpDate: t.dueDate,
            title: t.title || 'Follow-up',
            isTask: true
        }));

        // 2. Process Leads that might have a followUpDate but no Task entity (legacy/manual)
        const leadsWithFollowup = leads.filter(l => {
            if (!l.followUpDate) return false;
            const lDate = String(l.followUpDate).split('T')[0].split(' ')[0];
            return lDate === today;
        }).filter(l => !processedTasks.find(t => t.id === l.id)) // Avoid duplicates
        .map(l => ({
            id: l.id,
            name: l.name,
            status: l.status,
            followUpDate: l.followUpDate,
            title: 'Follow-up',
            isTask: false
        }));

        return [...processedTasks, ...leadsWithFollowup]
            .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
    }, [tasks, leads, today]);

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
            <div className="px-1 pt-2 pb-2" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                {todayTasks.length === 0 ? (
                    <div className="h-100 d-flex flex-column align-items-center justify-content-center py-5 opacity-40">
                        <div style={{ fontSize: '40px' }}>🎯</div>
                        <p className="fw-bold mb-0">All caught up!</p>
                        <small>No tasks scheduled for today.</small>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-2">
                        {todayTasks.map((item, idx) => (
                            <div 
                                key={item.isTask ? `task-${item.id}-${idx}` : `lead-${item.id}`}
                                onClick={() => navigate(`/leads/${item.id}/status-update`)}
                                className={`p-3 rounded-4 d-flex align-items-center justify-content-between transition-all cursor-pointer ${
                                    isDarkMode ? 'bg-white bg-opacity-5 hover-bg-opacity-10' : 'bg-card hover-bg-surface border'
                                }`}
                                style={{ transition: '0.2s ease' }}
                            >
                                <div className="d-flex align-items-center gap-3 w-100 overflow-hidden px-1">
                                    <div className="d-flex flex-column flex-grow-1 overflow-hidden">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="fw-black text-main text-truncate" style={{ fontSize: '14px' }}>{item.name}</span>
                                            {item.isTask && (
                                                <span className="badge bg-primary bg-opacity-10 text-primary border-0 fw-black" style={{ fontSize: '7px' }}>TASK</span>
                                            )}
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <small className="text-muted fw-bold" style={{ fontSize: '11px' }}>
                                                {new Date(item.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </small>
                                            <span className="opacity-20">•</span>
                                            <small className="text-primary fw-black text-uppercase tracking-wider" style={{ fontSize: '9px', opacity: 0.8 }}>
                                                {item.title}
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
