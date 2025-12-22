// js/src/utils/fieldOrder.js
// Per-workflow field preferences: order + hidden.
// Stored in localStorage, per-device.

const STORAGE_KEY = 'cozygen_field_order_v1';

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    const val = JSON.parse(json);
    if (val && typeof val === 'object') return val;
    return fallback;
  } catch {
    return fallback;
  }
}

function loadRawMap() {
  if (typeof window === 'undefined') return {};
  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEY), {});
  } catch {
    return {};
  }
}

function saveRawMap(map) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function normalizeEntry(entry) {
  // Backwards compatibility: old versions may have stored an array = order
  if (Array.isArray(entry)) {
    return { order: entry.filter(Boolean), hidden: {} };
  }
  if (!entry || typeof entry !== 'object') {
    return { order: [], hidden: {} };
  }
  const order = Array.isArray(entry.order)
    ? entry.order.filter(Boolean)
    : [];
  const hidden =
    entry.hidden && typeof entry.hidden === 'object' ? entry.hidden : {};
  return { order, hidden };
}

// --- public helpers ---

export function getFieldPrefs(workflowName) {
  if (!workflowName) return { order: [], hidden: {} };
  const map = loadRawMap();
  const raw = map[workflowName];
  return normalizeEntry(raw);
}

export function setFieldPrefs(workflowName, prefs) {
  if (!workflowName) return;
  const map = loadRawMap();
  const existing = normalizeEntry(map[workflowName]);

  const next = {
    order: Array.isArray(prefs.order)
      ? prefs.order.filter(Boolean)
      : existing.order,
    hidden:
      prefs.hidden && typeof prefs.hidden === 'object'
        ? prefs.hidden
        : existing.hidden,
  };

  map[workflowName] = next;
  saveRawMap(map);
}

// Legacy-style helpers (for convenience)

export function getFieldOrder(workflowName) {
  return getFieldPrefs(workflowName).order;
}

export function setFieldOrder(workflowName, orderNames) {
  setFieldPrefs(workflowName, {
    order: Array.isArray(orderNames) ? orderNames.filter(Boolean) : [],
  });
}

export function getFieldOrderMap() {
  const map = loadRawMap();
  const result = {};
  Object.keys(map).forEach((wf) => {
    result[wf] = getFieldPrefs(wf).order;
  });
  return result;
}

/**
 * Apply stored field preferences to a list of dynamic input nodes.
 * - Respects custom order if present.
 * - Filters out hidden fields.
 */
export function applyFieldOrder(workflowName, inputs) {
  let list = Array.isArray(inputs) ? inputs : [];
  if (!workflowName || list.length === 0) return list;

  const { order, hidden } = getFieldPrefs(workflowName);

  // 1) Apply explicit order (if defined)
  if (order && order.length) {
    const byName = new Map();
    list.forEach((inp) => {
      const pn = inp?.inputs?.param_name;
      if (pn && !byName.has(pn)) byName.set(pn, inp);
    });

    const ordered = [];
    order.forEach((name) => {
      const item = byName.get(name);
      if (item) {
        ordered.push(item);
        byName.delete(name);
      }
    });

    // Append any remaining inputs in original order
    list.forEach((inp) => {
      const pn = inp?.inputs?.param_name;
      if (!pn) {
        ordered.push(inp);
        return;
      }
      if (byName.has(pn)) {
        ordered.push(inp);
        byName.delete(pn);
      }
    });

    list = ordered;
  }

  // 2) Filter out hidden fields
  list = list.filter((inp) => {
    const pn = inp?.inputs?.param_name;
    if (!pn) return true;
    return !hidden[pn];
  });

  return list;
}
