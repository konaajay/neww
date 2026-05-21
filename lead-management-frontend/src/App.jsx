import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 0, // Real-time immediate stale
    },
  },
});

import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/ManagerDashboard';
import TeamLeaderDashboard from './pages/TeamLeaderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentPortal from './pages/PaymentPortal';
import AssociateDashboard from './pages/AssociateDashboard';
import StudentFeePage from './pages/StudentFeePage';
import LeadStatusUpdatePage from './pages/LeadStatusUpdatePage';
import LeadDetailsPage from './pages/LeadDetailsPage';
import InvoicePage from './pages/InvoicePage';
import CourseManagementPage from './pages/CourseManagementPage';
import PaymentInstructionPage from './pages/PaymentInstructionPage';
import PaymentStatusPage from './pages/PaymentStatusPage';
import NotificationManager from './components/NotificationManager';
import LeadEditPage from './pages/dashboard/components/LeadEditPage';
import CertificateDashboard from './modules/certificates/pages/CertificateDashboard';
import StudentRegistrationForm from './components/StudentRegistrationForm';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles) {
    const userRole = (user.role || '').toUpperCase().replace('ROLE_', '');
    const hasAccess = allowedRoles.some(role => {
      const target = role.toUpperCase();
      if (target === 'TEAM_LEADER') {
        return ['TEAM_LEADER', 'TL', 'TEAM_LEAD', 'TEAMLEAD', 'TEAMLEADER'].includes(userRole);
      }
      if (target === 'MANAGER') {
        return ['MANAGER', 'MGR', 'MANAGEMENT'].includes(userRole);
      }
      return userRole === target;
    });
    
    if (!hasAccess) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

const AutoHardRefresher = () => {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (sessionStorage.getItem('pendingHardRefresh') === 'true') {
      sessionStorage.removeItem('pendingHardRefresh');
      queryClient.invalidateQueries();
    }
  }, [location, queryClient]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pendingHardRefresh') {
        queryClient.invalidateQueries();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [queryClient]);

  return null;
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 bg-dark d-flex flex-column align-items-center justify-content-center text-center p-4">
        <div className="p-4 rounded-4 bg-surface bg-opacity-20 border border-white border-opacity-5 shadow-lg animate-pulse" style={{maxWidth: '320px'}}>
             <div className="spinner-border text-primary mb-3" role="status"></div>
             <h6 className="fw-black text-main text-uppercase tracking-widest mb-1" style={{fontSize: '11px'}}>GYANTRIX OS</h6>
             <p className="text-muted small fw-bold mb-0 opacity-50 px-4" style={{fontSize: '9px'}}>SYNCHRONIZING SECURE SESSION PROTOCOLS...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AutoHardRefresher />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-instruction/:orderId" element={<PaymentInstructionPage />} />
            <Route path="/payment-status/:orderId" element={<PaymentStatusPage />} />
            <Route path="/pay/:sessionId" element={<PaymentPortal />} />
            <Route path="/registration/form" element={<StudentRegistrationForm />} />
            
            <Route 
              path="/manager/*" 
              element={
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/tl/*" 
              element={
                <ProtectedRoute allowedRoles={['TEAM_LEADER', 'TL', 'TEAMLEAD', 'TEAMLEADER']}>
                  <TeamLeaderDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/associate/*" 
              element={
                <ProtectedRoute allowedRoles={['ASSOCIATE', 'ASSOCIATE_TEAM_LEAD']}>
                  <AssociateDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/certificates/*" 
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'TEAM_LEADER']}>
                  <CertificateDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leads/:id/fee-structure" 
              element={
                <ProtectedRoute>
                  <StudentFeePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leads/:id/status-update" 
              element={
                <ProtectedRoute>
                  <LeadStatusUpdatePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leads/:id/details" 
              element={
                <ProtectedRoute>
                  <LeadDetailsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invoice/:leadId" 
              element={
                <ProtectedRoute>
                  <InvoicePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invoice/:leadId/:paymentId" 
              element={
                <ProtectedRoute>
                  <InvoicePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leads/:id/edit" 
              element={
                <ProtectedRoute>
                  <LeadEditPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/" 
              element={
                user ? (
                  (() => {
                    const role = (user.role || '').toUpperCase();
                    if (role.includes('ADMIN')) return <Navigate to="/admin" replace />;
                    if (role.includes('MANAGER') || role === 'MGR') return <Navigate to="/manager" replace />;
                    if (role.includes('TEAM_LEADER') || role.includes('TL') || role.includes('TEAM_LEAD') || role.includes('TEAMLEAD')) return <Navigate to="/tl" replace />;
                    return <Navigate to="/associate" replace />;
                  })()
                ) : <Navigate to="/login" replace />
              } 
            />
          </Routes>
        </Router>
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          theme="dark"
          style={{ zIndex: 99999 }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

