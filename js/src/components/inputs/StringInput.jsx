import { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '../ui/BottomSheet';
import TextAreaSheet from '../ui/TextAreaSheet';
import { IconEdit, IconGrip, IconTag, IconX } from '../Icons';
import { formatCategoryLabel, formatSubcategoryLabel, presentAliasEntry } from '../../utils/aliasPresentation';

export default function StringInput({
  name,
  label,        // DynamicForm handles visible label
  description,  // DynamicForm handles help text / tooltip
  value,
  onChange,
  onEnter,
  disabled = false,
  multiline = false,
  aliasOptions = [],
  aliasCatalog = [],
  onOpenComposer,
}) {
  const textRef = useRef(null);
  const wrapperRef = useRef(null);
  const caretRef = useRef({ start: null, end: null });
  const dragNodeRef = useRef(null);
  const touchStartRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('All');
  const [pickerSubcategory, setPickerSubcategory] = useState('All');
  const [recent] = useState([]);
  const [tokens, setTokens] = useState([]);
  const pickerSearchRef = useRef(null);
  const [expandedEditorOpen, setExpandedEditorOpen] = useState(false);

  const aliasList = useMemo(
    () => (Array.isArray(aliasOptions) ? aliasOptions.filter(Boolean) : []),
    [aliasOptions]
  );

  const aliasEntries = useMemo(
    () =>
      (Array.isArray(aliasCatalog) ? aliasCatalog.filter((e) => e && e.name) : []).map((e) => ({
        ...e,
        ...presentAliasEntry(e),
      })),
    [aliasCatalog]
  );

  const withSubcategory = useMemo(() => {
    return aliasEntries;
  }, [aliasEntries]);

  const handleChange = (e) => {
    const next = e.target.value;
    onChange?.(next);
    parseTokens(next);
  };

  const handleKeyDown = (e) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      onEnter?.(e.target.value, e);
      return;
    }
  };

  // Auto-grow textareas up to max height
  useEffect(() => {
    if (!multiline) return;
    const el = textRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
    };
    resize();
  }, [value, multiline]);

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

  useEffect(() => {
    setPickerSubcategory('All');
  }, [pickerCategory]);

  const parseTokens = (text) => {
    if (typeof text !== 'string') {
      setTokens([]);
      return;
    }
    const found = [];
    const re = /\$([a-z0-9_:-]+)\$/gi;
    let match;
    while ((match = re.exec(text))) {
      found.push({ token: match[1], index: match.index, length: match[0].length });
    }
    setTokens(found);
  };

  useEffect(() => {
    parseTokens(value || '');
  }, [value]);

  useEffect(() => {
    if (showPicker && pickerSearchRef.current) {
      requestAnimationFrame(() => pickerSearchRef.current?.focus({ preventScroll: true }));
    }
  }, [showPicker]);

  const openPicker = () => {
    try {
      const el = textRef.current;
      if (el) {
        caretRef.current = {
          start: el.selectionStart ?? null,
          end: el.selectionEnd ?? null,
        };
      } else {
        caretRef.current = { start: null, end: null };
      }
    } catch {
      caretRef.current = { start: null, end: null };
    }
    if (wrapperRef.current) {
      wrapperRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    setShowPicker(true);
  };

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

  const [visibleCount, setVisibleCount] = useState(30);
  const visibleAliases = useMemo(() => filteredAliases.slice(0, visibleCount), [filteredAliases, visibleCount]);
  useEffect(() => {
    setVisibleCount(30);
  }, [pickerCategory, pickerSubcategory, pickerSearch, aliasEntries]);

  useEffect(() => {
    // Reset subcategory when primary category changes to avoid stale filters
    setPickerSubcategory('All');
  }, [pickerCategory]);

  const handleInsertAlias = (token, { closeAfter = true } = {}) => {
    const el = textRef.current;
    const insertText = `$${token}$`;
    const current = value || '';
    const storedStart = caretRef.current?.start;
    const storedEnd = caretRef.current?.end;
    const start = el?.selectionStart ?? (typeof storedStart === 'number' ? storedStart : current.length);
    const end = el?.selectionEnd ?? (typeof storedEnd === 'number' ? storedEnd : current.length);

    const before = current.slice(0, start);
    const after = current.slice(end);
    const prevCharMatch = before.match(/[^\s]$/);
    const nextCharMatch = after.match(/^[^\s]/);
    const needsLeading = prevCharMatch && prevCharMatch[0] !== ',' ? ', ' : '';
    const needsTrailing = nextCharMatch && nextCharMatch[0] !== ',' ? ', ' : '';

    const nextValue = before + needsLeading + insertText + needsTrailing + after;
    onChange?.(nextValue);
    const nextPos = (before + needsLeading + insertText + needsTrailing).length;
    caretRef.current = { start: nextPos, end: nextPos };
    if (closeAfter) {
      setShowPicker(false);
      requestAnimationFrame(() => {
        el?.blur?.();
      });
    }
  };

  const removeToken = (tokenObj) => {
    const current = value || '';
    const start = tokenObj.index;
    const end = tokenObj.index + tokenObj.length;
    // Also trim adjoining spaces/commas
    const before = current.slice(0, start).replace(/[\s,]*$/, '');
    const after = current.slice(end).replace(/^[\s,]*/, '');
    const next = before ? `${before} ${after}`.trim() : after.trim();
    onChange?.(next);
  };

  const reorderTokens = useMemo(() => {
    return (fromIdx, toIdx) => {
      if (fromIdx === toIdx || fromIdx === null || toIdx === null) return;
      if (!tokens?.length) return;

      const current = value || '';
      const firstToken = tokens[0];
      const lastToken = tokens[tokens.length - 1];
      const prefix = firstToken
        ? current.slice(0, firstToken.index).replace(/[\s,]*$/, '')
        : '';
      const suffix = lastToken
        ? current.slice(lastToken.index + lastToken.length).replace(/^[\s,]*/, '')
        : '';

      const reordered = [...tokens];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      const tokenStrings = reordered.map((t) => `$${t.token}$`);
      const joinedTokens = tokenStrings.join(', ');

      let next = prefix ? `${prefix}, ${joinedTokens}` : joinedTokens;
      if (suffix) next = `${next}, ${suffix}`;

      onChange?.(next.trim());
    };
  }, [onChange, tokens, value]);

  const handleDragStart = (e, idx) => {
    setDragIndex(idx);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    requestAnimationFrame(() => {
      if (dragNodeRef.current) dragNodeRef.current.classList.add('is-dragging');
    });
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dropIndex) setDropIndex(idx);
  };

  const handleDragEnter = (idx) => {
    if (idx !== dropIndex) setDropIndex(idx);
  };

  const finishDrag = (targetIdx) => {
    if (dragIndex !== null && targetIdx !== null && dragIndex !== targetIdx) {
      reorderTokens(dragIndex, targetIdx);
    }
    setDragIndex(null);
    setDropIndex(null);
    dragNodeRef.current = null;
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) dragNodeRef.current.classList.remove('is-dragging');
    finishDrag(dropIndex);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    finishDrag(idx);
  };

  const handleTouchStart = (e, idx) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartRef.current = {
      idx,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
    };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.startY);
    if (deltaX <= 10 && deltaY <= 10) return;

    touchStartRef.current.moved = true;
    setDragIndex(touchStartRef.current.idx);
    e.preventDefault();

    const container = wrapperRef.current;
    const tokenElements = container
      ? container.querySelectorAll('.token-chip-draggable')
      : document.querySelectorAll('.token-chip-draggable');
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    for (let i = 0; i < tokenElements.length; i++) {
      const rect = tokenElements[i].getBoundingClientRect();
      if (touchX >= rect.left && touchX <= rect.right && touchY >= rect.top && touchY <= rect.bottom) {
        setDropIndex(i);
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current?.moved && dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      reorderTokens(dragIndex, dropIndex);
    }
    touchStartRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  };

  const commonProps = {
    id: name,
    name,
    value: value ?? '',
    onChange: handleChange,
    disabled,
    className:
      'w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] ' +
      'px-3 py-2.5 pr-10 text-[13px] sm:text-sm text-[rgba(237,242,255,0.92)] ' +
      'placeholder-[rgba(159,178,215,0.65)] focus:outline-none ' +
      'focus:border-[rgba(68,225,197,0.60)] focus:shadow-[0_0_0_3px_rgba(68,225,197,0.16)] ' +
      'transition',
    placeholder: '',
    'aria-label': label || name,
    'aria-describedby': description ? `${name}-description` : undefined,
  };

  const closePicker = () => {
    setShowPicker(false);
    requestAnimationFrame(() => {
      textRef.current?.blur?.();
    });
  };
  const isPromptLike = (() => {
    const key = String(name || '').toLowerCase();
    const lbl = String(label || '').toLowerCase();
    const combined = `${key} ${lbl}`.trim();
    if (!combined.includes('prompt')) return false;
    // Still treat negative prompt as prompt-like (same UX needs)
    return true;
  })();

  const AliasPickerSheet = () => (
    <BottomSheet
      open={showPicker}
      onClose={closePicker}
      title={isPromptLike ? 'Insert alias' : 'Aliases'}
      footer={(
        <button type="button" className="ui-button is-primary w-full" onClick={closePicker}>
          Done
        </button>
      )}
    >
      <div className="sheet-stack">
        <div className="sheet-section">
          <div className="sheet-label">Search</div>
          <div className="composer-filters">
            <input
              ref={pickerSearchRef}
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
              {['All', ...categories.filter((c) => c !== 'All')].map((c) => (
                <option key={`cat-${c}`} value={c}>
                  {c === 'All' ? 'Category: All' : formatCategoryLabel(c)}
                </option>
              ))}
            </select>
            {subcategories.length > 2 ? (
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
            ) : null}
          </div>
        </div>

        <div className="sheet-section">
          <div className="sheet-label">Results</div>
          <div className="composer-alias-list">
            {filteredAliases.length === 0 ? (
              <div className="composer-alias-empty">No aliases found.</div>
            ) : (
              <>
                {visibleAliases.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => handleInsertAlias(entry.token, { closeAfter: !isPromptLike })}
                    className="composer-alias-item"
                  >
                    <div className="composer-alias-header">
                      <div className="composer-alias-name">
                        {entry.displayName || entry.token}
                      </div>
                      {entry.category ? (
                        <span className="composer-alias-category">
                          {formatCategoryLabel(entry.category)}
                        </span>
                      ) : null}
                    </div>
                    <div className="composer-alias-token">${entry.token}$</div>
                    <div className="composer-alias-text">{entry.text}</div>
                  </button>
                ))}

                {visibleCount < filteredAliases.length ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => Math.min(c + 30, filteredAliases.length))}
                    className="ui-button is-muted w-full"
                  >
                    Show more ({filteredAliases.length - visibleCount} left)
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );

  useEffect(() => {
    if (!showPicker) return;
    const id = setTimeout(() => {
      pickerSearchRef.current?.focus?.();
      pickerSearchRef.current?.select?.();
    }, 50);
    return () => clearTimeout(id);
  }, [showPicker]);

  if (multiline) {
    return (
      <div className="relative space-y-2" ref={wrapperRef}>
        {onOpenComposer && !isPromptLike ? (
          <div className="stringinput-toolbar">
            <button
              type="button"
              className="ui-button is-muted is-compact"
              onClick={() => onOpenComposer(name)}
            >
              Prompt Studio
            </button>
            {aliasEntries.length ? (
              <button
                type="button"
                className="ui-button is-ghost is-compact"
                onClick={openPicker}
              >
                Aliases
              </button>
            ) : null}
            <button
              type="button"
              className="ui-button is-ghost is-compact"
              onClick={() => setExpandedEditorOpen(true)}
            >
              Expand
            </button>
          </div>
        ) : null}
        <textarea
          ref={textRef}
          {...commonProps}
          rows={3}
          wrap="soft"
          onKeyDown={handleKeyDown}
          className={
            commonProps.className +
            ' resize-none min-h-[88px] max-h-[160px] leading-relaxed overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap'
          }
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        />
        {onOpenComposer && isPromptLike ? (
          <div className="stringinput-underbar">
            <div className="stringinput-underbar-actions">
              <button
                type="button"
                className="stringinput-action-link"
                onClick={() => onOpenComposer(name)}
              >
                Prompt Studio
              </button>
              {aliasEntries.length ? (
                <button
                  type="button"
                  className="stringinput-action-link"
                  onClick={openPicker}
                >
                  Insert alias
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <TextAreaSheet
          open={expandedEditorOpen}
          onClose={() => setExpandedEditorOpen(false)}
          title={label || name}
          value={value ?? ''}
          onChange={onChange}
          description={description}
        />
        {tokens.length ? (
          <div className="stringinput-tokens">
            <div className="stringinput-tokens-label">
              Active aliases <span className="stringinput-tokens-hint">(drag to reorder)</span>
            </div>
            <div className="stringinput-tokens-list">
            {tokens.map((t, idx) => {
              const entry = withSubcategory.find(
                (e) => e.token?.toLowerCase() === t.token.toLowerCase()
              );
              const friendlyName = entry?.displayName || t.token;
              const isDragging = dragIndex === idx;
              const isDropTarget = dropIndex === idx && dragIndex !== null && dragIndex !== idx;
              return (
                <div
                  key={`${t.token}-${t.index}`}
                  className={`token-chip token-chip-draggable ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                  title={`$${t.token}$`}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onTouchStart={(e) => handleTouchStart(e, idx)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => {
                    if (dragIndex !== null) return;
                    const start = t.index;
                    const end = t.index + t.length;
                    const el = textRef.current;
                    if (el) {
                      el.focus();
                      el.setSelectionRange(start, end);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const start = t.index;
                      const end = t.index + t.length;
                      const el = textRef.current;
                      if (el) {
                        el.focus();
                        el.setSelectionRange(start, end);
                      }
                    }
                  }}
                >
                  <span className="token-chip-drag-handle" aria-hidden="true">
                    <IconGrip size={14} />
                  </span>
                  <span className="token-chip-label">{friendlyName}</span>
                  <button
                    type="button"
                    className="token-chip-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeToken(t);
                    }}
                    aria-label={`Remove ${t.token}`}
                  >
                    <IconX size={12} />
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        ) : null}
        {showPicker ? <AliasPickerSheet /> : null}
      </div>
    );
  }

  return (
    <div className="relative space-y-2" ref={wrapperRef}>
      <input
        {...commonProps}
        type="text"
        inputMode="text"
        autoComplete="off"
        onKeyDown={handleKeyDown}
        className={
          commonProps.className +
          ' min-h-[44px]'
        }
        ref={textRef}
      />
      {tokens.length ? (
        <div className="stringinput-tokens">
          <div className="stringinput-tokens-label">
            Active aliases <span className="stringinput-tokens-hint">(drag to reorder)</span>
          </div>
          <div className="stringinput-tokens-list">
          {tokens.map((t, idx) => {
            const entry = withSubcategory.find(
              (e) => e.token?.toLowerCase() === t.token.toLowerCase()
            );
            const friendlyName = entry?.displayName || t.token;
            const isDragging = dragIndex === idx;
            const isDropTarget = dropIndex === idx && dragIndex !== null && dragIndex !== idx;
            return (
              <div
                key={`${t.token}-${t.index}`}
                className={`token-chip token-chip-draggable ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                title={`$${t.token}$`}
                onClick={() => {
                  if (dragIndex !== null) return;
                  const start = t.index;
                  const end = t.index + t.length;
                  const el = textRef.current;
                  if (el) {
                    el.focus();
                    el.setSelectionRange(start, end);
                  }
                  openPicker();
                }}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                onDragEnter={() => handleDragEnter(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onTouchStart={(e) => handleTouchStart(e, idx)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const start = t.index;
                    const end = t.index + t.length;
                    const el = textRef.current;
                    if (el) {
                      el.focus();
                      el.setSelectionRange(start, end);
                    }
                    openPicker();
                  }
                }}
              >
                <span className="token-chip-drag-handle" aria-hidden="true">
                  <IconGrip size={14} />
                </span>
                <span className="token-chip-label">{friendlyName}</span>
                <button
                  type="button"
                  className="token-chip-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToken(t);
                  }}
                  aria-label={`Remove ${t.token}`}
                >
                  <IconX size={12} />
                </button>
              </div>
            );
          })}
          </div>
        </div>
      ) : null}
      {aliasEntries.length ? (
        <button
          type="button"
          className="stringinput-trailing ui-button is-ghost is-compact"
          onClick={() => onOpenComposer ? onOpenComposer(name) : openPicker()}
          title={onOpenComposer ? "Open prompt composer" : "Insert alias"}
        >
          {onOpenComposer ? <IconEdit size={16} /> : <IconTag size={16} />}
        </button>
      ) : null}
      <AliasPickerSheet />
    </div>
  );
}
