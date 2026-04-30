import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';
import authService from '../services/authService';

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
    console.log("[AuthContext] session check:", { 
      hasToken: !!token, 
      hasUser: !!savedUser,
      role: savedUser ? JSON.parse(savedUser).role : 'NONE'
    });
    setLoading(false);
  }, [user]);

  const login = async (email, password) => {
    console.log("[AuthContext] Attempting login for:", email);
    try {
      const response = await authService.login(email, password);
      const { token, id, role, email: userEmail, name } = response.data;
      const userData = { id, email: userEmail, role, name: name || userEmail.split('@')[0] };
      
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

  return (
    <AuthContext.Provider value={{ user, login, loginDemo, logout, loading, activeCall, startCall, clearCall }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
