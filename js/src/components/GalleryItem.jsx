// js/src/components/GalleryItem.jsx
import React, { useEffect, useRef } from 'react';

const looksLikeVideo = (name = '') =>
  /\.(mp4|webm|mov|mkv)$/i.test(name);

const FeedVideoPlayer = ({ src, poster, autoPlay }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    el.load();
  }, [src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let observer;

    const attemptPlay = () => {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay might be blocked; ignore errors to avoid console noise.
        });
      }
    };

    const pauseVideo = () => {
      el.pause();
    };

    if (autoPlay) {
      const supportsObserver =
        typeof window !== 'undefined' && 'IntersectionObserver' in window;

      if (supportsObserver) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                attemptPlay();
              } else {
                pauseVideo();
              }
            });
          },
          { threshold: 0.65 }
        );
        observer.observe(el);
      } else {
        attemptPlay();
      }
    } else {
      pauseVideo();
      el.currentTime = 0;
    }

    return () => {
      if (observer) observer.disconnect();
      pauseVideo();
    };
  }, [autoPlay, src]);

  if (!src) {
    return (
      <div className="flex items-center justify-center py-16 text-[11px] text-[#9DA3FFCC]">
        No preview available
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      muted
      playsInline
      loop
      preload="metadata"
      className="w-full h-auto max-h-[80vh] rounded-2xl object-contain bg-black/40"
    />
  );
};

export default function GalleryItem({
  item,
  onSelect,
  variant = 'grid', // 'grid' | 'feed'
  autoPlay = false,
}) {
  if (!item) return null;

  const isDir = item.type === 'directory';
  const filename = item.filename || '';
  const subfolder = item.subfolder || '';
  const displayName = filename || subfolder || 'Unknown';

  const handleClick = () => {
    if (!onSelect) return;
    onSelect(item);
  };

  // Build thumbnail URL based on the CozyGen API contract:
  // /cozygen/thumb?type=output&subfolder=...&filename=...&w=...
  const thumbSize = variant === 'feed' ? 768 : 384;
  const thumbSrc = !isDir && filename
    ? `/cozygen/thumb?type=output&subfolder=${encodeURIComponent(
        subfolder
      )}&filename=${encodeURIComponent(filename)}&w=${thumbSize}`
    : null;

  const mediaSrc =
    !isDir && filename
      ? (() => {
          const type = item.type && item.type !== 'directory' ? item.type : 'output';
          const version = item.mtime ? `&v=${encodeURIComponent(String(item.mtime))}` : '';
          return `/view?filename=${encodeURIComponent(
            filename
          )}&subfolder=${encodeURIComponent(
            subfolder
          )}&type=${encodeURIComponent(type)}${version}`;
        })()
      : null;

  const isVideo = looksLikeVideo(filename);

  // ----- DIRECTORY TILE (grid only) -----
  if (isDir) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="group flex flex-col items-start justify-between rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-left hover:border-[#6B5BFF] hover:bg-[#0B0E27] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#6B5BFF] to-[#FF4F9A] opacity-80 group-hover:opacity-100 flex items-center justify-center text-[11px] text-white">
            ▤
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-[#E5E7FF] truncate">
              {displayName}
            </div>
            <div className="text-[10px] text-[#9DA3FFCC] truncate">
              Collection
            </div>
          </div>
        </div>
      </button>
    );
  }

  // ----- FEED VARIANT: large vertical card -----
  if (variant === 'feed') {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleClick}
          className="group relative w-full overflow-hidden rounded-2xl bg-[#020312]"
        >
          <div className="relative w-full flex items-center justify-center bg-[#020312]">
            {isVideo ? (
              <FeedVideoPlayer src={mediaSrc} poster={thumbSrc} autoPlay={autoPlay} />
            ) : thumbSrc ? (
              <img
                src={thumbSrc}
                alt={displayName}
                className="w-full h-auto max-h-[80vh] rounded-2xl object-contain bg-black/40"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center py-16 text-[11px] text-[#9DA3FFCC]">
                No preview available
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05071680] opacity-0 group-hover:opacity-100 transition-opacity" />

          {isVideo && (
            <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-[#050716CC] px-2 py-[1px] text-[10px] text-[#CFFAFE] border border-[#3EF0FF80]">
              Video
            </div>
          )}
        </button>

        <div className="flex items-center justify-between text-[11px] text-[#9DA3FFCC]">
          <div className="flex-1 min-w-0">
            <div className="truncate text-[#E5E7FF]">{displayName}</div>
            {subfolder && (
              <div className="truncate text-[10px] text-[#6A6FA8]">
                {subfolder}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="ml-3 px-2 py-[3px] rounded-full border border-[#3D4270] bg-[#050716] text-[10px] text-[#C3C7FF] hover:border-[#6B5BFF]"
          >
            Open
          </button>
        </div>
      </div>
    );
  }

  // ----- GRID VARIANT: small tiles -----
  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative w-full overflow-hidden rounded-xl border border-[#2A2E4A] bg-[#050716] hover:border-[#6B5BFF] hover:bg-[#0B0E27] transition-colors"
    >
      <div className="relative w-full aspect-[4/5] bg-[#020312]">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={displayName}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-[#9DA3FFCC] px-2 text-center">
            No preview
          </div>
        )}
        {isVideo && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-[#050716E0] px-2 py-[2px] text-[10px] text-[#CFFAFE] border border-[#3EF0FF80]">
            Video
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050716CC] via-[#05071699] to-transparent px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] text-[#E5E7FF] truncate">
            {displayName}
          </div>
          {isVideo && (
            <span className="text-[9px] uppercase tracking-[0.16em] text-[#CFFAFE]">
              Vid
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
