
// js/src/pages/Gallery.jsx
import React, { useState, useEffect } from 'react';
import GalleryNav from '../components/GalleryNav';
import GalleryItem from '../components/GalleryItem';
import MediaViewerModal from '../components/MediaViewerModal';
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
    query,
    crumbs,
    dirChips,
    filtered,
    mediaItems,
    setPage,
    setPerPage,
    setShowHidden,
    setQuery,
    setKind,
    goBack,
    goRoot,
    goToPath,
    selectDir,
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
  const isFeed = viewMode === 'feed';

  const itemKey = (item) =>
    item.type === 'directory'
      ? `dir:${item.subfolder || item.filename}`
      : `${item.subfolder || ''}|${item.filename}`;

  return (
    <div className="page-shell">
      <div className="neon-card px-3 py-3 sm:px-4 sm:py-4 space-y-4">
        {/* Navigation + filters */}
        <GalleryNav
          subfolder={path}
          crumbs={crumbs}
          dirChips={dirChips}
          kind={kind}
          showHidden={showHidden}
          query={query}
          onBack={goBack}
          onRoot={goRoot}
          onCrumb={(p) => goToPath(p)}
          onSelectDir={(subfolder) => selectDir(subfolder)}
          onKind={(v) => setKind(v)}
          onShowHidden={(v) => setShowHidden(v)}
          onQuery={(v) => setQuery(v)}
        />

        {/* View mode + autoplay */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-[11px] text-[#9DA3FFCC]">
            {loading
              ? 'Loading collection…'
              : `${filtered.length} item${filtered.length === 1 ? '' : 's'} visible`}
          </div>

          <div className="flex items-center gap-3 justify-end">
            <div className="inline-flex items-center rounded-full border border-[#3D4270] bg-[#050716] px-1 py-[2px] text-[10px] text-[#9DA3FFCC]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={
                  'px-2 py-[2px] rounded-full transition-colors ' +
                  (isGrid
                    ? 'bg-gradient-to-r from-[#6B5BFF] to-[#FF4F9A] text-white'
                    : 'text-[#9DA3FFCC]')
                }
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('feed')}
                className={
                  'px-2 py-[2px] rounded-full transition-colors ' +
                  (isFeed
                    ? 'bg-gradient-to-r from-[#6B5BFF] to-[#FF4F9A] text-white'
                    : 'text-[#9DA3FFCC]')
                }
              >
                Feed
              </button>
            </div>

            {isFeed && (
              <button
                type="button"
                onClick={() => setFeedAutoplay((prev) => !prev)}
                className={
                  'inline-flex items-center gap-1 rounded-full border px-3 py-[3px] text-[10px] ' +
                  (feedAutoplay
                    ? 'border-[#3EF0FFCC] text-[#CFFAFE] bg-[#04151E]'
                    : 'border-[#3D4270] text-[#9DA3FFCC] bg-[#050716]')
                }
              >
                <span
                  className={
                    'inline-block h-[10px] w-[10px] rounded-full border ' +
                    (feedAutoplay
                      ? 'border-[#3EF0FF] bg-[#3EF0FF55]'
                      : 'border-[#3D4270] bg-transparent')
                  }
                />
                Autoplay
              </button>
            )}
          </div>
        </div>

        {/* Pagination row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] sm:text-xs text-[#C3C7FFCC]">
          <div className="flex items-center gap-1">
            <span className="opacity-75">Per page</span>
            <select
              className="px-2 py-1 rounded-full bg-[#050716] border border-[#3D4270] text-[11px]"
              value={perPage}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10) || 30;
                setPerPage(n);
              }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={120}>120</option>
            </select>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded-full border border-[#3D4270] bg-[#050716] hover:bg-[#111325] disabled:opacity-40"
            >
              ←
            </button>
            <span className="opacity-80">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages || loading}
              className="px-2.5 py-1 rounded-full border border-[#3D4270] bg-[#050716] hover:bg-[#111325] disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 && !loading ? (
          <div className="py-10 flex items-center justify-center">
            <div className="rounded-2xl border border-[#3D4270] bg-[#050716] px-4 py-6 max-w-md w-full text-center shadow-[0_0_20px_rgba(5,7,22,0.9)]">
              <div className="mb-2 text-base font-semibold text-[#F8F4FF]">
                Vault is empty
              </div>
              <div className="text-xs text-[#9DA3FFCC] mb-3">
                Try switching collections, clearing search, or generating new
                images.
              </div>
            </div>
          </div>
        ) : isGrid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
        ) : (
          // Feed view: TikTok/IG-style vertical scroll of large cards
          <div className="flex flex-col gap-4 items-center">
            {mediaItems.map((item) => (
              <div
                key={itemKey(item)}
                className="w-full flex justify-center"
              >
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

        {/* Viewer modal */}
        <MediaViewerModal
          isOpen={viewerOpen}
          media={currentMedia}
          onClose={closeViewer}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>
    </div>
  );
}
