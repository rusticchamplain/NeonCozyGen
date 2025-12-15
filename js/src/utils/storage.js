// js/src/utils/storage.js

/**
 * Safe JSON parse from localStorage.
 */
function readJson(key) {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Safe JSON stringify to localStorage.
 */
function writeJson(key, value) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode errors
  }
}

/**
 * Debounced form state writes to avoid blocking keystrokes.
 */
const WRITE_DELAY_MS = 180;
const pendingFormWrites = new Map();
const pendingTimers = new Map();

function flushPending(key) {
  if (pendingTimers.has(key)) {
    clearTimeout(pendingTimers.get(key));
    pendingTimers.delete(key);
  }
  if (pendingFormWrites.has(key)) {
    writeJson(key, pendingFormWrites.get(key));
    pendingFormWrites.delete(key);
  }
}

function scheduleWrite(key) {
  if (pendingTimers.has(key)) return;
  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    if (!pendingFormWrites.has(key)) return;
    writeJson(key, pendingFormWrites.get(key));
    pendingFormWrites.delete(key);
  }, WRITE_DELAY_MS);
  pendingTimers.set(key, timer);
}

function flushAllPending() {
  Array.from(pendingTimers.values()).forEach((t) => clearTimeout(t));
  pendingTimers.clear();
  Array.from(pendingFormWrites.entries()).forEach(([key, payload]) => {
    writeJson(key, payload);
  });
  pendingFormWrites.clear();
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
  return readJson(`${workflowName}_formData`) || {};
}

export function saveFormState(workflowName, formData, options = {}) {
  if (!workflowName) return;
  const { immediate = false } = options || {};
  const key = `${workflowName}_formData`;
  if (immediate) {
    flushPending(key);
    writeJson(key, formData || {});
    return;
  }
  pendingFormWrites.set(key, formData || {});
  scheduleWrite(key);
}

export function flushFormState(workflowName) {
  if (!workflowName) return;
  flushPending(`${workflowName}_formData`);
}
