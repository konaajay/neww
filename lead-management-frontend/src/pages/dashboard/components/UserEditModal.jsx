import React from 'react';
import { ShieldHalf, X, ShieldCheck, Key, RefreshCw, Send } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-toastify';
import adminService from '../../../services/adminService';

const UserEditModal = ({ 
  isOpen, 
  onClose, 
  user, 
  setUser, 
  onSubmit, 
  roles = [], 
  permissions = [],
  teamLeaders = [],
  shifts = [],
  offices = []
}) => {
  const { isDarkMode } = useTheme();
  const [showOtpPanel, setShowOtpPanel] = React.useState(false);
  const [resetData, setResetData] = React.useState({ otp: '', newPassword: '', serverOtp: '' });
  const [isGenerating, setIsGenerating] = React.useState(false);

  if (!isOpen || !user) return null;

  // Defensive safety guards to prevent crashes if props are not arrays
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeRoles = Array.isArray(roles) ? roles : [];
  const safePermissions = Array.isArray(permissions) ? permissions : [];
  const safeTeamLeaders = Array.isArray(teamLeaders) ? teamLeaders : [];
  const safeOffices = Array.isArray(offices) ? offices : [];

  const isAllSelected = safePermissions.length > 0 && (user.permissions || []).length === safePermissions.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setUser(prev => ({ ...prev, permissions: [...safePermissions] }));
      toast.info("All Shield Nodes synchronized", { autoClose: 800 });
    } else {
      setUser(prev => ({ ...prev, permissions: [] }));
      toast.warning("All Shield Nodes deauthorized", { autoClose: 800 });
    }
  };

  const selectedShift = safeShifts.find(s => s?.id === user.shiftId);

  const handleGenerateOtp = async () => {
    setIsGenerating(true);
    try {
      const res = await adminService.generateResetOtp(user.id);
      setResetData(prev => ({ ...prev, serverOtp: res.data.otp }));
      setShowOtpPanel(true);
      toast.success("Security OTP Generated! Share this with the user.");
    } catch (err) {
      toast.error("Failed to initiate security handshake.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (!resetData.otp || !resetData.newPassword) {
      toast.warning("Complete security fields first.");
      return;
    }
    try {
      await adminService.verifyResetOtp(user.id, resetData.otp, resetData.newPassword);
      toast.success("User Access Key Synchronized!");
      setShowOtpPanel(false);
      setResetData({ otp: '', newPassword: '', serverOtp: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid Security Token.");
    }
  };

  return (
    <div 
      className="modal show d-block animate-fade-in" 
      tabIndex="-1" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)', 
        backdropFilter: 'blur(10px)', 
        zIndex: 1100005,
        pointerEvents: 'all',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(var(--bs-primary-rgb), 0.3); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(var(--bs-primary-rgb), 0.6); }
      `}</style>
      <div className="modal-dialog modal-lg my-md-5 my-2 mx-auto" style={{ pointerEvents: 'all', maxWidth: '95%', width: '750px' }}>
        <div className="premium-card shadow-lg border-0 rounded-4 bg-card" style={{ width: '100%', position: 'relative', zIndex: 1100010 }}>
          <div className="modal-header p-3 p-md-4 border-0 d-flex align-items-center justify-content-between border-bottom border-white border-opacity-5">
            <div className="d-flex align-items-center gap-2 gap-md-3">
              <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle shadow-glow d-none d-sm-block">
                <ShieldHalf size={24} />
              </div>
              <div>
                <h6 className="fw-black text-main mb-0 text-uppercase tracking-widest fs-6">Edit Staff Profile</h6>
                <small className="text-muted fw-bold opacity-50 text-uppercase d-block" style={{ fontSize: '7px', letterSpacing: '1px' }}>Operational Node Reconfiguration</small>
              </div>
            </div>
            <button type="button" className="btn btn-link p-0 text-muted shadow-none border-0 transition-all hover-scale" onClick={onClose}><X size={20}/></button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body p-3 p-md-4 custom-scroll" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="row g-3 g-md-4">
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-black text-uppercase text-muted mb-1 tracking-widest" style={{ fontSize: '9px' }}>Full Name</label>
                  <input 
                    type="text" 
                    className="form-control border border-white border-opacity-10 shadow-none bg-surface text-main fw-bold py-2 rounded-3" 
                    value={user.name || ''}
                    onChange={(e) => setUser(prev => ({...prev, name: e.target.value}))}
                    required
                  />
                </div>
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-black text-uppercase text-muted mb-1 tracking-widest" style={{ fontSize: '9px' }}>Official Email (Identification)</label>
                  <input 
                    type="email" 
                    className="form-control border border-white border-opacity-10 shadow-none bg-surface text-main fw-bold py-2 rounded-3" 
                    value={user.email || ''}
                    readOnly
                    disabled
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label small fw-black text-uppercase text-muted mb-1 tracking-widest" style={{ fontSize: '9px' }}>Role</label>
                  <select 
                    className="form-select border border-white border-opacity-10 shadow-none fw-bold bg-surface text-main py-2 rounded-3"
                    value={user.role || ''}
                    onChange={(e) => setUser(prev => ({...prev, role: e.target.value}))}
                    required
                  >
                    {safeRoles.map(role => (
                      <option key={role.id} value={role.name}>{role.name.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-black text-uppercase text-muted mb-1 tracking-widest" style={{ fontSize: '9px' }}>Phone Number</label>
                  <input 
                    type="text" 
                    className="form-control border border-white border-opacity-10 shadow-none bg-surface text-main fw-bold py-2 rounded-3" 
                    value={user.mobile || ''}
                    onChange={(e) => setUser(prev => ({...prev, mobile: e.target.value}))}
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-black text-uppercase text-muted mb-1 tracking-widest" style={{ fontSize: '9px' }}>Reports To</label>
                  <select 
                    className="form-select border border-white border-opacity-10 shadow-none fw-bold bg-surface text-main py-2 rounded-3"
                    value={user.supervisorId || ''}
                    onChange={(e) => setUser(prev => ({...prev, supervisorId: e.target.value ? parseInt(e.target.value) : null}))}
                  >
                    <option value="">Independent Operator</option>
                    {safeTeamLeaders.filter(tl => {
                      if (user.role === 'ASSOCIATE') return tl.role === 'TEAM_LEADER';
                      if (user.role === 'TEAM_LEADER') return tl.role === 'MANAGER';
                      if (user.role === 'MANAGER') return tl.role === 'ADMIN' || tl.role === 'MANAGER';
                      return false;
                    })
                    .filter(tl => tl.id !== user.id)
                    .map(tl => (
                      <option key={tl.id} value={tl.id}>{tl.name} ({tl.role})</option>
                    ))}
                  </select>
                </div>



              </div>
            </div>
            <div className="modal-footer border-0 p-3 p-md-4 d-flex flex-column flex-sm-row justify-content-end gap-2 gap-md-3 bg-card border-top border-white border-opacity-5">
              <button type="button" className="btn btn-link text-muted fw-black text-uppercase text-decoration-none small tracking-widest p-0 transition-all hover-white order-2 order-sm-1" onClick={onClose}>Abort</button>
              <button type="submit" className="btn btn-primary fw-black text-uppercase px-5 shadow-glow rounded-pill py-2.5 transition-all hover-scale order-1 order-sm-2 w-100 w-sm-auto">Sync profile</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserEditModal;
