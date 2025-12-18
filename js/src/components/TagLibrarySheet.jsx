import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from './ui/BottomSheet';
import { getDanbooruTagCategories, searchDanbooruTags } from '../api';
import { IconRefresh, IconTag } from './Icons';
import { formatSubcategoryLabel } from '../utils/aliasPresentation';

function safeCopy(text) {
  const value = String(text || '');
  if (!value) return false;
  try {
    navigator.clipboard?.writeText?.(value);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export default function TagLibrarySheet({
  open,
  onClose,
  onSelectTag,
  initialQuery = '',
  title = 'Tag library',
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
  const sentinelRef = useRef(null);
  const searchRef = useRef(null);

  const canLoadMore = items.length < total;

  const resetAndSearch = useCallback(async ({ nextQuery, nextCategory, nextSort } = {}) => {
    const q = typeof nextQuery === 'string' ? nextQuery : query;
    const c = typeof nextCategory === 'string' ? nextCategory : category;
    const s = typeof nextSort === 'string' ? nextSort : sort;
    setLoading(true);
    setError('');
    setStatus('');
    setOffset(0);
    try {
      const res = await searchDanbooruTags({ q, category: c, sort: s, limit: 80, offset: 0 });
      setItems(res?.items || []);
      setTotal(Number(res?.total || 0));
    } catch (e) {
      console.error('Failed to search tags', e);
      setError('Unable to load tags right now.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [category, query, sort]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    if (!canLoadMore) return;
    const nextOffset = offset + 80;
    setLoadingMore(true);
    setError('');
    try {
      const res = await searchDanbooruTags({ q: query, category, sort, limit: 80, offset: nextOffset });
      const nextItems = res?.items || [];
      setItems((prev) => [...prev, ...nextItems]);
      setTotal(Number(res?.total || 0));
      setOffset(nextOffset);
    } catch (e) {
      console.error('Failed to load more tags', e);
      setError('Unable to load more tags.');
    } finally {
      setLoadingMore(false);
    }
  }, [canLoadMore, category, loading, loadingMore, offset, query, sort]);

  // Load categories on open
  useEffect(() => {
    if (!open) return undefined;
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
  }, [open]);

  // Reset local state when opening
  useEffect(() => {
    if (!open) return;
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
    requestAnimationFrame(() => searchRef.current?.focus?.({ preventScroll: true }));
  }, [open, initialQuery]);

  // Debounced search
  useEffect(() => {
    if (!open) return undefined;
    const handle = window.setTimeout(() => {
      resetAndSearch();
    }, 220);
    return () => window.clearTimeout(handle);
  }, [open, query, category, sort, resetAndSearch]);

  // Infinite load sentinel
  useEffect(() => {
    if (!open) return undefined;
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
  }, [open, loadMore]);

  const footer = useMemo(() => (
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
  ), [loading, loadingMore, onClose, resetAndSearch]);

  const totalLabel = total ? `${items.length.toLocaleString()} / ${total.toLocaleString()}` : `${items.length.toLocaleString()}`;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      variant="fullscreen"
      footer={footer}
      shouldCloseOnOverlayClick={false}
    >
      <div className="sheet-stack">
        <div className="sheet-section">
          <div className="sheet-label">Browse</div>
          <div className="composer-filters">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tags… (e.g. smile, city, sword)"
              className="composer-search ui-control ui-input"
              aria-label="Search tags"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="composer-subcategory-select ui-control ui-select is-compact"
              aria-label="Filter by category"
            >
              <option value="">Category: All</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {formatSubcategoryLabel(c.key)} ({Number(c.actual || c.count || 0).toLocaleString()})
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="composer-subcategory-select ui-control ui-select is-compact"
              aria-label="Sort tags"
            >
              <option value="count">Sort: Popular</option>
              <option value="alpha">Sort: A–Z</option>
            </select>
          </div>
          <div className="sheet-hint">
            <span className="inline-flex items-center gap-2">
              <IconTag size={14} />
              Tap a tag to {onSelectTag ? 'add it to the alias' : 'copy it'}
            </span>
            <span className="ml-3 opacity-80">{totalLabel}</span>
          </div>
          {status ? <div className="text-xs text-[#9DA3FFCC]">{status}</div> : null}
          {error ? <div className="text-xs text-[#FF8F70]">{error}</div> : null}
        </div>

        <div className="composer-alias-list" role="list">
          {loading ? (
            <div className="composer-alias-empty">Loading tags…</div>
          ) : items.length === 0 ? (
            <div className="composer-alias-empty">No tags found.</div>
          ) : (
            <>
              {items.map((t) => (
                <div key={`${t.tag}-${t.category}`} className="tag-library-row" role="listitem">
                  <button
                    type="button"
                    className="composer-alias-item tag-library-item"
                    onClick={() => {
                      if (onSelectTag) {
                        onSelectTag(String(t.tag || ''));
                        setStatus(`Added: ${t.tag}`);
                        return;
                      }
                      if (safeCopy(t.tag)) {
                        setStatus(`Copied: ${t.tag}`);
                      } else {
                        setStatus('Copy not available on this browser.');
                      }
                    }}
                  >
                    <div className="composer-alias-header">
                      <div className="composer-alias-name tag-library-name">
                        <code className="tag-library-code">{t.tag}</code>
                      </div>
                      {t.category ? (
                        <span className="composer-alias-category">
                          {formatSubcategoryLabel(t.category)}
                        </span>
                      ) : null}
                    </div>
                    <div className="composer-alias-token">{Number(t.count || 0).toLocaleString()}</div>
                  </button>
                  <button
                    type="button"
                    className="ui-button is-tiny is-ghost tag-library-copy"
                    onClick={() => {
                      if (safeCopy(t.tag)) {
                        setStatus(`Copied: ${t.tag}`);
                      } else {
                        setStatus('Copy not available on this browser.');
                      }
                    }}
                    aria-label={`Copy ${t.tag}`}
                    title="Copy"
                  >
                    Copy
                  </button>
                </div>
              ))}
              <div ref={sentinelRef} className="composer-sentinel" />
              {loadingMore ? (
                <div className="composer-alias-empty">Loading more…</div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

