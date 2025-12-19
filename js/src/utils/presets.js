const PRESET_STORAGE_KEY = 'cozygen_workflow_presets';

function readStorage() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to read workflow presets', err);
    return {};
  }
}

function writeStorage(value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to persist workflow presets', err);
  }
}

export function loadWorkflowPresets(workflowName) {
  if (!workflowName) return [];
  const store = readStorage();
  return Array.isArray(store[workflowName]) ? store[workflowName] : [];
}

export function saveWorkflowPresets(workflowName, presets) {
  if (!workflowName) return;
  const store = readStorage();
  store[workflowName] = Array.isArray(presets) ? presets : [];
  writeStorage(store);
}

export function addWorkflowPreset(workflowName, preset) {
  if (!workflowName || !preset) return [];
  const current = loadWorkflowPresets(workflowName);
  const next = [...current.filter((p) => p.id !== preset.id), preset];
  saveWorkflowPresets(workflowName, next);
  return next;
}

export function removeWorkflowPreset(workflowName, presetId) {
  if (!workflowName || !presetId) return [];
  const current = loadWorkflowPresets(workflowName);
  const next = current.filter((preset) => preset.id !== presetId);
  saveWorkflowPresets(workflowName, next);
  return next;
}
