// js/src/utils/promptAliases.js

/**
 * Normalize alias mapping by trimming keys/values and dropping empties.
 * Keeps original casing for display but matches lookups case-insensitively.
 */
const DELIM = '::';

export function normalizeAliasMap(aliases) {
  const result = {};
  Object.entries(aliases || {}).forEach(([name, value]) => {
    const key = String(name || '').trim();
    if (!key) return;
    if (typeof value !== 'string') return;
    const text = value.trim();
    if (!text) return;
    result[key] = text;
  });
  return result;
}

export function buildAliasLookup(aliases) {
  const map = new Map();
  Object.entries(normalizeAliasMap(aliases)).forEach(([name, value]) => {
    const key = name.toLowerCase();
    map.set(key, value);
    // Support category-aware tokens: fruit::cherry => fruit:cherry
    if (key.includes(DELIM)) {
      map.set(key.replace(DELIM, ':'), value);
    }
  });
  return map;
}

export function applyPromptAliases(text, aliases) {
  if (typeof text !== 'string' || !text.includes('$')) return text;
  const lookup = aliases instanceof Map ? aliases : buildAliasLookup(aliases);
  if (!lookup.size) return text;

  return text.replace(/\$([a-z0-9_:-]+)\$/gi, (match, key) => {
    const replacement = lookup.get(key.toLowerCase());
    return typeof replacement === 'string' ? replacement : match;
  });
}

export function applyAliasesToForm(formData, aliases) {
  const lookup = aliases instanceof Map ? aliases : buildAliasLookup(aliases);
  if (!lookup.size) return formData;
  if (!formData || typeof formData !== 'object') return formData;

  let changed = false;
  const next = {};
  Object.entries(formData).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const expanded = applyPromptAliases(value, lookup);
      next[key] = expanded;
      if (expanded !== value) changed = true;
    } else {
      next[key] = value;
    }
  });
  return changed ? next : formData;
}
