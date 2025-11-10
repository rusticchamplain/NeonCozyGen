// js/src/utils/storage.js

/**
 * Safe JSON parse from localStorage.
 */
function readJson(key) {
  try {
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
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode errors
  }
}

/**
 * Keys:
 *  - ${workflowName}_formData
 */

export function loadFormState(workflowName) {
  if (!workflowName) return {};
  return readJson(`${workflowName}_formData`) || {};
}

export function saveFormState(workflowName, formData) {
  if (!workflowName) return;
  writeJson(`${workflowName}_formData`, formData || {});
}
