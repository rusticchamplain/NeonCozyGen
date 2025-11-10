// js/src/components/presets/PresetCard.jsx
import React, { useEffect, useMemo, useRef } from 'react';

export default function PresetCard({
  workflow,
  preset,
  workflowMode,
  modeOptions = [],
  previewSrc,
  previewType = 'image',
  tags = [],
  isSelected,
  requiresImages = false,
  canQuickLaunch = false,
  launching = false,
  onActivate,
  onBuilder,
  onQuickLaunch,
  onAssignMode,
  onUploadPreview,
  onClear,
  savingMode,
  previewSaving = false,
  children,
  description,
}) {
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.focus();
    }
  }, [isSelected]);

  useEffect(() => {
    if (!isSelected || !cardRef.current) return;
    const node = cardRef.current;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClear?.();
        return;
      }
    };
    node.addEventListener('keydown', handleKeyDown);
    return () => node.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, onClear]);

  const modeLabel = useMemo(() => {
    if (!workflowMode) return 'Uncategorized';
    const match = modeOptions.find((opt) => opt.id === workflowMode);
    return match ? match.label : workflowMode;
  }, [workflowMode, modeOptions]);

  const previewIsVideo =
    previewType === 'video' ||
    (previewSrc && previewSrc.startsWith('data:video'));

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUploadPreview?.(file);
    event.target.value = '';
  };

  const cardClass = [
    'preset-card',
    isSelected ? 'preset-card--active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClass}
      tabIndex={isSelected ? 0 : -1}
      ref={cardRef}
    >
      <div className="preset-card-media" onClick={() => onActivate?.()}>
        {previewSrc ? (
          previewIsVideo ? (
            <video
              src={previewSrc}
              muted
              loop
              playsInline
              autoPlay
              className="preset-card-media-src"
            />
          ) : (
            <img
              src={previewSrc}
              alt={`${preset?.name} preview`}
              loading="lazy"
              className="preset-card-media-src"
            />
          )
        ) : (
          <div className="preset-card-preview preset-card-preview--placeholder">
            <span>{preset?.name?.slice(0, 1) || 'P'}</span>
          </div>
        )}
        <div className="preset-card-overlay">
          <div>
            <span className="ui-kicker">{workflow}</span>
            <div className="preset-card-title">{preset?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <select
              id={`mode-${workflow}-${preset?.name}`}
              value={workflowMode || ''}
              onChange={(e) => onAssignMode?.(e.target.value || null)}
              disabled={savingMode}
              className="preset-card-mode-select"
            >
              <option value="">Unset</option>
              {modeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="preset-card-setref"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={previewSaving}
            >
              {previewSaving ? 'Uploading…' : 'Reference'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      <div className="preset-card-underbar">
        <div className="preset-card-tagrow">
          <span className="ui-pill is-muted">{modeLabel}</span>
          {requiresImages && <span className="ui-pill is-soft">Image input</span>}
          {tags.map((tag) => (
            <span key={tag} className="ui-pill is-soft">
              {tag}
            </span>
          ))}
        </div>
        {description && (
          <p className="preset-card-description">{description}</p>
        )}
        <div className="preset-card-actions">
          <button
            type="button"
            className="ui-button is-primary is-compact"
            onClick={(e) => {
              e.stopPropagation();
              onActivate?.();
            }}
          >
            {isSelected ? 'Reapply' : 'Activate'}
          </button>
          <button
            type="button"
            className="ui-button is-muted is-compact"
            onClick={(e) => {
              e.stopPropagation();
              onBuilder?.();
            }}
          >
            Builder
          </button>
          <button
            type="button"
            className="ui-button is-ghost is-compact"
            disabled={!canQuickLaunch || launching}
            onClick={(e) => {
              e.stopPropagation();
              if (canQuickLaunch && !launching) onQuickLaunch?.();
            }}
          >
            {launching ? 'Rendering…' : 'Quick launch'}
          </button>
        </div>
      </div>

      {isSelected && children && (
        <div className="preset-card-drawer" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}
