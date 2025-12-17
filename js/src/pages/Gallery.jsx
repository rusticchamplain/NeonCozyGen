// js/src/pages/Gallery.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GalleryNav from '../components/GalleryNav';
import GalleryItem from '../components/GalleryItem';
import MediaViewerModal from '../components/MediaViewerModal';
import CollapsibleSection from '../components/CollapsibleSection';
import { useGallery } from '../hooks/useGallery';
import { useMediaViewer } from '../hooks/useMediaViewer';

const VIEW_MODE_STORAGE_KEY = 'cozygen_gallery_view_mode';
const FEED_AUTOPLAY_STORAGE_KEY = 'cozygen_gallery_feed_autoplay';

function useVirtualGrid(items, enabled) {
  // Approximate grid virtualization to keep DOM nodes low when many tiles are shown.
  const containerRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const [metrics, setMetrics] = useState({
    width: 0,
    cols: 0,
    top: 0,
    viewport: typeof window !== 'undefined' ? window.innerHeight || 800 : 800,
  });

  const resolveScrollParent = (node) => {
    if (!node || typeof window === 'undefined') return null;
    let current = node.parentElement;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return current;
      }
      current = current.parentElement;
    }
    return window;
  };

  useEffect(() => {
    if (!enabled) return undefined;
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return undefined;
    if (typeof ResizeObserver === 'undefined') return undefined;

    const scrollParent = resolveScrollParent(el) || window;

    const updateMetrics = () => {
      const rect = el.getBoundingClientRect();
      const width = rect.width || el.clientWidth || 1;
      const cols = Math.max(1, Math.floor(width / 160)); // min 160px cards
      const scrollOffset = scrollParent === window ? (window.scrollY || 0) : (scrollParent.scrollTop || 0);
      const parentRect = scrollParent === window
        ? { top: 0 }
        : scrollParent.getBoundingClientRect();
      const top = scrollParent === window
        ? rect.top + (window.scrollY || 0)
        : rect.top - parentRect.top + scrollOffset;
      const viewport = scrollParent === window
        ? window.innerHeight || 800
        : scrollParent.clientHeight || 800;
      setMetrics((prev) => {
        if (
          prev.width === width &&
          prev.cols === cols &&
          prev.top === top &&
          prev.viewport === viewport
        ) {
          return prev;
        }
        return {
          width,
          cols,
          top,
          viewport,
        };
      });
      setScrollY(scrollOffset);
    };

    updateMetrics();

    const ro = new ResizeObserver(() => updateMetrics());
    ro.observe(el);
    window.addEventListener('resize', updateMetrics);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const scrollOffset = scrollParent === window
          ? (window.scrollY || 0)
          : (scrollParent.scrollTop || 0);
        setScrollY(scrollOffset);
      });
    };

    scrollParent.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateMetrics);
      scrollParent.removeEventListener('scroll', onScroll);
    };
  }, [enabled]);

  const virtualized = enabled && metrics.cols > 0 && items.length > 60;

  const { visibleItems, topSpacer, bottomSpacer } = useMemo(() => {
    if (!virtualized) {
      return {
        visibleItems: items,
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }
    const colWidth = metrics.width / metrics.cols;
    const rowHeight = Math.max(180, Math.ceil(colWidth * 1.25) + 32); // approx 4:5 + footer
    const rowCount = Math.ceil(items.length / metrics.cols);
    const relScroll = Math.max(0, scrollY - metrics.top);
    const startRow = Math.max(0, Math.floor(relScroll / rowHeight) - 2);
    const endRow = Math.min(
      rowCount,
      Math.ceil((relScroll + metrics.viewport) / rowHeight) + 2
    );
    const startIdx = startRow * metrics.cols;
    const endIdx = Math.min(items.length, endRow * metrics.cols);

    return {
      visibleItems: items.slice(startIdx, endIdx),
      topSpacer: startRow * rowHeight,
      bottomSpacer: Math.max(0, (rowCount - endRow) * rowHeight),
    };
  }, [items, metrics, scrollY, virtualized]);

  return { containerRef, visibleItems, topSpacer, bottomSpacer, virtualized };
}

