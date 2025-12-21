// js/src/pages/Gallery.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GalleryNav from '../components/GalleryNav';
import GalleryItem from '../components/GalleryItem';
import MediaViewerModal from '../components/MediaViewerModal';
import BottomSheet from '../components/ui/BottomSheet';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { useGallery } from '../hooks/useGallery';
import { useMediaViewer } from '../hooks/useMediaViewer';
import {
  IconEmpty,
  IconFolderOpen,
  IconFolder,
  IconEye,
  IconEyeOff,
  IconPlay,
  IconPause,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
} from '../components/Icons';

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
    hasLoaded,
    page,
    totalPages,
    perPage,
    kind,
    showHidden,
    recursive,
    error,
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
    total,
    canPrev,
    canNext,
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterItems = useMemo(
    () => [
      { key: 'all', label: 'All' },
      { key: 'image', label: 'Images' },
      { key: 'video', label: 'Videos' },
    ],
    []
  );

  const viewItems = useMemo(
    () => [
      {
        key: 'grid',
        ariaLabel: 'Grid view',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1" width="6" height="6" rx="1" />
            <rect x="9" y="1" width="6" height="6" rx="1" />
            <rect x="1" y="9" width="6" height="6" rx="1" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
          </svg>
        ),
      },
      {
        key: 'feed',
        ariaLabel: 'Feed view',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="1" width="12" height="5" rx="1" />
            <rect x="2" y="8" width="12" height="5" rx="1" />
          </svg>
        ),
      },
    ],
    []
  );

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

  const isInitialLoading = loading && !hasLoaded;
  const isRefreshing = loading && hasLoaded;
  const summaryCount = `${filtered.length} items`;
  const summaryMeta = isInitialLoading ? 'Loading…' : summaryCount;
  const hasError = Boolean(error);
  const { containerRef, visibleItems, topSpacer, bottomSpacer, virtualized } =
    useVirtualGrid(filtered, isGrid);

  return (
    <div className="page-shell gallery-shell">
      <div className="screen-sticky gallery-header">
        <div className="gallery-header-inner">
          <div className="page-bar gallery-bar">
            <h1 className="page-bar-title">Gallery</h1>
            <div className="page-bar-actions">
              <span className="gallery-status">{summaryMeta}</span>
              <SegmentedTabs
                ariaLabel="View mode"
                value={viewMode}
                onChange={setViewMode}
                layout="icon"
                size="sm"
                items={viewItems}
              />
              <Button
                size="xs"
                className="gallery-filter-btn"
                onClick={() => setFiltersOpen(true)}
              >
                Filters
              </Button>
            </div>
          </div>

          <div className="gallery-nav-row">
            <GalleryNav
              subfolder={path}
              crumbs={crumbs}
              dirChips={dirChips}
              onBack={goBack}
              onRoot={goRoot}
              onCrumb={(p) => goToPath(p)}
              onSelectDir={(subfolder) => selectDir(subfolder)}
            />
          </div>

          <div className="gallery-toolbar">
            <div className="gallery-toolbar-left">
              <SegmentedTabs
                ariaLabel="Filter by type"
                value={kind}
                onChange={setKind}
                size="sm"
                items={filterItems}
              />
            </div>

            <div className="gallery-toolbar-right">
              <div className="gallery-options">
                <Button
                  size="icon"
                  active={recursive}
                  pressed={recursive}
                  onClick={() => setRecursive((prev) => !prev)}
                  title={recursive ? 'Showing subfolders' : 'This folder only'}
                  aria-label="Toggle subfolders"
                >
                  {recursive ? <IconFolderOpen size={16} /> : <IconFolder size={16} />}
                </Button>
                <Button
                  size="icon"
                  active={showHidden}
                  pressed={showHidden}
                  onClick={() => setShowHidden((prev) => !prev)}
                  title={showHidden ? 'Showing hidden' : 'Hiding hidden'}
                  aria-label="Toggle hidden items"
                >
                  {showHidden ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                </Button>
                {viewMode === 'feed' && (
                  <Button
                    size="icon"
                    active={feedAutoplay}
                    pressed={feedAutoplay}
                    onClick={() => setFeedAutoplay((prev) => !prev)}
                    title={feedAutoplay ? 'Autoplay on' : 'Autoplay off'}
                    aria-label="Toggle autoplay"
                  >
                    {feedAutoplay ? <IconPlay size={16} /> : <IconPause size={16} />}
                  </Button>
                )}
                <Button
                  size="icon"
                  onClick={refresh}
                  title="Refresh"
                  aria-label="Refresh gallery"
                >
                  <IconRefresh size={16} />
                </Button>
              </div>
            </div>
          </div>

          <div className="gallery-pagination">
            <div className="gallery-pagination-info">
              {isRefreshing ? <span className="loading-spinner" aria-hidden="true" /> : null}
              <span className={isInitialLoading ? 'gallery-loading-text' : ''}>{summaryMeta}</span>
            </div>
            <div className="gallery-pagination-controls">
              <button
                type="button"
                className="gallery-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
              >
                <IconChevronLeft size={16} />
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
                <IconChevronRight size={16} />
              </button>
              <Select
                value={perPage}
                onChange={(value) => setPerPage(parseInt(value, 10) || 30)}
                className="gallery-page-size"
                aria-label="Items per page"
                size="sm"
                options={[15, 30, 60, 120]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid/feed content (scrolls under anchored toolbar) */}
      {isInitialLoading && filtered.length === 0 ? (
        <div className="gallery-grid-responsive">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="gallery-skeleton-item">
              <div className="gallery-skeleton-thumb skeleton" />
              <div className="gallery-skeleton-label skeleton skeleton-text" />
            </div>
          ))}
        </div>
      ) : hasError && filtered.length === 0 ? (
        <div className="gallery-empty" role="alert">
          <div className="gallery-empty-icon"><IconEmpty size={48} /></div>
          <div className="gallery-empty-title">Gallery unavailable</div>
          <div className="gallery-empty-desc">{error}</div>
          <button
            type="button"
            className="ui-button is-primary is-compact mt-4"
            onClick={refresh}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gallery-empty">
          <div className="gallery-empty-icon"><IconEmpty size={48} /></div>
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
        <div className="flex flex-col gap-6 items-center">
          {filtered
            .filter((item) => item.type !== 'directory')
            .map((item) => (
            <div key={itemKey(item)} className="w-full flex justify-center">
              <GalleryItem
                item={item}
                onSelect={handleItemSelect}
                variant="feed"
                autoPlay={feedAutoplay}
              />
            </div>
          ))}
        </div>
      )}

      <MediaViewerModal
        isOpen={viewerOpen}
        media={currentMedia}
        onClose={closeViewer}
        onPrev={handlePrev}
        onNext={handleNext}
        total={total}
        canPrev={canPrev}
        canNext={canNext}
      />

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Gallery filters"
        footer={(
          <button type="button" className="ui-button is-primary w-full" onClick={() => setFiltersOpen(false)}>
            Done
          </button>
        )}
      >
        <div className="sheet-stack">
          <div className="sheet-section">
            <div className="sheet-label">Type</div>
            <SegmentedTabs
              ariaLabel="Filter by type"
              value={kind}
              onChange={setKind}
              size="sm"
              items={filterItems}
            />
          </div>

          <div className="sheet-section">
            <div className="sheet-label">Options</div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className={`ui-button is-compact ${recursive ? 'is-primary' : 'is-muted'}`}
                onClick={() => setRecursive((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {recursive ? <IconFolderOpen size={14} /> : <IconFolder size={14} />}
                  <span>{recursive ? 'Subfolders' : 'This folder'}</span>
                </span>
              </button>
              <button
                type="button"
                className={`ui-button is-compact ${showHidden ? 'is-primary' : 'is-muted'}`}
                onClick={() => setShowHidden((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {showHidden ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  <span>{showHidden ? 'Hidden on' : 'Hidden off'}</span>
                </span>
              </button>
              {viewMode === 'feed' ? (
                <button
                  type="button"
                  className={`ui-button is-compact ${feedAutoplay ? 'is-primary' : 'is-muted'}`}
                  onClick={() => setFeedAutoplay((prev) => !prev)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {feedAutoplay ? <IconPlay size={14} /> : <IconPause size={14} />}
                    <span>{feedAutoplay ? 'Autoplay' : 'No autoplay'}</span>
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                className="ui-button is-compact is-ghost"
                onClick={refresh}
              >
                <span className="inline-flex items-center gap-1.5">
                  <IconRefresh size={14} />
                  <span>Refresh</span>
                </span>
              </button>
            </div>
          </div>

          <div className="sheet-section">
            <div className="sheet-label">Page size</div>
            <Select
              value={perPage}
              onChange={(value) => setPerPage(parseInt(value, 10) || 30)}
              className="sheet-select"
              aria-label="Items per page"
              size="sm"
              options={[15, 30, 60, 120]}
            />
            <div className="sheet-hint">
              {isRefreshing ? <span className="loading-spinner" aria-hidden="true" /> : null}
              <span>{summaryMeta} • Page {page} of {totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ui-button is-muted w-full"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Prev
              </button>
              <button
                type="button"
                className="ui-button is-muted w-full"
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
