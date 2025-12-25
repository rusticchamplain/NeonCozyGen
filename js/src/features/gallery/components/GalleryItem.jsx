// js/src/components/GalleryItem.jsx
import { memo, useEffect, useRef } from 'react';
import { usePageVisibility } from '../../../hooks/usePageVisibility';
import Button from '../../../ui/primitives/Button';
import { IconTweak, IconTrash } from '../../../ui/primitives/Icons';

const looksLikeVideo = (name = '') =>
  /\.(mp4|webm|mov|mkv)$/i.test(name);

const FeedVideoPlayer = ({ src, poster, autoPlay }) => {
  const videoRef = useRef(null);
  const isVisible = usePageVisibility();

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

    if (!autoPlay) {
      pauseVideo();
      el.currentTime = 0;
    } else if (!isVisible) {
      pauseVideo();
    } else {
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
    }

    return () => {
      if (observer) observer.disconnect();
      pauseVideo();
    };
  }, [autoPlay, src, isVisible]);

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
      preload={autoPlay ? 'metadata' : 'none'}
      className="w-full h-auto max-h-[80vh] rounded-2xl object-contain bg-black/40"
    />
  );
};

const tileVisibilityStyles = {
  contentVisibility: 'auto',
  containIntrinsicSize: '260px 320px',
};

function GalleryItem({
  item,
  onSelect,
  onDelete,
  onRerun,
  isDeleting = false,
  variant = 'grid', // 'grid' | 'feed'
  autoPlay = false,
}) {
  if (!item) return null;

  const isDir = item.type === 'directory';
  const filename = item.filename || '';
  const subfolder = item.subfolder || '';
  const displayName = filename || subfolder || 'Unknown';
  const thumbVersionValue = item.mtime ?? item.modified ?? item.updated_at ?? item.created_at;
  const thumbVersion = thumbVersionValue ? `&v=${encodeURIComponent(String(thumbVersionValue))}` : '';

  const handleClick = () => {
    if (!onSelect) return;
    onSelect(item);
  };

  // Build thumbnail URL based on the CozyGen API contract:
  // /cozygen/thumb?type=output&subfolder=...&filename=...&w=...
  const thumbSize = variant === 'feed' ? 768 : 384;
  const thumbBase = !isDir && filename
    ? `/cozygen/thumb?type=output&subfolder=${encodeURIComponent(
        subfolder
      )}&filename=${encodeURIComponent(filename)}${thumbVersion}&w=`
    : null;
  const thumbSrc = thumbBase ? `${thumbBase}${thumbSize}` : null;
  const thumbSrcSet = thumbBase
    ? variant === 'feed'
      ? `${thumbBase}384 384w, ${thumbBase}768 768w`
      : `${thumbBase}192 192w, ${thumbBase}384 384w`
    : null;
  const thumbSizes = variant === 'feed'
    ? '(max-width: 768px) 92vw, 768px'
    : '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px';

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
  const canDelete = Boolean(onDelete) && !isDir;
  const meta = item?.meta || {};
  const hasPromptMeta = Boolean(meta?.has_prompt || meta?.prompt || meta?.model || (Array.isArray(meta?.loras) && meta.loras.length));
  const isPng = typeof filename === 'string' && filename.toLowerCase().endsWith('.png');
  const canRerun = Boolean(onRerun) && !isDir && hasPromptMeta && isPng;

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(item);
  };

  const handleRerun = (e) => {
    e.stopPropagation();
    onRerun?.(item);
  };

  // ----- DIRECTORY TILE (grid only) -----
  if (isDir) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="gallery-dir-tile"
        style={tileVisibilityStyles}
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
    const feedVisibilityStyles = {
      contentVisibility: 'auto',
      containIntrinsicSize: '520px 720px',
    };
    return (
      <div className="gallery-feed-item" style={feedVisibilityStyles}>
        <button
          type="button"
          onClick={handleClick}
          className="gallery-feed-media"
        >
          <div className="relative w-full flex items-center justify-center bg-[#020312]">
            {isVideo ? (
              <FeedVideoPlayer src={mediaSrc} poster={thumbSrc} autoPlay={autoPlay} />
            ) : thumbSrc ? (
              <img
                src={thumbSrc}
                srcSet={thumbSrcSet || undefined}
                sizes={thumbSizes}
                alt={displayName}
                className="w-full h-auto max-h-[80vh] rounded-2xl object-contain bg-black/40"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex items-center justify-center py-16 text-[11px] text-[#9DA3FFCC]">
                No preview available
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05071680] opacity-0 group-hover:opacity-100 transition-opacity" />

          {isVideo && (
            <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-[#050716CC] px-2 py-[1px] text-[10px] text-[#CFFAFE] border border-[#3EF0FF80]">
              Video
            </div>
          )}
        </button>
        {canDelete ? (
          <Button
            size="mini"
            variant="muted"
            iconOnly
            className="gallery-tile-delete"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete item"
            title={isDeleting ? 'Deleting…' : 'Delete item'}
          >
            <IconTrash size={12} />
          </Button>
        ) : null}
        {canRerun ? (
          <Button
            size="mini"
            variant="ghost"
            iconOnly
            className="gallery-tile-rerun"
            onClick={handleRerun}
            aria-label="Tweak"
            title="Tweak"
          >
            <IconTweak size={12} />
          </Button>
        ) : null}
      </div>
    );
  }

  // ----- GRID VARIANT: small tiles -----
  return (
    <div className="gallery-tile" style={tileVisibilityStyles}>
      <button
        type="button"
        onClick={handleClick}
        className="gallery-tile-button"
      >
        <div className="gallery-tile-media">
          {thumbSrc ? (
            <img
              src={thumbSrc}
              srcSet={thumbSrcSet || undefined}
              sizes={thumbSizes}
              alt={displayName}
              className="gallery-tile-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="gallery-tile-empty">
              No preview
            </div>
          )}
          {isVideo && (
            <div className="gallery-badge">
              Video
            </div>
          )}
        </div>
      </button>
      {canDelete ? (
        <Button
          size="mini"
          variant="muted"
          iconOnly
          className="gallery-tile-delete"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Delete item"
          title={isDeleting ? 'Deleting…' : 'Delete item'}
        >
          <IconTrash size={12} />
        </Button>
      ) : null}
      {canRerun ? (
        <Button
          size="mini"
          variant="ghost"
          iconOnly
          className="gallery-tile-rerun"
          onClick={handleRerun}
          aria-label="Tweak"
          title="Tweak"
        >
          <IconTweak size={12} />
        </Button>
      ) : null}
    </div>
  );
}

export default memo(GalleryItem);
