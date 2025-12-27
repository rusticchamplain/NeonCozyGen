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
  if (typeof text !== 'string' || (!text.includes('$') && !text.includes('::'))) return text;
  const lookup = aliases instanceof Map ? aliases : buildAliasLookup(aliases);
  if (!lookup.size) return text;

  const fallbackCache = applyPromptAliases._fallbackCache
    || (applyPromptAliases._fallbackCache = new WeakMap());
  const getFallbackLookup = (map) => {
    const cached = fallbackCache.get(map);
    if (cached) return cached;
    const next = new Map();
    const ambiguous = new Set();
    map.forEach((value, key) => {
      const rawKey = String(key || '').toLowerCase();
      if (!rawKey) return;
      const base = rawKey.includes(':') ? rawKey.split(':').pop() : rawKey;
      if (!base) return;
      if (ambiguous.has(base)) return;
      if (next.has(base)) {
        if (next.get(base) === value) return;
        next.set(base, null);
        ambiguous.add(base);
        return;
      }
      next.set(base, value);
    });
    fallbackCache.set(map, next);
    return next;
  };

  const unwrapWeightedTag = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return null;
    const inner = trimmed.slice(1, -1);
    const colonIdx = inner.lastIndexOf(':');
    if (colonIdx === -1) return null;
    const weightStr = inner.slice(colonIdx + 1).trim();
    if (!/^\d+(\.\d+)?$/u.test(weightStr)) return null;
    const core = inner.slice(0, colonIdx).trim();
    return core || null;
  };

  const applyAliasWeight = (replacement, weight) => {
    const parts = String(replacement || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return replacement;
    return parts
      .map((part) => {
        const core = unwrapWeightedTag(part) || part;
        return core ? `(${core}:${weight})` : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  const weightedAliasPattern = /\(\s*\$([a-z0-9_:-]+)\$\s*:\s*(\d+(?:\.\d+)?)\s*\)/gi;
  const bareAliasPattern = /(?<!\$)\b([a-z0-9_]+)::([a-z0-9_:-]+)\b(?!\$)/gi;
  const expandOnce = (value) => {
    let result = value.replace(weightedAliasPattern, (match, key, weight) => {
      const normalizedKey = String(key || '').toLowerCase();
      let replacement = lookup.get(normalizedKey);
      if (typeof replacement !== 'string' && !normalizedKey.includes(':')) {
        replacement = getFallbackLookup(lookup).get(normalizedKey);
      }
      if (typeof replacement !== 'string') return match;
      return applyAliasWeight(replacement, String(weight || '').trim());
    });

    result = result.replace(/\$([a-z0-9_:-]+)\$/gi, (match, key) => {
      const normalizedKey = String(key || '').toLowerCase();
      let replacement = lookup.get(normalizedKey);
      if (typeof replacement !== 'string' && !normalizedKey.includes(':')) {
        replacement = getFallbackLookup(lookup).get(normalizedKey);
      }
      return typeof replacement === 'string' ? replacement : match;
    });

    result = result.replace(bareAliasPattern, (match, prefix, name, offset) => {
      const nextChar = result[offset + match.length];
      if (nextChar === ':') return match;
      const key = `${prefix}::${name}`.toLowerCase();
      let replacement = lookup.get(key);
      if (typeof replacement !== 'string') {
        replacement = lookup.get(key.replace('::', ':'));
      }
      if (typeof replacement === 'string') return replacement;
      const stripped = String(name || '').trim();
      return stripped || match;
    });

    return result;
  };

  const maxPasses = 10;
  let result = text;
  const seen = new Set([result]);
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const next = expandOnce(result);
    if (next === result || seen.has(next)) break;
    seen.add(next);
    result = next;
    if (!result.includes('$')) break;
  }

  return result;
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
