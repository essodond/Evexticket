import React, { createContext, useContext, useEffect, useState } from 'react';
import apiService from '../services/api';

type User = any;

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  /** True when the backend is taking unusually long to respond (Render.com cold start). */
  serverStarting: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverStarting, setServerStarting] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Preemptively wake the backend (fire-and-forget) so it's warm by the time the user logs in
    apiService.warmup();

    // Show "server is starting" banner after 3s if auth is still loading
    const serverStartTimer = setTimeout(() => {
      if (mounted) setServerStarting(true);
    }, 3000);

    const run = async () => {
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (token) {
          apiService.setAuthToken(token);
          try {
            const me = await apiService.getMe();
            if (!mounted) return;
            setUser(me);
            try { localStorage.setItem('user', JSON.stringify(me)); } catch (e) {}
          } catch {
            // Token invalid, expired, or server timed out — force clean logout
            apiService.setAuthToken(null);
            try { localStorage.removeItem('authToken'); localStorage.removeItem('user'); } catch (e) {}
          }
        }
      } finally {
        clearTimeout(serverStartTimer);
        if (mounted) {
          setLoading(false);
          setServerStarting(false);
        }
      }
    };

    run();

    return () => {
      mounted = false;
      clearTimeout(serverStartTimer);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const resp = await apiService.login(email, password);
    if (resp.token) {
      apiService.setAuthToken(resp.token);
    }
    const me = resp.user || await apiService.getMe();
    setUser(me);
    try { localStorage.setItem('user', JSON.stringify(me)); } catch (e) {}
    return me;
  };

  const register = async (payload: any) => {
    const resp = await apiService.register(payload);
    if (resp.token) {
      apiService.setAuthToken(resp.token);
    }
    const me = resp.user || await apiService.getMe();
    setUser(me);
    try { localStorage.setItem('user', JSON.stringify(me)); } catch (e) {}
    return me;
  };

  const logout = () => {
    apiService.setAuthToken(null);
    setUser(null);
    try { localStorage.removeItem('user'); } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, serverStarting, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
