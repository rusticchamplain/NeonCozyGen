// js/src/components/PromptComposer.jsx
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from './ui/BottomSheet';
import TokenStrengthSheet from './ui/TokenStrengthSheet';
import { IconGrip, IconX, IconTag } from './Icons';
import { formatCategoryLabel, formatSubcategoryLabel, presentAliasEntry } from '../utils/aliasPresentation';

function safeCopy(text) {
  const value = String(text || '');
  if (!value) return false;
  try {
    navigator.clipboard?.writeText?.(value);
    return true;
  } catch {
    return false;
  }
}
import {
  formatTokenWeight,
  parsePromptElements,
  getElementWeight,
  setElementWeight,
  reorderElements,
  removeElement,
} from '../utils/tokenWeights';
import { getDanbooruTagCategories, searchDanbooruTags } from '../api';

export default function PromptComposer({
  open = false,
  onClose,
  value = '',
  onChange,
  aliasOptions = [],
  aliasCatalog = [],
  aliasLookup,
  fieldLabel = 'Prompt',
  variant = 'sheet', // 'sheet' or 'page'
}) {
  const textRef = useRef(null);
  const searchInputRef = useRef(null);
  const sentinelRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('All');
  const [pickerSubcategory, setPickerSubcategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'aliases'

  // Drag and drop state
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
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
  const [tagStatus, setTagStatus] = useState('');
  const [composerCollectedTags, setComposerCollectedTags] = useState([]);
  const [collectionSheetOpen, setCollectionSheetOpen] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState('');
  const composerCollectionTextareaRef = useRef(null);

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
      setStrengthOpen(false);
      setStrengthToken(null);
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
      setTagStatus('');
    }
  }, [open, value]);

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
    const term = pickerSearch.trim().toLowerCase();
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
  }, [aliasEntries, pickerCategory, pickerSubcategory, pickerSearch]);

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
    if (activeTab !== 'compose') return [];
    if (typeof localValue !== 'string') return [];
    return parsePromptElements(localValue);
  }, [activeTab, localValue]);

  // Expanded preview
  const deferredPreviewValue = useDeferredValue(localValue);
  const expandedPrompt = useMemo(() => {
    const MAX_PREVIEW_CHARS = 2600;
    const truncate = (s) =>
      s && s.length > MAX_PREVIEW_CHARS ? `${s.slice(0, MAX_PREVIEW_CHARS)}…` : s;
    if (activeTab !== 'compose') return '';
    const text = deferredPreviewValue || '';
    if (!text) return '';
    if (!aliasLookup || !text.includes('$')) return truncate(text);
    try {
      const expanded = text.replace(/\$([a-z0-9_:-]+)\$/gi, (match, key) => {
        const val = aliasLookup.get(key.toLowerCase());
        return typeof val === 'string' ? val : match;
      });
      return truncate(expanded);
    } catch {
      return truncate(text);
    }
  }, [activeTab, deferredPreviewValue, aliasLookup]);

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
    setTagStatus('');
    setTagOffset(0);
    try {
      const res = await searchDanbooruTags({ q, category: c, sort: s, limit: 80, offset: 0 });
      setTagItems(res?.items || []);
      setTagTotal(Number(res?.total || 0));
    } catch (e) {
      console.error('Failed to search tags', e);
      setTagError('Unable to load tags right now.');
      setTagItems([]);
      setTagTotal(0);
    } finally {
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
    try {
      const res = await searchDanbooruTags({ q: tagQuery, category: tagCategory, sort: tagSort, limit: 80, offset: nextOffset });
      const nextItems = res?.items || [];
      setTagItems((prev) => [...prev, ...nextItems]);
      setTagTotal(Number(res?.total || 0));
      setTagOffset(nextOffset);
    } catch (e) {
      console.error('Failed to load more tags', e);
      setTagError('Unable to load more tags.');
    } finally {
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

  const handleTextChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleInsertAlias = (token) => {
    const el = textRef.current;
    const insertText = `$${token}$`;
    const current = localValue || '';
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;

    const before = current.slice(0, start);
    const after = current.slice(end);
    const prevCharMatch = before.match(/[^\s]$/);
    const nextCharMatch = after.match(/^[^\s]/);
    const needsLeading = prevCharMatch && prevCharMatch[0] !== ',' ? ', ' : '';
    const needsTrailing = nextCharMatch && nextCharMatch[0] !== ',' ? ', ' : '';

    const nextValue = before + needsLeading + insertText + needsTrailing + after;
    setLocalValue(nextValue);
    const nextPos = (before + needsLeading + insertText + needsTrailing).length;

    // Keep composer open without forcing keyboard; store caret for next edit
    requestAnimationFrame(() => {
      try {
        el?.setSelectionRange?.(nextPos, nextPos);
      } catch {
        /* ignore */
      }
    });
  };

  // Insert a plain tag (from tag library) into the prompt
  const addToComposerCollection = useCallback((tag) => {
    const normalized = String(tag || '').trim();
    if (!normalized) return;
    setComposerCollectedTags((prev) => {
      const seen = new Set(prev.map((t) => t.toLowerCase()));
      if (seen.has(normalized.toLowerCase())) return prev;
      return [...prev, normalized];
    });
  }, []);

  const composerCollectedText = useMemo(() => composerCollectedTags.join(', '), [composerCollectedTags]);

  const copyComposerCollection = useCallback(() => {
    if (!composerCollectedTags.length) {
      setCollectionStatus('No tags to copy.');
      return;
    }
    if (safeCopy(composerCollectedText)) {
      setCollectionStatus(`Copied ${composerCollectedTags.length} tag${composerCollectedTags.length === 1 ? '' : 's'}.`);
      return;
    }
    const textarea = composerCollectionTextareaRef.current;
    if (textarea) {
      try {
        textarea.value = composerCollectedText;
        textarea.removeAttribute('readonly');
        textarea.select();
        textarea.setSelectionRange(0, composerCollectedText.length);
        const ok = document.execCommand && document.execCommand('copy');
        textarea.setAttribute('readonly', 'readonly');
        window.getSelection()?.removeAllRanges?.();
        if (ok) {
          setCollectionStatus(`Copied ${composerCollectedTags.length} tag${composerCollectedTags.length === 1 ? '' : 's'}.`);
          return;
        }
      } catch {
        /* ignore */
      }
    }
    setCollectionStatus('Copy not available on this browser.');
  }, [composerCollectedTags, composerCollectedText]);

  const clearComposerCollection = useCallback(() => {
    setComposerCollectedTags([]);
    setCollectionStatus('Cleared collected tags.');
  }, []);

  const removeComposerTag = useCallback((tag) => {
    const target = String(tag || '').trim().toLowerCase();
    if (!target) return;
    setComposerCollectedTags((prev) => prev.filter((t) => t.toLowerCase() !== target));
  }, []);

  const handleOpenCollectionSheet = useCallback(() => {
    setCollectionSheetOpen(true);
  }, []);

  const handleInsertTag = (tag) => {
    const el = textRef.current;
    const insertText = String(tag || '').trim();
    if (!insertText) return;
    const current = localValue || '';
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;

    const before = current.slice(0, start);
    const after = current.slice(end);
    const prevCharMatch = before.match(/[^\s]$/);
    const nextCharMatch = after.match(/^[^\s]/);
    const needsLeading = prevCharMatch && prevCharMatch[0] !== ',' ? ', ' : '';
    const needsTrailing = nextCharMatch && nextCharMatch[0] !== ',' ? ', ' : '';

    const nextValue = before + needsLeading + insertText + needsTrailing + after;
    setLocalValue(nextValue);
    setTagStatus(`Added: ${insertText}`);
    addToComposerCollection(insertText);
    const nextPos = (before + needsLeading + insertText + needsTrailing).length;
    addToComposerCollection(insertText);

    // Position caret after inserted text
    requestAnimationFrame(() => {
      try {
        el?.setSelectionRange?.(nextPos, nextPos);
      } catch {
        /* ignore */
      }
    });
  };

  const handleRemoveElement = (element) => {
    setLocalValue((prev) => removeElement(prev || '', element));
  };

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
    setLocalValue((prev) => reorderElements(prev || '', elements, fromIdx, toIdx));
  }, [elements]);

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
    touchStartRef.current = {
      idx,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.startY);

    // Start drag if moved enough
    if (deltaX > 10 || deltaY > 10) {
      touchStartRef.current.moved = true;
      setDragIndex(touchStartRef.current.idx);
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
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartRef.current?.moved && dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      handleReorderElements(dragIndex, dropIndex);
    }
    touchStartRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, dropIndex, handleReorderElements]);

  const handleSave = () => {
    onChange?.(localValue);
    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  if (!open) return null;

  return (
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
      <div className="composer-shell">
        <div className="composer-subhead">
          <div className="sheet-label">Editing</div>
          <div className="composer-field">{fieldLabel}</div>
        </div>

        <div className="composer-tabs" role="tablist" aria-label="Composer tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'compose'}
            className={`composer-tab ${activeTab === 'compose' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('compose')}
          >
            Compose
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'aliases'}
            className={`composer-tab ${activeTab === 'aliases' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('aliases')}
          >
            Aliases
            {aliasEntries.length > 0 && (
              <span className="composer-tab-badge">{aliasEntries.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tags'}
            className={`composer-tab ${activeTab === 'tags' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            <IconTag size={14} />
            Tags
          </button>
        </div>

        <div className={`composer-panel composer-panel-compose ${activeTab === 'compose' ? 'is-visible' : ''}`}>
          <div className="composer-textarea-wrap">
            <textarea
              ref={textRef}
              value={localValue}
              onChange={handleTextChange}
              className="composer-textarea"
              rows={8}
            />
          </div>

          {elements.length > 0 && (
            <div className="composer-tokens">
              <div className="composer-tokens-header">
                <span className="composer-tokens-label">
                  Elements
                  <span className="composer-tokens-count">{elements.length}</span>
                </span>
                <span className="composer-tokens-hint">Drag to reorder · Tap to adjust</span>
              </div>
              <div className="composer-tokens-list">
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
                      className={`composer-token composer-token-draggable ${el.type === 'alias' ? 'is-alias' : 'is-tag'} ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                      title={el.type === 'alias' ? `Alias: $${el.text}$` : `Tag: ${el.text}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onTouchStart={(e) => handleTouchStart(e, idx)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => {
                        if (dragIndex !== null) return;
                        openStrengthFor(el);
                      }}
                    >
                      <span className="composer-token-drag-handle" aria-hidden="true"><IconGrip size={10} /></span>
                      <span className="composer-token-name">{displayName}</span>
                      {el.type === 'alias' && <span className="composer-token-type">$</span>}
                      {Math.abs(weight - 1) > 1e-6 && (
                        <span className="composer-token-weight">
                          {formatTokenWeight(weight)}×
                        </span>
                      )}
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
            </div>
          )}

          <div className="composer-preview">
            <div className="composer-preview-label">Expanded prompt</div>
            <div className="composer-preview-content">{expandedPrompt || '—'}</div>
          </div>
        </div>

        <div className={`composer-panel composer-panel-aliases ${activeTab === 'aliases' ? 'is-visible' : ''}`}>
          <div className="composer-filters">
            <input
              ref={searchInputRef}
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search aliases…"
              className="composer-search ui-control ui-input"
            />
            <select
              value={pickerCategory}
              onChange={(e) => setPickerCategory(e.target.value)}
              className="composer-subcategory-select ui-control ui-select is-compact"
              aria-label="Filter by category"
            >
              {categoryOptions.map((c) => (
                <option key={`cat-${c}`} value={c}>
                  {c === 'All' ? 'Category: All' : formatCategoryLabel(c)}
                </option>
              ))}
            </select>
            {subcategoryOptions.length > 2 && (
              <select
                value={pickerSubcategory}
                onChange={(e) => setPickerSubcategory(e.target.value)}
                className="composer-subcategory-select ui-control ui-select is-compact"
              >
                {subcategoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All subcategories' : formatSubcategoryLabel(c)}
                  </option>
                ))}
              </select>
            )}
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
                    onClick={() => handleInsertAlias(entry.token)}
                    className="composer-alias-item"
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
            <input
              ref={tagSearchRef}
              type="search"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder="Search tags… (e.g. smile, city, sword)"
              className="composer-search ui-control ui-input"
              aria-label="Search tags"
            />
            <select
              value={tagCategory}
              onChange={(e) => setTagCategory(e.target.value)}
              className="composer-subcategory-select ui-control ui-select is-compact"
              aria-label="Filter by category"
            >
              <option value="">Category: All</option>
              {tagCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {formatSubcategoryLabel(c.key)} ({Number(c.actual || c.count || 0).toLocaleString()})
                </option>
              ))}
            </select>
            <select
              value={tagSort}
              onChange={(e) => setTagSort(e.target.value)}
              className="composer-subcategory-select ui-control ui-select is-compact"
              aria-label="Sort tags"
            >
              <option value="count">Sort: Popular</option>
              <option value="alpha">Sort: A–Z</option>
            </select>
          </div>

          <div className="composer-tags-header">
            <div className="composer-tags-hint">
              <span className="inline-flex items-center gap-2">
                <IconTag size={14} />
                Tap a tag to insert into prompt
              </span>
              <span className="ml-3 opacity-80">{tagTotalLabel}</span>
            </div>
            <button
              type="button"
              className="ui-button is-tiny is-primary"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('compose');
              }}
            >
              Done
            </button>
          </div>
          <div className="composer-tag-collection-bar is-sticky">
            <div>
              <div className="composer-tag-collection-label">
                {composerCollectedTags.length ? `${composerCollectedTags.length} tags collected` : 'No tags collected'}
              </div>
              {collectionStatus ? (
                <div className="composer-tag-collection-status">{collectionStatus}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="composer-tag-collection-btn"
              onClick={handleOpenCollectionSheet}
              disabled={!composerCollectedTags.length}
            >
              Manage
            </button>
          </div>
          <div className="composer-tag-collection-bar">
            <div>
              <div className="composer-tag-collection-label">
                {composerCollectedTags.length ? `${composerCollectedTags.length} tags ready` : 'No tags collected yet'}
              </div>
              {collectionStatus ? (
                <div className="composer-tag-collection-status">{collectionStatus}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="composer-tag-collection-btn"
              onClick={handleOpenCollectionSheet}
              disabled={!composerCollectedTags.length}
            >
              Manage
            </button>
          </div>
          {tagStatus ? <div className="composer-tags-status">{tagStatus}</div> : null}
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
                        handleInsertTag(t.tag);
                      }}
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

      <BottomSheet
        open={collectionSheetOpen}
        onClose={() => setCollectionSheetOpen(false)}
        title="Collected tags"
        variant="sheet"
        shouldCloseOnOverlayClick
      >
        <div className="sheet-stack">
          <div className="sheet-section">
            <div className="sheet-label">Tags ({composerCollectedTags.length})</div>
            <div className="composer-collection-chips" role="list">
              {composerCollectedTags.length ? (
                composerCollectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="collected-tag-chip"
                    onClick={() => removeComposerTag(tag)}
                    aria-label={`Remove ${tag}`}
                  >
                    <code className="collected-tag-code">{tag}</code>
                    <span aria-hidden="true">×</span>
                  </button>
                ))
              ) : (
                <div className="sheet-hint">No tags collected yet.</div>
              )}
            </div>
          </div>
          <div className="sheet-section flex gap-2">
            <button
              type="button"
              className="ui-button is-muted w-full"
              onClick={() => setCollectionSheetOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="ui-button is-ghost w-full"
              onClick={clearComposerCollection}
              disabled={!composerCollectedTags.length}
            >
              Clear
            </button>
            <button
              type="button"
              className="ui-button is-primary w-full"
              onClick={copyComposerCollection}
              disabled={!composerCollectedTags.length}
            >
              Copy
            </button>
            <textarea
              ref={composerCollectionTextareaRef}
              readOnly
              className="sr-only"
              aria-label="Collected tags"
            />
          </div>
        </div>
      </BottomSheet>

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
          setLocalValue((prev) => setElementWeight(prev || '', strengthToken.element, w));
        }}
        onRemoveWeight={() => {
          if (!strengthToken?.element) return;
          setLocalValue((prev) => setElementWeight(prev || '', strengthToken.element, null));
        }}
        onDeleteToken={() => {
          if (!strengthToken?.element) return;
          handleRemoveElement(strengthToken.element);
        }}
      />
    </BottomSheet>
  );
}
