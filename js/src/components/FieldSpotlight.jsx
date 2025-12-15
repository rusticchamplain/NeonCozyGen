// js/src/components/FieldSpotlight.jsx
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (ackState === 'queued') {
      const t = setTimeout(() => setAckState('idle'), 1600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [ackState]);

  if (!open) return null;
  const content = typeof render === 'function' ? render() : children;
  return (
    <div className="spotlight-overlay" role="dialog" aria-modal="true">
      <div className="spotlight-backdrop" onClick={onClose} />
      <div className="spotlight-sheet">
        <div className="spotlight-header">
          <div className="spotlight-meta">
            <div className="spotlight-kicker">Focused control</div>
            <div className="spotlight-title">{title || 'Control'}</div>
            {description ? (
              <div className="spotlight-hint">{description}</div>
            ) : null}
          </div>
          <button type="button" className="spotlight-close" onClick={onClose} aria-label="Close">
            ×
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
