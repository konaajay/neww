import React, { useState, useCallback, useRef } from 'react';
import {
    Download, FileSpreadsheet, Users, User,
    Calendar, RefreshCcw, TrendingUp, Target,
    CheckCircle, XCircle, AlertCircle, ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import api, { safeRequest } from '../../../api/api';
import adminService from '../../../services/adminService';
import { useTheme } from '../../../context/ThemeContext';

// ── helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

function toISO(y, m, d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
}

function downloadCSV(filename, rows) {
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function fmt(n) {
    if (n === undefined || n === null) return '0';
    return Number(n).toLocaleString('en-IN');
}

function fmtCurrency(n) {
    if (!n) return '₹0';
    return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// ── component ─────────────────────────────────────────────────────────────────

const MonthlyReportDownload = ({ role }) => {
    const { isDarkMode } = useTheme();
    const monthInputRef = useRef(null);
    const now = new Date();

    const [year,    setYear]    = useState(now.getFullYear());
    const [month,   setMonth]   = useState(now.getMonth() + 1); // 1-based
    const [loading, setLoading] = useState(false);
    const [rows,    setRows]    = useState(null); // { users: [...], totals: {...} }

    // ── fetch ─────────────────────────────────────────────────────────────────

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setRows(null);
        try {
            const from = toISO(year, month, 1);
            const to   = toISO(year, month, daysInMonth(year, month));

            // 1. fetch users based on role
            let allUsers = [];
            if (role === 'admin' || role === 'SUPER_ADMIN') {
                const usersRes = await adminService.fetchUsers();
                allUsers = (usersRes?.content ?? usersRes ?? []);
            } else {
                // For Managers & TLs, use hierarchical endpoint
                const treeRes = await safeRequest(api.get('/manager/team-tree'));
                let rawTree = Array.isArray(treeRes) ? treeRes : (treeRes?.data || treeRes?.content || []);
                
                // Fallback for Manager: if team-tree is empty, try team-leaders
                if (rawTree.length === 0) {
                    const fbRes = await safeRequest(api.get('/manager/team-leaders'));
                    rawTree = Array.isArray(fbRes) ? fbRes : (fbRes?.data || fbRes?.content || []);
                }
                
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
                allUsers = flattenTree(rawTree);
            }

            allUsers = allUsers
                .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i) // deduplicate
                .filter(u => !String(u.role || '').toUpperCase().includes('ADMIN'))
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // 2. stats per user
            const userRows = await Promise.all(allUsers.map(async u => {
                try {
                    const res = await safeRequest(
                        api.get('/reports/stats', { params: { from, to, userId: u.id } })
                    );
                    return { user: u, stats: res ?? {} };
                } catch {
                    return { user: u, stats: {} };
                }
            }));

            // 3. team totals — hierarchical aggregation
            const teamMap = {};
            userRows.forEach(({ user, stats }) => {
                const teamsToAddTo = new Set();
                
                // 1. If user is a leader, they are the head of their own team
                const roleStr = String(user.role || '').toUpperCase();
                if (roleStr.includes('MANAGER') || roleStr.includes('TEAM_LEADER')) {
                    teamsToAddTo.add(user.name);
                }
                
                // 2. Add to supervisor's team
                if (user.supervisorName && !user.supervisorName.toUpperCase().includes('ADMIN')) {
                    teamsToAddTo.add(user.supervisorName);
                }
                
                // 3. Add to manager's team
                if (user.managerName && !user.managerName.toUpperCase().includes('ADMIN')) {
                    teamsToAddTo.add(user.managerName);
                }

                teamsToAddTo.forEach(teamKey => {
                    if (!teamKey) return;
                    if (!teamMap[teamKey]) {
                        teamMap[teamKey] = { teamName: teamKey, members: 0, total: 0, converted: 0, lost: 0, revenue: 0 };
                    }
                    const t = teamMap[teamKey];
                    t.members   += 1;
                    t.total     += stats.total     ?? 0;
                    t.converted += stats.convertedCount ?? 0;
                    t.lost      += stats.lostCount      ?? 0;
                    t.revenue   += stats.totalRevenue   ?? 0;
                });
            });

            setRows({ users: userRows, teams: Object.values(teamMap), from, to });
        } catch (err) {
            toast.error('Failed to load report data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    // ── download helpers ───────────────────────────────────────────────────────

    const downloadIndividual = () => {
        if (!rows) return;
        const header = ['#','Employee','Role','Team/TL','Total Leads','New','Contacted','Interested','Follow-Up','Converted','Lost','Closed','Revenue (₹)'];
        const data = rows.users.map(({ user, stats }, i) => [
            i + 1,
            user.name || '',
            (user.role || '').replace('ROLE_',''),
            user.supervisorName || user.managerName || 'Unassigned',
            stats.total          ?? 0,
            stats.newCount       ?? 0,
            stats.contactedCount ?? 0,
            stats.interestedCount?? 0,
            stats.followUpCount  ?? 0,
            stats.convertedCount ?? 0,
            stats.lostCount      ?? 0,
            stats.closedCount    ?? 0,
            stats.totalRevenue   ?? 0
        ]);
        downloadCSV(
            `Individual_Sales_Report_${MONTHS[month-1]}_${year}.csv`,
            [header, ...data]
        );
        toast.success('Individual report downloaded!');
    };

    const downloadTeam = () => {
        if (!rows) return;
        const header = ['#','Team / Team Leader','Members','Total Leads','Converted','Lost','Revenue (₹)','Conversion %'];
        const data = rows.teams
            .filter(t => !t.teamName.toUpperCase().includes('ADMIN'))
            .map((t, i) => [
            i + 1,
            t.teamName,
            t.members,
            t.total,
            t.converted,
            t.lost,
            t.revenue.toFixed(0),
            t.total > 0 ? ((t.converted / t.total) * 100).toFixed(1) + '%' : '0%'
        ]);
        downloadCSV(
            `Team_Sales_Report_${MONTHS[month-1]}_${year}.csv`,
            [header, ...data]
        );
        toast.success('Team report downloaded!');
    };

    // ── render ─────────────────────────────────────────────────────────────────

    const cardBg = isDarkMode
        ? 'bg-dark bg-opacity-50 border border-white border-opacity-10'
        : 'bg-white border border-light';

    return (
        <div className="p-4">

            {/* Header */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h5 className="fw-black text-main text-uppercase tracking-widest mb-1" style={{ fontSize: '13px' }}>
                        Monthly Sales Report
                    </h5>
                    <p className="text-muted small mb-0 fw-bold" style={{ fontSize: '11px' }}>
                        Download individual &amp; team performance for any month
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                    {/* Unified Month/Year Native Picker with Bulletproof Icon */}
                    <div 
                        className={`position-relative rounded-pill shadow-sm d-flex align-items-center ${isDarkMode ? 'bg-dark text-white' : 'bg-light text-dark'}`} 
                        style={{ minWidth: '160px', height: '36px', cursor: 'pointer' }}
                        onClick={() => monthInputRef.current?.showPicker()}
                    >
                        <input 
                            ref={monthInputRef}
                            type="month"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-form-type="other"
                            autoComplete="off"
                            className="form-control form-control-sm fw-bold border-0 bg-transparent h-100 w-100"
                            style={{ fontSize: '11px', paddingLeft: '15px', paddingRight: '40px', color: 'inherit', cursor: 'pointer' }}
                            value={`${year}-${String(month).padStart(2, '0')}`}
                            onChange={e => {
                                if (e.target.value) {
                                    const [y, m] = e.target.value.split('-');
                                    setYear(Number(y));
                                    setMonth(Number(m));
                                }
                            }}
                        />
                        <Calendar 
                            size={16} 
                            color="#00b4d8"
                            className="position-absolute" 
                            style={{ right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} 
                        />
                    </div>

                    {/* Load report */}
                    <button
                        className="btn btn-primary btn-sm rounded-pill px-4 fw-black"
                        style={{ fontSize: '11px', height: '36px', background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', border: 'none' }}
                        onClick={fetchReport}
                        disabled={loading}
                    >
                        {loading ? <><span className="spinner-border spinner-border-sm me-2" />Loading...</> : <><RefreshCcw size={12} className="me-2" />LOAD REPORT</>}
                    </button>
                </div>
            </div>

            {/* Download Buttons — only show when data loaded */}
            {rows && (
                <div className="d-flex gap-3 mb-4 flex-wrap">
                    <button
                        className="btn btn-sm rounded-pill px-4 fw-black text-white d-flex align-items-center gap-2"
                        style={{ fontSize: '11px', height: '36px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none' }}
                        onClick={downloadIndividual}
                    >
                        <User size={12} />
                        Download Individual CSV
                        <Download size={12} />
                    </button>
                    <button
                        className="btn btn-sm rounded-pill px-4 fw-black text-white d-flex align-items-center gap-2"
                        style={{ fontSize: '11px', height: '36px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', border: 'none' }}
                        onClick={downloadTeam}
                    >
                        <Users size={12} />
                        Download Team CSV
                        <Download size={12} />
                    </button>
                    <span className="text-muted small fw-bold align-self-center" style={{ fontSize: '11px' }}>
                        {MONTHS[month-1]} {year} &nbsp;·&nbsp; {rows.users.length} employees &nbsp;·&nbsp; {rows.teams.length} teams
                    </span>
                </div>
            )}

            {/* Individual Table */}
            {rows && (
                <>
                    <div className={`rounded-4 overflow-hidden mb-4 ${cardBg}`}>
                        <div className="px-4 py-3 border-bottom border-white border-opacity-5 d-flex align-items-center gap-2">
                            <User size={14} className="text-primary" />
                            <span className="fw-black text-main text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Individual Performance</span>
                        </div>
                        <div className="table-responsive">
                            <table className="table align-middle mb-0 border-0 bg-transparent text-main">
                                <thead>
                                    <tr className="border-bottom border-white border-opacity-5">
                                        {['Employee','Role','Team/TL','Leads','Converted','Lost','Revenue','Conv%'].map(h => (
                                            <th key={h} className="py-3 px-4 text-muted fw-black text-uppercase" style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.users.map(({ user, stats }, i) => {
                                        const conv = stats.convertedCount ?? 0;
                                        const total = stats.total ?? 0;
                                        const pct = total > 0 ? ((conv / total) * 100).toFixed(1) : '0.0';
                                        return (
                                            <tr key={user.id} className="border-bottom border-white border-opacity-5">
                                                <td className="py-3 px-4">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-black" style={{ width: 28, height: 28, fontSize: '10px' }}>
                                                            {(user.name ?? '?')[0].toUpperCase()}
                                                        </div>
                                                        <span className="fw-bold small">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="badge bg-secondary bg-opacity-10 text-muted border-0" style={{ fontSize: '9px' }}>
                                                        {(user.role ?? '').replace('ROLE_','')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-muted small fw-bold">
                                                    {user.supervisorName || user.managerName || '—'}
                                                </td>
                                                <td className="py-3 px-4 fw-black small">{fmt(total)}</td>
                                                <td className="py-3 px-4">
                                                    <span className="fw-black small text-success">{fmt(conv)}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="fw-black small text-danger">{fmt(stats.lostCount)}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="fw-black small text-warning">{fmtCurrency(stats.totalRevenue)}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="progress flex-grow-1" style={{ height: '4px', minWidth: '50px', background: 'var(--border-color)' }}>
                                                            <div className="progress-bar bg-success" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="fw-black text-muted" style={{ fontSize: '10px' }}>{pct}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Team Table */}
                    <div className={`rounded-4 overflow-hidden ${cardBg}`}>
                        <div className="px-4 py-3 border-bottom border-white border-opacity-5 d-flex align-items-center gap-2">
                            <Users size={14} className="text-purple" style={{ color: '#7c3aed' }} />
                            <span className="fw-black text-main text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>Team Performance</span>
                        </div>
                        <div className="table-responsive">
                            <table className="table align-middle mb-0 border-0 bg-transparent text-main">
                                <thead>
                                    <tr className="border-bottom border-white border-opacity-5">
                                        {['Team / Team Leader','Members','Total Leads','Converted','Lost','Revenue','Conv%'].map(h => (
                                            <th key={h} className="py-3 px-4 text-muted fw-black text-uppercase" style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.teams
                                        .filter(t => !t.teamName.toUpperCase().includes('ADMIN'))
                                        .sort((a, b) => b.revenue - a.revenue)
                                        .map((t, i) => {
                                        const pct = t.total > 0 ? ((t.converted / t.total) * 100).toFixed(1) : '0.0';
                                        return (
                                            <tr key={i} className="border-bottom border-white border-opacity-5">
                                                <td className="py-3 px-4">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-black text-white" style={{ width: 28, height: 28, fontSize: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                                            {(t.teamName ?? '?')[0].toUpperCase()}
                                                        </div>
                                                        <span className="fw-bold small">{t.teamName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 fw-black small text-muted">{t.members}</td>
                                                <td className="py-3 px-4 fw-black small">{fmt(t.total)}</td>
                                                <td className="py-3 px-4"><span className="fw-black small text-success">{fmt(t.converted)}</span></td>
                                                <td className="py-3 px-4"><span className="fw-black small text-danger">{fmt(t.lost)}</span></td>
                                                <td className="py-3 px-4"><span className="fw-black small text-warning">{fmtCurrency(t.revenue)}</span></td>
                                                <td className="py-3 px-4">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="progress flex-grow-1" style={{ height: '4px', minWidth: '50px', background: 'var(--border-color)' }}>
                                                            <div className="progress-bar" style={{ width: `${pct}%`, background: '#7c3aed' }} />
                                                        </div>
                                                        <span className="fw-black text-muted" style={{ fontSize: '10px' }}>{pct}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Empty state */}
            {!rows && !loading && (
                <div className={`rounded-4 p-5 text-center ${cardBg}`}>
                    <FileSpreadsheet size={40} className="text-muted opacity-30 mb-3" />
                    <p className="fw-black text-muted text-uppercase tracking-widest small opacity-50">
                        Select a month &amp; year, then click LOAD REPORT
                    </p>
                </div>
            )}
        </div>
    );
};

export default MonthlyReportDownload;
