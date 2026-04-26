import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
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
import InvoicePage from './pages/InvoicePage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles) {
    const userRole = (user.role || '').toUpperCase();
    const hasAccess = allowedRoles.some(role => 
      userRole === role.toUpperCase() || userRole === `ROLE_${role.toUpperCase()}`
    );
    
    if (!hasAccess) {
      console.warn(`Access denied for role: ${userRole}. Required: ${allowedRoles}`);
      return <Navigate to="/login" replace />; // Redirect to login breaks the loop better if role is invalid
    }
  }

  return children;
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
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/pay/:sessionId" element={<PaymentPortal />} />
            
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
                <ProtectedRoute allowedRoles={['TEAM_LEADER']}>
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
              path="/invoice/:leadId" 
              element={
                <ProtectedRoute>
                  <InvoicePage />
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
                    if (role.includes('MANAGER')) return <Navigate to="/manager" replace />;
                    if (role.includes('TEAM_LEADER') || role.includes('TL')) return <Navigate to="/tl" replace />;
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
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

