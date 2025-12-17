import { useEffect, useMemo, useRef, useState } from 'react';
import TextAreaSheet from '../ui/TextAreaSheet';

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
  const scrollRestoreRef = useRef(null);
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
    const observer = new MutationObserver(resize);
    observer.observe(el, { characterData: true, subtree: true });
    return () => observer.disconnect();
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

  useEffect(() => {
    const body = document.body;
    if (showPicker && body) {
      const y = window.scrollY || window.pageYOffset;
      scrollRestoreRef.current = y;
      body.style.position = 'fixed';
      body.style.top = `-${y}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    } else if (!showPicker && body && scrollRestoreRef.current !== null) {
      const y = scrollRestoreRef.current;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      window.scrollTo({ top: y, behavior: 'auto' });
      scrollRestoreRef.current = null;
    }
  }, [showPicker]);

  const openPicker = () => {
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

  const handleInsertAlias = (token) => {
    const el = textRef.current;
    const insertText = `$${token}$`;
    const current = value || '';
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;

    const before = current.slice(0, start);
    const after = current.slice(end);
    const prevCharMatch = before.match(/[^\s]$/);
    const nextCharMatch = after.match(/^[^\s]/);
    const needsLeading = prevCharMatch && prevCharMatch[0] !== ',' ? ', ' : '';
    const needsTrailing = nextCharMatch && nextCharMatch[0] !== ',' ? ', ' : '';

    const nextValue = before + needsLeading + insertText + needsTrailing + after;
    onChange?.(nextValue);
    const nextPos = (before + needsLeading + insertText + needsTrailing).length;
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      }
    });
    setShowPicker(false);
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

  const commonProps = {
    id: name,
    name,
    value: value ?? '',
    onChange: handleChange,
    disabled,
    className:
      'w-full rounded-xl border border-[#2A2E4A] bg-[#050716] ' +
      'px-3 py-2.5 pr-10 text-[13px] sm:text-sm text-[#E5E7FF] ' +
      'placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80] ' +
      'transition-shadow shadow-[0_0_18px_rgba(5,7,22,0.7)]',
    placeholder: '',
    'aria-label': label || name,
    'aria-describedby': description ? `${name}-description` : undefined,
  };

  if (multiline) {
    return (
      <div className="relative space-y-2" ref={wrapperRef}>
        <div className="stringinput-actions">
          <button
            type="button"
            className="stringinput-action"
            onClick={() => setExpandedEditorOpen(true)}
            aria-label={`Expand ${label || name}`}
            title="Expand"
          >
            ⤢
          </button>
          {aliasEntries.length ? (
            <button
              type="button"
              className="stringinput-action"
              onClick={() => (onOpenComposer ? onOpenComposer(name) : openPicker())}
              aria-label={onOpenComposer ? 'Open prompt composer' : 'Insert alias'}
              title={onOpenComposer ? 'Compose' : 'Insert alias'}
            >
              {onOpenComposer ? '✏️' : '🔖'}
            </button>
          ) : null}
        </div>
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
        <TextAreaSheet
          open={expandedEditorOpen}
          onClose={() => setExpandedEditorOpen(false)}
          title={label || name}
          value={value ?? ''}
          onChange={onChange}
          description={description}
        />
        {tokens.length ? (
          <div className="flex flex-wrap gap-1">
            {tokens.map((t) => {
              const entry = withSubcategory.find(
                (e) => e.token?.toLowerCase() === t.token.toLowerCase()
              );
              const friendlyName = entry?.displayName || t.token;
              return (
                <span
                  key={`${t.token}-${t.index}`}
                  className="inline-flex items-center gap-1 rounded-md bg-[#0F1A2F] border border-[#2A2E4A] px-2 py-1 text-[11px] text-[#E5E7FF]"
                  title={`$${t.token}$`}
                  onClick={() => {
                    const start = t.index;
                    const end = t.index + t.length;
                    const el = textRef.current;
                    if (el) {
                      el.focus();
                      el.setSelectionRange(start, end);
                    }
                    openPicker();
                  }}
                >
                  {friendlyName}
                  <button
                    type="button"
                    className="text-[#FF8F70]"
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
        ) : null}
        {showPicker ? (
          <div className="fixed inset-0 z-50 sm:z-40 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowPicker(false)}
            />
            <div className="relative w-full max-w-xl mx-3 sm:mx-0 bg-[#0B1226] border border-[#2A2E4A] rounded-2xl shadow-[0_20px_50px_rgba(4,7,16,0.45)] p-3 sm:p-4 space-y-3 h-[70vh] max-h-[80vh] flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#E5E7FF]">Alias picker</h3>
                <button
                  type="button"
                  className="text-xs text-[#E5E7FF] underline"
                  onClick={() => setShowPicker(false)}
                >
                  Close
                </button>
              </div>
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['All', ...categories.filter((c) => c !== 'All')].map((c) => (
                    <button
                      key={`cat-${c}`}
                      type="button"
                      onClick={() => setPickerCategory(c)}
                      className={`flex-shrink-0 rounded-full border px-3 py-1 text-[12px] ${
                        pickerCategory === c
                          ? 'border-[#5EF1D4] bg-[#0F1A2F]'
                          : 'border-[#1D2440] bg-[#0A1022] hover:border-[#2A2E4A]'
                      } text-[#E5E7FF] transition`}
                    >
                      {c === 'All' ? 'All Aliases' : c}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-[160px] w-full">
                    <input
                      ref={pickerSearchRef}
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search aliases"
                      className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm text-[#E5E7FF] placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
                    />
                  </div>
                  <label className="flex sm:flex-row flex-col sm:items-center gap-1 text-[12px] text-[#7F91B6]">
                    <span>Subcategory</span>
                    <select
                      value={pickerSubcategory}
                      onChange={(e) => setPickerSubcategory(e.target.value)}
                      className="h-9 rounded-lg border border-[#2A2E4A] bg-[#0C1222] px-2 text-sm text-[#E5E7FF] focus:outline-none"
                    >
                      {subcategories.map((c) => (
                        <option key={c} value={c}>
                          {c === 'All' ? 'All subcategories' : c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-1">
                  {filteredAliases.length === 0 ? (
                    <div className="text-[12px] text-[#A9B6D9]">No aliases found.</div>
                  ) : (
                    <>
                      {visibleAliases.map((entry) => (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => handleInsertAlias(entry.token)}
                          className="w-full text-left rounded-lg border border-[#1D2440] bg-[#0C1222] px-3 py-2 hover:border-[#5EF1D4] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[13px] font-semibold text-[#E5E7FF] truncate">
                              {entry.displayName || entry.token}
                            </div>
                            {entry.category ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F1A2F] border border-[#2A2E4A] text-[#7F91B6]">
                                {entry.category}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-[#7F91B6] truncate">
                            ${entry.token}$
                          </div>
                          <div className="text-[11px] text-[#A9B6D9] line-clamp-2">
                            {entry.text}
                          </div>
                        </button>
                      ))}
                      {visibleCount < filteredAliases.length ? (
                        <div className="flex justify-center py-2">
                          <button
                            type="button"
                            onClick={() => setVisibleCount((c) => Math.min(c + 30, filteredAliases.length))}
                            className="px-3 py-1 rounded-md border border-[#2A2E4A] bg-[#0F1A2F] text-[12px] text-[#E5E7FF] hover:border-[#5EF1D4] transition"
                          >
                            Show more ({filteredAliases.length - visibleCount} left)
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
        <div className="flex flex-wrap gap-1">
          {tokens.map((t) => {
            const entry = withSubcategory.find(
              (e) => e.token?.toLowerCase() === t.token.toLowerCase()
            );
            const friendlyName = entry?.displayName || t.token;
            return (
              <span
                key={`${t.token}-${t.index}`}
                className="inline-flex items-center gap-1 rounded-md bg-[#0F1A2F] border border-[#2A2E4A] px-2 py-1 text-[11px] text-[#E5E7FF]"
                title={`$${t.token}$`}
                onClick={() => {
                  const start = t.index;
                  const end = t.index + t.length;
                  const el = textRef.current;
                  if (el) {
                    el.focus();
                    el.setSelectionRange(start, end);
                  }
                  openPicker();
                }}
              >
                {friendlyName}
                <button
                  type="button"
                  className="text-[#FF8F70]"
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
      ) : null}
      {aliasEntries.length ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg border border-[#2A2E4A] bg-[#0F1A2F] text-sm text-[#E5E7FF] shadow-sm hover:border-[#5EF1D4] transition"
          onClick={() => onOpenComposer ? onOpenComposer(name) : openPicker()}
          title={onOpenComposer ? "Open prompt composer" : "Insert alias"}
        >
          {onOpenComposer ? '✏️' : '🔖'}
        </button>
      ) : null}
      {showPicker ? (
        <div className="fixed inset-0 z-50 sm:z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowPicker(false)}
          />
          <div className="relative w-full max-w-xl mx-3 sm:mx-0 bg-[#0B1226] border border-[#2A2E4A] rounded-2xl shadow-[0_20px_50px_rgba(4,7,16,0.45)] p-3 sm:p-4 space-y-3 h-[70vh] max-h-[80vh] flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#E5E7FF]">Alias picker</h3>
              <button
                type="button"
                className="text-xs text-[#E5E7FF] underline"
                onClick={() => setShowPicker(false)}
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['All', ...categories.filter((c) => c !== 'All')].map((c) => (
                  <button
                    key={`cat-${c}`}
                    type="button"
                    onClick={() => setPickerCategory(c)}
                    className={`flex-shrink-0 rounded-full border px-3 py-1 text-[12px] ${
                      pickerCategory === c
                        ? 'border-[#5EF1D4] bg-[#0F1A2F]'
                        : 'border-[#1D2440] bg-[#0A1022] hover:border-[#2A2E4A]'
                    } text-[#E5E7FF] transition`}
                  >
                    {c === 'All' ? 'All Aliases' : c}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <input
                    ref={pickerSearchRef}
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search aliases"
                    className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm text-[#E5E7FF] placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
                  />
                </div>
                <label className="flex sm:flex-row flex-col sm:items-center gap-1 text-[12px] text-[#7F91B6]">
                  <span>Subcategory</span>
                  <select
                    value={pickerSubcategory}
                    onChange={(e) => setPickerSubcategory(e.target.value)}
                    className="h-9 rounded-lg border border-[#2A2E4A] bg-[#0C1222] px-2 text-sm text-[#E5E7FF] focus:outline-none"
                  >
                    {subcategories.map((c) => (
                      <option key={c} value={c}>
                        {c === 'All' ? 'All subcategories' : c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-1">
                {filteredAliases.length === 0 ? (
                  <div className="text-[12px] text-[#A9B6D9]">No aliases found.</div>
                ) : (
                  <>
                    {visibleAliases.map((entry) => (
                      <button
                        key={entry.key}
                        type="button"
                        onClick={() => handleInsertAlias(entry.token)}
                        className="w-full text-left rounded-lg border border-[#1D2440] bg-[#0C1222] px-3 py-2 hover:border-[#5EF1D4] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[13px] font-semibold text-[#E5E7FF] truncate">
                            {entry.displayName || entry.token}
                          </div>
                          {entry.category ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F1A2F] border border-[#2A2E4A] text-[#7F91B6]">
                              {entry.category}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-[#7F91B6] truncate">
                          ${entry.token}$
                        </div>
                        <div className="text-[11px] text-[#A9B6D9] line-clamp-2">
                          {entry.text}
                        </div>
                      </button>
                    ))}
                    {visibleCount < filteredAliases.length ? (
                      <div className="flex justify-center py-2">
                        <button
                          type="button"
                          onClick={() => setVisibleCount((c) => Math.min(c + 30, filteredAliases.length))}
                          className="px-3 py-1 rounded-md border border-[#2A2E4A] bg-[#0F1A2F] text-[12px] text-[#E5E7FF] hover:border-[#5EF1D4] transition"
                        >
                          Show more ({filteredAliases.length - visibleCount} left)
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
