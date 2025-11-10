// js/src/components/presets/PresetCard.jsx
import React, { useEffect, useMemo, useRef } from 'react';

export default function PresetCard({
  workflow,
  preset,
  workflowMode,
  modeOptions = [],
  previewUrl,
  tags = [],
  isSelected,
  requiresImages = false,
  onSelect,
  onAssignMode,
  savingMode,
  autoFocus = false,
  onClear,
  children,
}) {
  const cardClass = [
    'preset-card ui-card',
    isSelected ? 'preset-card--active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cardRef = useRef(null);

  useEffect(() => {
    if (isSelected && autoFocus && cardRef.current) {
      cardRef.current.focus();
    }
  }, [isSelected, autoFocus]);

  useEffect(() => {
    if (!isSelected || !cardRef.current) return;
    const node = cardRef.current;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClear?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = node.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', handleKeyDown);
    return () => node.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, onClear]);

  const description =
    (preset?.meta?.description || '').trim() || 'No description yet.';

  const modeLabel = useMemo(() => {
    if (!workflowMode) return 'Uncategorized';
    const match = modeOptions.find((opt) => opt.id === workflowMode);
    return match ? match.label : workflowMode;
  }, [workflowMode, modeOptions]);

  return (
    <div
      className={cardClass}
      tabIndex={isSelected ? 0 : -1}
      ref={cardRef}
      onClick={() => {
        if (!isSelected) onSelect?.();
      }}
    >
      {previewUrl ? (
        <div className="preset-card-preview">
          <img src={previewUrl} alt={`${preset?.name} preview`} loading="lazy" />
        </div>
      ) : (
        <div className="preset-card-preview preset-card-preview--placeholder">
          <span>{preset?.name?.slice(0, 1) || 'P'}</span>
        </div>
      )}

      <div className="preset-card-heading">
        <div>
          <span className="ui-kicker">{workflow}</span>
          <h3 className="preset-card-title">{preset?.name}</h3>
        </div>
        <div className="preset-card-mode">
          <label
            htmlFor={`mode-${workflow}-${preset?.name}`}
            className="preset-card-label"
          >
            Mode
          </label>
          <select
            id={`mode-${workflow}-${preset?.name}`}
            value={workflowMode || ''}
            onChange={(e) => onAssignMode?.(e.target.value || null)}
            disabled={savingMode}
          >
            <option value="">Unset</option>
            {modeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          {savingMode && <span className="preset-card-saving">Saving…</span>}
        </div>
      </div>

      <div className="preset-card-chips">
        <span className="ui-pill is-muted">{modeLabel}</span>
        {requiresImages && <span className="ui-pill is-soft">Image input</span>}
        {isSelected && <span className="ui-pill is-soft">Active</span>}
      </div>

      <p className="ui-hint">{description}</p>

      {tags.length > 0 && (
        <div className="preset-card-tags">
          {tags.map((tag) => (
            <span key={tag} className="preset-card-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {!isSelected && (
        <div className="preset-card-actions">
          <button
            type="button"
            className="ui-button is-primary is-compact"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
          >
            Activate
          </button>
        </div>
      )}

      {children && (
        <div className="preset-card-live" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}
