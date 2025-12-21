// js/src/components/MediaViewerModal.jsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGalleryPrompt, queuePrompt } from '../api';
import Button from './ui/Button';
import { IconChevronLeft, IconChevronRight, IconX } from './Icons';
import { saveLastRenderPayload } from '../utils/globalRender';

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
  const [metaOpen, setMetaOpen] = useState(false);
  const [rerunBusy, setRerunBusy] = useState(false);
  const contentRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const getFocusable = (root) => {
    if (!root) return [];
    return Array.from(
      root.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  };

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
    setMetaOpen(false);
  }, [isOpen, media]);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (typeof document === 'undefined') return undefined;
    const contentEl = contentRef.current;
    lastFocusedRef.current = document.activeElement;

    const focusInitial = () => {
      const focusables = getFocusable(contentEl);
      const target = closeButtonRef.current || focusables[0] || contentEl;
      target?.focus?.();
    };

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (!contentEl) return;
      const focusables = getFocusable(contentEl);
      if (!focusables.length) {
        e.preventDefault();
        contentEl.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    requestAnimationFrame(focusInitial);
    contentEl?.addEventListener('keydown', onKeyDown);

    return () => {
      contentEl?.removeEventListener('keydown', onKeyDown);
      const lastFocused = lastFocusedRef.current;
      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus?.();
      }
    };
  }, [isOpen]);

  if (!media) return null;
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const url = mediaUrl(media);
  const locationLabel = media.subfolder || 'Gallery';
  const isClip = isVideo(media.filename);
  const showNav = total > 1;
  const meta = media?.meta || {};
  const metaRows = [
    meta?.model ? { label: 'Model', value: meta.model } : null,
    meta?.prompt ? { label: 'Prompt', value: meta.prompt, isPrompt: true } : null,
    Array.isArray(meta?.loras) && meta.loras.length
      ? { label: 'LoRAs', value: meta.loras.join(', ') }
      : null,
  ].filter(Boolean);
  const hasPromptMeta = Boolean(media?.meta?.has_prompt || metaRows.length);
  const isPng = typeof media?.filename === 'string' && media.filename.toLowerCase().endsWith('.png');
  const canRerun = hasPromptMeta && isPng;

  const emitRenderState = (active) => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('cozygen:render-state', { detail: { active } }));
    } catch {
      // ignore
    }
  };

  const handleRerun = async () => {
    if (!media || rerunBusy || !canRerun) return;
    setRerunBusy(true);
    emitRenderState(true);
    try {
      const data = await getGalleryPrompt({
        filename: media.filename,
        subfolder: media.subfolder || '',
      });
      const prompt = data?.prompt;
      if (!prompt) {
        throw new Error('prompt_missing');
      }

      saveLastRenderPayload({
        workflowName: media.filename || 'gallery',
        workflow: prompt,
        timestamp: Date.now(),
      });

      await queuePrompt({ prompt });
      emitRenderState(false);
    } catch (err) {
      emitRenderState(false);
      if (err?.unauthorized) {
        window.location.hash = '#/login';
        return;
      }
      alert('Unable to re-run this item. It may not include prompt metadata.');
    } finally {
      setRerunBusy(false);
    }
  };

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
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-label="Preview"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <div className="media-viewer-panel">
            <header className="media-viewer-head">
              <div className="media-viewer-head-bar bottom-sheet-head">
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
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="bottom-sheet-close media-viewer-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <IconX size={16} />
                </button>
              </div>
              <div className="media-viewer-actions">
                {canRerun ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRerun}
                    disabled={rerunBusy}
                    aria-label="Re-run generation"
                  >
                    {rerunBusy ? 'Re-running…' : 'Re-run'}
                  </Button>
                ) : null}
                {metaRows.length ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMetaOpen((prev) => !prev)}
                    aria-expanded={metaOpen}
                    aria-label={metaOpen ? 'Hide metadata' : 'Show metadata'}
                  >
                    {metaOpen ? 'Hide metadata' : 'Metadata'}
                  </Button>
                ) : null}
                <Button
                  as="a"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  variant="ghost"
                  size="sm"
                >
                  Open
                </Button>
              </div>
            </header>

            {metaOpen && metaRows.length ? (
              <div className="media-viewer-info" aria-label="Generation metadata">
                {metaRows.map((row) => (
                  <div key={row.label} className="media-info-row">
                    <span className="media-info-label">{row.label}</span>
                    <span className={`media-info-value ${row.isPrompt ? 'is-prompt' : ''}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="media-viewer-stage">
              {showNav ? (
                <button
                  type="button"
                  className={`media-stage-nav is-left ${canPrev ? '' : 'is-disabled'}`}
                  onClick={onPrev}
                  aria-label="Previous"
                  disabled={!canPrev}
                >
                  <IconChevronLeft size={18} />
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
                  <IconChevronRight size={18} />
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
