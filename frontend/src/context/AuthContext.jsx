"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import { trackLogin, trackOAuthLogin, trackRegister, trackLogout, identifyUser, clearUser } from '../lib/analytics';

const AuthContext = createContext(null);

// Safari wirft bei blockiertem Speicher (ITP / Private Mode / nach Cross-Tab-OAuth)
// einen SecurityError bei localStorage-Zugriff. Immer defensiv kapseln, sonst
// stürzt die App ab (weiße Seite, v.a. nach Google-Login auf Safari).
const safeGet = (k) => {
  try { return typeof window !== 'undefined' ? window.localStorage.getItem(k) : null; } catch { return null; }
};
const safeSet = (k, v) => {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(k, v); } catch { /* ignore */ }
};
const safeRemove = (k) => {
  try { if (typeof window !== 'undefined') window.localStorage.removeItem(k); } catch { /* ignore */ }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Beim Start prüfen ob Token vorhanden (Safari-sicher)
    try {
      const token = safeGet('token');
      const savedUser = safeGet('user');
      if (token && savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        try { identifyUser(parsed.id, parsed.role); } catch {}
      }
    } catch {
      // Defekter/blockierter Speicher -> als nicht eingeloggt behandeln, nicht abstürzen
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { access_token, user } = response.data;

    safeSet('token', access_token);
    safeSet('user', JSON.stringify(user));
    setUser(user);
    try { identifyUser(user.id, user.role); trackLogin(user.role); } catch {}

    return user;
  };

  const registerApplicant = async (email, password, firstName, lastName, sourceToken = null) => {
    const response = await authAPI.registerApplicant(
      { email, password, role: 'applicant' },
      firstName,
      lastName,
      sourceToken
    );
    const { access_token, user } = response.data;

    safeSet('token', access_token);
    safeSet('user', JSON.stringify(user));
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

    safeSet('token', access_token);
    safeSet('user', JSON.stringify(user));
    setUser(user);
    try { identifyUser(user.id, user.role); trackRegister('company'); } catch {}

    return user;
  };

  const logout = () => {
    try { trackLogout(); clearUser(); } catch {}
    safeRemove('token');
    safeRemove('user');
    setUser(null);
  };

  // Direkter Login mit Token und User (für OAuth)
  const setAuth = (token, userData) => {
    safeSet('token', token);
    safeSet('user', JSON.stringify(userData));
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
