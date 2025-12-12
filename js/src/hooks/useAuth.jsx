import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authStatus, login as loginRequest } from '../api';
import { clearToken, getToken, setToken } from '../utils/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [defaultCreds, setDefaultCreds] = useState(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setDefaultCreds(false);
      setReady(true);
      return;
    }
    try {
      const res = await authStatus();
      setUser(res?.user || null);
      setDefaultCreds(Boolean(res?.default_credentials));
    } catch (err) {
      clearToken();
      setUser(null);
      setDefaultCreds(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username, password) => {
    const res = await loginRequest(username, password);
    setToken(res?.token || '');
    setUser(res?.user || username);
    setDefaultCreds(Boolean(res?.default_credentials));
    return res;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setDefaultCreds(false);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      user,
      authed: Boolean(user),
      defaultCreds,
      login,
      logout,
      refresh,
    }),
    [ready, user, defaultCreds, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
