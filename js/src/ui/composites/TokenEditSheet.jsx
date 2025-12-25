import { useEffect, useMemo, useState, useCallback } from 'react';
import BottomSheet from '../primitives/BottomSheet';
import { formatTokenWeight } from '../../utils/tokenWeights';

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * Unified token sheet - supports both editing existing tokens and adding new ones.
 * "Low noise, high impact" - single sheet for all token operations.
 *
 * mode='edit' (default): Edit existing token - shows identity, strength, replace, delete
 * mode='add': Add new token - shows browse/search interface directly
 */
export default function TokenEditSheet({
  open,
  onClose,
  mode = 'edit', // 'edit' | 'add'
  tokenType = 'alias', // 'alias' | 'tag'
  tokenLabel = '',
  tokenDisplay = '',
  weight = 1,
  onWeightChange,
  onDelete,
  onAdd, // Called when adding a new token (add mode)
  // Alias replacement data
  aliases = [],
  aliasCategories = [],
  aliasLoading = false,
  // Tag replacement data
  tags = [],
  tagLoading = false,
  onLoadTags,
  // Search & replace
  replacementSearch = '',
  onReplacementSearchChange,
  onReplace,
  // Category filter
  activeCategory = 'All',
  onCategoryChange,
}) {
  const isAddMode = mode === 'add';
  const initial = useMemo(() => clamp(weight || 1, 0.2, 2.0), [weight]);
  const [draft, setDraft] = useState(initial);
  const [showReplace, setShowReplace] = useState(false);
  const [replaceType, setReplaceType] = useState(tokenType); // 'alias' | 'tag'

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setShowReplace(isAddMode); // In add mode, show browser immediately
    setReplaceType(tokenType);
  }, [open, initial, tokenType, isAddMode]);

  // Load tags when Replace section is expanded and viewing tags (or in add mode)
  useEffect(() => {
    if (open && (showReplace || isAddMode) && replaceType === 'tag') {
      onLoadTags?.();
    }
  }, [open, showReplace, replaceType, onLoadTags, isAddMode]);

  // Auto-apply weight changes
  const handleWeightChange = useCallback((newWeight) => {
    const clamped = clamp(newWeight, 0.2, 2.0);
    setDraft(clamped);
    onWeightChange?.(clamped);
  }, [onWeightChange]);

  const handleSliderChange = useCallback((e) => {
    handleWeightChange(parseFloat(e.target.value));
  }, [handleWeightChange]);

  // Filter replacements based on type, search, and category
  const filteredReplacements = useMemo(() => {
    const term = String(replacementSearch || '').trim().toLowerCase();

    if (replaceType === 'alias') {
      return aliases.filter((entry) => {
        if (activeCategory !== 'All' && (entry.category || '') !== activeCategory) return false;
        if (!term) return true;
        const display = String(entry.displayName || entry.name || '').toLowerCase();
        const token = String(entry.token || '').toLowerCase();
        return display.includes(term) || token.includes(term);
      });
    } else {
      return tags.filter((t) => {
        if (!term) return true;
        return String(t.tag || '').toLowerCase().includes(term);
      });
    }
  }, [replaceType, replacementSearch, activeCategory, aliases, tags]);

  const isLoading = replaceType === 'alias' ? aliasLoading : tagLoading;
  const isEmpty = filteredReplacements.length === 0 && !isLoading;

  const pretty = formatTokenWeight(draft);
  const isAlias = tokenType === 'alias';
  const title = isAddMode ? 'Add to Prompt' : (isAlias ? 'Edit Alias' : 'Edit Tag');

  // Reset category when switching types, load tags on demand
  const handleTypeChange = (type) => {
    setReplaceType(type);
    onCategoryChange?.('All');
    onReplacementSearchChange?.('');
    if (type === 'tag') {
      onLoadTags?.();
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
    >
      <div className="token-edit-sheet">
        {/* Token Identity - only in edit mode */}
        {!isAddMode && (
          <div className="token-edit-identity">
            <span className="token-edit-type-badge" data-type={tokenType}>
              {isAlias ? '$' : '#'}
            </span>
            <div className="token-edit-name">
              <span className="token-edit-display">{tokenDisplay || tokenLabel}</span>
              {isAlias && tokenLabel && tokenLabel !== tokenDisplay && (
                <span className="token-edit-token">${tokenLabel}$</span>
              )}
            </div>
          </div>
        )}

        {/* Strength Control - only in edit mode */}
        {!isAddMode && (
          <div className="token-edit-section">
            <div className="token-edit-strength-row">
              <span className="token-edit-section-label">Strength</span>
              <div className="token-edit-strength-controls">
                <button
                  type="button"
                  className="token-edit-strength-btn"
                  onClick={() => handleWeightChange(draft - 0.05)}
                  disabled={draft <= 0.2}
                  aria-label="Decrease strength"
                >
                  −
                </button>
                <span className="token-edit-strength-value">{pretty}×</span>
                <button
                  type="button"
                  className="token-edit-strength-btn"
                  onClick={() => handleWeightChange(draft + 0.05)}
                  disabled={draft >= 2.0}
                  aria-label="Increase strength"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0.2}
              max={2.0}
              step={0.05}
              value={draft}
              onChange={handleSliderChange}
              className="ui-range token-edit-slider"
              aria-label="Token strength"
            />
            <div className="token-edit-strength-hint">
              {draft < 0.8 ? 'Softened' : draft > 1.2 ? 'Emphasized' : 'Normal'} influence
            </div>
          </div>
        )}

        {/* Replace Toggle - only in edit mode; in add mode, show browser directly */}
        <div className="token-edit-section">
          {!isAddMode && (
            <button
              type="button"
              className={`token-edit-replace-toggle ${showReplace ? 'is-active' : ''}`}
              onClick={() => setShowReplace(!showReplace)}
            >
              <span className="token-edit-section-label">Replace with…</span>
              <span className="token-edit-toggle-icon">{showReplace ? '−' : '+'}</span>
            </button>
          )}

          {(showReplace || isAddMode) && (
            <div className="token-edit-replace-panel">
              {/* Type Toggle - Alias vs Tag */}
              <div className="token-edit-type-toggle">
                <button
                  type="button"
                  className={`token-edit-type-btn ${replaceType === 'alias' ? 'is-active' : ''}`}
                  onClick={() => handleTypeChange('alias')}
                >
                  <span className="token-edit-type-icon">$</span>
                  Aliases
                </button>
                <button
                  type="button"
                  className={`token-edit-type-btn ${replaceType === 'tag' ? 'is-active' : ''}`}
                  onClick={() => handleTypeChange('tag')}
                >
                  <span className="token-edit-type-icon">#</span>
                  Tags
                </button>
              </div>

              {/* Search and Category Filter Row */}
              <div className="token-edit-filter-row">
                <input
                  type="search"
                  value={replacementSearch}
                  onChange={(e) => onReplacementSearchChange?.(e.target.value)}
                  placeholder={replaceType === 'alias' ? 'Search aliases…' : 'Search tags…'}
                  className="ui-control ui-input token-edit-search"
                />

                {/* Category Dropdown - only for aliases */}
                {replaceType === 'alias' && aliasCategories.length > 1 && (
                  <select
                    value={activeCategory}
                    onChange={(e) => onCategoryChange?.(e.target.value)}
                    className="ui-control ui-select token-edit-category-select"
                    aria-label="Filter by category"
                  >
                    {aliasCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Results List */}
              <div className="token-edit-replace-list">
                {isLoading ? (
                  <div className="token-edit-replace-empty">Loading…</div>
                ) : isEmpty ? (
                  <div className="token-edit-replace-empty">
                    {replacementSearch ? 'No matches found' : `No ${replaceType === 'alias' ? 'aliases' : 'tags'} available`}
                  </div>
                ) : (
                  filteredReplacements.slice(0, 30).map((item) => {
                    const key = item.key || item.token || item.tag || item.displayName;
                    const name = item.displayName || item.name || item.tag || item.token;
                    const isAliasItem = !!item.token;

                    return (
                      <button
                        key={key}
                        type="button"
                        className="token-edit-replace-item"
                        onClick={() => {
                          const payload = { ...item, type: isAliasItem ? 'alias' : 'tag' };
                          if (isAddMode) {
                            onAdd?.(payload);
                          } else {
                            onReplace?.(payload);
                          }
                          onClose?.();
                        }}
                      >
                        <span className="token-edit-replace-type-icon" data-type={isAliasItem ? 'alias' : 'tag'}>
                          {isAliasItem ? '$' : '#'}
                        </span>
                        <span className="token-edit-replace-name">{name}</span>
                        {item.category && (
                          <span className="token-edit-replace-category">{item.category}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="token-edit-actions">
          <button
            type="button"
            className="token-edit-apply"
            onClick={onClose}
          >
            {isAddMode ? 'Done' : 'Apply'}
          </button>
          {!isAddMode && (
            <button
              type="button"
              className="token-edit-delete"
              onClick={() => {
                onDelete?.();
                onClose?.();
              }}
            >
              Remove from prompt
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
