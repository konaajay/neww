import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { X, Calendar, MessageSquare, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import associateService from '../services/associateService';

const StatusChangeModal = ({ isOpen, onClose, lead, newStatus, onUpdateSuccess }) => {
  const { isDarkMode } = useTheme();
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Update Lead Status
      await associateService.updateStatus(lead.id, newStatus, note);

      // 2. Create Task if date is provided
      if (followUpDate) {
        try {
          await associateService.addLeadTask(lead.id, {
            title: `Follow-up Required: ${newStatus}`,
            taskType: 'FOLLOW_UP',
            dueDate: followUpDate,
            description: note || `Scheduled follow-up for lead ${lead.name}`
          });
        } catch (taskErr) {
          console.error("Task creation failed:", taskErr);
          toast.warning("Status updated, but failed to create the calendar task.");
        }
      }

      toast.success('Status updated successfully');
      if (onUpdateSuccess) onUpdateSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bgClass = isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark';
  const borderClass = isDarkMode ? 'border-secondary border-opacity-25' : 'border-light';
  const inputBgClass = isDarkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary border-opacity-50' : 'bg-light border-light text-dark';

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
        <div className={`modal-content border-0 rounded-4 shadow-lg ${bgClass}`}>
          <div className="modal-header border-bottom border-secondary border-opacity-10 p-4">
            <h5 className="modal-title fw-black tracking-widest text-uppercase small d-flex align-items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              Update Status: <span className="text-primary">{newStatus}</span>
            </h5>
            <button type="button" className="btn-close btn-close-white opacity-50" onClick={onClose}></button>
          </div>
          
          <div className="modal-body p-4">
            <p className="text-muted small fw-bold mb-4">You are updating the status for lead <strong>{lead.name}</strong>.</p>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label small fw-bold text-uppercase text-muted tracking-wider mb-2 d-flex align-items-center gap-2">
                  <MessageSquare size={14} /> Interaction Note
                </label>
                <textarea
                  className={`form-control border-0 shadow-sm rounded-3 py-2 ${inputBgClass}`}
                  rows="3"
                  placeholder="Enter context or requirements (Optional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                ></textarea>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-uppercase text-muted tracking-wider mb-2 d-flex align-items-center gap-2">
                  <Calendar size={14} /> Schedule Follow-up
                </label>
                <input
                  type="datetime-local"
                  className={`form-control border-0 shadow-sm rounded-3 py-2 ${inputBgClass}`}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
                <small className="text-muted mt-2 d-block" style={{ fontSize: '10px' }}>
                  * Set a date to automatically attach a calendar task.
                </small>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary border-opacity-10">
                <button 
                  type="button" 
                  className={`btn btn-link text-decoration-none fw-bold small ${isDarkMode ? 'text-white text-opacity-50' : 'text-muted'}`} 
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary rounded-pill fw-bold text-uppercase px-4 shadow-sm d-flex align-items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  Confirm Change
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeModal;
