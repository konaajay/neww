import React, { useState, useEffect } from 'react';
import { 
    Target, 
    Calendar, 
    User as UserIcon, 
    History, 
    Save, 
    TrendingUp,
    Shield,
    Users,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    IndianRupee,
    Clock,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import api from '../../../api/api';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-toastify';
import TargetHistoryModal from './TargetHistoryModal';

const TargetDistributionHub = ({ filters }) => {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const [subordinates, setSubordinates] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [amount, setAmount] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyUser, setHistoryUser] = useState(null);
    const [editMode, setEditMode] = useState(false);

    // Distribution State for TLs
    const [distributions, setDistributions] = useState({});
    const [budgetData, setBudgetData] = useState({ assigned: 0, distributed: 0 });

    const isManager = user?.roles?.some(r => ['ROLE_MANAGER', 'MANAGER', 'ROLE_ADMIN', 'ADMIN'].includes(r.name?.toUpperCase())) || 
                     ['ROLE_MANAGER', 'MANAGER', 'ROLE_ADMIN', 'ADMIN'].includes(user?.role?.toUpperCase() || user?.roleName?.toUpperCase());
    const isAdmin = user?.roles?.some(r => ['ROLE_ADMIN', 'ADMIN'].includes(r.name?.toUpperCase())) || 
                     ['ROLE_ADMIN', 'ADMIN'].includes(user?.role?.toUpperCase() || user?.roleName?.toUpperCase());

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const years = [2024, 2025, 2026, 2027];

    const loadData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // 1. Load Budget for TLs
            // 1. Load Budget for the current view context
            const budgetUserId = (isManager && filters?.userId) ? filters.userId : user.id;
            try {
                const summaryRes = await api.get(`/targets/v2/user/${budgetUserId}`, { params: { month, year } });
                const resData = summaryRes.data?.data || summaryRes.data || {};
                setBudgetData({
                    assigned: resData.assignedTarget || 0,
                    distributed: resData.distributedAmount || 0
                });
            } catch (e) {
                setBudgetData({ assigned: 0, distributed: 0 });
            }

            // 2. Load Team with Fallback
            let rawData = [];
            const targetId = (isManager && filters?.userId) ? filters.userId : user.id;
            const res = await api.get('/manager/team-tree', { params: { targetUserId: targetId } });
            rawData = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.content || []);
            
            // Fallback for Manager: if team-tree is empty, try team-leaders
            if (isManager && rawData.length === 0 && !filters?.userId) {
                const fbRes = await api.get('/manager/team-leaders');
                rawData = Array.isArray(fbRes.data) ? fbRes.data : (fbRes.data?.data || fbRes.data?.content || []);
            }

            // Helper to flatten the tree
            const flattenTree = (users) => {
                let flat = [];
                users.forEach(u => {
                    flat.push(u);
                    if (u.subordinates && u.subordinates.length > 0) {
                        flat = [...flat, ...flattenTree(u.subordinates)];
                    }
                });
                return flat;
            };

            const teamData = flattenTree(rawData);

            // Deduplicate by ID
            const uniqueTeamData = [];
            const seenIds = new Set();
            teamData.forEach(u => {
                if (!seenIds.has(u.id)) {
                    uniqueTeamData.push(u);
                    seenIds.add(u.id);
                }
            });

            const userRole = (user?.role || user?.roleName || '').toUpperCase();
            const isAdmin = userRole.includes('ADMIN');
            
            const filteredData = uniqueTeamData.filter(u => {
                if (u.id === user.id) return false;
                const name = (u.name || '').toUpperCase();
                if (name.includes('ASSIGN TO SELF')) return false;
                
                const r = (u.role?.name || u.roleName || u.role || '').toUpperCase();
                
                if (isAdmin) {
                    // Admins only distribute to Managers
                    return r.includes('MANAGER') || r === 'MGR';
                }
                
                if (isManager) {
                    // Managers only distribute to Team Leaders/Supervisors
                    return r.includes('TEAM') || r.includes('LEAD') || r.includes('TL') || r.includes('SUPER');
                }
                
                // Team Leaders distribute to their Associates
                return true;
            });

            // If empty for TL, try a direct fetch as fallback
            if (!isManager && filteredData.length === 0) {
                console.log("[TEAM-DEBUG] TL tree empty, attempting direct associate fallback");
                const dirRes = await api.get('/manager/direct-associates');
                const dirData = Array.isArray(dirRes.data) ? dirRes.data : (dirRes.data?.data || []);
                filteredData.push(...dirData.filter(u => u.id !== user.id));
            }

            console.log(`[TEAM-DEBUG] Found ${filteredData.length} associates/TLs:`, filteredData.map(u => u.name));

            const fullList = isAdmin ? filteredData : [{ 
                id: (isManager && filters?.userId) ? filters.userId : user.id, 
                name: "Assign to Self", 
                email: user.email, 
                roleName: isManager ? 'MANAGER' : 'TEAM_LEADER' 
            }, ...filteredData];
            
            setSubordinates(fullList);

            // 3. Load Current Allocations
            const distMap = {};
            let hasExisting = false;
            try {
                const assignedById = (isManager && filters?.userId) ? filters.userId : user.id;
                const assignedByRes = await api.get(`/targets/bulk/assigned-by/${assignedById}`, { params: { month, year } });
                const currentAllocations = assignedByRes.data?.data || [];
                
                fullList.forEach(s => {
                    const existing = currentAllocations.find(a => a.userId == s.id);
                    if (existing && parseFloat(existing.amount) > 0) hasExisting = true;
                    distMap[s.id] = existing ? existing.amount.toString() : '0';
                });
            } catch (e) {
                fullList.forEach(s => { distMap[s.id] = '0'; });
            }
            setDistributions(distMap);
            // Default to read-only if we have existing allocations and aren't already editing
            if (hasExisting) setEditMode(false);
            else setEditMode(true);

            if (!selectedUserId && fullList.length > 0) setSelectedUserId(fullList[0].id);
        } catch (err) {
            console.error("Data load failed:", err);
            // On error, at least show Self
            const selfOnly = [{ id: user.id, name: "Assign to Self", email: user.email, roleName: isManager ? 'MANAGER' : 'TEAM_LEADER' }];
            setSubordinates(selfOnly);
            setDistributions({ [user.id]: '0' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [month, year, user, filters?.userId]);

    const handleSingleSave = async () => {
        if (!selectedUserId || !amount || parseFloat(amount) <= 0) {
            return toast.warning("Please select a user and enter a valid amount");
        }
        setIsSaving(true);
        try {
            await api.post('/targets/set', {
                userId: parseInt(selectedUserId),
                amount: parseFloat(amount),
                month: parseInt(month),
                year: parseInt(year),
                type: 'ASSIGNED'
            });
            toast.success("Target saved successfully");
            setAmount('');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkSave = async () => {
        const payloads = Object.entries(distributions).map(([uid, val]) => ({
            userId: parseInt(uid),
            amount: parseFloat(val || 0),
            month, year, 
            type: parseInt(uid) === (filters?.userId || user.id) ? 'DISTRIBUTED' : 'ASSIGNED'
        }));

        const total = payloads.reduce((sum, p) => sum + p.amount, 0);
        
        // Admins define the top-level budget, so they don't need to balance against a pre-assigned amount
        if (!isAdmin && Math.abs(total - budgetData.assigned) > 1) {
            return toast.error(`Imbalance: Total must be ₹${budgetData.assigned.toLocaleString()}`);
        }

        setIsSaving(true);
        try {
            await api.post('/targets/bulk', payloads);
            toast.success("Team targets synchronized!");
            setEditMode(false);
            loadData();
        } catch (err) { toast.error("Sync failed"); }
        finally { setIsSaving(false); }
    };

    const currentTotal = Object.values(distributions).reduce((sum, val) => sum + parseFloat(val || 0), 0);
    const isBalanced = isAdmin || Math.abs(currentTotal - budgetData.assigned) <= 1;
    return (
        <div className="position-relative animate-fade-in">
            {isLoading && (
                <div className={`position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-3 rounded-4 ${isDarkMode ? 'bg-dark bg-opacity-50' : 'bg-white bg-opacity-75'}`}>
                    <div className="spinner-border text-primary text-opacity-25" role="status"></div>
                </div>
            )}

            <div className={`p-4 border shadow-sm rounded-4 bg-card ${isDarkMode ? 'border-main border-opacity-10' : 'border-gray-100'}`}>
                {/* Minimalist Header */}
                <div className={`d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom ${isDarkMode ? 'border-main border-opacity-10' : 'border-gray-50'}`}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-3 text-blue-500">
                            <Target size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h5 className="fw-black m-0 text-main tracking-tight">Strategic Hub</h5>
                            <p className="text-muted tiny m-0 fw-bold tracking-widest text-uppercase opacity-40">Target Distribution</p>
                        </div>
                    </div>
                    
                    <div className={`d-flex align-items-center gap-3 p-1 rounded-pill ${isDarkMode ? 'bg-surface' : 'bg-gray-50'}`}>
                        <button 
                            onClick={() => { 
                                if (month === 1) {
                                    setMonth(12);
                                    setYear(prev => prev - 1);
                                } else {
                                    setMonth(prev => prev - 1);
                                }
                                setEditMode(false); 
                            }} 
                            className={`btn btn-sm rounded-circle border-0 shadow-sm ${isDarkMode ? 'bg-surface text-main' : 'bg-white'}`}
                        >
                            <ChevronLeft size={12}/>
                        </button>
                        <span className="small fw-black text-main px-2 uppercase tracking-tighter" style={{ minWidth: '100px', textAlign: 'center' }}>{months[month-1]} {year}</span>
                        <button 
                            onClick={() => { 
                                if (month === 12) {
                                    setMonth(1);
                                    setYear(prev => prev + 1);
                                } else {
                                    setMonth(prev => prev + 1);
                                }
                                setEditMode(false); 
                            }} 
                            className={`btn btn-sm rounded-circle border-0 shadow-sm ${isDarkMode ? 'bg-surface text-main' : 'bg-white'}`}
                        >
                            <ChevronRight size={12}/>
                        </button>
                    </div>
                </div>

                {/* Clean Budget Summary */}
                <div className="row g-3 mb-4">
                    {!isAdmin ? (
                        <>
                            <div className="col-md-4">
                                <div className={`p-3 border rounded-4 ${isDarkMode ? 'bg-surface bg-opacity-50 border-main border-opacity-10 shadow-inner' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <span className="text-muted tiny fw-black text-uppercase tracking-widest opacity-40 d-block mb-1">Assigned Budget</span>
                                    <h4 className="fw-black m-0 text-main">₹{budgetData.assigned.toLocaleString()}</h4>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className={`p-3 border rounded-4 transition-all ${isDarkMode ? 'bg-surface border-primary border-opacity-30' : 'bg-blue-50/30 border-blue-50'}`} style={{ boxShadow: isDarkMode ? '0 0 15px rgba(99, 102, 241, 0.05)' : 'none' }}>
                                    <span className="text-primary tiny fw-black text-uppercase tracking-widest d-block mb-1 opacity-70">Allocated Pool</span>
                                    <h4 className="fw-black m-0 text-primary">₹{currentTotal.toLocaleString()}</h4>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className={`p-3 border rounded-4 transition-all ${isBalanced 
                                    ? (isDarkMode ? 'bg-surface border-success border-opacity-30 text-success' : 'bg-emerald-50/30 border-emerald-50 text-emerald-600') 
                                    : (isDarkMode ? 'bg-surface border-danger border-opacity-30 text-danger' : 'bg-rose-50/30 border-rose-50 text-rose-600')}`}
                                    style={{ boxShadow: isDarkMode ? (isBalanced ? '0 0 15px rgba(16, 185, 129, 0.05)' : '0 0 15px rgba(244, 63, 94, 0.05)') : 'none' }}>
                                    <span className={`tiny fw-black text-uppercase tracking-widest d-block mb-1 opacity-70`}>Parity Status</span>
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-2 fw-black small">
                                            {isBalanced ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                            {isBalanced ? 'ALIGNED' : 'IMBALANCED'}
                                        </div>
                                        {!isBalanced && (
                                            <div className="tiny fw-black">
                                                {currentTotal > budgetData.assigned ? (
                                                    <span className="opacity-75">+{ (currentTotal - budgetData.assigned).toLocaleString() } Surplus</span>
                                                ) : (
                                                    <span className="opacity-75">-{ (budgetData.assigned - currentTotal).toLocaleString() } Deficit</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="col-md-6">
                                <div className={`p-3 border rounded-4 ${isDarkMode ? 'bg-surface border-primary border-opacity-30 shadow-inner' : 'bg-blue-50/30 border-blue-50 shadow-sm'}`} style={{ boxShadow: isDarkMode ? '0 0 15px rgba(99, 102, 241, 0.05)' : 'none' }}>
                                    <span className="text-primary tiny fw-black text-uppercase tracking-widest d-block mb-1 opacity-70">Total Team Target (Allocated)</span>
                                    <h4 className="fw-black m-0 text-primary">₹{currentTotal.toLocaleString()}</h4>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className={`p-3 border rounded-4 ${isDarkMode ? 'bg-surface bg-opacity-50 border-main border-opacity-10 shadow-inner' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <span className="text-muted tiny fw-black text-uppercase tracking-widest opacity-40 d-block mb-1">Status</span>
                                    <div className="d-flex align-items-center gap-2 text-main fw-black small">
                                        <div className="p-1 rounded-circle bg-success shadow-glow"></div>
                                        ADMINISTRATIVE SOURCE ACTIVE
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className={`border rounded-4 overflow-hidden ${isDarkMode ? 'border-main border-opacity-10' : 'border-gray-50'}`}>
                    <div className="table-responsive">
                            <table className="table table-hover m-0 align-middle">
                                <thead className={isDarkMode ? 'bg-surface bg-opacity-30' : 'bg-gray-50 bg-opacity-50'}>
                                    <tr>
                                        <th className="px-4 py-3 border-0 tiny fw-black text-muted text-uppercase tracking-widest">Team Member</th>
                                        <th className="px-4 py-3 border-0 tiny fw-black text-muted text-uppercase tracking-widest">Role</th>
                                        <th className="px-4 py-3 border-0 tiny fw-black text-muted text-uppercase tracking-widest text-end">Allocation (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subordinates.map(sub => (
                                        <tr key={sub.id} className={`border-bottom ${isDarkMode ? 'border-main border-opacity-10' : 'border-gray-50'}`}>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-circle d-flex align-items-center justify-content-center fw-black small ${isDarkMode ? 'bg-surface text-muted' : 'bg-gray-50 text-gray-400'}`}>{sub.name.charAt(0)}</div>
                                                    <div className="fw-bold small text-main">{sub.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`badge rounded-pill px-2 py-1 fw-bold tracking-tighter ${isDarkMode ? 'bg-white bg-opacity-5 text-muted' : 'bg-gray-50 text-muted'}`} style={{fontSize: '9px'}}>
                                                    {sub.role?.name || sub.roleName || sub.role || 'ASSOCIATE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-end">
                                                <div className="d-flex align-items-center justify-content-end gap-3">
                                                    <input 
                                                        type="number" 
                                                        className={`form-control form-control-sm text-end fw-black rounded-2 p-2 transition-all ${!editMode ? 'bg-transparent border-transparent cursor-default text-main' : (isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-10 text-main' : 'bg-gray-50 bg-opacity-30 border-gray-100')}`}
                                                        style={{width: '110px', fontSize: '12px'}} 
                                                        value={distributions[sub.id] || ''} 
                                                        onChange={e => setDistributions({...distributions, [sub.id]: e.target.value})} 
                                                        readOnly={!editMode}
                                                    />
                                                    <button onClick={() => { setHistoryUser(sub); setShowHistory(true); }} className="btn btn-link btn-sm text-muted p-0 opacity-25 hover-opacity-100"><History size={14}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className={`p-4 border-top d-flex gap-3 bg-card ${isDarkMode ? 'border-white border-opacity-5' : 'border-gray-50'}`}>
                                {editMode ? (
                                    <button 
                                        onClick={handleBulkSave} 
                                        disabled={isSaving || !isBalanced} 
                                        className={`btn btn-primary w-100 py-3 rounded-pill fw-black text-uppercase tracking-[0.1em] small shadow-sm ${(!isBalanced || isSaving) ? 'opacity-25' : ''}`}
                                    >
                                        {isSaving ? 'SYNCHRONIZING...' : 'COMMIT ALLOCATIONS'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setEditMode(true)} 
                                        className={`btn w-100 py-3 rounded-pill fw-black text-uppercase tracking-[0.1em] small ${isDarkMode ? 'btn-outline-light border-opacity-20' : 'btn-outline-primary'}`}
                                    >
                                        EDIT ALLOCATIONS
                                    </button>
                                )}
                            </div>
                        </div>
                </div>
            </div>

            {showHistory && historyUser && (
                <TargetHistoryModal isOpen={showHistory} user={historyUser} onClose={() => setShowHistory(false)} />
            )}
        </div>
    );
};

export default TargetDistributionHub;
