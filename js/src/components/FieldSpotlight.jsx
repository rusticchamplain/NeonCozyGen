// js/src/components/FieldSpotlight.jsx
import { useEffect, useRef, useState } from 'react';
import { IconX } from './Icons';

export default function FieldSpotlight({
  open,
  onClose,
  title,
  description,
  render,
  index = 0,
  total = 0,
  children,
}) {
  const [ackState, setAckState] = useState('idle'); // idle | queued
  const sheetRef = useRef(null);
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
    if (ackState === 'queued') {
      const t = setTimeout(() => setAckState('idle'), 1600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [ackState]);

  useEffect(() => {
    if (!open) return undefined;
    if (typeof document === 'undefined') return undefined;
    const sheetEl = sheetRef.current;
    lastFocusedRef.current = document.activeElement;

    const focusInitial = () => {
      const focusables = getFocusable(sheetEl);
      const target = focusables[0] || sheetEl;
      target?.focus?.();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;
      if (!sheetEl) return;
      const focusables = getFocusable(sheetEl);
      if (!focusables.length) {
        e.preventDefault();
        sheetEl.focus();
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
    sheetEl?.addEventListener('keydown', onKeyDown);

    return () => {
      sheetEl?.removeEventListener('keydown', onKeyDown);
      const lastFocused = lastFocusedRef.current;
      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus?.();
      }
    };
  }, [open, onClose]);

  if (!open) return null;
  const content = typeof render === 'function' ? render() : children;
  return (
    <div className="spotlight-overlay" role="dialog" aria-modal="true">
      <div className="spotlight-backdrop" onClick={onClose} />
      <div className="spotlight-sheet" ref={sheetRef} tabIndex={-1}>
        <div className="spotlight-header">
          <div className="spotlight-meta">
            <div className="spotlight-kicker">Focused control</div>
            <div className="spotlight-title">{title || 'Control'}</div>
            {description ? (
              <div className="spotlight-hint">{description}</div>
            ) : null}
          </div>
          <button type="button" className="spotlight-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>
        <div className="spotlight-body">{content}</div>
        <div className="spotlight-footer">
          <div className="spotlight-footer-right">
            <button
              type="button"
              className="ui-button is-muted is-compact"
              onClick={onClose}
              aria-label="Close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
