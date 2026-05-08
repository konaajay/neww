import React, { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Bell, Calendar } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const NotificationManager = () => {
    const { user } = useAuth();
    const notifiedRef = useRef(new Set());

    useEffect(() => {
        if (!user) return;

        const checkFollowUps = async () => {
            try {
                const res = await api.get('/leads/alerts/upcoming');
                const leads = res.data || [];
                
                leads.forEach(lead => {
                    const leadId = lead.id;
                    const followUpTime = new Date(lead.followUpDate);
                    const now = new Date();
                    const diffMs = followUpTime - now;
                    const diffMins = Math.floor(diffMs / 60000);

                    // If it's between 0 and 10 minutes and we haven't notified for THIS specific time today
                    const notifyKey = `${leadId}_${lead.followUpDate}`;
                    
                    if (diffMins >= 0 && diffMins <= 10 && !notifiedRef.current.has(notifyKey)) {
                        notifiedRef.current.add(notifyKey);
                        
                        toast.info(
                            <div className="d-flex flex-column gap-1">
                                <div className="d-flex align-items-center gap-2 text-primary fw-black">
                                    <Bell size={16} />
                                    <span style={{fontSize: '11px', letterSpacing: '0.05em'}}>FOLLOW-UP ALERT</span>
                                </div>
                                <div className="fw-bold text-main">{lead.name}</div>
                                <div className="text-muted small d-flex align-items-center gap-1" style={{fontSize: '10px'}}>
                                    <Calendar size={12} />
                                    Scheduled in {diffMins} minutes
                                </div>
                            </div>,
                            {
                                position: "top-right",
                                autoClose: 10000,
                                hideProgressBar: false,
                                closeOnClick: true,
                                pauseOnHover: true,
                                draggable: true,
                                theme: "dark",
                                icon: false
                            }
                        );

                        // Play a subtle notification sound if possible
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                            audio.volume = 0.4;
                            audio.play();
                        } catch (e) {
                            console.warn("Audio play blocked");
                        }
                    }
                });

                // Cleanup set occasionally to prevent memory bloat
                if (notifiedRef.current.size > 100) {
                    notifiedRef.current.clear();
                }
            } catch (err) {
                console.error("Notification check failed", err);
            }
        };

        // Check every minute
        checkFollowUps();
        const interval = setInterval(checkFollowUps, 60000);
        return () => clearInterval(interval);
    }, [user]);

    return null;
};

export default NotificationManager;
