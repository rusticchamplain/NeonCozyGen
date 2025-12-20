// js/src/components/MediaViewerModal.jsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const isVideo = (name = '') => /\.(mp4|webm|mov|mkv)$/i.test(name);

const mediaUrl = (item) => {
  if (!item) return '';
  const filename = item.filename || '';
  const subfolder = item.subfolder || '';
  const type = item.type || 'output';
  const v = item.mtime ? `&v=${encodeURIComponent(String(item.mtime))}` : '';
  return `/view?filename=${encodeURIComponent(
    filename
  )}&subfolder=${encodeURIComponent(
    subfolder
  )}&type=${encodeURIComponent(type)}${v}`;
};

export default function MediaViewerModal({
  isOpen,
  media,
  onClose,
  onPrev,
  onNext,
  total = 0,
  canPrev = false,
  canNext = false,
}) {
  const overlayPointerDownRef = useRef(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft' && canPrev) onPrev?.();
      if (e.key === 'ArrowRight' && canNext) onNext?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, onNext, onPrev, canPrev, canNext]);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus?.();
  }, [isOpen]);

  if (!media) return null;
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const url = mediaUrl(media);
  const locationLabel = media.subfolder || 'Gallery';
  const isClip = isVideo(media.filename);
  const showNav = total > 1;

  return (
    createPortal(
      <div
        className="react-modal-overlay"
        role="presentation"
        onPointerDown={(e) => {
          overlayPointerDownRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (!overlayPointerDownRef.current) return;
          if (e.target !== e.currentTarget) return;
          onClose?.();
        }}
      >
        <div
          className="react-modal-content"
          role="dialog"
          aria-modal="true"
          aria-label="Preview"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="media-viewer-panel">
            <header className="media-viewer-head">
              <div className="media-viewer-meta">
                <div className="media-viewer-title" title={media.filename}>
                  {media.filename}
                </div>
                <div className="media-viewer-sub">
                  <span className="media-chip">{locationLabel}</span>
                  <span className={`media-chip ${isClip ? 'is-clip' : 'is-still'}`}>
                    {isClip ? 'Video' : 'Image'}
                  </span>
                </div>
              </div>
              <div className="media-viewer-actions">
                <a href={url} target="_blank" rel="noreferrer" className="media-btn">
                  Open
                </a>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="media-btn solid"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </header>

            <div className="media-viewer-stage">
              {showNav ? (
                <button
                  type="button"
                  className={`media-stage-nav is-left ${canPrev ? '' : 'is-disabled'}`}
                  onClick={onPrev}
                  aria-label="Previous"
                  disabled={!canPrev}
                >
                  ←
                </button>
              ) : null}
              <div className="media-viewer-frame">
                {isClip ? (
                  <video
                    src={url}
                    controls
                    className="media-viewer-media"
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <img src={url} alt={media.filename} className="media-viewer-media" />
                )}
              </div>
              {showNav ? (
                <button
                  type="button"
                  className={`media-stage-nav is-right ${canNext ? '' : 'is-disabled'}`}
                  onClick={onNext}
                  aria-label="Next"
                  disabled={!canNext}
                >
                  →
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  );
}
