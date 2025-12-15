// js/src/pages/Gallery.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [scrollY, setScrollY] = useState(() =>
    typeof window !== 'undefined' ? window.scrollY || 0 : 0
  );
  const [metrics, setMetrics] = useState({
    width: 0,
    cols: 0,
    top: 0,
    viewport: typeof window !== 'undefined' ? window.innerHeight || 800 : 800,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return undefined;
    if (typeof ResizeObserver === 'undefined') return undefined;

    const updateMetrics = () => {
      const rect = el.getBoundingClientRect();
      const width = rect.width || el.clientWidth || 1;
      const cols = Math.max(1, Math.floor(width / 160)); // min 160px cards
      const top = rect.top + (window.scrollY || 0);
      setMetrics({
        width,
        cols,
        top,
        viewport: window.innerHeight || 800,
      });
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
        setScrollY(window.scrollY || 0);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('scroll', onScroll);
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

  const handleItemSelect = (item) => {
    if (item.type === 'directory') {
      selectDir(item.subfolder);
      return;
    }
    openMedia(item);
  };

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

        <div className="gallery-topbar">
          <div className="gallery-topbar-grid">
            <div className="gallery-group">
              <div className="gallery-group-label">Type</div>
              <div className="gallery-kind-toggle" role="group" aria-label="Filter by media type">
                <button
                  type="button"
                  className={kind === 'all' ? 'is-active' : ''}
                  aria-pressed={kind === 'all'}
                  onClick={() => setKind('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={kind === 'image' ? 'is-active' : ''}
                  aria-pressed={kind === 'image'}
                  onClick={() => setKind('image')}
                >
                  Img
                </button>
                <button
                  type="button"
                  className={kind === 'video' ? 'is-active' : ''}
                  aria-pressed={kind === 'video'}
                  onClick={() => setKind('video')}
                >
                  Vid
                </button>
              </div>
            </div>

            <div className="gallery-group">
              <div className="gallery-group-label">View</div>
              <div className="gallery-inline-actions">
                <div className="gallery-kind-toggle" role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={viewMode === 'grid' ? 'is-active' : ''}
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'feed' ? 'is-active' : ''}
                    aria-pressed={viewMode === 'feed'}
                    onClick={() => setViewMode('feed')}
                  >
                    Feed
                  </button>
                </div>
                <div className="gallery-icon-row">
                <button
                  type="button"
                  className={`gallery-chip-btn is-icon ${showHidden ? 'is-active' : ''}`}
                  onClick={() => setShowHidden((prev) => !prev)}
                  aria-label="Toggle hidden"
                  title="Toggle hidden"
                >
                  👁
                  </button>
                  <button
                    type="button"
                    className={`gallery-chip-btn is-icon ${recursive ? 'is-active' : ''}`}
                  onClick={() => setRecursive((prev) => !prev)}
                  aria-label="Include subfolders"
                  title="Include subfolders"
                >
                  🌲
                </button>
                <button
                  type="button"
                  className="gallery-refresh"
                  onClick={refresh}
                  aria-label="Refresh"
                  title="Refresh"
                >
                  <span className="sr-only">Refresh</span>
                  <span aria-hidden="true">⟳</span>
                </button>
              </div>
            </div>
              {viewMode === 'feed' ? (
                <button
                  type="button"
                  className={`gallery-chip-btn ${feedAutoplay ? 'is-active' : ''}`}
                  onClick={() => setFeedAutoplay((prev) => !prev)}
                  aria-pressed={feedAutoplay}
                  aria-label={`Toggle autoplay (${feedAutoplay ? 'on' : 'off'})`}
                  title="Toggle feed autoplay"
                >
                  {feedAutoplay ? 'Autoplay On' : 'Autoplay Off'}
                </button>
              ) : null}
            </div>

            <div className="gallery-group" />
          </div>
        </div>
        <div className="gallery-meta-row">
            <span className="gallery-meta">
              Page {page} / {totalPages} · {filtered.length} items
            </span>
            <div className="gallery-meta-actions">
              <div className="gallery-pagination-mini">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  aria-label="Prev page"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                  disabled={page >= totalPages || loading}
                  aria-label="Next page"
                >
                  →
                </button>
                <select
                  value={perPage}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10) || 30;
                    setPerPage(n);
                  }}
                  className="gallery-perpage"
                  aria-label="Items per page"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                  <option value={120}>120</option>
                </select>
              </div>
            </div>
          </div>

        {filtered.length === 0 && !loading ? (
          <div className="py-10 flex items-center justify-center">
            <div className="ui-card max-w-md w-full text-center">
              <div className="mb-2 text-base font-semibold text-[#F8F4FF]">
                Nothing here yet
              </div>
              <div className="text-xs text-[#9DA3FFCC]">
                Adjust filters or render something new.
              </div>
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
            {mediaItems.map((item) => (
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
