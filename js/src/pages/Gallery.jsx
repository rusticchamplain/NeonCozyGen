
// js/src/pages/Gallery.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import GalleryNav from '../components/GalleryNav';
import GalleryItem from '../components/GalleryItem';
import { useGallery } from '../hooks/useGallery';
import { useMediaViewer } from '../hooks/useMediaViewer';

const VIEW_MODE_STORAGE_KEY = 'cozygen_gallery_view_mode';
const FEED_AUTOPLAY_STORAGE_KEY = 'cozygen_gallery_feed_autoplay';

const isVideo = (name = '') => /\.(mp4|webm|mov|mkv)$/i.test(name);

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function Lightbox({ open, media, onClose, onPrev, onNext }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(true);
    setProgress(0);
    setDuration(0);
  }, [media?.filename]);

  useEffect(() => {
    const handler = (evt) => {
      if (evt.key === 'Escape') {
        onClose?.();
      }
      if (evt.key === 'ArrowRight') {
        onNext?.();
      }
      if (evt.key === 'ArrowLeft') {
        onPrev?.();
      }
    };
    if (open) {
      window.addEventListener('keydown', handler);
    }
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, onPrev, onNext]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (playing) {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [playing, muted, media?.filename]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const handleTime = () => {
      if (!video.duration) return;
      setProgress((video.currentTime / video.duration) * 100);
    };
    const handleMeta = () => setDuration(video.duration || 0);
    video.addEventListener('timeupdate', handleTime);
    video.addEventListener('loadedmetadata', handleMeta);
    return () => {
      video.removeEventListener('timeupdate', handleTime);
      video.removeEventListener('loadedmetadata', handleMeta);
    };
  }, [media?.filename]);

  if (!open || !media) return null;
  if (typeof document === 'undefined') return null;

  const type = media.type || 'output';
  const version = media.mtime ? `&v=${encodeURIComponent(String(media.mtime))}` : '';
  const url = `/view?filename=${encodeURIComponent(
    media.filename || ''
  )}&subfolder=${encodeURIComponent(media.subfolder || '')}&type=${encodeURIComponent(type)}${version}`;

  const metaChips = useMemo(() => {
    const chips = [];
    if (media.size) chips.push(formatBytes(media.size));
    if (media.width && media.height) chips.push(`${media.width}×${media.height}`);
    else if (media.metadata?.resolution) chips.push(media.metadata.resolution);
    if (media.mtime) chips.push(new Date(media.mtime * 1000).toLocaleString());
    return chips;
  }, [media]);

  const body = (
    <div className="gallery-lightbox">
      <div className="gallery-lightbox__backdrop" onClick={onClose} />
      <div className="gallery-lightbox__panel">
        <header className="gallery-lightbox__header">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{media.filename}</div>
            <div className="text-[11px] text-[#9DA3FFCC] truncate">
              {media.subfolder || 'root'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onPrev} className="ui-button is-ghost is-compact">
              ←
            </button>
            <button type="button" onClick={onNext} className="ui-button is-ghost is-compact">
              →
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="ui-button is-muted is-compact"
            >
              Open
            </a>
            <button type="button" onClick={onClose} className="ui-button is-primary is-compact">
              Close
            </button>
          </div>
        </header>

        <div className="gallery-lightbox__body">
          {isVideo(media.filename) ? (
            <div className="gallery-lightbox__video">
              <video
                ref={videoRef}
                src={url}
                playsInline
                loop
                muted={muted}
                className="gallery-lightbox__media"
              />
              <div className="gallery-lightbox__controls">
                <button
                  type="button"
                  className="ui-button is-ghost is-compact"
                  onClick={() => setPlaying((prev) => !prev)}
                >
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  className="ui-button is-ghost is-compact"
                  onClick={() => setMuted((prev) => !prev)}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => {
                    const video = videoRef.current;
                    if (!video || !video.duration) return;
                    const next = Number(e.target.value);
                    video.currentTime = (next / 100) * video.duration;
                    setProgress(next);
                  }}
                />
                <div className="text-[11px] text-[#C3C7FF] w-20 text-right">
                  {duration ? `${Math.round(duration)}s` : ''}
                </div>
              </div>
            </div>
          ) : (
            <img src={url} alt={media.filename} className="gallery-lightbox__media" />
          )}
        </div>

        <footer className="gallery-lightbox__footer">
          {metaChips.map((chip) => (
            <span key={chip} className="ui-pill is-muted">
              {chip}
            </span>
          ))}
        </footer>
      </div>
    </div>
  );

  return createPortal(body, document.body);
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
    <div className="page-shell page-stack">
      <section className="ui-panel space-y-4">
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-[11px] text-[#9DA3FFCC]">
            {loading ? 'Loading…' : `${filtered.length} items`}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 justify-end">
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
      </section>

      <section className="ui-panel space-y-4">
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

        {filtered.length === 0 && !loading ? (
          <div className="py-10 flex items-center justify-center">
            <div className="ui-card max-w-md w-full text-center">
              <div className="mb-2 text-base font-semibold text-[#F8F4FF]">
                No media here
              </div>
              <div className="text-xs text-[#9DA3FFCC]">
                Adjust filters or render something new.
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
      </section>

      <Lightbox
        open={viewerOpen}
        media={currentMedia}
        onClose={closeViewer}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}
