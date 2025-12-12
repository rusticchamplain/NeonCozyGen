// js/src/pages/Gallery.jsx
import { useState, useEffect } from 'react';
import GalleryNav from '../components/GalleryNav';
import GalleryItem from '../components/GalleryItem';
import MediaViewerModal from '../components/MediaViewerModal';
import CollapsibleSection from '../components/CollapsibleSection';
import { useGallery } from '../hooks/useGallery';
import { useMediaViewer } from '../hooks/useMediaViewer';

const VIEW_MODE_STORAGE_KEY = 'cozygen_gallery_view_mode';
const FEED_AUTOPLAY_STORAGE_KEY = 'cozygen_gallery_feed_autoplay';

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

  const [viewMode] = useState(() => {
    if (typeof window === 'undefined') return 'grid';
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === 'feed' || stored === 'grid' ? stored : 'grid';
  });

  const [feedAutoplay] = useState(() => {
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

  return (
    <div className="page-shell page-stack">
      <CollapsibleSection kicker="Output" title="🖼️ Gallery" meta={summaryMeta}>
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
            <div className="gallery-topbar-row">
              <div className="gallery-quick-actions">
                <div className="gallery-kind-toggle">
                  <button
                    type="button"
                  className={kind === 'all' ? 'is-active' : ''}
                  onClick={() => setKind('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={kind === 'image' ? 'is-active' : ''}
                  onClick={() => setKind('image')}
                >
                  Img
                </button>
                <button
                  type="button"
                  className={kind === 'video' ? 'is-active' : ''}
                  onClick={() => setKind('video')}
                >
                  Vid
                </button>
              </div>
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
                className="gallery-chip-btn is-icon"
                onClick={refresh}
                aria-label="Refresh"
                title="Refresh"
              >
                ⟳
              </button>
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
            <div className="gallery-grid-responsive">
              {filtered.map((item) => (
                <GalleryItem
                  key={itemKey(item)}
                  item={item}
                  onSelect={handleItemSelect}
                  variant="grid"
                  autoPlay={false}
                />
              ))}
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
