import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare,
  Filter,
  MoreVertical,
  ChevronRight,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const TicketManager = ({ role, userId, memberIds = [] }) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('ledger'); // 'ledger' or 'raise'
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'System/Technical',
    priority: 'Medium',
    description: ''
  });

  const isAdmin = role === 'ADMIN';

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = isAdmin ? await ticketService.getAllTickets() : await ticketService.getMyTickets();
      
      let data = res.data;
      if (isAdmin && userId) {
        data = data.filter(t => 
          t.createdBy?.id == userId || 
          memberIds.some(id => id == t.createdBy?.id)
        );
      }
      
      setTickets(data);
    } catch (err) {
      toast.error('Failed to sync ticket ledger');
    } finally {
      setLoading(false);
    }
  };

  const memberIdsKey = JSON.stringify(memberIds);

  useEffect(() => {
    fetchTickets();
  }, [isAdmin, userId, memberIdsKey]);

  const handleRaiseTicket = async (e) => {
    e.preventDefault();
    try {
      await ticketService.createTicket(newTicket);
      toast.success('Ticket Transmission Successful');
      setNewTicket({ subject: '', category: 'System/Technical', priority: 'Medium', description: '' });
      setView('ledger');
      await fetchTickets();
    } catch (err) {
      toast.error('Transmission Blocked');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await ticketService.updateStatus(id, status);
      toast.success(`Ticket #${id} status synchronized to ${status}`);
      fetchTickets();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const getPriorityBadge = (p) => {
    const colors = { LOW: 'bg-info', MEDIUM: 'bg-warning', HIGH: 'bg-danger', URGENT: 'bg-danger shadow-glow-danger' };
    return <span className={`ui-badge ${colors[p] || 'bg-surface'} text-white border-0 fw-black shadow-none`} style={{ fontSize: '8px' }}>{p}</span>;
  };

  const getStatusBadge = (s) => {
    const colors = { OPEN: 'bg-primary text-primary', IN_PROGRESS: 'bg-warning text-warning', RESOLVED: 'bg-success text-success', CLOSED: 'bg-surface text-muted' };
    return <span className={`ui-badge ${colors[s]} bg-opacity-10 border border-current border-opacity-10 fw-black`} style={{ fontSize: '9px' }}>{s?.replace('_', ' ')}</span>;
  };

  const textClass = isDarkMode ? 'text-white' : 'text-dark';
  const borderClass = isDarkMode ? 'border-white border-opacity-10' : 'border-dark border-opacity-10';
  const cardBg = isDarkMode ? 'bg-surface bg-opacity-10' : 'bg-white shadow-sm';

  if (view === 'raise') {
    return (
      <div className={`animate-fade-in d-flex flex-column gap-4 min-vh-100 p-2 ${isDarkMode ? '' : 'text-dark'}`}>
         <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
               <h3 className={`fw-black ${isDarkMode ? 'text-main' : 'text-dark'} text-uppercase tracking-widest mb-1`}>Initialize Ticket Lead</h3>
               <p className="text-muted fw-bold opacity-50 small mb-0">ESTABLISHING DIRECT CONNECTION WITH STRATEGIC SUPPORT</p>
            </div>
            <button 
              onClick={() => setView('ledger')}
              className="ui-btn ui-btn-outline px-4 rounded-pill small fw-black text-uppercase tracking-wider"
              style={{ fontSize: '10px' }}
            >
              ← BACK TO LEDGER
            </button>
         </div>

         <div className="row g-4 justify-content-center">
            <div className="col-12 col-xl-8">
               <div className={`premium-card p-5 border-0 ${cardBg} rounded-5`}>
                  <form onSubmit={handleRaiseTicket} className="d-flex flex-column gap-4">
                     <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <label className="small fw-black text-primary text-uppercase tracking-widest opacity-75 mb-3 d-block" style={{ fontSize: '10px' }}>Issue Synopsis</label>
                        <input 
                           className={`form-control bg-transparent ${borderClass} ${textClass} py-3 px-4 shadow-none rounded-4 focus:border-primary transition-all`}
                           placeholder="Enter high-level issue summary..."
                           required
                           value={newTicket.subject}
                           onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        />
                     </div>

                     <div className="row g-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="col-md-6">
                           <label className="small fw-black text-info text-uppercase tracking-widest opacity-75 mb-3 d-block" style={{ fontSize: '10px' }}>Category Select</label>
                           <select 
                              className={`form-select bg-transparent ${borderClass} ${textClass} py-3 px-4 shadow-none rounded-4 focus:border-primary transition-all`}
                              value={newTicket.category}
                              onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                           >
                              <option className={isDarkMode ? "bg-dark text-white" : "bg-white text-dark"} value="System/Technical">System/Technical</option>
                              <option className={isDarkMode ? "bg-dark text-white" : "bg-white text-dark"} value="Operational">Operational</option>
                              <option className={isDarkMode ? "bg-dark text-white" : "bg-white text-dark"} value="Financial">Financial</option>
                              <option className={isDarkMode ? "bg-dark text-white" : "bg-white text-dark"} value="Account/Access">Account/Access</option>
                           </select>
                        </div>
                        <div className="col-md-6">
                           <label className="small fw-black text-warning text-uppercase tracking-widest opacity-75 mb-3 d-block" style={{ fontSize: '10px' }}>Priority Level</label>
                           <select 
                              className={`form-select bg-transparent ${borderClass} ${textClass} py-3 px-4 shadow-none rounded-4 focus:border-primary transition-all`}
                              value={newTicket.priority}
                              onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                           >
                              <option className={isDarkMode ? "bg-dark text-white" : "bg-white text-dark"} value="Low">Standard Level</option>
                              <option className={isDarkMode ? "bg-dark text-white" : "bg-white text-dark"} value="Medium">Elevated Level</option>
                              <option className={isDarkMode ? "bg-dark text-white" : "bg-white text-dark"} value="High">Critical Priority</option>
                              <option className={isDarkMode ? "bg-dark text-white" : "bg-white text-dark"} value="Urgent">Immediate Action</option>
                           </select>
                        </div>
                     </div>

                     <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <label className={`small fw-black ${isDarkMode ? 'text-main' : 'text-dark-50'} text-uppercase tracking-widest opacity-50 mb-3 d-block`} style={{ fontSize: '10px' }}>Detailed Intelligence</label>
                        <textarea 
                           className={`form-control bg-transparent ${borderClass} ${textClass} py-3 px-4 shadow-none rounded-4 focus:border-primary transition-all`}
                           rows="6" 
                           placeholder="Provide exhaustive details about the operational block..."
                           required
                           value={newTicket.description}
                           onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                        ></textarea>
                     </div>

                     <div className="mt-2 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <button 
                           type="submit" 
                           className="ui-btn ui-btn-primary w-100 py-3 rounded-pill fw-black text-uppercase tracking-widest shadow-glow"
                        >
                           Initialize Ticket Lead
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 animate-fade-in">
      {/* Header Area */}
      <div className="d-flex justify-content-between align-items-center mb-4 px-1">
        <div>
          <h4 className="fw-black text-main mb-1 text-uppercase tracking-widest">Support Ledger</h4>
          <p className="text-muted small fw-bold opacity-75 mb-0">System tickets & operational assistance requests</p>
        </div>
        <button 
          onClick={() => setView('raise')}
          className="btn btn-primary d-flex align-items-center gap-2 rounded-pill shadow-glow px-4 fw-black text-uppercase small"
        >
          <Plus size={18} /> Raise Ticket
        </button>
      </div>

      {/* Stats Summary Area */}
      <div className="row g-3 mb-4">
          <div className="col-md-3">
              <div className="premium-card p-3 border-0 shadow-lg bg-surface h-100">
                  <div className="small fw-black text-muted text-uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: '8px' }}>Active Tickets</div>
                  <div className="fs-4 fw-black text-main">{tickets.filter(t => t.status !== 'CLOSED').length}</div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="premium-card p-3 border-0 shadow-lg bg-surface h-100">
                  <div className="small fw-black text-muted text-uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: '8px' }}>Resolved Today</div>
                  <div className="fs-4 fw-black text-success tabular-nums">{tickets.filter(t => t.status === 'RESOLVED').length}</div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="premium-card p-3 border-0 shadow-lg bg-surface h-100">
                  <div className="small fw-black text-muted text-uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: '8px' }}>Critical Response</div>
                  <div className="fs-4 fw-black text-danger tabular-nums">{tickets.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length}</div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="premium-card p-3 border-0 shadow-lg bg-surface h-100">
                  <div className="small fw-black text-muted text-uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: '8px' }}>System Efficiency</div>
                  <div className="fs-4 fw-black text-primary">High</div>
              </div>
          </div>
      </div>

      {/* Ticket List Area */}
      <div className="premium-card border-0 shadow-lg overflow-hidden bg-surface">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-surface bg-opacity-30 border-bottom border-white border-opacity-5">
              <tr>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Index Lead</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest" style={{ fontSize: '10px' }}>Subject & Intel</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-center" style={{ fontSize: '10px' }}>Priority</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-center" style={{ fontSize: '10px' }}>Identity</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-center" style={{ fontSize: '10px' }}>Status</th>
                <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-end" style={{ fontSize: '10px' }}>Transmission</th>
                {isAdmin && <th className="px-4 py-3 small fw-black text-muted text-uppercase tracking-widest text-end" style={{ fontSize: '10px' }}>Protocol</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    <span className="text-muted fw-bold small opacity-75">POLING TICKET CLOUD...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="opacity-25 py-4">
                       <CheckCircle size={48} className="text-muted mb-2" />
                       <div className="fw-black text-muted text-uppercase small">Zero active leads in the support spectrum</div>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((t, idx) => (
                  <tr key={t.id} className="border-bottom border-white border-opacity-5 transition-smooth hover-bg-surface-light">
                    <td className="px-4 py-4 text-muted small fw-bold">#{t.id.toString().padStart(4, '0')}</td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="fw-black text-main small text-uppercase mb-1">{t.subject}</div>
                        <div className="small text-muted fw-bold opacity-50 text-truncate" style={{ maxWidth: '250px' }}>{t.description}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getPriorityBadge(t.priority)}
                    </td>
                    <td className="px-4 py-4 text-center">
                       <div className="d-flex flex-column align-items-center">
                          <span className="small fw-black text-main">{t.createdBy?.name || 'UNKNOWN'}</span>
                          <span className="text-muted fw-bold opacity-50" style={{ fontSize: '8px' }}>{t.createdBy?.role?.name || t.createdBy?.role || 'ASSOCIATE'}</span>
                       </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="px-4 py-4 text-end">
                       <div className="d-flex flex-column align-items-end">
                          <span className="small fw-black text-muted mb-1 tabular-nums">{new Date(t.createdAt).toLocaleDateString()}</span>
                          <span className="text-muted fw-bold opacity-25" style={{ fontSize: '8px' }}>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-4 text-end">
                        <div className="dropdown">
                          <button className="btn btn-link p-0 text-muted opacity-50 hover-opacity-100" type="button" data-bs-toggle="dropdown">
                             <MoreVertical size={16} />
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end bg-surface border-white border-opacity-10 shadow-lg">
                             <li><button className="dropdown-item small fw-bold text-warning" onClick={() => updateStatus(t.id, 'IN_PROGRESS')}>In Progress</button></li>
                             <li><button className="dropdown-item small fw-bold text-success" onClick={() => updateStatus(t.id, 'RESOLVED')}>Resolve</button></li>
                             <li><button className="dropdown-item small fw-bold text-muted" onClick={() => updateStatus(t.id, 'CLOSED')}>Close</button></li>
                          </ul>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TicketManager;
