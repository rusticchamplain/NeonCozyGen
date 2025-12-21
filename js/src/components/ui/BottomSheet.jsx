import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '../Icons';

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'sheet', // 'sheet' | 'fullscreen'
  className = '',
  contentClassName = '',
  shouldCloseOnOverlayClick = true,
  shouldCloseOnEsc = true,
}) {
  const overlayPointerDownRef = useRef(false);
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

  const contentClasses = useMemo(() => (
    [
      'bottom-sheet-content',
      variant === 'fullscreen' ? 'is-fullscreen' : 'is-sheet',
      contentClassName,
    ]
      .filter(Boolean)
      .join(' ')
  ), [contentClassName, variant]);

  const overlayClasses = useMemo(() => (
    ['bottom-sheet-overlay', className].filter(Boolean).join(' ')
  ), [className]);

  useEffect(() => {
    if (!open) return undefined;
    if (!shouldCloseOnEsc) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, shouldCloseOnEsc]);

  useEffect(() => {
    if (!open) return undefined;
    if (typeof document === 'undefined') return undefined;
    const contentEl = contentRef.current;
    lastFocusedRef.current = document.activeElement;

    const focusInitial = () => {
      const focusables = getFocusable(contentEl);
      const target = focusables[0] || contentEl;
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
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return (
    createPortal(
      <div
        className={overlayClasses}
        role="presentation"
        onPointerDown={(e) => {
          overlayPointerDownRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (!shouldCloseOnOverlayClick) return;
          if (!overlayPointerDownRef.current) return;
          if (e.target !== e.currentTarget) return;
          onClose?.();
        }}
      >
        <div
          ref={contentRef}
          className={contentClasses}
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Sheet'}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <div className="bottom-sheet-panel">
            <header className="bottom-sheet-head">
              <div className="bottom-sheet-title">{title || ''}</div>
              <button type="button" className="bottom-sheet-close" onClick={onClose} aria-label="Close">
                <IconX size={16} />
              </button>
            </header>

            <div className="bottom-sheet-body">{children}</div>

            {footer ? <footer className="bottom-sheet-foot">{footer}</footer> : null}
          </div>
        </div>
      </div>,
      document.body
    )
  );
}
