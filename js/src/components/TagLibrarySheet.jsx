import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from './ui/BottomSheet';
import Select from './ui/Select';
import { getDanbooruTagCategories, searchDanbooruTags } from '../api';
import { IconCopy, IconDots, IconGrip, IconRefresh, IconTag, IconX } from './Icons';
import { formatSubcategoryLabel } from '../utils/aliasPresentation';
import { useVirtualList } from '../hooks/useVirtualList';

const listItemVisibilityStyles = {
  contentVisibility: 'auto',
  containIntrinsicSize: '240px 120px',
};

const TagLibraryRow = memo(function TagLibraryRow({
  tag,
  category,
  count,
  isCollected,
  onSelectTag,
  addToCollection,
  removeFromCollection,
  setStatus,
}) {
  const handleClick = useCallback(() => {
    const tagStr = String(tag || '');
    if (onSelectTag) {
      onSelectTag(tagStr);
      setStatus(`Added: ${tagStr}`);
      return;
    }
    if (isCollected) {
      removeFromCollection(tagStr);
      setStatus(`Removed: ${tagStr}`);
    } else {
      addToCollection(tagStr);
      setStatus(`Added: ${tagStr}`);
    }
  }, [addToCollection, isCollected, onSelectTag, removeFromCollection, setStatus, tag]);

  return (
    <div
      className="tag-library-row"
      role="listitem"
      style={listItemVisibilityStyles}
      data-virtual-row="true"
    >
      <button
        type="button"
        className={`composer-alias-item tag-library-item ${!onSelectTag && isCollected ? 'is-collected' : ''}`}
        onClick={handleClick}
      >
        <div className="composer-alias-header">
          <div className="composer-alias-name tag-library-name">
            <code className="tag-library-code">{tag}</code>
          </div>
          {category ? (
            <span className="composer-alias-category">
              {formatSubcategoryLabel(category)}
            </span>
          ) : null}
        </div>
        <div className="composer-alias-token">{Number(count || 0).toLocaleString()}</div>
      </button>
    </div>
  );
});

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

