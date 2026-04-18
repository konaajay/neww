import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/ManagerDashboard';
import TeamLeaderDashboard from './pages/TeamLeaderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentPortal from './pages/PaymentPortal';
import AssociateDashboard from './pages/AssociateDashboard';
import StudentFeePage from './pages/StudentFeePage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;

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
            path="/" 
            element={
              user ? (
                user.role === 'ADMIN' ? 
                  <Navigate to="/admin" /> : 
                  user.role === 'MANAGER' ? 
                    <Navigate to="/manager" /> : 
                    user.role === 'TEAM_LEADER' ? 
                      <Navigate to="/tl" /> : <Navigate to="/associate" />
              ) : <Navigate to="/login" />
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
  );
}

export default App;

