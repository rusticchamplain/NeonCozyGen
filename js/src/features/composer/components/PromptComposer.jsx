// js/src/components/PromptComposer.jsx
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '../../../ui/primitives/BottomSheet';
import Button from '../../../ui/primitives/Button';
import SegmentedTabs from '../../../ui/primitives/SegmentedTabs';
import TokenEditSheet from '../../../ui/composites/TokenEditSheet';
import Select from '../../../ui/primitives/Select';
import TopicTabs from '../../../ui/primitives/TopicTabs';
import { IconGrip, IconX, IconTag, IconAlias, IconEdit } from '../../../ui/primitives/Icons';
import { formatCategoryLabel, formatSubcategoryLabel, presentAliasEntry } from '../../../utils/aliasPresentation';
import { filterCategoriesByTopic, getCategoryTopic } from '../../../utils/categoryTopics';
import ComposerSelectionBar from './ComposerSelectionBar';
import TagComposerRow from './TagComposerRow';
import useMediaQuery from '../../../hooks/useMediaQuery';

import {
  formatTokenWeight,
  parsePromptElements,
  getElementWeight,
  setElementWeight,
  reorderElements,
  removeElement,
  replaceElement,
} from '../../../utils/tokenWeights';
import { getDanbooruTagCategories, searchDanbooruTags } from '../../../services/api';
import { useVirtualList } from '../../../hooks/useVirtualList';

const listItemVisibilityStyles = {
  contentVisibility: 'auto',
  containIntrinsicSize: '260px 140px',
};

