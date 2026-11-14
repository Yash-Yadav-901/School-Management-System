import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, setSession, clearSession, TOKEN_KEY, USER_KEY } from '../api/client.js';
import { logger } from '../utils/logger.js';

const AuthContext = createContext(null);

export function getRoleHome(role) {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'TEACHER':
      return '/teacher/sections';
    case 'GUARDIAN':
      return '/guardian/children';
    default:
      return '/login';
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Sync with global 401 events
  useEffect(() => {
    function handleUnauthorized() {
      setToken(null);
      setUser(null);
    }
    window.addEventListener('sms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('sms:unauthorized', handleUnauthorized);
  }, []);

  // Validate session on boot if token exists
  useEffect(() => {
    let isMounted = true;
    async function verifyAuth() {
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const profile = await apiClient.get('/auth/me');
        if (isMounted && profile) {
          const userData = profile.user || profile;
          setUser(userData);
          setSession(token, userData);
        }
      } catch {
        if (isMounted) {
          clearSession();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    verifyAuth();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await apiClient.post('/auth/login', { email, password });
    setSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    logger.authState('login_success', data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    logger.authState('logout', user || {});
    clearSession();
    setToken(null);
    setUser(null);
  }, [user]);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    getRoleHome,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

