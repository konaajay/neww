import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';
import authService from '../services/authService';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("AuthContext: Malformed user session detected, clearing storage.");
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  });

  const [activeCall, setActiveCall] = useState(() => {
    try {
      const savedCall = localStorage.getItem('activeCall');
      return savedCall ? JSON.parse(savedCall) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      // Refresh profile data from server to keep shift/office info fresh
      authService.getProfile().then(res => {
        const fullUser = res.data;
        const userData = { 
          id: fullUser.id, 
          email: fullUser.email, 
          role: fullUser.role, 
          name: fullUser.name,
          mobile: fullUser.mobile,
          shiftTime: fullUser.shiftTime,
          officeName: fullUser.officeName,
          latitude: fullUser.latitude,
          longitude: fullUser.longitude
        };

        // Deep equality check to prevent infinite re-renders
        const currentUserStr = localStorage.getItem('user');
        const newUserStr = JSON.stringify(userData);
        
        if (currentUserStr !== newUserStr) {
          console.log("[AuthContext] Profile data changed, updating session state.");
          localStorage.setItem('user', newUserStr);
          setUser(userData);
        } else {
          console.log("[AuthContext] Profile data stable.");
        }
      }).catch(err => {
        console.warn("[AuthContext] Profile sync failed:", err);
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const handleGlobalLogout = () => logout();
    window.addEventListener('auth-logout', handleGlobalLogout);
    return () => window.removeEventListener('auth-logout', handleGlobalLogout);
  }, []);

  const login = async (email, password) => {
    console.log("[AuthContext] Attempting login for:", email);
    try {
      const response = await authService.login(email, password);
      const { token, id, role, email: userEmail, name, shiftTime, officeName, latitude, longitude } = response.data;
      const userData = { 
        id, 
        email: userEmail, 
        role, 
        name: name || userEmail.split('@')[0],
        shiftTime,
        officeName,
        latitude,
        longitude
      };
      
      console.log("[AuthContext] Login success payload:", { id, role, userEmail });
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed';
      console.error("[AuthContext] Login error:", errorMsg, error.response?.status);
      throw errorMsg;
    }
  };

  const loginDemo = (role) => {
    const userData = { 
      id: 999,
      email: `demo_${role.toLowerCase()}@lms.com`, 
      role,
      name: `Demo ${role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, ' ')}`
    };
    
    localStorage.setItem('token', 'demo-token-' + Date.now());
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn("Logout ping failed");
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeCall');
    setUser(null);
    setActiveCall(null);
  };

  const startCall = (callData) => {
    localStorage.setItem('activeCall', JSON.stringify(callData));
    setActiveCall(callData);
  };

  const clearCall = () => {
    localStorage.removeItem('activeCall');
    setActiveCall(null);
  };

  const updateProfile = async (updates) => {
    try {
      const res = await api.put('/auth/profile', updates);
      const fullUser = res.data;
      const userData = { 
        ...user,
        name: fullUser.name,
        mobile: fullUser.mobile,
        shiftTime: fullUser.shiftTime,
        officeName: fullUser.officeName
      };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      toast.success('Identity profile synchronized');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Profile update failed');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginDemo, logout, loading, activeCall, startCall, clearCall, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
