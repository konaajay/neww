import React, { useState } from 'react';
import { X, Calendar, AlignLeft, User, Target, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import taskService from '../services/taskService';
import { useTheme } from '../context/ThemeContext';

const ManualTaskModal = ({ show, onClose, onTaskCreated, leads, initialData }) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    dueDate: initialData.dueDate || ''
  } : {
    leadId: '',
    title: '',
    description: '',
    dueDate: '',
    taskType: 'FOLLOW_UP'
  });

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.mobile?.includes(searchTerm)
  );

  const selectedLead = leads.find(l => l.id === formData.leadId);

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        dueDate: initialData.dueDate || ''
      });
    }
  }, [initialData]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const taskPayload = {
        title: formData.title,
        description: formData.description,
        taskType: formData.taskType,
        dueDate: formData.dueDate ? `${formData.dueDate}T09:00:00` : null
      };

      if (!taskPayload.dueDate) {
        toast.error('Please select a schedule date');
        return;
      }

      await taskService.createTask(formData.leadId, taskPayload);
      toast.success('Task scheduled successfully');
      onTaskCreated();
      onClose();
    } catch (err) {
      toast.error('Failed to schedule task');
    } finally {
      setLoading(false);
    }
  };

  const setQuickDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFormData({ ...formData, dueDate: d.toISOString().split('T')[0] });
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 11000 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '650px' }}>
        <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden bg-card" style={{ color: 'var(--text-main)' }}>

          {/* Header */}
          <div className="modal-header border-bottom border-secondary border-opacity-10 bg-surface bg-opacity-30 p-4 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <Calendar size={20} className="text-primary opacity-75" />
              <div>
                <h4 className="fw-black text-main mb-0 tracking-tight" style={{ fontSize: '1.25rem' }}>Schedule Activity</h4>
                <p className="text-muted small fw-bold mb-0 text-uppercase tracking-widest" style={{ fontSize: '8px' }}>Manual Ledger Entry</p>
              </div>
            </div>
            <button 
              type="button" 
              className="btn btn-link text-muted p-2 rounded-circle hover-bg-surface transition-all border-0 outline-none shadow-none" 
              onClick={onClose}
              style={{ marginTop: '-10px', marginRight: '-10px' }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body p-4 p-md-5">
            <form onSubmit={handleSubmit} className="d-flex flex-column gap-4">

              {/* Searchable Lead Selection */}
              <div className="position-relative">
                <div className="form-floating h-100">
                  <input
                    type="text"
                    className={`form-control ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-4 px-4 shadow-none rounded-4 focus:border-primary transition-all custom-input h-100 fw-bold`}
                    placeholder="Search Leads..."
                    value={showDropdown ? searchTerm : (selectedLead ? `${selectedLead.name} (${selectedLead.email || 'No email'})` : '')}
                    onFocus={() => {
                        setShowDropdown(true);
                        setSearchTerm('');
                    }}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    required={!formData.leadId}
                    style={{ minHeight: '70px' }}
                    autoComplete="off"
                  />
                  <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-4 pt-4`} style={{ fontSize: '10px' }}>
                    {formData.leadId ? 'Linked Student / Lead' : 'Search & Select Lead'}
                  </label>
                </div>

                {showDropdown && (
                  <div 
                    className="position-absolute w-100 mt-2 shadow-2xl rounded-4 overflow-hidden animate-slide-down"
                    style={{ 
                        zIndex: 1000, 
                        maxHeight: '250px', 
                        overflowY: 'auto',
                        background: isDarkMode ? 'rgba(17, 24, 39, 0.98)' : '#ffffff',
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                    }}
                  >
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map(l => (
                        <div 
                          key={l.id}
                          className={`p-3 cursor-pointer transition-all ${formData.leadId === l.id ? 'bg-primary bg-opacity-20 text-primary' : 'hover:bg-surface text-main'}`}
                          onClick={() => {
                            setFormData({ ...formData, leadId: l.id });
                            setShowDropdown(false);
                            setSearchTerm('');
                          }}
                          style={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}
                        >
                          <div className="fw-black small">{l.name}</div>
                          <div className="text-muted small opacity-50" style={{ fontSize: '10px' }}>{l.email || 'No email'} • {l.mobile || 'No contact'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted small fw-bold opacity-50">NO ENTITIES MATCH SEARCH PROTOCOL</div>
                    )}
                  </div>
                )}
                
                {/* Click outside to close dropdown mask */}
                {showDropdown && (
                    <div 
                        className="position-fixed top-0 start-0 w-100 h-100" 
                        style={{ zIndex: -1 }} 
                        onClick={() => setShowDropdown(false)}
                    />
                )}
              </div>

              {/* Objective & Classification */}
              <div className="row g-4">
                <div className="col-12 col-md-7">
                  <div className="form-floating">
                    <input
                      type="text"
                      className={`form-control ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-4 px-4 shadow-none rounded-4 focus:border-primary transition-all custom-input fw-black`}
                      placeholder="Objective"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      style={{ minHeight: '75px' }}
                    />
                    <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-4 pt-4`} style={{ fontSize: '10px' }}>Objective / Title</label>
                  </div>
                </div>
                <div className="col-12 col-md-5">
                  <div className="form-floating">
                    <select
                      className={`form-select ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-4 px-4 shadow-none rounded-4 focus:border-primary transition-all custom-input fw-bold`}
                      value={formData.taskType}
                      onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                      style={{ minHeight: '75px' }}
                    >
                      <option value="FOLLOW_UP" className="bg-card">Follow-up</option>
                      <option value="EMI_COLLECTION" className="bg-card">EMI Collection</option>
                      <option value="INVITATION" className="bg-card">Invitation</option>
                      <option value="CLOSING" className="bg-card">Closing</option>
                    </select>
                    <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-4 pt-4`} style={{ fontSize: '10px' }}>Classification</label>
                  </div>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                 <div className="form-floating mb-3">
                  <input
                    type="date"
                    className={`form-control ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-4 px-4 shadow-none rounded-4 focus:border-primary transition-all custom-input h-auto fw-black`}
                    value={formData.dueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    style={{ colorScheme: isDarkMode ? 'dark' : 'light', minHeight: '70px' }}
                    required
                  />
                  <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-4 pt-4`} style={{ fontSize: '10px' }}>Scheduled Target Date</label>
                </div>
                <div className="d-flex gap-2 flex-wrap ps-2">
                  <button type="button" onClick={() => setQuickDate(0)} className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-black small border-opacity-25" style={{fontSize: '10px'}}>Today</button>
                  <button type="button" onClick={() => setQuickDate(1)} className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-black small border-opacity-25" style={{fontSize: '10px'}}>Tomorrow</button>
                  <button type="button" onClick={() => setQuickDate(7)} className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-black small border-opacity-25" style={{fontSize: '10px'}}>Next Week</button>
                </div>
              </div>

              {/* Description */}
              <div className="form-floating">
                <textarea
                  className={`form-control ${isDarkMode ? 'bg-dark bg-opacity-40 border-white border-opacity-10 text-main' : 'bg-light border-dark border-opacity-10 text-dark'} py-4 px-4 shadow-none rounded-4 focus:border-primary transition-all custom-input fw-bold`}
                  placeholder="Notes"
                  style={{ height: '120px' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <label className={`${isDarkMode ? 'text-muted' : 'text-slate-500'} fw-bold small text-uppercase tracking-widest opacity-50 ps-4 pt-3`} style={{ fontSize: '10px' }}>Strategy / Evolution Notes</label>
              </div>

              <button
                type="submit"
                className={`ui-btn ui-btn-primary w-100 py-4 rounded-pill fw-black text-uppercase d-flex align-items-center justify-content-center gap-3 shadow-glow transition-all ${loading ? 'opacity-50' : 'hover-scale'}`}
                style={{ letterSpacing: '4px', fontSize: '13px', minHeight: '70px' }}
                disabled={loading}
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {loading ? 'COMMITTING TO LEDGER...' : 'COMMIT TO SCHEDULE'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`
        .premium-modal-card { background: rgba(13, 17, 23, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .premium-input-group { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; display: flex; align-items: center; }
        .premium-input-group.focused { border-color: #6366f1; background: rgba(99, 102, 241, 0.05); }
        .btn-close-custom { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-close-custom:hover { background: #ef4444; border-color: #ef4444; transform: rotate(90deg); }
        .search-dropdown-overlay { position: absolute; top: 100%; left: 0; right: 0; background: #1a1f2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; margin-top: 8px; z-index: 1000; overflow: hidden; }
        .dropdown-item-custom { padding: 12px 20px; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .dropdown-item-custom:hover { background: rgba(99, 102, 241, 0.1); }
        .dropdown-item-custom.active { background: rgba(99, 102, 241, 0.2); border-left: 4px solid #6366f1; }
        .avatar-sm { width: 32px; height: 32px; font-size: 11px; }
        .quick-date-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #6366f1; font-weight: 900; font-size: 10px; padding: 6px 16px; border-radius: 100px; text-transform: uppercase; transition: all 0.2s; }
        .quick-date-btn:hover { background: #6366f1; color: white; transform: translateY(-2px); }
        .btn-sync-action { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-sync-action:hover { transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.5); }
        .btn-sync-action:active { transform: translateY(0); }
        .animate-slide-down { animation: slideDown 0.3s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .rotate-180 { transform: rotate(180deg); }
      `}</style>
    </div>
  );
};

export default ManualTaskModal;
