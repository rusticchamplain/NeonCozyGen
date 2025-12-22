import { normalizeAliasMap } from '../../../utils/promptAliases';

const DELIM = '::';

export const makeRowId = () =>
  `alias-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const splitTags = (text) =>
  String(text || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export const joinTags = (tags) =>
  (tags || []).map((t) => String(t || '').trim()).filter(Boolean).join(', ');

export const addTagToText = (text, tag) => {
  const nextTag = String(tag || '').trim();
  if (!nextTag) return String(text || '');
  const existing = splitTags(text);
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  if (!seen.has(nextTag.toLowerCase())) existing.push(nextTag);
  return joinTags(existing);
};

export const removeTagFromText = (text, tag) => {
  const target = String(tag || '').trim().toLowerCase();
  if (!target) return String(text || '');
  const next = splitTags(text).filter((t) => t.toLowerCase() !== target);
  return joinTags(next);
};

export const replaceTagInText = (text, fromTag, toTag) => {
  const from = String(fromTag || '').trim().toLowerCase();
  const to = String(toTag || '').trim();
  if (!from || !to) return String(text || '');
  const tags = splitTags(text).map((t) => (t.toLowerCase() === from ? to : t));
  const seen = new Set();
  const deduped = [];
  tags.forEach((t) => {
    const key = String(t || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(t);
  });
  return joinTags(deduped);
};

export const rowsFromAliases = (aliases, categories = {}) =>
  Object.entries(normalizeAliasMap(aliases)).map(([key, text], idx) => {
    const [maybeCat, maybeName] = String(key).includes(DELIM)
      ? key.split(DELIM)
      : ['', key];
    const name = maybeName || key;
    const category =
      categories[key] ||
      categories[name] ||
      maybeCat ||
      '';
    return {
      id: `existing-${idx}-${key}`,
      name,
      text,
      category,
    };
  });

export const rowsToAliasMap = (rows) => {
  const next = {};
  rows.forEach((row) => {
    const key = String(row?.name || '').trim();
    const val = typeof row?.text === 'string' ? row.text.trim() : '';
    if (key && val) {
      const cat = String(row?.category || '').trim();
      const aliasKey = cat ? `${cat}${DELIM}${key}` : key;
      next[aliasKey] = val;
    }
  });
  return next;
};

export const rowsToCategories = (rows) => {
  const next = {};
  rows.forEach((row) => {
    const key = String(row?.name || '').trim();
    const cat = typeof row?.category === 'string' ? row.category.trim() : '';
    if (key) {
      const aliasKey = cat ? `${cat}${DELIM}${key}` : key;
      next[aliasKey] = cat;
    }
  });
  return next;
};
