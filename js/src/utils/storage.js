// js/src/utils/storage.js

/**
 * Safe JSON parse from Storage.
 */
function readJson(storage, key) {
  try {
    if (typeof window === 'undefined') return null;
    if (!storage) return null;
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Safe JSON stringify to Storage.
 */
function writeJson(storage, key, value) {
  try {
    if (typeof window === 'undefined') return;
    if (!storage) return;
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode errors
  }
}

function getSessionStorage() {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

function getLocalStorage() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * Debounced form state writes to avoid blocking keystrokes.
 */
const WRITE_DELAY_MS = 260;
const pendingFormWrites = new Map();
const pendingTimers = new Map();
const pendingKeyWrites = new Map();
const pendingKeyTimers = new Map();

function flushPending(key) {
  if (pendingTimers.has(key)) {
    clearTimeout(pendingTimers.get(key));
    pendingTimers.delete(key);
  }
  if (pendingFormWrites.has(key)) {
    writeJson(getSessionStorage(), key, pendingFormWrites.get(key));
    pendingFormWrites.delete(key);
  }
}

function scheduleWrite(key) {
  if (pendingTimers.has(key)) return;
  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    if (!pendingFormWrites.has(key)) return;
    writeJson(getSessionStorage(), key, pendingFormWrites.get(key));
    pendingFormWrites.delete(key);
  }, WRITE_DELAY_MS);
  pendingTimers.set(key, timer);
}

function flushAllPending() {
  Array.from(pendingTimers.values()).forEach((t) => clearTimeout(t));
  pendingTimers.clear();
  Array.from(pendingFormWrites.entries()).forEach(([key, payload]) => {
    writeJson(getSessionStorage(), key, payload);
  });
  pendingFormWrites.clear();

  Array.from(pendingKeyTimers.values()).forEach((t) => clearTimeout(t));
  pendingKeyTimers.clear();
  Array.from(pendingKeyWrites.entries()).forEach(([key, value]) => {
    try {
      const storage = getSessionStorage();
      if (storage) storage.setItem(key, value);
    } catch {
      // ignore
    }
  });
  pendingKeyWrites.clear();
}

// Flush queued writes before navigating away
if (typeof window !== 'undefined' && !window.__cozygenFormStateFlush) {
  const flushHandler = () => flushAllPending();
  window.addEventListener('beforeunload', flushHandler);
  window.addEventListener('pagehide', flushHandler);
  window.__cozygenFormStateFlush = true;
}

/**
 * Keys:
 *  - ${workflowName}_formData
 */

export function loadFormState(workflowName) {
  if (!workflowName) return {};
  const key = `${workflowName}_formData`;
  const session = readJson(getSessionStorage(), key);
  if (session && typeof session === 'object') return session;
  // Session-only persistence: cleanup any legacy localStorage value.
  try {
    const local = getLocalStorage();
    local?.removeItem?.(key);
  } catch {
    // ignore
  }
  return {};
}

export function saveFormState(workflowName, formData, options = {}) {
  if (!workflowName) return;
  const { immediate = false } = options || {};
  const key = `${workflowName}_formData`;
  if (immediate) {
    flushPending(key);
    writeJson(getSessionStorage(), key, formData || {});
    try {
      const local = getLocalStorage();
      local?.removeItem?.(key);
    } catch {
      // ignore
    }
    return;
  }
  pendingFormWrites.set(key, formData || {});
  scheduleWrite(key);
}

export function flushFormState(workflowName) {
  if (!workflowName) return;
  flushPending(`${workflowName}_formData`);
}

function queueKeyWrite(key, value, delay = WRITE_DELAY_MS) {
  if (!key) return;
  pendingKeyWrites.set(key, value);
  if (pendingKeyTimers.has(key)) return;
  const timer = setTimeout(() => {
    pendingKeyTimers.delete(key);
    const payload = pendingKeyWrites.get(key);
    pendingKeyWrites.delete(key);
    try {
      const storage = getSessionStorage();
      if (storage) storage.setItem(key, payload);
    } catch {
      // ignore
    }
  }, delay);
  pendingKeyTimers.set(key, timer);
}

/**
 * Debounced helper for tracking last edited param without blocking keystrokes.
 */
export function saveLastEditedParam(name, options = {}) {
  const { immediate = false } = options || {};
  const key = 'cozygen_last_param';
  if (immediate) {
    if (pendingKeyTimers.has(key)) {
      clearTimeout(pendingKeyTimers.get(key));
      pendingKeyTimers.delete(key);
    }
    pendingKeyWrites.delete(key);
    try {
      const storage = getSessionStorage();
      if (storage) storage.setItem(key, name || '');
      const local = getLocalStorage();
      local?.removeItem?.(key);
    } catch {
      // ignore
    }
    return;
  }
  queueKeyWrite(key, name || '');
}

export function loadLastEditedParam() {
  const key = 'cozygen_last_param';
  try {
    const storage = getSessionStorage();
    const val = storage?.getItem?.(key) || '';
    if (val) return val;
    // Cleanup legacy localStorage
    const local = getLocalStorage();
    local?.removeItem?.(key);
  } catch {
    // ignore
  }
  return '';
}

function getDropdownFolderKey(workflowName, paramName) {
  const wf = workflowName ? String(workflowName) : 'global';
  const pn = paramName ? String(paramName) : '';
  return `cozygen_dropdown_folder:${wf}:${pn}`;
}

export function loadDropdownFolder(workflowName, paramName) {
  const key = getDropdownFolderKey(workflowName, paramName);
  try {
    const storage = getSessionStorage();
    const val = storage?.getItem?.(key) || '';
    if (val) return val;
    const local = getLocalStorage();
    local?.removeItem?.(key);
  } catch {
    // ignore
  }
  return '';
}

export function saveDropdownFolder(workflowName, paramName, folder) {
  const key = getDropdownFolderKey(workflowName, paramName);
  try {
    const storage = getSessionStorage();
    if (storage) storage.setItem(key, String(folder || ''));
    const local = getLocalStorage();
    local?.removeItem?.(key);
  } catch {
    // ignore
  }
}