export default function TagLibrarySheet({
  open,
  onClose,
  onSelectTag,
  initialQuery = '',
  title = 'Tag library',
  contextTitle = '',
  contextToken = '',
  contextText = '',
  contextTagCount = null,
  inline = false,
}) {
  const [query, setQuery] = useState(initialQuery || '');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('count'); // 'count' | 'alpha'
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const searchAbortRef = useRef(null);
  const loadAbortRef = useRef(null);
  const searchCacheRef = useRef(new Map());
  const inflightRef = useRef(new Map());
  const [collectedTags, setCollectedTags] = useState([]);
  const [collectionManagerOpen, setCollectionManagerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const sentinelRef = useRef(null);
  const searchRef = useRef(null);
  const collectedTextareaRef = useRef(null);
  const dragNodeRef = useRef(null);
  const touchStartRef = useRef(null);

  const canLoadMore = items.length < total;
  const isActive = inline || open;
  const {
    containerRef: listRef,
    startIndex,
    endIndex,
    topSpacer,
    bottomSpacer,
    virtualized,
    isNearEnd,
  } = useVirtualList({
    itemCount: items.length,
    enabled: isActive,
    estimateRowHeight: 74,
    overscan: 8,
    minItems: 90,
  });
  const visibleItems = virtualized ? items.slice(startIndex, endIndex) : items;

  const collectedText = useMemo(() => collectedTags.join(', '), [collectedTags]);
  const collectedSet = useMemo(() => new Set(collectedTags.map((t) => t.toLowerCase())), [collectedTags]);
  const cacheKey = useCallback((q, c, s, limit, offset) => {
    return [q || '', c || '', s || '', String(limit || 0), String(offset || 0)].join('::');
  }, []);

  const trimCache = useCallback(() => {
    const cache = searchCacheRef.current;
    if (cache.size <= 50) return;
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => (a[1]?.ts || 0) - (b[1]?.ts || 0));
    entries.slice(0, Math.max(0, entries.length - 50)).forEach(([key]) => cache.delete(key));
  }, []);

  const addToCollection = useCallback((tag) => {
    const normalized = String(tag || '').trim();
    if (!normalized) return;
    setCollectedTags((prev) => {
      const seen = new Set(prev.map((t) => t.toLowerCase()));
      if (seen.has(normalized.toLowerCase())) return prev;
      return [...prev, normalized];
    });
  }, []);

  const removeFromCollection = useCallback((tag) => {
    const target = String(tag || '').trim().toLowerCase();
    if (!target) return;
    setCollectedTags((prev) => prev.filter((t) => t.toLowerCase() !== target));
  }, []);

  const clearCollection = useCallback(() => {
    setCollectedTags([]);
    setStatus('Cleared collected tags.');
  }, []);

  const copyCollection = useCallback(() => {
    if (!collectedTags.length) {
      setStatus('No tags to copy.');
      return;
    }

    // Try modern async clipboard first
    if (safeCopy(collectedText)) {
      setStatus(`Copied ${collectedTags.length} tag${collectedTags.length === 1 ? '' : 's'}.`);
      return;
    }

    // Fallback for mobile/webviews: select hidden textarea and execCommand
    const textarea = collectedTextareaRef.current;
    if (textarea) {
      try {
        textarea.value = collectedText;
        textarea.removeAttribute('readonly');
        textarea.select();
        textarea.setSelectionRange(0, collectedText.length);
        const ok = document.execCommand && document.execCommand('copy');
        textarea.setAttribute('readonly', 'readonly');
        window.getSelection()?.removeAllRanges?.();
        if (ok) {
          setStatus(`Copied ${collectedTags.length} tag${collectedTags.length === 1 ? '' : 's'}.`);
          return;
        }
      } catch {
        // fall through
      }
    }

    setStatus('Copy not available on this browser.');
  }, [collectedTags, collectedText]);

  // Reorder collected tags
  const reorderCollectedTags = useCallback((fromIdx, toIdx) => {
    setCollectedTags((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  // Drag handlers for collected tags
  const handleDragStart = useCallback((e, idx) => {
    setDragIndex(idx);
    dragNodeRef.current = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
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
      reorderCollectedTags(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
    dragNodeRef.current = null;
  }, [dragIndex, dropIndex, reorderCollectedTags]);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndex(idx);
  }, []);

  const handleDragLeave = useCallback(() => {
    // Don't clear dropIndex here to prevent flickering
  }, []);

  // Touch handlers for mobile drag-and-drop
  const handleTouchStart = useCallback((e, idx) => {
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

    if (deltaX > 10 || deltaY > 10) {
      touchStartRef.current.moved = true;
      setDragIndex(touchStartRef.current.idx);
      e.preventDefault();

      const chipElements = document.querySelectorAll('.collected-tag-chip');
      const touchX = touch.clientX;
      const touchY = touch.clientY;

      for (let i = 0; i < chipElements.length; i++) {
        const rect = chipElements[i].getBoundingClientRect();
        if (touchX >= rect.left && touchX <= rect.right && touchY >= rect.top && touchY <= rect.bottom) {
          setDropIndex(i);
          break;
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartRef.current?.moved && dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      reorderCollectedTags(dragIndex, dropIndex);
    }
    touchStartRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, dropIndex, reorderCollectedTags]);

  const resetAndSearch = useCallback(async ({ nextQuery, nextCategory, nextSort } = {}) => {
    const q = typeof nextQuery === 'string' ? nextQuery : query;
    const c = typeof nextCategory === 'string' ? nextCategory : category;
    const s = typeof nextSort === 'string' ? nextSort : sort;
    const key = cacheKey(q, c, s, 80, 0);
    const now = Date.now();
    const cached = searchCacheRef.current.get(key);
    if (cached && now - cached.ts < 5 * 60 * 1000) {
      setItems(cached.items || []);
      setTotal(Number(cached.total || 0));
      setOffset(0);
      setError('');
      setStatus('');
      setLoading(false);
      return;
    }
    const inflight = inflightRef.current.get(key);
    if (inflight) {
      try {
        const res = await inflight;
        setItems(res?.items || []);
        setTotal(Number(res?.total || 0));
        setOffset(0);
        setError('');
        setStatus('');
      } catch {
        // errors handled by owner
      }
      return;
    }
    setLoading(true);
    setError('');
    setStatus('');
    setOffset(0);
    if (searchAbortRef.current && searchAbortRef.current.key !== key) {
      searchAbortRef.current.controller.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = { controller, key };
    try {
      const request = searchDanbooruTags(
        { q, category: c, sort: s, limit: 80, offset: 0 },
        { signal: controller.signal }
      );
      inflightRef.current.set(key, request);
      const res = await request;
      searchCacheRef.current.set(key, { items: res?.items || [], total: Number(res?.total || 0), ts: Date.now() });
      trimCache();
      setItems(res?.items || []);
      setTotal(Number(res?.total || 0));
    } catch (e) {
      if (e?.name === 'AbortError') {
        return;
      }
      console.error('Failed to search tags', e);
      setError('Unable to load tags right now.');
      setItems([]);
      setTotal(0);
    } finally {
      inflightRef.current.delete(key);
      if (searchAbortRef.current?.key === key) {
        searchAbortRef.current = null;
      }
      setLoading(false);
    }
  }, [cacheKey, category, query, sort, trimCache]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    if (!canLoadMore) return;
    const nextOffset = offset + 80;
    const key = cacheKey(query, category, sort, 80, nextOffset);
    const now = Date.now();
    const cached = searchCacheRef.current.get(key);
    if (cached && now - cached.ts < 5 * 60 * 1000) {
      setItems((prev) => [...prev, ...(cached.items || [])]);
      setTotal(Number(cached.total || 0));
      setOffset(nextOffset);
      setLoadingMore(false);
      return;
    }
    const inflight = inflightRef.current.get(key);
    if (inflight) {
      try {
        const res = await inflight;
        const nextItems = res?.items || [];
        setItems((prev) => [...prev, ...nextItems]);
        setTotal(Number(res?.total || 0));
        setOffset(nextOffset);
      } catch {
        // errors handled by owner
      }
      return;
    }
    setLoadingMore(true);
    setError('');
    if (loadAbortRef.current && loadAbortRef.current.key !== key) {
      loadAbortRef.current.controller.abort();
    }
    const controller = new AbortController();
    loadAbortRef.current = { controller, key };
    try {
      const request = searchDanbooruTags(
        { q: query, category, sort, limit: 80, offset: nextOffset },
        { signal: controller.signal }
      );
      inflightRef.current.set(key, request);
      const res = await request;
      const nextItems = res?.items || [];
      searchCacheRef.current.set(key, { items: nextItems, total: Number(res?.total || 0), ts: Date.now() });
      trimCache();
      setItems((prev) => [...prev, ...nextItems]);
      setTotal(Number(res?.total || 0));
      setOffset(nextOffset);
    } catch (e) {
      if (e?.name === 'AbortError') {
        return;
      }
      console.error('Failed to load more tags', e);
      setError('Unable to load more tags.');
    } finally {
      inflightRef.current.delete(key);
      if (loadAbortRef.current?.key === key) {
        loadAbortRef.current = null;
      }
      setLoadingMore(false);
    }
  }, [cacheKey, canLoadMore, category, loading, loadingMore, offset, query, sort, trimCache]);

  // Load categories on open
  useEffect(() => {
    if (!isActive) return undefined;
    setError('');
    setStatus('');
    let cancelled = false;
    (async () => {
      try {
        const res = await getDanbooruTagCategories();
        if (cancelled) return;
        setCategories(Array.isArray(res?.categories) ? res.categories : []);
      } catch (e) {
        console.error('Failed to load tag categories', e);
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive]);

  // Reset local state when opening
  useEffect(() => {
    if (!isActive) return;
    setQuery(initialQuery || '');
    setCategory('');
    setSort('count');
    setItems([]);
    setTotal(0);
    setOffset(0);
    setLoading(false);
    setLoadingMore(false);
    setError('');
    setStatus('');
    setCollectedTags([]);
    // Avoid auto-focusing to prevent mobile keyboard pop.
  }, [initialQuery, isActive]);

  // Debounced search
  useEffect(() => {
    if (!isActive) return undefined;
    const handle = window.setTimeout(() => {
      resetAndSearch();
    }, 220);
    return () => window.clearTimeout(handle);
  }, [category, isActive, query, resetAndSearch, sort]);

  useEffect(() => {
    return () => {
      if (searchAbortRef.current) {
        searchAbortRef.current.controller?.abort?.();
      }
      if (loadAbortRef.current) {
        loadAbortRef.current.controller?.abort?.();
      }
    };
  }, []);

  // Infinite load sentinel
  useEffect(() => {
    if (!isActive) return undefined;
    if (virtualized) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isActive, loadMore]);

  useEffect(() => {
    if (!virtualized) return;
    if (!canLoadMore || loading || loadingMore) return;
    if (isNearEnd) loadMore();
  }, [virtualized, canLoadMore, loading, loadingMore, isNearEnd, loadMore]);

  const footer = useMemo(() => {
    if (inline) return null;
    return (
      <div className="flex gap-2">
        <button type="button" className="ui-button is-muted w-full" onClick={onClose}>
          Done
        </button>
        <button
          type="button"
          className="ui-button is-ghost w-full"
          onClick={() => resetAndSearch()}
          disabled={loading || loadingMore}
        >
          <span className="inline-flex items-center gap-2">
            <IconRefresh size={14} />
            Refresh
          </span>
        </button>
      </div>
    );
  }, [inline, loading, loadingMore, onClose, resetAndSearch]);

  const showContext = Boolean(onSelectTag && (contextTitle || contextToken || contextText));
  const tagCountLabel = Number.isFinite(contextTagCount) ? `${contextTagCount} tags` : '';
  const content = (
    <div className={`sheet-stack ${inline ? 'tag-library-page' : ''}`}>
      {showContext ? (
        <div className="tag-library-context">
          <div className="tag-library-context-head">
            <div className="min-w-0">
              <div className="sheet-label">Adding to alias</div>
              <div className="tag-library-context-title">{contextTitle || 'Alias'}</div>
              {contextToken ? (
                <div className="tag-library-context-token">{contextToken}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="ui-button is-tiny is-muted"
              onClick={onClose}
            >
              Back
            </button>
          </div>
          <div className="tag-library-context-preview">
            {contextText || '—'}
          </div>
          {tagCountLabel ? (
            <div className="tag-library-context-meta">{tagCountLabel}</div>
          ) : null}
        </div>
      ) : null}

      <div className="sheet-section">
        {!inline ? <div className="sheet-label">Browse</div> : null}
        <div className="composer-filters">
          <div className="input-with-action">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tags… (e.g. smile, city, sword)"
              className="composer-search ui-control ui-input"
              aria-label="Search tags"
            />
            <button
              type="button"
              className="input-action-btn"
              onClick={() => setQuery('')}
              disabled={!query}
            >
              Clear
            </button>
          </div>
          <Select
            value={category}
            onChange={setCategory}
            className="composer-subcategory-select"
            aria-label="Filter by category"
            size="sm"
            options={[
              { value: '', label: 'Category: All' },
              ...categories.map((c) => ({
                value: c.key,
                label: `${formatSubcategoryLabel(c.key)} (${Number(c.actual || c.count || 0).toLocaleString()})`,
              })),
            ]}
          />
          <Select
            value={sort}
            onChange={setSort}
            className="composer-subcategory-select"
            aria-label="Sort tags"
            size="sm"
            options={[
              { value: 'count', label: 'Sort: Popular' },
              { value: 'alpha', label: 'Sort: A–Z' },
            ]}
          />
        </div>
        {status ? <div className="text-xs text-[#9DA3FFCC]">{status}</div> : null}
        {error ? <div className="text-xs text-[#FF8F70]">{error}</div> : null}
      </div>

      <div className="composer-alias-list tag-library-grid" role="list" ref={listRef}>
        {loading ? (
          <div className="composer-alias-empty">Loading tags…</div>
        ) : items.length === 0 ? (
          <div className="composer-alias-empty">No tags found.</div>
        ) : (
          <>
            {virtualized && topSpacer > 0 ? (
              <div aria-hidden style={{ height: `${topSpacer}px` }} />
            ) : null}
            {visibleItems.map((t) => (
              <TagLibraryRow
                key={`${t.tag}-${t.category}`}
                tag={t.tag}
                category={t.category}
                count={t.count}
                isCollected={collectedSet.has(String(t.tag || '').toLowerCase())}
                onSelectTag={onSelectTag}
                addToCollection={addToCollection}
                removeFromCollection={removeFromCollection}
                setStatus={setStatus}
              />
            ))}
            {virtualized && bottomSpacer > 0 ? (
              <div aria-hidden style={{ height: `${bottomSpacer}px` }} />
            ) : null}
            {!virtualized ? <div ref={sentinelRef} className="composer-sentinel" /> : null}
            {loadingMore ? (
              <div className="composer-alias-empty">Loading more…</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );

  if (!isActive) return null;

  if (inline) {
    return (
      <section className="tag-library-surface">
        {title ? <div className="sheet-label tag-library-page-title">{title}</div> : null}
        {content}
        {!onSelectTag ? (
          <div className="tag-collection-bar" aria-live="polite">
            <div className="tag-collection-bar-main">
              <div className="tag-collection-bar-title">
                Tags
              </div>
              <div className="tag-collection-bar-count" aria-live="polite">
                {collectedTags.length === 0 ? 'No tags selected' : `${collectedTags.length} selected`}
              </div>
            </div>
            <button
              type="button"
              className="tag-collection-menu-btn"
              onClick={() => setCollectionManagerOpen(true)}
              aria-label="Manage collected tags"
            >
              <IconDots size={16} />
            </button>
            <textarea
              ref={collectedTextareaRef}
              value={collectedText}
              onChange={(e) => {
                const tags = e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean);
                const seen = new Set();
                const unique = [];
                tags.forEach((t) => {
                  const key = t.toLowerCase();
                  if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(t);
                  }
                });
                setCollectedTags(unique);
              }}
              className="sr-only"
              aria-label="Collected tags text"
            />
          </div>
        ) : null}

        {!onSelectTag ? (
          <BottomSheet
            open={collectionManagerOpen}
            onClose={() => setCollectionManagerOpen(false)}
            title="Collected tags"
            variant="sheet"
            shouldCloseOnOverlayClick
          >
            <div className="sheet-stack">
              <div className="sheet-section">
                <div className="sheet-label">
                  Tags ({collectedTags.length})
                </div>
                <div className="tag-collection-codeblock">
                  <pre className="tag-collection-pre">{collectedText || '—'}</pre>
                  <button
                    type="button"
                    className="tag-collection-copy-btn"
                    onClick={copyCollection}
                    disabled={collectedTags.length === 0}
                    aria-label="Copy collected tags"
                  >
                    <IconCopy size={16} />
                  </button>
                  <textarea
                    ref={collectedTextareaRef}
                    value={collectedText}
                    readOnly
                    className="sr-only"
                    aria-label="Collected tags text"
                  />
                </div>
                {collectedTags.length ? (
                  <div className="tag-collection-chips">
                    {collectedTags.map((tag, idx) => (
                      <span
                        key={`${tag}-${idx}`}
                        className="collected-tag-chip"
                        onClick={() => removeFromCollection(tag)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            removeFromCollection(tag);
                          }
                        }}
                      >
                        <code className="collected-tag-code">{tag}</code>
                        <button
                          type="button"
                          className="collected-tag-remove"
                          aria-label={`Remove ${tag}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCollection(tag);
                          }}
                        >
                          <IconX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="sheet-hint">No tags collected yet.</div>
                )}
              </div>

              <div className="sheet-section flex gap-2">
                <button
                  type="button"
                  className="ui-button is-muted w-full"
                  onClick={() => setCollectionManagerOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="ui-button is-ghost w-full"
                  onClick={clearCollection}
                  disabled={collectedTags.length === 0}
                >
                  Clear
                </button>
              </div>
            </div>
          </BottomSheet>
        ) : null}
      </section>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      variant="fullscreen"
      contentClassName="tag-library-sheet"
      footer={footer}
      shouldCloseOnOverlayClick={false}
    >
      {content}
    </BottomSheet>
  );
}
