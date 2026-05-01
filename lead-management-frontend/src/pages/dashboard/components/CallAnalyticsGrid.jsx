import React from 'react';
import {
    Phone,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    PhoneForwarded,
    PhoneOff,
    UserCheck,
    Clock,
    Zap,
    History
} from 'lucide-react';

const CallAnalyticsGrid = ({ stats, loading, isDarkMode }) => {
    if (loading) {
        return (
            <div className="row g-3">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="col-12 col-md-6 col-lg-3">
                        <div className="analytics-card loading p-4 rounded-4 border border-white border-opacity-5" style={{ height: '140px' }}>
                            <div className="shimmer w-50 h-25 mb-3"></div>
                            <div className="shimmer w-75 h-50"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: "Total Phone Calls",
            value: stats?.totalCalls || 0,
            subValue: stats?.totalDurationFormatted || "0s",
            icon: <History size={24} />,
            color: "#f59e0b", // Amber
            secondaryIcon: <Clock size={14} />
        },
        {
            title: "Incoming Calls",
            value: stats?.incomingCount || 0,
            subValue: stats?.incomingDurationFormatted || "0s",
            icon: <PhoneIncoming size={24} />,
            color: "#84cc16", // Lime
            secondaryIcon: <Clock size={14} />
        },
        {
            title: "Outgoing Calls",
            value: stats?.outgoingCount || 0,
            subValue: stats?.outgoingDurationFormatted || "0s",
            icon: <PhoneOutgoing size={24} />,
            color: "#eab308", // Yellow
            secondaryIcon: <Clock size={14} />
        },
        {
            title: "Missed Calls",
            value: stats?.missedCount || 0,
            icon: <PhoneMissed size={24} />,
            color: "#f87171", // Red
        },
        {
            title: "Rejected Calls",
            value: stats?.rejectedCount || 0,
            icon: <PhoneOff size={24} />,
            color: "#dc2626", // Dark Red
        },
        {
            title: "Never Attended Calls",
            value: stats?.neverAttendedCount || 0,
            icon: <PhoneForwarded size={24} />,
            color: "#94a3b8", // Slate
        },
        {
            title: "Not Pickup by Client",
            value: stats?.notPickedCount || 0,
            icon: <Phone size={24} />,
            color: "#f97316", // Orange
            style: { transform: 'rotate(180deg)' }
        },
        {
            title: "Unique Calls",
            value: stats?.uniqueCount || 0,
            icon: <UserCheck size={24} />,
            color: "#cbd5e1", // Light Slate
            isPremium: true
        }
    ];

    return (
        <div className="row g-2 animate-fade-in px-1">
            {cards.map((card, idx) => (
                <div key={idx} className="col-6 col-md-4 col-lg-3">
                    <div className="premium-card p-3 p-md-4 transition-all hover-lift h-100 position-relative border-0 shadow-lg"
                        style={{
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            color: isDarkMode ? '#ffffff' : '#1a1a25',
                            borderRadius: '1.25rem',
                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
                        }}>

                        {card.isPremium && (
                            <div className="position-absolute top-0 end-0 mt-2 me-2" style={{ zIndex: 2 }}>
                                <span className="badge bg-warning text-dark fw-black d-flex align-items-center gap-1 shadow-sm" style={{ fontSize: '6px', padding: '3px 6px', borderRadius: '4px' }}>
                                    <Zap size={6} fill="currentColor" />
                                </span>
                            </div>
                        )}

                        <div className="d-flex flex-column h-100">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <div className="p-2.5 rounded-3 d-flex align-items-center justify-content-center"
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: card.color,
                                        border: `1px solid ${card.color}20`
                                    }}>
                                    {card.icon}
                                </div>
                                <h6 className="text-muted small fw-bold mb-0 opacity-75" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                                    {card.title}
                                </h6>
                            </div>

                            <div className="mt-auto">
                                <div className="d-flex align-items-baseline gap-2 mb-1">
                                    <Phone size={14} className="opacity-50" />
                                    <h3 className="fw-black mb-0" style={{ fontSize: '28px', letterSpacing: '-0.01em' }}>
                                        {card.value}
                                    </h3>
                                </div>
                                {/* {card.subValue && (
                                    <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top border-white border-opacity-5" style={{ color: card.color }}>
                                        <Clock size={16} />
                                        <span className="fw-black" style={{ fontSize: '14px' }}>{card.subValue}</span>
                                    </div>
                                )} */}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CallAnalyticsGrid;
