import React, { createContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getMe } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await getMe();
          setUser(res.data);
        } catch (e) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    window.addEventListener('auth-expired', () => setUser(null));
    initAuth();
    return () => window.removeEventListener('auth-expired', () => setUser(null));
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    localStorage.setItem('token', res.data.access_token);
    const userRes = await getMe();
    setUser(userRes.data);
  };

  const register = async (email, password) => {
    await apiRegister(email, password);
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};