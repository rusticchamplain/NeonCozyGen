// js/src/components/PromptComposer.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function PromptComposer({
  open,
  onClose,
  value = '',
  onChange,
  aliasOptions = [],
  aliasCatalog = [],
  aliasLookup,
  fieldLabel = 'Prompt',
}) {
  const textRef = useRef(null);
  const scrollRestoreRef = useRef(null);
  const searchInputRef = useRef(null);
  const sentinelRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('All');
  const [pickerSubcategory, setPickerSubcategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'aliases'

  // Drag and drop state
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const dragNodeRef = useRef(null);
  const touchStartRef = useRef(null);

  // Sync local value with prop when modal opens
  useEffect(() => {
    if (open) {
      setLocalValue(value);
    }
  }, [open, value]);

  const aliasEntries = useMemo(
    () => (Array.isArray(aliasCatalog) ? aliasCatalog.filter((e) => e && e.name) : []),
    [aliasCatalog]
  );

  const withSubcategory = useMemo(() => {
    // Human-readable labels for technical subcategory prefixes
    const subLabels = {
      precip: 'Weather',
      ambient: 'Atmosphere',
      sky: 'Sky',
      urbex: 'Urban Exploration',
      scifi: 'Sci-Fi',
      framing: 'Framing',
      angle: 'Angle',
      perspective: 'Perspective',
      composition: 'Composition',
      motion: 'Motion',
    };

    // Special full-name mappings for known problematic aliases
    const specialNames = {
      'sky_hour': 'Golden Hour',
      'sky_blue': 'Clear Blue Sky',
      'sky_clouds': 'Sunset Clouds',
      'sky_lights': 'Aurora Borealis',
      'sky_night': 'Starry Night',
      'sky_rainbow': 'Rainbow',
      'ambient_mist': 'Misty Fog',
      'ambient_blossom': 'Cherry Blossoms',
      'ambient_leaves': 'Autumn Leaves',
      'ambient_storm': 'Sandstorm',
      'ambient_heatwave': 'Heat Wave',
      'precip_day': 'Rainy Day',
      'precip_thunderstorm': 'Thunderstorm',
      'precip_snowfall': 'Snowfall',
      'precip_blizzard': 'Blizzard',
      'painterly_painterly': 'Painterly',
      'explorer_explorer': 'Explorer',
      'painterly_e_print': 'Ukiyo-e Print',
      'painterly_wash_monochrome': 'Ink Wash',
    };

    return aliasEntries.map((entry) => {
      const name = entry.name || '';
      const tokenPart = entry.token || name;
      const base = tokenPart.includes(':') ? tokenPart.split(':')[1] : tokenPart;

      // Check for special name mapping first
      if (specialNames[base]) {
        const parts = base.split('_').filter(Boolean);
        const sub = parts.length > 0 ? parts[0] : 'other';
        return { ...entry, subcategory: sub, displayName: specialNames[base] };
      }

      // Remove trailing numbers (e.g., "neon_1" -> "neon")
      const cleanBase = base.replace(/_(\d+)$/, '');
      const parts = cleanBase.split('_').filter(Boolean);
      const sub = parts.length > 0 ? parts[0] : 'other';
      const mainParts = parts.length > 1 ? parts.slice(1) : [];

      // Capitalize each word
      const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1);

      const friendlyMain = mainParts.map(capitalize).join(' ').trim();
      const friendlyWhole = parts.map(capitalize).join(' ').trim();

      // Get human-readable subcategory label
      const subLabel = subLabels[sub.toLowerCase()] || capitalize(sub);

      // Avoid redundant display like "Painterly - Painterly"
      let displayName;
      if (!friendlyMain || friendlyMain.toLowerCase() === subLabel.toLowerCase()) {
        displayName = friendlyWhole || base || name;
      } else {
        displayName = `${subLabel} - ${friendlyMain}`;
      }

      return { ...entry, subcategory: sub, displayName };
    });
  }, [aliasEntries]);

  const categories = useMemo(() => {
    const set = new Set(['All']);
    aliasEntries.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [aliasEntries]);

  const subcategories = useMemo(() => {
    const set = new Set(['All']);
    withSubcategory.forEach((e) => {
      if (!pickerCategory || pickerCategory === 'All' || e.category === pickerCategory) {
        if (e.subcategory) set.add(e.subcategory);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [withSubcategory, pickerCategory]);

  const filteredAliases = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    return withSubcategory
      .filter((e) => {
        if (pickerCategory !== 'All' && (e.category || '') !== pickerCategory) return false;
        if (pickerSubcategory !== 'All' && (e.subcategory || 'other') !== pickerSubcategory)
          return false;
        if (!term) return true;
        return (
          e.token?.toLowerCase().includes(term) ||
          e.text?.toLowerCase().includes(term) ||
          e.name?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const subA = (a.subcategory || '').toLowerCase();
        const subB = (b.subcategory || '').toLowerCase();
        if (subA !== subB) return subA.localeCompare(subB);
        return a.token.localeCompare(b.token);
      });
  }, [withSubcategory, pickerCategory, pickerSubcategory, pickerSearch]);

  const visibleAliases = useMemo(
    () => filteredAliases.slice(0, visibleCount),
    [filteredAliases, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(30);
  }, [pickerCategory, pickerSubcategory, pickerSearch, aliasEntries]);

  useEffect(() => {
    setPickerSubcategory('All');
  }, [pickerCategory]);

  // Infinite scroll with IntersectionObserver sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && visibleCount < filteredAliases.length) {
          setVisibleCount((c) => Math.min(c + 20, filteredAliases.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredAliases.length]);

  // Parse tokens from current text
  const tokens = useMemo(() => {
    if (typeof localValue !== 'string') return [];
    const found = [];
    const re = /\$([a-z0-9_:-]+)\$/gi;
    let match;
    while ((match = re.exec(localValue))) {
      found.push({ token: match[1], index: match.index, length: match[0].length });
    }
    return found;
  }, [localValue]);

  // Expanded preview
  const expandedPrompt = useMemo(() => {
    if (!localValue || !aliasLookup) return localValue;
    try {
      return localValue.replace(/\$([a-z0-9_:-]+)\$/gi, (match, key) => {
        const val = aliasLookup.get(key.toLowerCase());
        return typeof val === 'string' ? val : match;
      });
    } catch {
      return localValue;
    }
  }, [localValue, aliasLookup]);

  // Lock body scroll when open
  useEffect(() => {
    const body = document.body;
    if (open && body) {
      const y = window.scrollY || window.pageYOffset;
      scrollRestoreRef.current = y;
      body.style.position = 'fixed';
      body.style.top = `-${y}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    } else if (!open && body && scrollRestoreRef.current !== null) {
      const y = scrollRestoreRef.current;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      window.scrollTo({ top: y, behavior: 'auto' });
      scrollRestoreRef.current = null;
    }
  }, [open]);

  // Focus textarea on open
  useEffect(() => {
    if (open && textRef.current) {
      requestAnimationFrame(() => textRef.current?.focus({ preventScroll: true }));
    }
  }, [open]);

  const handleTextChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleInsertAlias = (token) => {
    const el = textRef.current;
    const insertText = `$${token}$`;
    const current = localValue || '';
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;

    const before = current.slice(0, start);
    const after = current.slice(end);
    const prevCharMatch = before.match(/[^\s]$/);
    const nextCharMatch = after.match(/^[^\s]/);
    const needsLeading = prevCharMatch && prevCharMatch[0] !== ',' ? ', ' : '';
    const needsTrailing = nextCharMatch && nextCharMatch[0] !== ',' ? ', ' : '';

    const nextValue = before + needsLeading + insertText + needsTrailing + after;
    setLocalValue(nextValue);
    const nextPos = (before + needsLeading + insertText + needsTrailing).length;

    // Switch to compose tab and focus
    setActiveTab('compose');
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      }
    });
  };

  const removeToken = (tokenObj) => {
    const current = localValue || '';
    const start = tokenObj.index;
    const end = tokenObj.index + tokenObj.length;
    const before = current.slice(0, start).replace(/[\s,]*$/, '');
    const after = current.slice(end).replace(/^[\s,]*/, '');
    const next = before ? `${before} ${after}`.trim() : after.trim();
    setLocalValue(next);
  };

  // Reorder tokens and rebuild the text
  const reorderTokens = useCallback((fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx === null || toIdx === null) return;

    const current = localValue || '';
    // Find text before first token and after last token
    const firstToken = tokens[0];
    const lastToken = tokens[tokens.length - 1];
    const prefix = firstToken ? current.slice(0, firstToken.index).replace(/[\s,]*$/, '') : '';
    const suffix = lastToken ? current.slice(lastToken.index + lastToken.length).replace(/^[\s,]*/, '') : '';

    // Reorder the token array
    const reordered = [...tokens];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Rebuild text with reordered tokens
    const tokenStrings = reordered.map((t) => `$${t.token}$`);
    const joinedTokens = tokenStrings.join(', ');

    let next = '';
    if (prefix) {
      next = `${prefix}, ${joinedTokens}`;
    } else {
      next = joinedTokens;
    }
    if (suffix) {
      next = `${next}, ${suffix}`;
    }

    setLocalValue(next.trim());
  }, [localValue, tokens]);

  // Drag handlers
  const handleDragStart = useCallback((e, idx) => {
    setDragIndex(idx);
    dragNodeRef.current = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
    // Add dragging class after a frame to allow the drag image to be captured
    requestAnimationFrame(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.classList.add('is-dragging');
      }
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.classList.remove('is-dragging');
    }
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      reorderTokens(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
    dragNodeRef.current = null;
  }, [dragIndex, dropIndex, reorderTokens]);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dropIndex) {
      setDropIndex(idx);
    }
  }, [dropIndex]);

  const handleDragLeave = useCallback(() => {
    // Don't clear dropIndex here to prevent flickering
  }, []);

  // Touch handlers for mobile drag-and-drop
  const handleTouchStart = useCallback((e, idx) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      idx,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.startY);

    // Start drag if moved enough
    if (deltaX > 10 || deltaY > 10) {
      touchStartRef.current.moved = true;
      setDragIndex(touchStartRef.current.idx);

      // Find which token we're over
      const tokenElements = document.querySelectorAll('.composer-token-draggable');
      const touchX = touch.clientX;
      const touchY = touch.clientY;

      for (let i = 0; i < tokenElements.length; i++) {
        const rect = tokenElements[i].getBoundingClientRect();
        if (touchX >= rect.left && touchX <= rect.right && touchY >= rect.top && touchY <= rect.bottom) {
          setDropIndex(i);
          break;
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartRef.current?.moved && dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      reorderTokens(dragIndex, dropIndex);
    }
    touchStartRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, dropIndex, reorderTokens]);

  const handleSave = () => {
    onChange?.(localValue);
    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="composer-overlay" role="dialog" aria-modal="true">
      <div className="composer-backdrop" onClick={handleCancel} />
      <div className="composer-sheet">
        {/* Header */}
        <div className="composer-header">
          <div className="composer-header-left">
            <div className="composer-kicker">Prompt Composer</div>
            <div className="composer-title">{fieldLabel}</div>
          </div>
          <button
            type="button"
            className="composer-close"
            onClick={handleCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Mobile tab switcher */}
        <div className="composer-tabs">
          <button
            type="button"
            className={`composer-tab ${activeTab === 'compose' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('compose')}
          >
            Write
          </button>
          <button
            type="button"
            className={`composer-tab ${activeTab === 'aliases' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('aliases')}
          >
            Aliases
            {aliasEntries.length > 0 && (
              <span className="composer-tab-badge">{aliasEntries.length}</span>
            )}
          </button>
        </div>

        {/* Main content area */}
        <div className="composer-content">
          {/* Compose panel */}
          <div className={`composer-panel composer-panel-compose ${activeTab === 'compose' ? 'is-visible' : ''}`}>
            <div className="composer-textarea-wrap">
              <textarea
                ref={textRef}
                value={localValue}
                onChange={handleTextChange}
                placeholder="Write your prompt here... Use $alias$ tokens to insert dynamic content."
                className="composer-textarea"
                rows={6}
              />
            </div>

            {/* Token pills - draggable */}
            {tokens.length > 0 && (
              <div className="composer-tokens">
                <div className="composer-tokens-label">Active tokens: <span className="composer-tokens-hint">(drag to reorder)</span></div>
                <div className="composer-tokens-list">
                  {tokens.map((t, idx) => {
                    const entry = withSubcategory.find(
                      (e) => e.token?.toLowerCase() === t.token.toLowerCase()
                    );
                    const friendlyName = entry?.displayName || t.token;
                    const isDragging = dragIndex === idx;
                    const isDropTarget = dropIndex === idx && dragIndex !== null && dragIndex !== idx;

                    return (
                      <span
                        key={`${t.token}-${t.index}`}
                        className={`composer-token composer-token-draggable ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                        title={`$${t.token}$`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragLeave={handleDragLeave}
                        onTouchStart={(e) => handleTouchStart(e, idx)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <span className="composer-token-drag-handle" aria-hidden="true">⋮⋮</span>
                        <span className="composer-token-name">{friendlyName}</span>
                        <button
                          type="button"
                          className="composer-token-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeToken(t);
                          }}
                          aria-label={`Remove ${t.token}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview section */}
            <div className="composer-preview">
              <div className="composer-preview-label">Preview (expanded):</div>
              <div className="composer-preview-content">
                {expandedPrompt || '—'}
              </div>
            </div>

            {/* Action buttons - inline on mobile */}
            <div className="composer-actions">
              <button
                type="button"
                className="composer-btn composer-btn-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="composer-btn composer-btn-primary"
                onClick={handleSave}
              >
                Apply
              </button>
            </div>
          </div>

          {/* Aliases panel */}
          <div className={`composer-panel composer-panel-aliases ${activeTab === 'aliases' ? 'is-visible' : ''}`}>
            {/* Category pills */}
            <div className="composer-categories">
              {categories.map((c) => (
                <button
                  key={`cat-${c}`}
                  type="button"
                  onClick={() => setPickerCategory(c)}
                  className={`composer-category-pill ${pickerCategory === c ? 'is-active' : ''}`}
                >
                  {c === 'All' ? 'All' : c}
                </button>
              ))}
            </div>

            {/* Search and subcategory */}
            <div className="composer-filters">
              <input
                ref={searchInputRef}
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search aliases..."
                className="composer-search"
              />
              {subcategories.length > 2 && (
                <select
                  value={pickerSubcategory}
                  onChange={(e) => setPickerSubcategory(e.target.value)}
                  className="composer-subcategory-select"
                >
                  {subcategories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All subcategories' : c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Alias list */}
            <div className="composer-alias-list">
              {filteredAliases.length === 0 ? (
                <div className="composer-alias-empty">No aliases found.</div>
              ) : (
                <>
                  {visibleAliases.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => handleInsertAlias(entry.token)}
                      className="composer-alias-item"
                    >
                      <div className="composer-alias-header">
                        <div className="composer-alias-name">
                          {entry.displayName || entry.token}
                        </div>
                        {entry.category && (
                          <span className="composer-alias-category">
                            {entry.category}
                          </span>
                        )}
                      </div>
                      <div className="composer-alias-token">${entry.token}$</div>
                      <div className="composer-alias-text">{entry.text}</div>
                    </button>
                  ))}
                  {/* Sentinel for infinite scroll */}
                  {visibleCount < filteredAliases.length && (
                    <div ref={sentinelRef} className="composer-sentinel" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