export default function Gallery() {
  const {
    path,
    loading,
    page,
    totalPages,
    perPage,
    kind,
    showHidden,
    recursive,
    crumbs,
    dirChips,
    filtered,
    mediaItems,
    setPage,
    setPerPage,
    setShowHidden,
    setKind,
    setRecursive,
    goBack,
    goRoot,
    goToPath,
    selectDir,
    refresh,
  } = useGallery();

  const {
    viewerOpen,
    currentMedia,
    open: openMedia,
    close: closeViewer,
    next: handleNext,
    prev: handlePrev,
  } = useMediaViewer(mediaItems);

  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'grid';
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === 'feed' || stored === 'grid' ? stored : 'grid';
  });

  const [feedAutoplay, setFeedAutoplay] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(FEED_AUTOPLAY_STORAGE_KEY) === 'true';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // ignore
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FEED_AUTOPLAY_STORAGE_KEY,
        feedAutoplay ? 'true' : 'false'
      );
    } catch {
      // ignore
    }
  }, [feedAutoplay]);

  const handleItemSelect = useCallback((item) => {
    if (item.type === 'directory') {
      selectDir(item.subfolder);
      return;
    }
    openMedia(item);
  }, [openMedia, selectDir]);

  const isGrid = viewMode === 'grid';

  const itemKey = (item) =>
    item.type === 'directory'
      ? `dir:${item.subfolder || item.filename}`
      : `${item.subfolder || ''}|${item.filename}`;

  useEffect(() => {
    try {
      window.localStorage.setItem('cozygen_gallery_pending', '0');
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('cozygen:gallery-viewed'));
  }, []);

  const summaryMeta = loading ? 'Loading…' : `${filtered.length} items`;
  const { containerRef, visibleItems, topSpacer, bottomSpacer, virtualized } =
    useVirtualGrid(filtered, isGrid);

  return (
    <div className="page-shell page-stack">
      <CollapsibleSection title="🖼️ Gallery" meta={summaryMeta}>
        <GalleryNav
          subfolder={path}
          crumbs={crumbs}
          dirChips={dirChips}
          onBack={goBack}
          onRoot={goRoot}
          onCrumb={(p) => goToPath(p)}
          onSelectDir={(subfolder) => selectDir(subfolder)}
        />

        {/* Unified Gallery Toolbar */}
        <div className="gallery-toolbar">
          <div className="gallery-toolbar-left">
            {/* Type filter pills */}
            <div className="gallery-pills" role="group" aria-label="Filter by type">
              {[
                { key: 'all', label: 'All' },
                { key: 'image', label: 'Images' },
                { key: 'video', label: 'Videos' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`gallery-pill ${kind === opt.key ? 'is-active' : ''}`}
                  onClick={() => setKind(opt.key)}
                  aria-pressed={kind === opt.key}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gallery-toolbar-right">
            {/* View toggle */}
            <div className="gallery-view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={viewMode === 'grid' ? 'is-active' : ''}
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                title="Grid view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                className={viewMode === 'feed' ? 'is-active' : ''}
                onClick={() => setViewMode('feed')}
                aria-pressed={viewMode === 'feed'}
                title="Feed view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="2" y="1" width="12" height="5" rx="1" />
                  <rect x="2" y="8" width="12" height="5" rx="1" />
                </svg>
              </button>
            </div>

            {/* Options */}
            <div className="gallery-options">
              <button
                type="button"
                className={`gallery-option-btn ${recursive ? 'is-active' : ''}`}
                onClick={() => setRecursive((prev) => !prev)}
                title={recursive ? 'Showing subfolders' : 'This folder only'}
              >
                {recursive ? '📂' : '📁'}
              </button>
              <button
                type="button"
                className={`gallery-option-btn ${showHidden ? 'is-active' : ''}`}
                onClick={() => setShowHidden((prev) => !prev)}
                title={showHidden ? 'Showing hidden' : 'Hiding hidden'}
              >
                {showHidden ? '👁' : '👁‍🗨'}
              </button>
              {viewMode === 'feed' && (
                <button
                  type="button"
                  className={`gallery-option-btn ${feedAutoplay ? 'is-active' : ''}`}
                  onClick={() => setFeedAutoplay((prev) => !prev)}
                  title={feedAutoplay ? 'Autoplay on' : 'Autoplay off'}
                >
                  {feedAutoplay ? '▶️' : '⏸️'}
                </button>
              )}
              <button
                type="button"
                className="gallery-option-btn"
                onClick={refresh}
                title="Refresh"
              >
                ⟳
              </button>
            </div>
          </div>
        </div>

        {/* Pagination bar */}
        <div className="gallery-pagination">
          <div className="gallery-pagination-info">
            {loading ? (
              <span className="gallery-loading-text">Loading…</span>
            ) : (
              <span>{filtered.length} items</span>
            )}
          </div>
          <div className="gallery-pagination-controls">
            <button
              type="button"
              className="gallery-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="gallery-page-indicator">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="gallery-page-btn"
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages || loading}
              aria-label="Next page"
            >
              ›
            </button>
            <select
              value={perPage}
              onChange={(e) => setPerPage(parseInt(e.target.value, 10) || 30)}
              className="gallery-page-size"
              aria-label="Items per page"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={120}>120</option>
            </select>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && filtered.length === 0 ? (
          <div className="gallery-grid-responsive">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="gallery-skeleton-item">
                <div className="gallery-skeleton-thumb skeleton" />
                <div className="gallery-skeleton-label skeleton skeleton-text" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && !loading ? (
          <div className="gallery-empty">
            <div className="gallery-empty-icon">🖼️</div>
            <div className="gallery-empty-title">No media found</div>
            <div className="gallery-empty-desc">
              {kind !== 'all'
                ? `No ${kind}s match your filters. Try selecting "All" or adjusting your search.`
                : 'This folder is empty. Render something new or navigate to a different folder.'}
            </div>
          </div>
        ) : isGrid ? (
          <div className="w-full overflow-hidden">
            <div className="gallery-grid-responsive" ref={containerRef}>
              {virtualized && topSpacer > 0 ? (
                <div
                  aria-hidden
                  style={{ gridColumn: '1 / -1', height: `${topSpacer}px` }}
                />
              ) : null}
              {visibleItems.map((item) => (
                <GalleryItem
                  key={itemKey(item)}
                  item={item}
                  onSelect={handleItemSelect}
                  variant="grid"
                  autoPlay={false}
                />
              ))}
              {virtualized && bottomSpacer > 0 ? (
                <div
                  aria-hidden
                  style={{ gridColumn: '1 / -1', height: `${bottomSpacer}px` }}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center">
            {/* Use filtered (same as grid) but skip directories in feed view */}
            {filtered
              .filter((item) => item.type !== 'directory')
              .map((item) => (
              <div key={itemKey(item)} className="w-full flex justify-center">
                <div className="w-full max-w-[480px] sm:max-w-[640px] rounded-2xl border border-[#2A2E4A] bg-[#050716] px-3 py-3 shadow-[0_0_24px_rgba(5,7,22,0.9)]">
                  <GalleryItem
                    item={item}
                    onSelect={handleItemSelect}
                    variant="feed"
                    autoPlay={feedAutoplay}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <MediaViewerModal
        isOpen={viewerOpen}
        media={currentMedia}
        onClose={closeViewer}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}
