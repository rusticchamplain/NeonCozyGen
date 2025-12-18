import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

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
          className={contentClasses}
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Sheet'}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bottom-sheet-panel">
            <header className="bottom-sheet-head">
              <div className="bottom-sheet-title">{title || ''}</div>
              <button type="button" className="bottom-sheet-close" onClick={onClose} aria-label="Close">
                ×
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
