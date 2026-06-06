import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, X, ChevronDown, Shield, Users, Target, Info, CreditCard } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-toastify';
import paymentService from '../../../services/paymentService';
import leadsApi from '../../../features/leads/api/leadsApi';
import { useLookupData } from '../../../features/users/hooks/useLookupData';
import { useAuth } from '../../../context/AuthContext';
import { IndianRupee, Wallet, Calendar, AlertCircle } from 'lucide-react';
import adminService from '../../../services/adminService';

const LeadEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const role = user?.role ? user.role.replace('ROLE_', '') : 'MANAGER';
    
    const { teamLeaders = [], subordinates = [] } = useLookupData(role);
    const allUsers = [...teamLeaders, ...subordinates];

    const { isDarkMode } = useTheme();
    const [lead, setLead] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        email: '',
        college: '',
        status: 'Active',
        managerId: '',
        teamLeaderId: '',
        associateId: '',
        assignmentType: 'SPECIFIC',
        selectedLeads: [],
        notes: ''
    });

    const [studentFee, setStudentFee] = useState(null);
    const [isFeeLoading, setIsFeeLoading] = useState(false);
    const [activeColleges, setActiveColleges] = useState([]);

    // Fetch active colleges for dropdown
    useEffect(() => {
        adminService.fetchActiveColleges()
            .then(data => setActiveColleges(Array.isArray(data) ? data : []))
            .catch(() => setActiveColleges([]));
    }, []);

    useEffect(() => {
        const loadLead = () => {
            const fetchedLead = location.state?.lead;
            if (!fetchedLead) {
                toast.error("Lead data not found in session. Please return to dashboard and try again.");
                setIsLoading(false);
                return;
            }
            
            setLead(fetchedLead);
            setFormData({
                name: fetchedLead?.name || '',
                mobile: fetchedLead?.mobile || '',
                email: fetchedLead?.email || '',
                college: fetchedLead?.college || '',
                status: fetchedLead?.status || 'Active',
                managerId: fetchedLead?.managerId || '',
                teamLeaderId: fetchedLead?.teamLeaderId || '',
                associateId: fetchedLead?.assignedToId || '',
                assignmentType: 'SPECIFIC',
                selectedLeads: [fetchedLead?.id],
                notes: fetchedLead?.notes || ''
            });
            
            if (fetchedLead?.status === 'PAID' || fetchedLead?.status === 'EMI' || fetchedLead?.status === 'CONVERTED') {
                fetchFeeStructure();
            }
            setIsLoading(false);
        };
        loadLead();
    }, [id, location.state]);

    const fetchFeeStructure = async () => {
        setIsFeeLoading(true);
        try {
            const res = await paymentService.fetchStudentFee(id);
            setStudentFee(res.data);
        } catch (err) {
            console.error('Failed to fetch fee structure');
        } finally {
            setIsFeeLoading(false);
        }
    };

    const [errors, setErrors] = useState({});

    // Filtered users for hierarchy
    const managers = allUsers.filter(u => u.role === 'MANAGER');
    const teams = allUsers.filter(u => u.role === 'TEAM_LEADER' && (formData.managerId ? u.managerId?.toString() === formData.managerId?.toString() : true));
    const associates = allUsers.filter(u => u.role === 'ASSOCIATE' && (formData.teamLeaderId ? u.teamLeaderId?.toString() === formData.teamLeaderId?.toString() : true));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Reset dependent fields
            ...(name === 'managerId' ? { teamLeaderId: '', associateId: '' } : {}),
            ...(name === 'teamLeaderId' ? { associateId: '' } : {})
        }));
    };

    const validate = () => {
        let newErrors = {};
        if (!formData.name) newErrors.name = "Name is required";
        if (!formData.mobile) newErrors.mobile = "Phone number is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (validate()) {
            setIsSaving(true);
            try {
                // Determine save endpoint/method
                await leadsApi.updateLead(id, formData);
                
                if (formData.associateId) {
                    await leadsApi.assignLead(role, id, formData.associateId);
                }
                
                toast.success('Lead updated successfully');
                
                // Trigger a hard refresh on navigation
                sessionStorage.setItem('pendingHardRefresh', 'true');
                navigate(-1);
            } catch (err) {
                toast.error('Failed to update lead');
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className={`min-vh-100 d-flex justify-content-center align-items-center ${isDarkMode ? 'bg-dark text-white' : 'bg-light text-dark'}`}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-vh-100 py-5 px-3 px-md-5 animate-fade-in ${isDarkMode ? 'bg-dark bg-opacity-50' : 'bg-light'}`}>
            <div className="mx-auto" style={{ maxWidth: '900px' }}>
                {/* Header Section */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                    <div>
                        <h2 className="fw-bold text-main mb-1" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>Edit Lead </h2>
                        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Update lead details and assignments</p>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-secondary px-4 py-2 fw-bold text-uppercase tracking-wider rounded-pill"
                            style={{ fontSize: '11px' }}
                            onClick={() => navigate(-1)}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary px-4 py-2 fw-bold text-uppercase tracking-wider rounded-pill shadow-sm"
                            style={{ fontSize: '11px', background: '#4f46e5' }}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Updating...' : 'Update'}
                        </button>
                        {lead?.status === 'PAID' || lead?.status === 'EMI' ? (
                            <div className="d-flex align-items-center gap-2 px-4 py-2 bg-success bg-opacity-10 text-success rounded-pill fw-bold small border border-success border-opacity-20 ms-2">
                                <Shield size={14} />
                                Verified
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Main Form Card */}
                <div className={`rounded-4 shadow-sm border overflow-hidden bg-card ${isDarkMode ? 'border-white border-opacity-5' : 'border-light'}`}>
                    <div className="p-4 p-md-5">



                        {/* Basic Details Section */}
                        <div className="mb-5">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <Info size={18} className="text-primary" />
                                <h5 className="fw-bold text-main mb-0" style={{ fontSize: '16px' }}>Basic Details</h5>
                            </div>
                            <div className="row g-4">
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-secondary fw-semibold small text-uppercase mb-2">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className={`form-control py-2 px-3 rounded-3 transition-all ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-10 text-main' : 'bg-light border-light-subtle'}`}
                                        style={{ height: '48px' }}
                                    />
                                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-secondary fw-semibold small text-uppercase mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        className={`form-control py-2 px-3 rounded-3 border-light-subtle ${errors.mobile ? 'is-invalid' : ''}`}
                                        placeholder="Phone Number"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        style={{ backgroundColor: '#fdfdfd', height: '48px' }}
                                    />
                                    {errors.mobile && <div className="invalid-feedback">{errors.mobile}</div>}
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-secondary fw-semibold small text-uppercase mb-2">Mail</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className={`form-control py-2 px-3 rounded-3 transition-all ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-10 text-main' : 'bg-light border-light-subtle'}`}
                                        placeholder="Email Address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        style={{ height: '48px' }}
                                    />
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-secondary fw-semibold small text-uppercase mb-2">College</label>
                                    <select
                                        name="college"
                                        className={`form-select py-2 px-3 rounded-3 ${isDarkMode ? 'bg-white bg-opacity-5 border-white border-opacity-10 text-main' : 'border-light-subtle'}`}
                                        value={formData.college}
                                        onChange={handleChange}
                                        style={{ height: '48px', maxWidth: '100%', textOverflow: 'ellipsis' }}
                                    >
                                        <option value="">Select College</option>
                                        {/* Keep existing value selectable even if not in active list */}
                                        {formData.college && !activeColleges.find(c => c.collegeName?.trim() === formData.college?.trim()) && (
                                            <option value={formData.college}>{formData.college}</option>
                                        )}
                                        {activeColleges.map(c => (
                                            <option key={c.id} value={c.collegeName?.trim()}>{c.collegeName?.trim()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>


                        {/* Student Fee Structure Section */}
                        {(studentFee || isFeeLoading) && (
                            <div className="mt-5 pt-5 border-top border-light-subtle">
                                <div className="d-flex align-items-center justify-content-between mb-4">
                                    <div className="d-flex align-items-center gap-2">
                                        <Wallet size={18} className="text-success" />
                                        <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '16px' }}>Fee Structure</h5>
                                    </div>
                                    {studentFee?.paymentStatus === 'COMPLETED' ? (
                                        <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 border border-success border-opacity-10 fw-bold">SETTLED</span>
                                    ) : (
                                        <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill px-3 py-2 border border-warning border-opacity-10 fw-bold">ACTIVE BALANCE</span>
                                    )}
                                </div>

                                {isFeeLoading ? (
                                    <div className="text-center py-4 opacity-50">
                                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                        <span className="small fw-bold">Loading fee details...</span>
                                    </div>
                                ) : (
                                    <div className="row g-4">
                                        <div className="col-12 col-md-4">
                                            <div className="p-4 rounded-4 border border-light-subtle bg-light bg-opacity-30">
                                                <p className="text-secondary small fw-bold text-uppercase mb-2 tracking-wider" style={{ fontSize: '10px' }}>Total Package</p>
                                                <h4 className="fw-black mb-0 text-dark">₹{studentFee?.totalAmount?.toLocaleString() || '0'}</h4>
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <div className="p-4 rounded-4 border border-light-subtle bg-success bg-opacity-5">
                                                <p className="text-success small fw-bold text-uppercase mb-2 tracking-wider" style={{ fontSize: '10px' }}>Amount Paid</p>
                                                <h4 className="fw-black mb-0 text-success">₹{studentFee?.paidAmount?.toLocaleString() || '0'}</h4>
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <div className="p-4 rounded-4 border border-light-subtle bg-danger bg-opacity-5">
                                                <p className="text-danger small fw-bold text-uppercase mb-2 tracking-wider" style={{ fontSize: '10px' }}>Balance Due</p>
                                                <h4 className="fw-black mb-0 text-danger">₹{studentFee?.balanceAmount?.toLocaleString() || '0'}</h4>
                                            </div>
                                        </div>
                                        
                                        {studentFee?.nextDueDate && studentFee?.balanceAmount > 0 && (
                                            <div className="col-12">
                                                <div className="d-flex align-items-center gap-3 p-3 rounded-4 bg-primary bg-opacity-5 border border-primary border-opacity-10 mt-2">
                                                    <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
                                                       <Calendar size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="mb-0 text-dark fw-bold small">Next Installment Collection</p>
                                                        <p className="mb-0 text-primary small fw-black">{new Date(studentFee.nextDueDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}


                    </div>
                </div>

                {/* Removed bottom action bar to keep buttons at top */}
            <style>{`
                .form-label { letter-spacing: 0.5px; }
                .form-select, .form-control { border-width: 1.5px; }
                .form-select:focus, .form-control:focus { 
                    border-color: #4f46e5; 
                    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); 
                }
                .sticky-action-bar { 
                    max-width: 900px; 
                    width: 100%; 
                    margin-left: auto; 
                    margin-right: auto;
                    position: sticky;
                    bottom: 0px;
                    z-index: 100;
                }
                .is-invalid { border-color: #ef4444 !important; }
                @media (max-width: 768px) {
                    .sticky-action-bar { border-radius: 0 !important; margin: 0 !important; max-width: 100% !important; }
                }
            `}</style>
        </div>
        </div>
    );
};

export default LeadEditPage;