export default function PromptComposer({
  open = false,
  onClose,
  value = '',
  onChange,
  aliasOptions = [],
  aliasCatalog = [],
  fieldLabel = 'Prompt',
  variant = 'sheet', // 'sheet' or 'page'
}) {
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);
  const sentinelRef = useRef(null);
  const tokensListRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
  const [pickerSearch, setPickerSearch] = useState('');
  const deferredPickerSearch = useDeferredValue(pickerSearch);
  const [pickerTopic, setPickerTopic] = useState('All');
  const [pickerCategory, setPickerCategory] = useState('All');
  const [pickerSubcategory, setPickerSubcategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'aliases'
  const isPage = variant === 'page';
  const isVisible = isPage || open;
  const isSmall = useMediaQuery('(max-width: 640px)', false);
  const [expandedOpen, setExpandedOpen] = useState(!isSmall);

  // Drag and drop state
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(null);
  const dragNodeRef = useRef(null);
  const touchStartRef = useRef(null);
  const [strengthOpen, setStrengthOpen] = useState(false);
  const [strengthToken, setStrengthToken] = useState(null);
  const [tokenEditSearch, setTokenEditSearch] = useState('');
  const deferredTokenEditSearch = useDeferredValue(tokenEditSearch);
  const [tokenEditCategory, setTokenEditCategory] = useState('All');
  const [tokenEditSubcategory, setTokenEditSubcategory] = useState('All');
  const [tokenEditTagItems, setTokenEditTagItems] = useState([]);
  const [tokenEditTagTotal, setTokenEditTagTotal] = useState(0);
  const [tokenEditTagOffset, setTokenEditTagOffset] = useState(0);
  const [tokenEditTagLoading, setTokenEditTagLoading] = useState(false);
  const [tokenEditTagLoadingMore, setTokenEditTagLoadingMore] = useState(false);
  const tokenEditSearchAbortRef = useRef(null);
  const tokenEditLoadAbortRef = useRef(null);

  // Tag library state
  const tagSearchRef = useRef(null);
  const tagSentinelRef = useRef(null);
  const [tagQuery, setTagQuery] = useState('');
  const [tagCategory, setTagCategory] = useState('');
  const [tagSort, setTagSort] = useState('count');
  const [tagMinCount, setTagMinCount] = useState('');
  const [tagCategories, setTagCategories] = useState([]);
  const [tagItems, setTagItems] = useState([]);
  const [tagTotal, setTagTotal] = useState(0);
  const [tagOffset, setTagOffset] = useState(0);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagLoadingMore, setTagLoadingMore] = useState(false);
  const [tagError, setTagError] = useState('');
  const tagSearchAbortRef = useRef(null);
  const tagLoadAbortRef = useRef(null);
  const tagSearchCacheRef = useRef(new Map());
  const tagInflightRef = useRef(new Map());
  const tagMinCountValue = useMemo(() => {
    const parsed = Number.parseInt(String(tagMinCount || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [tagMinCount]);
  const [composerCollectedTags, setComposerCollectedTags] = useState([]);
  const [collectionStatus, setCollectionStatus] = useState('');
  const [composerCollectedAliases, setComposerCollectedAliases] = useState([]);
  const [aliasCollectionStatus, setAliasCollectionStatus] = useState('');
  const expandedPrompt = useMemo(() => {
    if (!localValue) return { text: '', parts: [] };
    const lookup = new Map();
    (aliasCatalog || []).forEach((entry) => {
      if (!entry) return;
      const key = String(entry.token || '').trim().toLowerCase();
      const text = typeof entry.text === 'string' ? entry.text.trim() : '';
      if (!key || !text) return;
      lookup.set(key, text);
    });
    if (!lookup.size || !localValue.includes('$')) {
      return { text: localValue, parts: [{ text: localValue, isAlias: false }] };
    }

    const parts = [];
    const regex = /\$([a-z0-9_:-]+)\$/gi;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(localValue)) !== null) {
      const start = match.index;
      if (start > lastIndex) {
        parts.push({ text: localValue.slice(lastIndex, start), isAlias: false });
      }
      const key = String(match[1] || '').toLowerCase();
      const replacement = lookup.get(key);
      if (typeof replacement === 'string') {
        parts.push({ text: replacement, isAlias: true });
      } else {
        parts.push({ text: match[0], isAlias: false });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < localValue.length) {
      parts.push({ text: localValue.slice(lastIndex), isAlias: false });
    }
    const text = parts.map((part) => part.text).join('');
    return { text, parts };
  }, [aliasCatalog, localValue]);

  // Sync local value with prop when modal opens
  useEffect(() => {
    if (open) {
      setLocalValue(value);
      setActiveTab('compose');
      setPickerSearch('');
      setPickerCategory('All');
      setPickerSubcategory('All');
      setVisibleCount(30);
      setDragIndex(null);
      setDropIndex(null);
      setSelectedTokenIndex(null);
      setStrengthOpen(false);
      setStrengthToken(null);
      setTokenEditSearch('');
      setTokenEditCategory('All');
      setTokenEditSubcategory('All');
      setTokenEditTagItems([]);
      setTokenEditTagTotal(0);
      setTokenEditTagOffset(0);
      setTokenEditTagLoading(false);
      setTokenEditTagLoadingMore(false);
      setComposerInput('');
      // Reset tag library state
      setTagQuery('');
      setTagCategory('');
      setTagSort('count');
      setTagMinCount('');
      setTagItems([]);
      setTagTotal(0);
      setTagOffset(0);
      setTagLoading(false);
      setTagLoadingMore(false);
      setTagError('');
    }
  }, [open, value]);

  useEffect(() => {
    setExpandedOpen(!isSmall);
  }, [isSmall]);

  useEffect(() => {
    if (dragIndex === null) return undefined;
    if (typeof document === 'undefined') return undefined;
    const scrollEl = document.querySelector('main.app-content');
    const prev = {
      htmlOverscroll: document.documentElement.style.overscrollBehavior,
      bodyOverscroll: document.body.style.overscrollBehavior,
      bodyOverflow: document.body.style.overflow,
      scrollOverflow: scrollEl?.style.overflow,
      scrollTouch: scrollEl?.style.touchAction,
      scrollOverscroll: scrollEl?.style.overscrollBehavior,
    };
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    if (scrollEl) {
      scrollEl.style.overflow = 'hidden';
      scrollEl.style.touchAction = 'none';
      scrollEl.style.overscrollBehavior = 'none';
    }
    return () => {
      document.documentElement.style.overscrollBehavior = prev.htmlOverscroll || '';
      document.body.style.overscrollBehavior = prev.bodyOverscroll || '';
      document.body.style.overflow = prev.bodyOverflow || '';
      if (scrollEl) {
        scrollEl.style.overflow = prev.scrollOverflow || '';
        scrollEl.style.touchAction = prev.scrollTouch || '';
        scrollEl.style.overscrollBehavior = prev.scrollOverscroll || '';
      }
    };
  }, [dragIndex]);

  const aliasEntries = useMemo(
    () =>
      (Array.isArray(aliasCatalog) ? aliasCatalog.filter((e) => e && e.name) : []).map((e) => ({
        ...e,
        ...presentAliasEntry(e),
      })),
    [aliasCatalog]
  );

  const aliasByToken = useMemo(() => {
    const map = new Map();
    aliasEntries.forEach((entry) => {
      if (!entry?.token) return;
      map.set(String(entry.token).toLowerCase(), entry);
    });
    return map;
  }, [aliasEntries]);

  const categories = useMemo(() => {
    const set = new Set(['All']);
    aliasEntries.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    const allCategories = Array.from(set).sort((a, b) =>
      formatCategoryLabel(a).localeCompare(formatCategoryLabel(b))
    );
    return filterCategoriesByTopic(allCategories, pickerTopic);
  }, [aliasEntries, pickerTopic]);

  const subcategories = useMemo(() => {
    const set = new Set(['All']);
    aliasEntries.forEach((e) => {
      if (!pickerCategory || pickerCategory === 'All' || e.category === pickerCategory) {
        if (e.subcategory) set.add(e.subcategory);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [aliasEntries, pickerCategory]);

  const categoryOptions = useMemo(
    () => ['All', ...categories.filter((c) => c !== 'All')],
    [categories]
  );

  const subcategoryOptions = useMemo(
    () => ['All', ...subcategories.filter((c) => c !== 'All')],
    [subcategories]
  );

  const filteredAliases = useMemo(() => {
    const term = deferredPickerSearch.trim().toLowerCase();
    return aliasEntries
      .filter((e) => {
        // Filter by topic first
        if (pickerTopic !== 'All') {
          const categoryTopic = getCategoryTopic(e.category);
          if (categoryTopic !== pickerTopic) return false;
        }
        // Then by category
        if (pickerCategory !== 'All' && (e.category || '') !== pickerCategory) return false;
        // Then by subcategory
        if (pickerSubcategory !== 'All' && (e.subcategory || 'other') !== pickerSubcategory)
          return false;
        // Finally by search term
        if (!term) return true;
        return (
          e.token?.toLowerCase().includes(term) ||
          e.text?.toLowerCase().includes(term) ||
          e.name?.toLowerCase().includes(term) ||
          e.displayName?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const subA = (a.subcategory || '').toLowerCase();
        const subB = (b.subcategory || '').toLowerCase();
        if (subA !== subB) return subA.localeCompare(subB);
        // Sort by display name for better readability
        const nameA = (a.displayName || a.name || a.token || '').toLowerCase();
        const nameB = (b.displayName || b.name || b.token || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [aliasEntries, pickerTopic, pickerCategory, pickerSubcategory, deferredPickerSearch]);

  const visibleAliases = useMemo(
    () => filteredAliases.slice(0, visibleCount),
    [filteredAliases, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(30);
  }, [pickerTopic, pickerCategory, pickerSubcategory, pickerSearch, aliasEntries]);

  useEffect(() => {
    setPickerSubcategory('All');
  }, [pickerCategory]);

  useEffect(() => {
    setPickerCategory('All');
    setPickerSubcategory('All');
  }, [pickerTopic]);

  // Infinite scroll with IntersectionObserver sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && visibleCount < filteredAliases.length) {
          setVisibleCount((c) => Math.min(c + 20, filteredAliases.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredAliases.length]);

  // Parse all elements (aliases and plain tags) from current text
  const elements = useMemo(() => {
    if (typeof localValue !== 'string') return [];
    return parsePromptElements(localValue);
  }, [localValue]);

  // Expanded preview
  // Body locking removed to reduce mobile blank/scroll quirks; Modal overlay already blocks scroll.

  // Tag library: load categories on first switch to tags tab
  useEffect(() => {
    if (!open || activeTab !== 'tags') return;
    if (tagCategories.length > 0) return; // Already loaded
    let cancelled = false;
    (async () => {
      try {
        const res = await getDanbooruTagCategories();
        if (cancelled) return;
        setTagCategories(Array.isArray(res?.categories) ? res.categories : []);
      } catch (e) {
        console.error('Failed to load tag categories', e);
        if (!cancelled) setTagCategories([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open, activeTab, tagCategories.length]);

  const loadTagsForTokenEdit = useCallback(async () => {
    if (tokenEditTagLoading) return;
    if (tokenEditSearchAbortRef.current) {
      tokenEditSearchAbortRef.current.abort();
    }
    const controller = new AbortController();
    tokenEditSearchAbortRef.current = controller;
    try {
      setTokenEditTagLoading(true);
      const res = await searchDanbooruTags(
        {
          q: deferredTokenEditSearch,
          category: '',
          sort: 'count',
          minCount: '',
          limit: 100,
          offset: 0,
        },
        { signal: controller.signal }
      );
      const nextItems = Array.isArray(res?.items) ? res.items : [];
      setTokenEditTagItems(nextItems);
      setTokenEditTagTotal(Number(res?.total || 0));
      setTokenEditTagOffset(nextItems.length);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setTokenEditTagItems([]);
      setTokenEditTagTotal(0);
      setTokenEditTagOffset(0);
    } finally {
      setTokenEditTagLoading(false);
    }
  }, [deferredTokenEditSearch, tokenEditTagLoading]);

  const loadMoreTagsForTokenEdit = useCallback(async () => {
    if (tokenEditTagLoading || tokenEditTagLoadingMore) return;
    if (tokenEditTagItems.length >= tokenEditTagTotal) return;
    if (tokenEditLoadAbortRef.current) {
      tokenEditLoadAbortRef.current.abort();
    }
    const controller = new AbortController();
    tokenEditLoadAbortRef.current = controller;
    try {
      setTokenEditTagLoadingMore(true);
      const res = await searchDanbooruTags(
        {
          q: deferredTokenEditSearch,
          category: '',
          sort: 'count',
          minCount: '',
          limit: 100,
          offset: tokenEditTagOffset,
        },
        { signal: controller.signal }
      );
      const nextItems = Array.isArray(res?.items) ? res.items : [];
      setTokenEditTagItems((prev) => [...prev, ...nextItems]);
      setTokenEditTagTotal(Number(res?.total || 0));
      setTokenEditTagOffset(tokenEditTagOffset + nextItems.length);
    } catch (err) {
      if (err?.name === 'AbortError') return;
    } finally {
      setTokenEditTagLoadingMore(false);
    }
  }, [
    deferredTokenEditSearch,
    tokenEditTagItems.length,
    tokenEditTagLoading,
    tokenEditTagLoadingMore,
    tokenEditTagOffset,
    tokenEditTagTotal,
  ]);

  const tagCacheKey = useCallback((q, c, s, minCount, limit, offset) => {
    return [q || '', c || '', s || '', String(minCount || 0), String(limit || 0), String(offset || 0)].join('::');
  }, []);

  const trimTagCache = useCallback(() => {
    const cache = tagSearchCacheRef.current;
    if (cache.size <= 50) return;
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => (a[1]?.ts || 0) - (b[1]?.ts || 0));
    entries.slice(0, Math.max(0, entries.length - 50)).forEach(([key]) => cache.delete(key));
  }, []);

  // Tag library: search function
  const searchTags = useCallback(async ({ nextQuery, nextCategory, nextSort, nextMinCount } = {}) => {
    const q = typeof nextQuery === 'string' ? nextQuery : tagQuery;
    const c = typeof nextCategory === 'string' ? nextCategory : tagCategory;
    const s = typeof nextSort === 'string' ? nextSort : tagSort;
    const m = typeof nextMinCount === 'number' ? nextMinCount : tagMinCountValue;
    const key = tagCacheKey(q, c, s, m, 80, 0);
    const now = Date.now();
    const cached = tagSearchCacheRef.current.get(key);
    if (cached && now - cached.ts < 5 * 60 * 1000) {
      setTagItems(cached.items || []);
      setTagTotal(Number(cached.total || 0));
      setTagOffset(0);
      setTagError('');
      setTagLoading(false);
      return;
    }
    const inflight = tagInflightRef.current.get(key);
    if (inflight) {
      try {
        const res = await inflight;
        setTagItems(res?.items || []);
        setTagTotal(Number(res?.total || 0));
        setTagOffset(0);
        setTagError('');
      } catch {
        // errors handled by owner
      }
      return;
    }
    setTagLoading(true);
    setTagError('');
    setTagOffset(0);
    if (tagSearchAbortRef.current && tagSearchAbortRef.current.key !== key) {
      tagSearchAbortRef.current.controller.abort();
    }
    const controller = new AbortController();
    tagSearchAbortRef.current = { controller, key };
    try {
      const request = searchDanbooruTags(
        { q, category: c, sort: s, minCount: m, limit: 80, offset: 0 },
        { signal: controller.signal }
      );
      tagInflightRef.current.set(key, request);
      const res = await request;
      tagSearchCacheRef.current.set(key, { items: res?.items || [], total: Number(res?.total || 0), ts: Date.now() });
      trimTagCache();
      setTagItems(res?.items || []);
      setTagTotal(Number(res?.total || 0));
    } catch (e) {
      if (e?.name === 'AbortError') {
        return;
      }
      console.error('Failed to search tags', e);
      setTagError('Unable to load tags right now.');
      setTagItems([]);
      setTagTotal(0);
    } finally {
      tagInflightRef.current.delete(key);
      if (tagSearchAbortRef.current?.key === key) {
        tagSearchAbortRef.current = null;
      }
      setTagLoading(false);
    }
  }, [tagCacheKey, tagCategory, tagMinCountValue, tagQuery, tagSort, trimTagCache]);

  // Tag library: load more function
  const loadMoreTags = useCallback(async () => {
    if (tagLoading || tagLoadingMore) return;
    if (tagItems.length >= tagTotal) return;
    const nextOffset = tagOffset + 80;
    const key = tagCacheKey(tagQuery, tagCategory, tagSort, tagMinCountValue, 80, nextOffset);
    const now = Date.now();
    const cached = tagSearchCacheRef.current.get(key);
    if (cached && now - cached.ts < 5 * 60 * 1000) {
      setTagItems((prev) => [...prev, ...(cached.items || [])]);
      setTagTotal(Number(cached.total || 0));
      setTagOffset(nextOffset);
      setTagLoadingMore(false);
      return;
    }
    const inflight = tagInflightRef.current.get(key);
    if (inflight) {
      try {
        const res = await inflight;
        const nextItems = res?.items || [];
        setTagItems((prev) => [...prev, ...nextItems]);
        setTagTotal(Number(res?.total || 0));
        setTagOffset(nextOffset);
      } catch {
        // errors handled by owner
      }
      return;
    }
    setTagLoadingMore(true);
    setTagError('');
    if (tagLoadAbortRef.current && tagLoadAbortRef.current.key !== key) {
      tagLoadAbortRef.current.controller.abort();
    }
    const controller = new AbortController();
    tagLoadAbortRef.current = { controller, key };
    try {
      const request = searchDanbooruTags(
        {
          q: tagQuery,
          category: tagCategory,
          sort: tagSort,
          minCount: tagMinCountValue,
          limit: 80,
          offset: nextOffset,
        },
        { signal: controller.signal }
      );
      tagInflightRef.current.set(key, request);
      const res = await request;
      const nextItems = res?.items || [];
      tagSearchCacheRef.current.set(key, { items: nextItems, total: Number(res?.total || 0), ts: Date.now() });
      trimTagCache();
      setTagItems((prev) => [...prev, ...nextItems]);
      setTagTotal(Number(res?.total || 0));
      setTagOffset(nextOffset);
    } catch (e) {
      if (e?.name === 'AbortError') {
        return;
      }
      console.error('Failed to load more tags', e);
      setTagError('Unable to load more tags.');
    } finally {
      tagInflightRef.current.delete(key);
      if (tagLoadAbortRef.current?.key === key) {
        tagLoadAbortRef.current = null;
      }
      setTagLoadingMore(false);
    }
  }, [
    tagCacheKey,
    tagCategory,
    tagLoading,
    tagLoadingMore,
    tagMinCountValue,
    tagOffset,
    tagQuery,
    tagSort,
    tagItems.length,
    tagTotal,
    trimTagCache,
  ]);

  // Tag library: debounced search when filters change
  useEffect(() => {
    if (!open || activeTab !== 'tags') return;
    const handle = window.setTimeout(() => {
      searchTags();
    }, 220);
    return () => window.clearTimeout(handle);
  }, [open, activeTab, tagQuery, tagCategory, tagSort, tagMinCountValue, searchTags]);

  useEffect(() => {
    return () => {
      if (tagSearchAbortRef.current) {
        tagSearchAbortRef.current.controller?.abort?.();
      }
      if (tagLoadAbortRef.current) {
        tagLoadAbortRef.current.controller?.abort?.();
      }
      if (tokenEditSearchAbortRef.current) {
        tokenEditSearchAbortRef.current.abort?.();
      }
      if (tokenEditLoadAbortRef.current) {
        tokenEditLoadAbortRef.current.abort?.();
      }
    };
  }, []);

  useEffect(() => {
    if (!strengthOpen) return undefined;
    const handle = window.setTimeout(() => {
      loadTagsForTokenEdit();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [strengthOpen, deferredTokenEditSearch, loadTagsForTokenEdit]);

  const {
    containerRef: tagListRef,
    startIndex: tagStart,
    endIndex: tagEnd,
    topSpacer: tagTopSpacer,
    bottomSpacer: tagBottomSpacer,
    virtualized: tagsVirtualized,
    isNearEnd: tagsNearEnd,
  } = useVirtualList({
    itemCount: tagItems.length,
    enabled: open && activeTab === 'tags',
    estimateRowHeight: 70,
    overscan: 8,
    minItems: 90,
  });
  const normalizedTagQuery = useMemo(
    () => String(tagQuery || '').trim().toLowerCase(),
    [tagQuery]
  );
  const orderedTagItems = useMemo(() => {
    if (!normalizedTagQuery) return tagItems;
    const exactMatches = [];
    const rest = [];
    tagItems.forEach((tag) => {
      const name = String(tag?.tag || '').toLowerCase();
      if (name === normalizedTagQuery) {
        exactMatches.push(tag);
      } else {
        rest.push(tag);
      }
    });
    return exactMatches.length ? [...exactMatches, ...rest] : tagItems;
  }, [tagItems, normalizedTagQuery]);
  const visibleTags = tagsVirtualized
    ? orderedTagItems.slice(tagStart, tagEnd)
    : orderedTagItems;

  // Tag library: infinite scroll sentinel
  useEffect(() => {
    if (!open || activeTab !== 'tags') return;
    if (tagsVirtualized) return;
    const el = tagSentinelRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) loadMoreTags();
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, activeTab, tagsVirtualized, loadMoreTags]);

  useEffect(() => {
    if (!tagsVirtualized) return;
    if (tagLoading || tagLoadingMore) return;
    if (tagItems.length >= tagTotal) return;
    if (tagsNearEnd) loadMoreTags();
  }, [tagsVirtualized, tagLoading, tagLoadingMore, tagItems.length, tagTotal, tagsNearEnd, loadMoreTags]);

  const updatePromptValue = useCallback((updater) => {
    setLocalValue((prev) => {
      const base = typeof prev === 'string' ? prev : '';
      const next = typeof updater === 'function' ? updater(base) : String(updater || '');
      if (variant === 'page') {
        onChange?.(next);
      }
      return next;
    });
  }, [onChange, variant]);

  const insertAtCursor = useCallback((insertText) => {
    const text = String(insertText || '').trim();
    if (!text) return;
    updatePromptValue((current) => {
      const start = current.length;
      const end = current.length;
      const before = current.slice(0, start);
      const after = current.slice(end);
      const prevCharMatch = before.match(/[^\s]$/);
      const nextCharMatch = after.match(/^[^\s]/);
      const needsLeading = prevCharMatch && prevCharMatch[0] !== ',' ? ', ' : '';
      const needsTrailing = nextCharMatch && nextCharMatch[0] !== ',' ? ', ' : '';
      return before + needsLeading + text + needsTrailing + after;
    });
    if (inputRef.current) {
      try {
        inputRef.current.blur();
      } catch {
        /* ignore */
      }
    }
  }, [updatePromptValue]);

  const [composerInput, setComposerInput] = useState('');

  const handleAddInput = useCallback(() => {
    const raw = String(composerInput || '').trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const joined = parts.join(', ');
    if (!joined) return;
    insertAtCursor(joined);
    setComposerInput('');
    setActiveTab('compose');
  }, [composerInput, insertAtCursor]);

  const clearComposerCollection = useCallback(() => {
    setComposerCollectedTags([]);
    setCollectionStatus('Cleared collected tags.');
  }, []);

  const applyComposerCollection = useCallback(() => {
    if (!composerCollectedTags.length) {
      setCollectionStatus('No tags to apply.');
      return;
    }
    insertAtCursor(composerCollectedTags.join(', '));
    setCollectionStatus(`Applied ${composerCollectedTags.length} tag${composerCollectedTags.length === 1 ? '' : 's'}.`);
    setComposerCollectedTags([]);
    setActiveTab('compose');
  }, [composerCollectedTags, insertAtCursor]);

  const toggleComposerTag = useCallback((tag) => {
    const normalized = String(tag || '').trim();
    if (!normalized) return;
    setComposerCollectedTags((prev) => {
      const target = normalized.toLowerCase();
      const exists = prev.some((t) => t.toLowerCase() === target);
      if (exists) {
        setCollectionStatus(`Removed: ${normalized}`);
        return prev.filter((t) => t.toLowerCase() !== target);
      }
      setCollectionStatus(`Selected: ${normalized}`);
      return [...prev, normalized];
    });
  }, []);

  const toggleComposerAlias = useCallback((token) => {
    const normalized = String(token || '').trim();
    if (!normalized) return;
    setComposerCollectedAliases((prev) => {
      const target = normalized.toLowerCase();
      const exists = prev.some((t) => t.toLowerCase() === target);
      if (exists) {
        setAliasCollectionStatus(`Removed: ${normalized}`);
        return prev.filter((t) => t.toLowerCase() !== target);
      }
      setAliasCollectionStatus(`Selected: ${normalized}`);
      return [...prev, normalized];
    });
  }, []);

  const clearComposerAliases = useCallback(() => {
    setComposerCollectedAliases([]);
    setAliasCollectionStatus('Cleared selected aliases.');
  }, []);

  const applyComposerAliases = useCallback(() => {
    if (!composerCollectedAliases.length) {
      setAliasCollectionStatus('No aliases to apply.');
      return;
    }
    const insertText = composerCollectedAliases.map((token) => `$${token}$`).join(', ');
    insertAtCursor(insertText);
    setAliasCollectionStatus(
      `Applied ${composerCollectedAliases.length} alias${composerCollectedAliases.length === 1 ? '' : 'es'}.`
    );
    setComposerCollectedAliases([]);
    setActiveTab('compose');
  }, [composerCollectedAliases, insertAtCursor]);

  const activeSelection = activeTab === 'tags'
    ? {
        kind: 'tag',
        count: composerCollectedTags.length,
        status: collectionStatus,
        onClear: clearComposerCollection,
        onApply: applyComposerCollection,
      }
    : activeTab === 'aliases'
      ? {
          kind: 'alias',
          count: composerCollectedAliases.length,
          status: aliasCollectionStatus,
          onClear: clearComposerAliases,
          onApply: applyComposerAliases,
        }
      : null;
  const activeSelectionCount = activeSelection?.count || 0;
  const activeSelectionLabel = activeSelection
    ? `${activeSelectionCount} ${
        activeSelection.kind === 'alias'
          ? (activeSelectionCount === 1 ? 'alias' : 'aliases')
          : (activeSelectionCount === 1 ? activeSelection.kind : `${activeSelection.kind}s`)
      } selected`
    : '';
  const showSelectionFooter = !isPage && activeSelectionCount > 0;
  const showSelectionFloat = isPage && activeSelectionCount > 0;
  const selectionFloatStyle = showSelectionFloat
    ? { '--composer-selection-offset': 'var(--bottom-nav-height, 64px)' }
    : undefined;

  const selectionBarProps = activeSelection
    ? {
        label: activeSelectionLabel,
        status: activeSelection.status,
        onClear: activeSelection.onClear,
        onApply: activeSelection.onApply,
        applyLabel: 'Insert',
        disabled: !activeSelectionCount,
      }
    : null;
  const selectionFooter = showSelectionFooter && selectionBarProps
    ? (
      <ComposerSelectionBar
        {...selectionBarProps}
        className="is-footer"
      />
    )
    : null;
  const selectionFloat = showSelectionFloat && selectionBarProps
    ? (
      <ComposerSelectionBar
        {...selectionBarProps}
        className="is-floating"
        style={selectionFloatStyle}
      />
    )
    : null;

  const handleRemoveElement = (element) => {
    updatePromptValue((prev) => removeElement(prev || '', element));
  };

  const openStrengthFor = (element) => {
    if (!element) return;
    let displayName = element.text;
    if (element.type === 'alias') {
      const entry = aliasByToken.get(element.text.toLowerCase());
      displayName = entry?.displayName || element.text;
    }
    if (element.type === 'alias') {
      const entry = aliasByToken.get(element.text.toLowerCase());
      setTokenEditCategory(entry?.category || 'All');
      setTokenEditSubcategory(entry?.subcategory || 'All');
    } else {
      setTokenEditCategory('All');
      setTokenEditSubcategory('All');
    }
    const weightInfo = getElementWeight(localValue || '', element);
    setStrengthToken({
      element,
      displayName,
      weight: weightInfo?.weight ?? 1,
    });
    setTokenEditSearch('');
    setTokenEditCategory('All');
    setStrengthOpen(true);
  };

  // Reorder elements and rebuild the text
  const handleReorderElements = useCallback((fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx === null || toIdx === null) return;
    if (!elements?.length) return;
    updatePromptValue((prev) => reorderElements(prev || '', elements, fromIdx, toIdx));
  }, [elements, updatePromptValue]);

  // Drag handlers
  const handleDragStart = useCallback((e, idx) => {
    setDragIndex(idx);
    dragNodeRef.current = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
    // Add dragging class after a frame to allow the drag image to be captured
    requestAnimationFrame(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.classList.add('is-dragging');
      }
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.classList.remove('is-dragging');
    }
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      handleReorderElements(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
    dragNodeRef.current = null;
  }, [dragIndex, dropIndex, handleReorderElements]);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dropIndex) {
      setDropIndex(idx);
    }
  }, [dropIndex]);

  const handleDragLeave = useCallback(() => {
    // Don't clear dropIndex here to prevent flickering
  }, []);

  // Touch handlers for mobile drag-and-drop
  const handleTouchStart = useCallback((e, idx) => {
    const isInteractive = e.target?.closest?.('button, a, input, select, textarea, .composer-token-shift');
    if (isInteractive) return;
    const touch = e.touches[0];
    const timer = window.setTimeout(() => {
      if (!touchStartRef.current) return;
      touchStartRef.current.active = true;
      setDragIndex(idx);
      setDropIndex(idx);
    }, 240);

    touchStartRef.current = {
      idx,
      startX: touch.clientX,
      startY: touch.clientY,
      active: false,
      timer,
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.startY);

    if (!touchStartRef.current.active) {
      if (deltaX > 8 || deltaY > 8) {
        window.clearTimeout(touchStartRef.current.timer);
        touchStartRef.current = null;
      }
      return;
    }

    e.preventDefault();

    // Find which token we're over
    const tokenElements = document.querySelectorAll('.composer-token-draggable');
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    for (let i = 0; i < tokenElements.length; i++) {
      const rect = tokenElements[i].getBoundingClientRect();
      if (touchX >= rect.left && touchX <= rect.right && touchY >= rect.top && touchY <= rect.bottom) {
        setDropIndex(i);
        break;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartRef.current?.timer) {
      window.clearTimeout(touchStartRef.current.timer);
    }
    if (touchStartRef.current?.active && dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      handleReorderElements(dragIndex, dropIndex);
    }
    touchStartRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, dropIndex, handleReorderElements]);

  const handleTouchCancel = useCallback(() => {
    if (touchStartRef.current?.timer) {
      window.clearTimeout(touchStartRef.current.timer);
    }
    touchStartRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, []);

  const handleSave = () => {
    onChange?.(localValue);
    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  if (!isVisible) return null;

  const composerShell = (
    <div className={`composer-shell ${isPage ? 'ui-card' : ''} ${showSelectionFloat ? 'has-selection-float' : ''}`}>
        <div className="composer-tabs-wrap">
          <SegmentedTabs
            ariaLabel="Composer tabs"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'compose', label: 'Compose', icon: <IconEdit size={14} /> },
              { key: 'aliases', label: 'Aliases', icon: <IconAlias size={14} /> },
              { key: 'tags', label: 'Tags', icon: <IconTag size={14} /> },
            ]}
          />
        </div>

        <div className={`composer-panel composer-panel-compose ${activeTab === 'compose' ? 'is-visible' : ''}`}>
          <div className="composer-editor">
            <div className="composer-input-row">
              <input
                ref={inputRef}
                type="text"
                value={composerInput}
                onChange={(e) => setComposerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInput();
                  }
                }}
                className="composer-input ui-control ui-input is-compact"
                placeholder="Add prompt text"
                aria-label="Add prompt text"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleAddInput}
                disabled={!composerInput.trim()}
                aria-label="Add prompt text"
              >
                +
              </Button>
            </div>
          </div>

          <div className="composer-tokens">
            <div className="composer-tokens-header">
              <span className="composer-tokens-label">
                Elements
                <span className="composer-tokens-count">{elements.length}</span>
              </span>
              <span className="composer-tokens-hint">Drag to reorder · Tap to adjust</span>
            </div>
            {elements.length ? (
              <div
                ref={tokensListRef}
                className={`composer-tokens-list ${dragIndex !== null ? 'is-dragging' : ''}`}
                style={{ '--composer-elements': elements.length }}
              >
                {elements.map((el, idx) => {
                  let displayName = el.text;
                  if (el.type === 'alias') {
                    const entry = aliasByToken.get(el.text.toLowerCase());
                    displayName = entry?.displayName || el.text;
                  }
                  const isDragging = dragIndex === idx;
                  const isDropTarget = dropIndex === idx && dragIndex !== null && dragIndex !== idx;
                  const weightInfo = getElementWeight(localValue || '', el);
                  const weight = weightInfo?.weight ?? 1;

                  return (
                    <span
                      key={`${el.type}-${el.text}-${el.start}`}
                      className={`composer-token composer-token-draggable ${el.type === 'alias' ? 'is-alias' : 'is-tag'} ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''} ${selectedTokenIndex === idx ? 'is-selected' : ''}`}
                      title={el.type === 'alias' ? `Alias: $${el.text}$` : `Tag: ${el.text}`}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onTouchStart={(e) => handleTouchStart(e, idx)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchCancel}
                      onClick={() => {
                        if (dragIndex !== null) return;
                        setSelectedTokenIndex(idx);
                        openStrengthFor(el);
                      }}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (dragIndex !== null) return;
                          setSelectedTokenIndex(idx);
                          openStrengthFor(el);
                        }
                      }}
                    >
                      <span className="composer-token-order">{idx + 1}</span>
                      <span className="composer-token-drag-handle" aria-hidden="true"><IconGrip size={10} /></span>
                      <span className="composer-token-name">{displayName}</span>
                      {el.type === 'alias' && <span className="composer-token-type">$</span>}
                      {Math.abs(weight - 1) > 1e-6 && (
                        <span className="composer-token-weight">
                          {formatTokenWeight(weight)}×
                        </span>
                      )}
                      <Button
                        size="mini"
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveElement(el);
                        }}
                        aria-label={`Remove ${el.text}`}
                      >
                        <IconX size={9} />
                      </Button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="composer-empty">No elements yet.</div>
            )}
          </div>

          <div className={`composer-expanded ${expandedOpen ? 'is-open' : 'is-collapsed'}`}>
            <div
              className="composer-expanded-header"
              role="button"
              tabIndex={0}
              aria-expanded={expandedOpen}
              aria-controls="composer-expanded-box"
              onClick={() => setExpandedOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedOpen((prev) => !prev);
                }
              }}
            >
              <span className="composer-expanded-label">Expanded prompt</span>
              <div className="composer-expanded-actions">
                <span className="composer-expanded-meta">
                  {expandedPrompt.text ? `${expandedPrompt.text.length} chars` : 'Empty'}
                </span>
              </div>
            </div>
            {expandedOpen ? (
              <div
                id="composer-expanded-box"
                className="composer-expanded-box"
                aria-label="Expanded prompt"
              >
                {expandedPrompt.text ? (
                  expandedPrompt.parts.map((part, idx) => (
                    part.isAlias ? (
                      <span key={`alias-${idx}`} className="composer-expanded-alias">
                        {part.text}
                      </span>
                    ) : (
                      <span key={`text-${idx}`}>{part.text}</span>
                    )
                  ))
                ) : (
                  'No prompt yet.'
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className={`composer-panel composer-panel-aliases ${activeTab === 'aliases' ? 'is-visible' : ''}`}>
          <div className="composer-browser-header">
            <div className="composer-filters">
              <TopicTabs activeTopic={pickerTopic} onTopicChange={setPickerTopic} />
              <div className="input-with-action">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search aliases…"
                  className="composer-search ui-control ui-input"
                  aria-label="Search aliases"
                />
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setPickerSearch('')}
                  disabled={!pickerSearch}
                >
                  Clear
                </Button>
              </div>
              <Select
                value={pickerCategory}
                onChange={setPickerCategory}
                wrapperClassName="composer-subcategory-select"
                aria-label="Filter by category"
                size="sm"
                searchThreshold={0}
                options={categoryOptions.map((c) => ({
                  value: c,
                  label: c === 'All' ? 'Category: All' : formatCategoryLabel(c),
                }))}
              />
              {subcategoryOptions.length > 2 && (
                <Select
                  value={pickerSubcategory}
                  onChange={setPickerSubcategory}
                  wrapperClassName="composer-subcategory-select"
                  size="sm"
                  searchThreshold={0}
                  options={subcategoryOptions.map((c) => ({
                    value: c,
                    label: c === 'All' ? 'All subcategories' : formatSubcategoryLabel(c),
                  }))}
                />
              )}
            </div>

            <div className="composer-browser-meta">
              <span>
                Showing {visibleAliases.length} of {filteredAliases.length} aliases
              </span>
            </div>
          </div>

          <div className="composer-alias-list">
            {filteredAliases.length === 0 ? (
              <div className="composer-alias-empty">No aliases found.</div>
            ) : (
              <>
                {visibleAliases.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => toggleComposerAlias(entry.token)}
                    className={`composer-alias-item ${composerCollectedAliases.some(
                      (t) => t.toLowerCase() === entry.token.toLowerCase()
                    ) ? 'is-collected' : ''}`}
                    style={listItemVisibilityStyles}
                  >
                    <div className="composer-alias-header">
                      <div className="composer-alias-name">
                        {entry.displayName || entry.token}
                      </div>
                      {entry.category ? (
                        <span className="composer-alias-category">{formatCategoryLabel(entry.category)}</span>
                      ) : null}
                    </div>
                    <div className="composer-alias-token">${entry.token}$</div>
                    <div className="composer-alias-text">{entry.text}</div>
                  </button>
                ))}
                {visibleCount < filteredAliases.length && (
                  <div ref={sentinelRef} className="composer-sentinel" />
                )}
              </>
            )}
          </div>
        </div>

        <div
          className={`composer-panel composer-panel-tags ${activeTab === 'tags' ? 'is-visible' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="composer-browser-header">
            <div className="composer-filters">
              <div className="input-with-action">
                <input
                  ref={tagSearchRef}
                  type="search"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  placeholder="Search tags… (e.g. smile, city, sword)"
                  className="composer-search ui-control ui-input"
                  aria-label="Search tags"
                />
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setTagQuery('')}
                  disabled={!tagQuery}
                >
                  Clear
                </Button>
              </div>
              <Select
                value={tagCategory}
                onChange={setTagCategory}
                wrapperClassName="composer-subcategory-select"
                aria-label="Filter by category"
                size="sm"
                searchThreshold={0}
                options={[
                  { value: '', label: 'Category: All' },
                  ...tagCategories.map((c) => ({
                    value: c.key,
                    label: `${formatSubcategoryLabel(c.key)} (${Number(c.actual || c.count || 0).toLocaleString()})`,
                  })),
                ]}
              />
              <div className="composer-sort-row">
                <Select
                  value={tagSort}
                  onChange={setTagSort}
                  wrapperClassName="composer-subcategory-select"
                  aria-label="Sort tags"
                  size="sm"
                  options={[
                    { value: 'count', label: 'Sort: Popular' },
                    { value: 'alpha', label: 'Sort: A–Z' },
                  ]}
                />
                <div className="composer-min-count">
                  <span className="composer-filter-divider" aria-hidden="true">|</span>
                  <label className="composer-min-count-label" htmlFor="composer-min-count">
                    Minimum count
                  </label>
                  <input
                    id="composer-min-count"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={tagMinCount}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (nextValue === '' || Number(nextValue) >= 0) {
                        setTagMinCount(nextValue);
                      }
                    }}
                    className="ui-control ui-input is-compact composer-min-count-input"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {tagError ? <div className="composer-tags-error">{tagError}</div> : null}

            <div className="composer-browser-meta">
              <span>
                {tagLoading
                  ? 'Loading tags…'
                  : tagTotal
                    ? `${tagItems.length} of ${tagTotal} tags`
                    : `${tagItems.length} tags`}
              </span>
              {tagLoadingMore ? <span>Loading more…</span> : null}
            </div>
          </div>

          <div className="composer-alias-list composer-tags-grid" role="list" ref={tagListRef}>
            {tagLoading ? (
              <div className="composer-alias-empty">Loading tags…</div>
            ) : tagItems.length === 0 ? (
              <div className="composer-alias-empty">No tags found.</div>
            ) : (
              <>
                {tagsVirtualized && tagTopSpacer > 0 ? (
                  <div aria-hidden style={{ height: `${tagTopSpacer}px` }} />
                ) : null}
                {visibleTags.map((t) => (
                  <TagComposerRow
                    key={`${t.tag}-${t.category}`}
                    tag={t.tag}
                    category={t.category}
                    count={t.count}
                    isCollected={composerCollectedTags.some(
                      (tag) => tag.toLowerCase() === String(t.tag || '').toLowerCase()
                    )}
                    onToggle={toggleComposerTag}
                    visibilityStyle={listItemVisibilityStyles}
                  />
                ))}
                {tagsVirtualized && tagBottomSpacer > 0 ? (
                  <div aria-hidden style={{ height: `${tagBottomSpacer}px` }} />
                ) : null}
                {tagItems.length < tagTotal && !tagsVirtualized ? (
                  <div ref={tagSentinelRef} className="composer-sentinel" />
                ) : null}
                {tagLoadingMore ? (
                  <div className="composer-alias-empty">Loading more…</div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
  );

  const tokenEditAliases = useMemo(() => {
    return aliasEntries.map((entry) => ({
      key: entry.key || entry.token,
      token: entry.token,
      displayName: entry.displayName || entry.name || entry.token,
      category: entry.category,
      subcategory: entry.subcategory,
      name: entry.name,
    }));
  }, [aliasEntries]);

  const tokenEditTags = useMemo(() => {
    return tokenEditTagItems.map((t) => ({
      key: `${t.tag}-${t.category}`,
      tag: t.tag,
      displayName: t.tag,
      category: t.category,
      count: t.count,
    }));
  }, [tokenEditTagItems]);

  const handleTokenEditReplace = useCallback((item) => {
    if (!strengthToken?.element) return;
    const nextType = item.type === 'alias' ? 'alias' : 'tag';
    const nextToken = item.token || item.tag || '';
    updatePromptValue((prev) => {
      const raw = String(prev || '');
      const weightInfo = getElementWeight(raw, strengthToken.element);
      const cleaned = String(nextToken || '').replace(/^\$|\$$/g, '').trim();
      if (!cleaned) return raw;
      const core = nextType === 'alias' ? `$${cleaned}$` : cleaned;
      const replacement = weightInfo
        ? `(${core}:${formatTokenWeight(weightInfo.weight)})`
        : core;
      return replaceElement(raw, strengthToken.element, replacement);
    });
    setStrengthOpen(false);
    setStrengthToken(null);
  }, [strengthToken, updatePromptValue]);

  const handleTokenEditWeightChange = useCallback((weight) => {
    if (!strengthToken?.element) return;
    updatePromptValue((prev) => setElementWeight(prev || '', strengthToken.element, weight));
    setStrengthToken((prev) => (prev ? { ...prev, weight } : null));
  }, [strengthToken, updatePromptValue]);

  const strengthSheet = (
    <TokenEditSheet
      open={strengthOpen}
      onClose={() => {
        setStrengthOpen(false);
        setStrengthToken(null);
      }}
      mode="edit"
      tokenType={strengthToken?.element?.type || 'tag'}
      tokenLabel={strengthToken?.element?.text || ''}
      tokenDisplay={strengthToken?.displayName || ''}
      weight={strengthToken?.weight ?? 1}
      onWeightChange={handleTokenEditWeightChange}
      deferWeightApply
      onDelete={() => {
        if (!strengthToken?.element) return;
        handleRemoveElement(strengthToken.element);
      }}
      aliases={tokenEditAliases}
      aliasCategories={categoryOptions}
      aliasLoading={false}
      tags={tokenEditTags}
      tagLoading={tokenEditTagLoading || tokenEditTagLoadingMore}
      tagHasMore={tokenEditTagItems.length < tokenEditTagTotal}
      onLoadTags={loadTagsForTokenEdit}
      onLoadMoreTags={loadMoreTagsForTokenEdit}
      replacementSearch={tokenEditSearch}
      onReplacementSearchChange={setTokenEditSearch}
      onReplace={handleTokenEditReplace}
      activeCategory={tokenEditCategory}
      onCategoryChange={setTokenEditCategory}
      initialCategory={tokenEditCategory}
      initialSubcategory={tokenEditSubcategory}
    />
  );


  const pageHeader = (
    <div className="page-bar composer-bar">
      <h1 className="page-bar-title">{fieldLabel || 'Prompt'}</h1>
    </div>
  );


  if (isPage) {
    return (
      <>
        <div className="page-shell page-stack">
          {pageHeader}
          {composerShell}
        </div>
        {selectionFloat}
        {strengthSheet}
      </>
    );
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={handleCancel}
        title="Composer"
        variant="fullscreen"
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        footer={(
          <div className="composer-footer-stack">
            {selectionFooter}
            <div className="flex gap-2">
              <Button variant="muted" className="w-full" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" className="w-full" onClick={handleSave}>
                Apply
              </Button>
            </div>
          </div>
        )}
      >
        {composerShell}
      </BottomSheet>
      {strengthSheet}
    </>
  );
}
