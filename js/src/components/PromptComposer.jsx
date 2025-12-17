// js/src/components/PromptComposer.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from './ui/BottomSheet';
import { IconGrip, IconX } from './Icons';
import { formatCategoryLabel, formatSubcategoryLabel, presentAliasEntry } from '../utils/aliasPresentation';

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
    () =>
      (Array.isArray(aliasCatalog) ? aliasCatalog.filter((e) => e && e.name) : []).map((e) => ({
        ...e,
        ...presentAliasEntry(e),
      })),
    [aliasCatalog]
  );

  const categories = useMemo(() => {
    const set = new Set(['All']);
    aliasEntries.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [aliasEntries]);

  const subcategories = useMemo(() => {
    const set = new Set(['All']);
    aliasEntries.forEach((e) => {
      if (!pickerCategory || pickerCategory === 'All' || e.category === pickerCategory) {
        if (e.subcategory) set.add(e.subcategory);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [aliasEntries, pickerCategory]);

  const filteredAliases = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    return aliasEntries
      .filter((e) => {
        if (pickerCategory !== 'All' && (e.category || '') !== pickerCategory) return false;
        if (pickerSubcategory !== 'All' && (e.subcategory || 'other') !== pickerSubcategory)
          return false;
        if (!term) return true;
        return (
          e.token?.toLowerCase().includes(term) ||
          e.text?.toLowerCase().includes(term) ||
          e.name?.toLowerCase().includes(term) ||
          e.displayName?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const subA = (a.subcategory || '').toLowerCase();
        const subB = (b.subcategory || '').toLowerCase();
        if (subA !== subB) return subA.localeCompare(subB);
        return a.token.localeCompare(b.token);
      });
  }, [aliasEntries, pickerCategory, pickerSubcategory, pickerSearch]);

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
    <BottomSheet
      open={open}
      onClose={handleCancel}
      title="Prompt composer"
      variant="fullscreen"
      footer={(
        <div className="flex gap-2">
          <button type="button" className="ui-button is-muted w-full" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="ui-button is-primary w-full" onClick={handleSave}>
            Apply
          </button>
        </div>
      )}
    >
      <div className="composer-shell">
        <div className="composer-subhead">
          <div className="sheet-label">Editing</div>
          <div className="composer-field">{fieldLabel}</div>
        </div>

        <div className="composer-tabs" role="tablist" aria-label="Composer tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'compose'}
            className={`composer-tab ${activeTab === 'compose' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('compose')}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'aliases'}
            className={`composer-tab ${activeTab === 'aliases' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('aliases')}
          >
            Aliases
            {aliasEntries.length > 0 && (
              <span className="composer-tab-badge">{aliasEntries.length}</span>
            )}
          </button>
        </div>

        <div className={`composer-panel composer-panel-compose ${activeTab === 'compose' ? 'is-visible' : ''}`}>
          <div className="composer-textarea-wrap">
            <textarea
              ref={textRef}
              value={localValue}
              onChange={handleTextChange}
              placeholder="Write your prompt here… Use $alias$ tokens to insert dynamic content."
              className="composer-textarea"
              rows={8}
            />
          </div>

          {tokens.length > 0 && (
            <div className="composer-tokens">
              <div className="composer-tokens-label">
                Active tokens <span className="composer-tokens-hint">(drag to reorder)</span>
              </div>
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
                      <span className="composer-token-drag-handle" aria-hidden="true"><IconGrip size={14} /></span>
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
                        <IconX size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="composer-preview">
            <div className="composer-preview-label">Preview (expanded)</div>
            <div className="composer-preview-content">{expandedPrompt || '—'}</div>
          </div>
        </div>

        <div className={`composer-panel composer-panel-aliases ${activeTab === 'aliases' ? 'is-visible' : ''}`}>
          <div className="composer-filters">
            <input
              ref={searchInputRef}
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search aliases…"
              className="composer-search"
            />
            <select
              value={pickerCategory}
              onChange={(e) => setPickerCategory(e.target.value)}
              className="composer-subcategory-select"
              aria-label="Filter by category"
            >
              {categories.map((c) => (
                <option key={`cat-${c}`} value={c}>
                  {c === 'All' ? 'Category: All' : formatCategoryLabel(c)}
                </option>
              ))}
            </select>
            {subcategories.length > 2 && (
              <select
                value={pickerSubcategory}
                onChange={(e) => setPickerSubcategory(e.target.value)}
                className="composer-subcategory-select"
              >
                {subcategories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All subcategories' : formatSubcategoryLabel(c)}
                  </option>
                ))}
              </select>
            )}
          </div>

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
                      {entry.category ? (
                        <span className="composer-alias-category">{formatCategoryLabel(entry.category)}</span>
                      ) : null}
                    </div>
                    <div className="composer-alias-token">${entry.token}$</div>
                    <div className="composer-alias-text">{entry.text}</div>
                  </button>
                ))}
                {visibleCount < filteredAliases.length && (
                  <div ref={sentinelRef} className="composer-sentinel" />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
