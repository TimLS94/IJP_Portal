"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import { trackLogin, trackOAuthLogin, trackRegister, trackLogout, identifyUser, clearUser } from '../lib/analytics';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Beim Start prüfen ob Token vorhanden
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      try { identifyUser(parsed.id, parsed.role); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { access_token, user } = response.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    try { identifyUser(user.id, user.role); trackLogin(user.role); } catch {}

    return user;
  };

  const registerApplicant = async (email, password, firstName, lastName) => {
    const response = await authAPI.registerApplicant(
      { email, password, role: 'applicant' },
      firstName,
      lastName
    );
    const { access_token, user } = response.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    try { identifyUser(user.id, user.role); trackRegister('applicant'); } catch {}

    return user;
  };

  const registerCompany = async (email, password, companyName) => {
    const response = await authAPI.registerCompany(
      { email, password, role: 'company' },
      companyName
    );
    const { access_token, user } = response.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    try { identifyUser(user.id, user.role); trackRegister('company'); } catch {}

    return user;
  };

  const logout = () => {
    try { trackLogout(); clearUser(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Direkter Login mit Token und User (für OAuth)
  const setAuth = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    try { identifyUser(userData.id, userData.role); trackOAuthLogin(userData.role); } catch {}
  };

  const value = {
    user,
    loading,
    login,
    setAuth,
    registerApplicant,
    registerCompany,
    logout,
    isAuthenticated: !!user,
    isApplicant: user?.role === 'applicant',
    isCompany: user?.role === 'company',
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth muss innerhalb eines AuthProviders verwendet werden');
  }
  return context;
}
