const TOKEN_KEY = 'cozygen_token';
export const AUTH_EXPIRED_EVENT = 'cozygen:auth-expired';

export function getToken() {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function clearToken() {
  setToken(null);
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function notifyAuthExpired(detail = {}) {
  clearToken();
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail }));
  } catch {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}
