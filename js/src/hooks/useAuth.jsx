import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authStatus, login as loginRequest } from '../api';
import { clearToken, getToken, setToken } from '../utils/auth';
import { IDLE_FLAG_KEY, IDLE_TIMEOUT_MS } from './useAuthConstants';
import AuthContext from './useAuthContext';

function AuthProviderInner({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [defaultCreds, setDefaultCreds] = useState(false);
  const [idleTimer, setIdleTimer] = useState(null);

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
    // Clear any idle flag after a fresh login
    try {
      localStorage.removeItem(IDLE_FLAG_KEY);
    } catch {
      /* ignore */
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setDefaultCreds(false);
  }, []);

  // Idle timeout: log out after inactivity window
  useEffect(() => {
    if (!ready) return;

    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      const t = setTimeout(() => {
        clearToken();
        setUser(null);
        setDefaultCreds(false);
        try {
          localStorage.setItem(IDLE_FLAG_KEY, '1');
        } catch {
          /* ignore */
        }
        // Redirect to login; HashRouter friendly
        window.location.hash = '#/login';
      }, IDLE_TIMEOUT_MS);
      setIdleTimer(t);
    };

    resetTimer();

    const events = ['pointerdown', 'keydown', 'visibilitychange'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [ready, idleTimer]);

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

export function AuthProvider({ children }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}
