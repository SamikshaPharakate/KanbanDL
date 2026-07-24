import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'https://kanbandl.onrender.com/api';

// Debug: log which API URL is being used (visible in browser console)
console.log('[AuthContext] API URL:', API_URL);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure axios authorization token default
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  const loadUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/user`);
      setUser(res.data);
    } catch (err) {
      console.error('Failed to load user:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const register = async (username, email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { username, email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      console.error('[Register Error]', err);
      // Show specific error: server message → network/CORS message → fallback
      const serverMsg = err.response?.data?.msg;
      const networkMsg = err.code === 'ERR_NETWORK' || err.message === 'Network Error'
        ? `Cannot reach server at ${API_URL}. Check if backend is running.`
        : null;
      const corsMsg = err.message?.includes('CORS') ? 'CORS error — backend rejecting frontend origin.' : null;
      return {
        success: false,
        message: serverMsg || corsMsg || networkMsg || `Error: ${err.message}`
      };
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      console.error('[Login Error]', err);
      const serverMsg = err.response?.data?.msg;
      const networkMsg = err.code === 'ERR_NETWORK' || err.message === 'Network Error'
        ? `Cannot reach server at ${API_URL}. Check if backend is running.`
        : null;
      return {
        success: false,
        message: serverMsg || networkMsg || `Error: ${err.message}`
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUserStats = (stats) => {
    // stats: { level, xp, badges, streak }
    if (user) {
      setUser(prev => ({
        ...prev,
        ...stats
      }));
    }
  };

  const updateUsername = async (newUsername) => {
    try {
      const res = await axios.put(`${API_URL}/auth/user`, { username: newUsername });
      setUser(res.data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.msg || 'Update failed'
      };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      register,
      login,
      logout,
      loadUser,
      updateUserStats,
      updateUsername
    }}>
      {children}
    </AuthContext.Provider>
  );
};
