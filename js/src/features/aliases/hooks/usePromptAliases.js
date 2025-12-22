// js/src/hooks/usePromptAliases.js
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getPromptAliases, savePromptAliases } from '../../../services/api';
import { buildAliasLookup, normalizeAliasMap } from '../../../utils/promptAliases';

const LOCAL_CACHE_KEY = 'cozygen_prompt_aliases';
const LOCAL_CATEGORIES_KEY = 'cozygen_alias_categories';
const LOCAL_CATEGORY_LIST_KEY = 'cozygen_alias_category_list';

function loadLocalAliases() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

function saveLocalAliases(data) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data || {}));
  } catch {
    // ignore
  }
}

function loadLocalCategories() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

function saveLocalCategories(data) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(data || {}));
  } catch {
    // ignore
  }
}

function loadLocalCategoryList() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_CATEGORY_LIST_KEY);
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCategoryList(list) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_CATEGORY_LIST_KEY, JSON.stringify(list || []));
  } catch {
    // ignore
  }
}

export default function usePromptAliases() {
  const [aliases, setAliases] = useState(() => loadLocalAliases());
  const [aliasCategories, setAliasCategories] = useState(() => loadLocalCategories());
  const [categoryList, setCategoryList] = useState(() => loadLocalCategoryList());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const refreshAliases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPromptAliases();
      const normalized = normalizeAliasMap(data?.items || data || {});
      const cats = data?.categories || {};
      const list = Array.isArray(data?.categoryList) ? data.categoryList : [];
      setAliases(normalized);
      setAliasCategories(cats);
      setCategoryList(list);
      saveLocalAliases(normalized);
      saveLocalCategories(cats);
      saveLocalCategoryList(list);
    } catch (err) {
      console.error('Failed to load prompt aliases', err);
      setError(err);
      const local = normalizeAliasMap(loadLocalAliases());
      const localCats = loadLocalCategories();
      const localList = loadLocalCategoryList();
      setAliases(local);
      setAliasCategories(localCats);
      setCategoryList(localList);
    } finally {
      setLoading(false);
    }
  }, []);

  const persistAliases = useCallback(async (payload) => {
    const items = payload?.items || payload || {};
    const cats = payload?.categories || aliasCategories || {};
    const list =
      Array.isArray(payload?.categoryList) && payload.categoryList.length
        ? payload.categoryList
        : categoryList.length
          ? categoryList
          : Array.from(new Set(Object.values(cats).filter(Boolean)));
    const normalized = normalizeAliasMap(items || {});
    setSaving(true);
    setError(null);
    try {
      await savePromptAliases({ items: normalized, categories: cats, categoryList: list });
      setAliases(normalized);
      setAliasCategories(cats);
      setCategoryList(list);
      saveLocalAliases(normalized);
      saveLocalCategories(cats);
      saveLocalCategoryList(list);
    } catch (err) {
      console.error('Failed to save prompt aliases', err);
      setError(err);
      // keep local cache even if server fails
      saveLocalAliases(normalized);
      saveLocalCategories(cats);
      saveLocalCategoryList(list);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [aliasCategories, categoryList]);

  useEffect(() => {
    refreshAliases();
  }, [refreshAliases]);

  const aliasLookup = useMemo(() => {
    const base = buildAliasLookup(aliases);
    const extended = new Map(base);
    Object.entries(aliasCategories || {}).forEach(([name, cat]) => {
      const categoryKey = String(cat || '').trim();
      if (categoryKey && aliases?.[name]) {
        extended.set(`${categoryKey}:${name}`, aliases[name]);
      }
    });
    return extended;
  }, [aliases, aliasCategories]);

  const aliasOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    aliasLookup.forEach((_, key) => {
      let display = key.includes('::') ? key.replace('::', ':') : key;
      const parts = display.split(':');
      if (parts.length >= 3 && parts[0] && parts[1] && parts[0].toLowerCase() === parts[1].toLowerCase()) {
        display = [parts[0], ...parts.slice(2)].join(':');
      }
      const norm = display.toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        list.push(display);
      }
    });
    return list;
  }, [aliasLookup]);

  return {
    aliases,
    aliasCategories,
    categoryList,
    aliasLookup,
    aliasOptions,
    loading,
    saving,
    error,
    refreshAliases,
    persistAliases,
  };
}
