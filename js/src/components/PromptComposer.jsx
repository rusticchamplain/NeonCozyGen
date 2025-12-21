// js/src/components/PromptComposer.jsx
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from './ui/BottomSheet';
import SegmentedTabs from './ui/SegmentedTabs';
import TokenStrengthSheet from './ui/TokenStrengthSheet';
import Select from './ui/Select';
import { IconGrip, IconX, IconTag, IconAlias, IconEdit } from './Icons';
import { formatCategoryLabel, formatSubcategoryLabel, presentAliasEntry } from '../utils/aliasPresentation';

import {
  formatTokenWeight,
  parsePromptElements,
  getElementWeight,
  setElementWeight,
  reorderElements,
  removeElement,
} from '../utils/tokenWeights';
import { getDanbooruTagCategories, searchDanbooruTags } from '../api';

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
  const [pickerCategory, setPickerCategory] = useState('All');
  const [pickerSubcategory, setPickerSubcategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'aliases'

  // Drag and drop state
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(null);
  const dragNodeRef = useRef(null);
  const touchStartRef = useRef(null);
  const [strengthOpen, setStrengthOpen] = useState(false);
  const [strengthToken, setStrengthToken] = useState(null);

  // Tag library state
  const tagSearchRef = useRef(null);
  const tagSentinelRef = useRef(null);
  const [tagQuery, setTagQuery] = useState('');
  const [tagCategory, setTagCategory] = useState('');
  const [tagSort, setTagSort] = useState('count');
  const [tagCategories, setTagCategories] = useState([]);
  const [tagItems, setTagItems] = useState([]);
  const [tagTotal, setTagTotal] = useState(0);
  const [tagOffset, setTagOffset] = useState(0);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagLoadingMore, setTagLoadingMore] = useState(false);
  const [tagError, setTagError] = useState('');
  const tagSearchAbortRef = useRef(null);
  const tagLoadAbortRef = useRef(null);
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
      setComposerInput('');
      // Reset tag library state
      setTagQuery('');
      setTagCategory('');
      setTagSort('count');
      setTagItems([]);
      setTagTotal(0);
      setTagOffset(0);
      setTagLoading(false);
      setTagLoadingMore(false);
      setTagError('');
    }
  }, [open, value]);

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
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [aliasEntries]);

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
        if (pickerCategory !== 'All' && (e.category || '') !== pickerCategory) return false;
        if (pickerSubcategory !== 'All' && (e.subcategory || 'other') !== pickerSubcategory)
          return false;
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
        return a.token.localeCompare(b.token);
      });
  }, [aliasEntries, pickerCategory, pickerSubcategory, deferredPickerSearch]);

  const visibleAliases = useMemo(
    () => filteredAliases.slice(0, visibleCount),
    [filteredAliases, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(30);
  }, [pickerCategory, pickerSubcategory, pickerSearch, aliasEntries]);

  useEffect(() => {
    setPickerSubcategory('All');
  }, [pickerCategory]);

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

  // Tag library: search function
  const searchTags = useCallback(async ({ nextQuery, nextCategory, nextSort } = {}) => {
    const q = typeof nextQuery === 'string' ? nextQuery : tagQuery;
    const c = typeof nextCategory === 'string' ? nextCategory : tagCategory;
    const s = typeof nextSort === 'string' ? nextSort : tagSort;
    setTagLoading(true);
    setTagError('');
    setTagOffset(0);
    if (tagSearchAbortRef.current) {
      tagSearchAbortRef.current.abort();
    }
    const controller = new AbortController();
    tagSearchAbortRef.current = controller;
    try {
      const res = await searchDanbooruTags(
        { q, category: c, sort: s, limit: 80, offset: 0 },
        { signal: controller.signal }
      );
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
      if (tagSearchAbortRef.current === controller) {
        tagSearchAbortRef.current = null;
      }
      setTagLoading(false);
    }
  }, [tagCategory, tagQuery, tagSort]);

  // Tag library: load more function
  const loadMoreTags = useCallback(async () => {
    if (tagLoading || tagLoadingMore) return;
    if (tagItems.length >= tagTotal) return;
    const nextOffset = tagOffset + 80;
    setTagLoadingMore(true);
    setTagError('');
    if (tagLoadAbortRef.current) {
      tagLoadAbortRef.current.abort();
    }
    const controller = new AbortController();
    tagLoadAbortRef.current = controller;
    try {
      const res = await searchDanbooruTags(
        { q: tagQuery, category: tagCategory, sort: tagSort, limit: 80, offset: nextOffset },
        { signal: controller.signal }
      );
      const nextItems = res?.items || [];
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
      if (tagLoadAbortRef.current === controller) {
        tagLoadAbortRef.current = null;
      }
      setTagLoadingMore(false);
    }
  }, [tagCategory, tagLoading, tagLoadingMore, tagOffset, tagQuery, tagSort, tagItems.length, tagTotal]);

  // Tag library: debounced search when filters change
  useEffect(() => {
    if (!open || activeTab !== 'tags') return;
    const handle = window.setTimeout(() => {
      searchTags();
    }, 220);
    return () => window.clearTimeout(handle);
  }, [open, activeTab, tagQuery, tagCategory, tagSort, searchTags]);

  useEffect(() => {
    return () => {
      if (tagSearchAbortRef.current) {
        tagSearchAbortRef.current.abort();
      }
      if (tagLoadAbortRef.current) {
        tagLoadAbortRef.current.abort();
      }
    };
  }, []);

  // Tag library: infinite scroll sentinel
  useEffect(() => {
    if (!open || activeTab !== 'tags') return;
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
  }, [open, activeTab, loadMoreTags]);

  const tagTotalLabel = tagTotal ? `${tagItems.length.toLocaleString()} / ${tagTotal.toLocaleString()}` : `${tagItems.length.toLocaleString()}`;

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

  const removeComposerTag = useCallback((tag) => {
    const target = String(tag || '').trim().toLowerCase();
    if (!target) return;
    setComposerCollectedTags((prev) => prev.filter((t) => t.toLowerCase() !== target));
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

  const removeComposerAlias = useCallback((token) => {
    const target = String(token || '').trim().toLowerCase();
    if (!target) return;
    setComposerCollectedAliases((prev) => prev.filter((t) => t.toLowerCase() !== target));
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

  const handleRemoveElement = (element) => {
    updatePromptValue((prev) => removeElement(prev || '', element));
  };

  const moveElementBy = useCallback((idx, delta) => {
    if (!elements?.length) return;
    const target = idx + delta;
    if (target < 0 || target >= elements.length) return;
    updatePromptValue((prev) => reorderElements(prev || '', elements, idx, target));
    setSelectedTokenIndex(target);
  }, [elements, updatePromptValue]);

  const openStrengthFor = (element) => {
    if (!element) return;
    let displayName = element.text;
    if (element.type === 'alias') {
      const entry = aliasByToken.get(element.text.toLowerCase());
      displayName = entry?.displayName || element.text;
    }
    const weightInfo = getElementWeight(localValue || '', element);
    setStrengthToken({
      element,
      displayName,
      weight: weightInfo?.weight ?? 1,
    });
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
    const isHandle = e.target?.closest?.('.composer-token-drag-handle');
    if (!isHandle) return;
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

  const isPage = variant === 'page';
  const isVisible = isPage || open;
  if (!isVisible) return null;

  const composerShell = (
    <div className={`composer-shell ${isPage ? 'is-page' : ''}`}>
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
              <button
                type="button"
                className="composer-add-btn"
                onClick={handleAddInput}
                disabled={!composerInput.trim()}
                aria-label="Add prompt text"
              >
                +
              </button>
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
                      <div className="composer-token-shift" role="group" aria-label="Reorder token">
                        <button
                          type="button"
                          className="composer-token-shift-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveElementBy(idx, -1);
                          }}
                          aria-label="Move up"
                          disabled={idx === 0}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="composer-token-shift-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveElementBy(idx, 1);
                          }}
                          aria-label="Move down"
                          disabled={idx === elements.length - 1}
                        >
                          ▼
                        </button>
                      </div>
                      <button
                        type="button"
                        className="composer-token-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveElement(el);
                        }}
                        aria-label={`Remove ${el.text}`}
                      >
                        <IconX size={9} />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="composer-empty">No elements yet.</div>
            )}
          </div>

          <div className="composer-expanded">
            <div className="composer-expanded-header">
              <span className="composer-expanded-label">Expanded prompt</span>
              <span className="composer-expanded-meta">
                {expandedPrompt.text ? `${expandedPrompt.text.length} chars` : 'Empty'}
              </span>
            </div>
            <div className="composer-expanded-box" aria-label="Expanded prompt">
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
          </div>
        </div>

        <div className={`composer-panel composer-panel-aliases ${activeTab === 'aliases' ? 'is-visible' : ''}`}>
          <div className="composer-filters">
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
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setPickerSearch('')}
                disabled={!pickerSearch}
              >
                Clear
              </button>
            </div>
            <Select
              value={pickerCategory}
              onChange={setPickerCategory}
              className="composer-subcategory-select"
              aria-label="Filter by category"
              size="sm"
              options={categoryOptions.map((c) => ({
                value: c,
                label: c === 'All' ? 'Category: All' : formatCategoryLabel(c),
              }))}
            />
            {subcategoryOptions.length > 2 && (
              <Select
                value={pickerSubcategory}
                onChange={setPickerSubcategory}
                className="composer-subcategory-select"
                size="sm"
                options={subcategoryOptions.map((c) => ({
                  value: c,
                  label: c === 'All' ? 'All subcategories' : formatSubcategoryLabel(c),
                }))}
              />
            )}
          </div>

          <div className="composer-tag-collection-bar is-sticky">
            <div>
              <div className="composer-tag-collection-label">
                {composerCollectedAliases.length ? `${composerCollectedAliases.length} selected` : 'No aliases selected'}
              </div>
              {aliasCollectionStatus ? (
                <div className="composer-tag-collection-status">{aliasCollectionStatus}</div>
              ) : null}
            </div>
            <div className="composer-tag-collection-actions">
              <button
                type="button"
                className="composer-tag-collection-btn"
                onClick={clearComposerAliases}
                disabled={!composerCollectedAliases.length}
              >
                Clear
              </button>
              <button
                type="button"
                className="composer-tag-collection-btn is-primary"
                onClick={applyComposerAliases}
                disabled={!composerCollectedAliases.length}
              >
                Apply
              </button>
            </div>
          </div>
          {composerCollectedAliases.length ? (
            <div className="composer-collection-inline" role="list">
              {composerCollectedAliases.slice(0, 3).map((token) => {
                const entry = aliasByToken.get(token.toLowerCase());
                const display = entry?.displayName || token;
                return (
                  <button
                    key={token}
                    type="button"
                    className="collected-tag-chip"
                    onClick={() => removeComposerAlias(token)}
                    aria-label={`Remove ${token}`}
                    title={`$${token}$`}
                  >
                    <code className="collected-tag-code">{display}</code>
                    <IconX size={12} />
                  </button>
                );
              })}
              {composerCollectedAliases.length > 3 ? (
                <div className="collected-tag-chip tag-overflow-chip" aria-hidden="true">
                  +{composerCollectedAliases.length - 3} more
                </div>
              ) : null}
            </div>
          ) : null}

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
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setTagQuery('')}
                disabled={!tagQuery}
              >
                Clear
              </button>
            </div>
            <Select
              value={tagCategory}
              onChange={setTagCategory}
              className="composer-subcategory-select"
              aria-label="Filter by category"
              size="sm"
              options={[
                { value: '', label: 'Category: All' },
                ...tagCategories.map((c) => ({
                  value: c.key,
                  label: `${formatSubcategoryLabel(c.key)} (${Number(c.actual || c.count || 0).toLocaleString()})`,
                })),
              ]}
            />
            <Select
              value={tagSort}
              onChange={setTagSort}
              className="composer-subcategory-select"
              aria-label="Sort tags"
              size="sm"
              options={[
                { value: 'count', label: 'Sort: Popular' },
                { value: 'alpha', label: 'Sort: A–Z' },
              ]}
            />
          </div>

          <div className="composer-tags-header">
            <div className="composer-tags-hint">
              <span className="ml-3 opacity-80">{tagTotalLabel}</span>
            </div>
          </div>
          <div className="composer-tag-collection-bar is-sticky">
            <div>
              <div className="composer-tag-collection-label">
                {composerCollectedTags.length ? `${composerCollectedTags.length} selected` : 'No tags selected'}
              </div>
              {collectionStatus ? (
                <div className="composer-tag-collection-status">{collectionStatus}</div>
              ) : null}
            </div>
            <div className="composer-tag-collection-actions">
              <button
                type="button"
                className="composer-tag-collection-btn"
                onClick={clearComposerCollection}
                disabled={!composerCollectedTags.length}
              >
                Clear
              </button>
              <button
                type="button"
                className="composer-tag-collection-btn is-primary"
                onClick={applyComposerCollection}
                disabled={!composerCollectedTags.length}
              >
                Apply
              </button>
            </div>
          </div>
          {composerCollectedTags.length ? (
            <div className="composer-collection-inline" role="list">
              {composerCollectedTags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="collected-tag-chip"
                  onClick={() => removeComposerTag(tag)}
                  aria-label={`Remove ${tag}`}
                >
                  <code className="collected-tag-code">{tag}</code>
                  <IconX size={12} />
                </button>
              ))}
              {composerCollectedTags.length > 3 ? (
                <div className="collected-tag-chip tag-overflow-chip" aria-hidden="true">
                  +{composerCollectedTags.length - 3} more
                </div>
              ) : null}
            </div>
          ) : null}
          {tagError ? <div className="composer-tags-error">{tagError}</div> : null}

          <div className="composer-alias-list composer-tags-grid" role="list">
            {tagLoading ? (
              <div className="composer-alias-empty">Loading tags…</div>
            ) : tagItems.length === 0 ? (
              <div className="composer-alias-empty">No tags found.</div>
            ) : (
              <>
                {tagItems.map((t) => {
                  const isCollected = composerCollectedTags.some(
                    (tag) => tag.toLowerCase() === String(t.tag || '').toLowerCase()
                  );
                  return (
                    <button
                      key={`${t.tag}-${t.category}`}
                      type="button"
                      className={`composer-alias-item composer-tag-item ${isCollected ? 'is-collected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleComposerTag(t.tag);
                      }}
                      style={listItemVisibilityStyles}
                    >
                    <div className="composer-alias-header">
                      <div className="composer-alias-name composer-tag-name">
                        <code className="composer-tag-code">{t.tag}</code>
                      </div>
                      {t.category ? (
                        <span className="composer-alias-category">
                          {formatSubcategoryLabel(t.category)}
                        </span>
                      ) : null}
                    </div>
                    <div className="composer-alias-token composer-tag-count">{Number(t.count || 0).toLocaleString()}</div>
                  </button>
                  );
                })}
                {tagItems.length < tagTotal && (
                  <div ref={tagSentinelRef} className="composer-sentinel" />
                )}
                {tagLoadingMore ? (
                  <div className="composer-alias-empty">Loading more…</div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
  );

  const strengthSheet = (
    <TokenStrengthSheet
      open={strengthOpen}
      onClose={() => setStrengthOpen(false)}
      title={strengthToken?.element?.type === 'alias' ? 'Alias strength' : 'Tag strength'}
      tokenLabel={
        strengthToken
          ? strengthToken.element?.type === 'alias'
            ? `${strengthToken.displayName} • $${strengthToken.element?.text}$`
            : strengthToken.displayName
          : ''
      }
      weight={strengthToken?.weight ?? 1}
      onApply={(w) => {
        if (!strengthToken?.element) return;
        updatePromptValue((prev) => setElementWeight(prev || '', strengthToken.element, w));
      }}
      onRemoveWeight={() => {
        if (!strengthToken?.element) return;
        updatePromptValue((prev) => setElementWeight(prev || '', strengthToken.element, null));
      }}
      onDeleteToken={() => {
        if (!strengthToken?.element) return;
        handleRemoveElement(strengthToken.element);
      }}
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
          <div className="flex gap-2">
            <button type="button" className="ui-button is-muted w-full" onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className="ui-button is-primary w-full" onClick={handleSave}>
              Apply
            </button>
          </div>
        )}
      >
        {composerShell}
      </BottomSheet>
      {strengthSheet}
    </>
  );
}
