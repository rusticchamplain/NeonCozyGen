// js/src/pages/Aliases.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePromptAliases from '../hooks/usePromptAliases';
import { normalizeAliasMap } from '../utils/promptAliases';
import { validateDanbooruTags } from '../api';
import BottomSheet from '../components/ui/BottomSheet';
import { IconTag } from '../components/Icons';
import useMediaQuery from '../hooks/useMediaQuery';
import {
  deriveAliasSubcategory,
  formatAliasFriendlyName,
  formatCategoryLabel,
  formatSubcategoryLabel,
} from '../utils/aliasPresentation';

const DELIM = '::';

function makeRowId() {
  return `alias-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function splitTags(text) {
  return String(text || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function joinTags(tags) {
  return (tags || []).map((t) => String(t || '').trim()).filter(Boolean).join(', ');
}

function addTagToText(text, tag) {
  const nextTag = String(tag || '').trim();
  if (!nextTag) return String(text || '');
  const existing = splitTags(text);
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  if (!seen.has(nextTag.toLowerCase())) existing.push(nextTag);
  return joinTags(existing);
}

function removeTagFromText(text, tag) {
  const target = String(tag || '').trim().toLowerCase();
  if (!target) return String(text || '');
  const next = splitTags(text).filter((t) => t.toLowerCase() !== target);
  return joinTags(next);
}

function replaceTagInText(text, fromTag, toTag) {
  const from = String(fromTag || '').trim().toLowerCase();
  const to = String(toTag || '').trim();
  if (!from || !to) return String(text || '');
  const tags = splitTags(text).map((t) => (t.toLowerCase() === from ? to : t));
  const seen = new Set();
  const deduped = [];
  tags.forEach((t) => {
    const key = String(t || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(t);
  });
  return joinTags(deduped);
}

function rowsFromAliases(aliases, categories = {}) {
  return Object.entries(normalizeAliasMap(aliases)).map(([key, text], idx) => {
    const [maybeCat, maybeName] = String(key).includes(DELIM)
      ? key.split(DELIM)
      : ['', key];
    const name = maybeName || key;
    const category =
      categories[key] ||
      categories[name] ||
      maybeCat ||
      '';
    return {
      id: `existing-${idx}-${key}`,
      name,
      text,
      category,
    };
  });
}

function rowsToAliasMap(rows) {
  const next = {};
  rows.forEach((row) => {
    const key = String(row?.name || '').trim();
    const val = typeof row?.text === 'string' ? row.text.trim() : '';
    if (key && val) {
      const cat = String(row?.category || '').trim();
      const aliasKey = cat ? `${cat}${DELIM}${key}` : key;
      next[aliasKey] = val;
    }
  });
  return next;
}

function rowsToCategories(rows) {
  const next = {};
  rows.forEach((row) => {
    const key = String(row?.name || '').trim();
    const cat = typeof row?.category === 'string' ? row.category.trim() : '';
    if (key) {
      const aliasKey = cat ? `${cat}${DELIM}${key}` : key;
      next[aliasKey] = cat;
    }
  });
  return next;
}

export default function Aliases() {
  const navigate = useNavigate();
  const {
    aliases,
    aliasCategories,
    categoryList: persistedCategoryList,
    loading,
    saving,
    error,
    persistAliases,
  } = usePromptAliases();

  const [rows, setRows] = useState(() => rowsFromAliases(aliases, aliasCategories));
  const [categoryList, setCategoryList] = useState(() => Array.isArray(persistedCategoryList) ? persistedCategoryList : []);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [subcategoryFilter, setSubcategoryFilter] = useState('All');
  const [query, setQuery] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [tagCheck, setTagCheck] = useState({ loading: false, invalid: [], suggestions: {} });
  const [invalidReportOpen, setInvalidReportOpen] = useState(false);
  const [invalidReport, setInvalidReport] = useState(null);
  const [status, setStatus] = useState('');
  const nameInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [quickTagInput, setQuickTagInput] = useState('');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    if (dirty) return;
    const nextRows = rowsFromAliases(aliases, aliasCategories || {});
    setRows(nextRows);
    if (selectedId && !nextRows.some((r) => r.id === selectedId)) {
      setSelectedId('');
      setEditorOpen(false);
    }
  }, [aliasCategories, dirty]);

  useEffect(() => {
    if (dirty) return;
    if (Array.isArray(persistedCategoryList)) {
      setCategoryList(persistedCategoryList);
    }
  }, [persistedCategoryList, dirty]);

  useEffect(() => {
    if (dirty) return;
    const nextRows = rowsFromAliases(aliases, aliasCategories || {});
    setRows(nextRows);
    if (selectedId && !nextRows.some((r) => r.id === selectedId)) {
      setSelectedId('');
      setEditorOpen(false);
    }
  }, [aliases, aliasCategories, selectedId, dirty]);

  const draftAliases = useMemo(() => rowsToAliasMap(rows), [rows]);

  const addRow = () => {
    const newRow = { id: makeRowId(), name: '', text: '', category: '' };
    setRows((prev) => [...prev, newRow]);
    setSelectedId(newRow.id);
    setStatus('');
    setDirty(true);
    setEditorOpen(true);
  };

  const updateRow = (index, field, value) => {
    setDirty(true);
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removeRow = (index) => {
    setDirty(true);
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setSelectedId('');
        setEditorOpen(false);
      } else if (selectedId === prev[index]?.id) {
        setSelectedId('');
        setEditorOpen(false);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setStatus('');
    try {
      // Preflight: block saving if any alias contains tags not present in danbooru_tags.md
      const tagToRows = new Map(); // lower -> { tag, rows: [rowId] }
      rows.forEach((row) => {
        const tags = splitTags(row?.text || '');
        tags.forEach((t) => {
          const key = String(t).toLowerCase();
          if (!key) return;
          if (!tagToRows.has(key)) tagToRows.set(key, { tag: t, rows: [] });
          tagToRows.get(key).rows.push(row.id);
        });
      });

      if (tagToRows.size) {
        const uniqueTags = Array.from(tagToRows.values()).map((v) => v.tag);
        try {
          const res = await validateDanbooruTags(uniqueTags);
          const invalid = Array.isArray(res?.invalid) ? res.invalid : [];
          const invalidLower = new Set(invalid.map((t) => String(t).toLowerCase()));
          if (invalidLower.size) {
            const rowsWithInvalid = rows
              .map((row) => {
                const tags = splitTags(row?.text || '');
                const bad = tags.filter((t) => invalidLower.has(String(t).toLowerCase()));
                if (!bad.length) return null;
                const token = row.category ? `${row.category}:${row.name}` : row.name;
                return {
                  id: row.id,
                  token,
                  friendlyName: formatAliasFriendlyName({ name: row.name }) || row.name || 'Untitled',
                  category: row.category || '',
                  invalid: bad,
                };
              })
              .filter(Boolean);

            setInvalidReport({
              invalid,
              invalidLower: Array.from(invalidLower),
              rows: rowsWithInvalid,
              suggestions: res?.suggestions || {},
            });
            setInvalidReportOpen(true);
            setStatus('Fix invalid tags before saving.');
            return;
          }
        } catch (e) {
          console.error('Unable to validate tags', e);
          setStatus('Unable to validate tags right now.');
          return;
        }
      }

      const nextCats = rowsToCategories(rows);
      await persistAliases({ items: draftAliases, categories: nextCats, categoryList });
      setDirty(false);
      setStatus('Saved.');
    } catch {
      setStatus('Unable to save right now.');
    }
  };

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = rows.filter((row) => {
      const cat = (row.category || '').trim();
      if (categoryFilter === '' && cat) return false;
      if (categoryFilter !== 'All' && categoryFilter !== '' && cat !== categoryFilter) return false;

      const sub = deriveAliasSubcategory(row.name || '', row.category || '');
      if (subcategoryFilter !== 'All' && sub !== subcategoryFilter) return false;

      if (!q) return true;
      const token = cat ? `${cat}:${row.name}` : row.name;
      return (
        (row.name || '').toLowerCase().includes(q) ||
        (row.text || '').toLowerCase().includes(q) ||
        (cat || '').toLowerCase().includes(q) ||
        (token || '').toLowerCase().includes(q)
      );
    });

    const order = [...base];
    order.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return order;
  }, [rows, categoryFilter, subcategoryFilter, query]);

  const selectedRow =
    filteredRows.find((r) => r.id === selectedId) ||
    rows.find((r) => r.id === selectedId) ||
    null;
  const selectedToken = selectedRow
    ? (selectedRow.category ? `${selectedRow.category}:${selectedRow.name}` : selectedRow.name || 'alias')
    : '';
  const selectedFriendlyName = selectedRow
    ? formatAliasFriendlyName({ name: selectedRow.name }) || selectedRow.name || 'Alias'
    : 'Alias';
  const selectedTokenDisplay = selectedToken ? `$${selectedToken}$` : '$alias$';
  const editorRows = filteredRows.length ? filteredRows : rows;
  const selectedIndex = selectedRow
    ? editorRows.findIndex((row) => row.id === selectedRow.id)
    : -1;
  const prevRow = selectedIndex > 0 ? editorRows[selectedIndex - 1] : null;
  const nextRow =
    selectedIndex >= 0 && selectedIndex < editorRows.length - 1
      ? editorRows[selectedIndex + 1]
      : null;

  const jumpToRow = (row) => {
    if (!row) return;
    setSelectedId(row.id);
    setEditorOpen(true);
    setStatus('');
  };

  const availableCategories = useMemo(() => {
    const set = new Set(categoryList || []);
    rows.forEach((row) => {
      if (row.category) set.add(row.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, categoryList]);

  const availableSubcategories = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      const cat = (row.category || '').trim();
      if (categoryFilter === '' && cat) return;
      if (categoryFilter !== 'All' && categoryFilter !== '' && cat !== categoryFilter) return;
      const sub = deriveAliasSubcategory(row.name || '', row.category || '');
      if (sub) set.add(sub);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, categoryFilter]);

  useEffect(() => {
    if (subcategoryFilter === 'All') return;
    if (!availableSubcategories.includes(subcategoryFilter)) {
      setSubcategoryFilter('All');
    }
  }, [availableSubcategories, subcategoryFilter]);

  useEffect(() => {
    setQuickTagInput('');
  }, [selectedId]);

  const selectedRowTags = useMemo(() => splitTags(selectedRow?.text || ''), [selectedRow?.text]);
  const selectedRowInvalidLower = useMemo(() => {
    const invalid = Array.isArray(tagCheck?.invalid) ? tagCheck.invalid : [];
    return new Set(invalid.map((t) => String(t).toLowerCase()));
  }, [tagCheck]);

  // Validate tags in the editor (debounced)
  useEffect(() => {
    if (!selectedRow || !(editorOpen || isDesktop)) return undefined;
    const tags = selectedRowTags;
    const unique = [];
    const seen = new Set();
    tags.forEach((t) => {
      const key = String(t).toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push(t);
    });
    if (!unique.length) {
      setTagCheck({ loading: false, invalid: [], suggestions: {} });
      return undefined;
    }

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setTagCheck((prev) => ({ ...prev, loading: true }));
      try {
        const res = await validateDanbooruTags(unique);
        if (cancelled) return;
        setTagCheck({
          loading: false,
          invalid: Array.isArray(res?.invalid) ? res.invalid : [],
          suggestions: res?.suggestions || {},
        });
      } catch (e) {
        console.error('Failed to validate tags', e);
        if (!cancelled) setTagCheck({ loading: false, invalid: [], suggestions: {} });
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [editorOpen, isDesktop, selectedRow, selectedRowTags]);

  const copyText = (text) => {
    const value = String(text || '');
    if (!value) return false;
    try {
      navigator.clipboard?.writeText?.(value);
      return true;
    } catch {
      return false;
    }
  };

  const goToTagLibrary = (q = '') => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    navigate(`/tags${qs}`);
  };

  const addQuickTags = () => {
    if (!selectedRow) return;
    const tags = splitTags(quickTagInput);
    if (!tags.length) {
      setStatus('Enter a tag to add.');
      return;
    }
    const idx = rows.findIndex((r) => r.id === selectedRow.id);
    if (idx === -1) return;
    let nextText = rows[idx]?.text || '';
    tags.forEach((t) => {
      nextText = addTagToText(nextText, t);
    });
    updateRow(idx, 'text', nextText);
    setQuickTagInput('');
    setStatus(`Added ${tags.length} tag${tags.length === 1 ? '' : 's'}.`);
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setStatus('Enter a category name.');
      return;
    }
    const nextCategoryList = Array.from(new Set([...(categoryList || []), name]));
    setCategoryList(nextCategoryList);
    setNewCategoryName('');
    setStatus('Category added.');

    // Persist the category list alongside current aliases/categories
    const items = rowsToAliasMap(rows);
    const cats = rowsToCategories(rows);
    setDirty(true);
    try {
      await persistAliases({ items, categories: cats, categoryList: nextCategoryList });
      setDirty(false);
      setStatus('Category saved.');
    } catch {
      setStatus('Unable to save right now.');
    }
  };

  const openEditorForRow = (row) => {
    if (!row) return;
    setSelectedId(row.id);
    setEditorOpen(true);
    setStatus('');
  };

  const closeEditor = () => {
    if (isDesktop) {
      setSelectedId('');
    }
    setEditorOpen(false);
    setStatus('');
  };

  const countsLabel = useMemo(() => {
    const total = rows.length;
    const shown = filteredRows.length;
    if (loading && total === 0) return 'Loading…';
    if (total === shown) return `${total} aliases`;
    return `${shown} of ${total} aliases`;
  }, [rows.length, filteredRows.length, loading]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.defaultPrevented) return;
      const target = e.target;
      const tagName = target?.tagName || '';
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) || target?.isContentEditable;
      const key = String(e.key || '').toLowerCase();
      const meta = e.metaKey || e.ctrlKey;

      if (meta && key === 's') {
        e.preventDefault();
        if (dirty && !saving) {
          handleSave();
        }
        return;
      }

      if (meta && key === 'n') {
        e.preventDefault();
        addRow();
        return;
      }

      if (!isInput && key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus?.();
        return;
      }

      if (key === 'escape' && editorOpen && !isDesktop) {
        e.preventDefault();
        closeEditor();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [addRow, closeEditor, dirty, editorOpen, handleSave, isDesktop, saving]);

  const editorFooter = (
    <div className="flex gap-2">
      <button
        type="button"
        className="ui-button is-muted w-full"
        onClick={closeEditor}
      >
        {isDesktop ? 'Clear selection' : 'Close'}
      </button>
      <button
        type="button"
        className="ui-button is-primary w-full"
        onClick={handleSave}
        disabled={saving || !dirty}
      >
        {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
      </button>
    </div>
  );

  const editorContent = selectedRow ? (
    <div className="sheet-stack">
      <div className="alias-editor-toolbar">
        <div className="alias-editor-heading">
          <div className="alias-editor-title">{selectedFriendlyName}</div>
          <div className="alias-editor-meta">{selectedTokenDisplay}</div>
        </div>
        <div className="alias-editor-actions">
          <button
            type="button"
            className="ui-button is-tiny is-muted"
            onClick={() => jumpToRow(prevRow)}
            disabled={!prevRow}
            title="Previous alias"
          >
            Prev
          </button>
          <button
            type="button"
            className="ui-button is-tiny is-muted"
            onClick={() => jumpToRow(nextRow)}
            disabled={!nextRow}
            title="Next alias"
          >
            Next
          </button>
          <button
            type="button"
            className="ui-button is-tiny is-ghost"
            onClick={() => {
              if (selectedToken && copyText(selectedTokenDisplay)) {
                setStatus('Token copied.');
              } else {
                setStatus('Copy not available on this browser.');
              }
            }}
            title="Copy token"
          >
            Copy token
          </button>
        </div>
      </div>

      <div className="sheet-section">
        <div className="sheet-label">Token</div>
        <div className="composer-token">{selectedTokenDisplay}</div>
        {deriveAliasSubcategory(selectedRow.name || '', selectedRow.category || '') ? (
          <div className="sheet-hint">
            Subcategory: {formatSubcategoryLabel(deriveAliasSubcategory(selectedRow.name || '', selectedRow.category || ''))}
          </div>
        ) : null}
      </div>

      <div className="sheet-section">
        <div className="sheet-label">Friendly name</div>
        <div className="composer-field">{selectedFriendlyName}</div>
      </div>

      <div className="sheet-section">
        <div className="sheet-label">Alias name</div>
        <input
          ref={nameInputRef}
          type="text"
          value={selectedRow.name || ''}
          onChange={(e) => {
            const idx = rows.findIndex((r) => r.id === selectedRow.id);
            if (idx !== -1) updateRow(idx, 'name', e.target.value);
          }}
          placeholder="e.g. cherry_fruit"
          className="sheet-input ui-control ui-input"
        />
      </div>

      <div className="sheet-section">
        <div className="sheet-label">Category</div>
        <select
          value={selectedRow.category || ''}
          onChange={(e) => {
            const idx = rows.findIndex((r) => r.id === selectedRow.id);
            if (idx !== -1) updateRow(idx, 'category', e.target.value);
          }}
          className="sheet-select ui-control ui-select"
        >
          <option value="">Uncategorized</option>
          {availableCategories.map((cat) => (
            <option key={cat || 'uncat'} value={cat}>
              {cat ? formatCategoryLabel(cat) : 'Uncategorized'}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ui-button is-tiny is-muted"
          onClick={() => setCategoriesOpen(true)}
        >
          Manage categories
        </button>
      </div>

      <div className="sheet-section">
        <div className="sheet-label">Expands to</div>
        <textarea
          value={selectedRow.text}
          onChange={(e) => {
            const idx = rows.findIndex((r) => r.id === selectedRow.id);
            if (idx !== -1) updateRow(idx, 'text', e.target.value);
          }}
          placeholder="Prompt text for this alias"
          className="sheet-textarea ui-control ui-textarea is-compact"
          rows={6}
        />
        <div className="tag-quick-add">
          <input
            type="text"
            value={quickTagInput}
            onChange={(e) => setQuickTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addQuickTags();
              }
            }}
            placeholder="Add tags (comma separated)"
            className="ui-control ui-input tag-quick-input"
            aria-label="Add tags"
          />
          <button
            type="button"
            className="ui-button is-compact is-primary"
            onClick={addQuickTags}
            disabled={!quickTagInput.trim()}
          >
            Add
          </button>
        </div>
          <div className="tag-editor-actions">
            <button
              type="button"
              className="ui-button is-tiny is-ghost"
              onClick={() => goToTagLibrary('')}
            >
              <span className="inline-flex items-center gap-2">
                <IconTag size={14} />
                Open tag library
              </span>
            </button>
            <button
              type="button"
              className="ui-button is-tiny is-muted"
            onClick={() => {
              setTagCheck((prev) => ({ ...prev, loading: true }));
              const tags = splitTags(selectedRow.text || '');
              validateDanbooruTags(tags)
                .then((res) => {
                  setTagCheck({
                    loading: false,
                    invalid: Array.isArray(res?.invalid) ? res.invalid : [],
                    suggestions: res?.suggestions || {},
                  });
                })
                .catch(() => setTagCheck({ loading: false, invalid: [], suggestions: {} }));
            }}
            disabled={tagCheck.loading}
            title="Validate against danbooru_tags.md"
          >
            {tagCheck.loading ? 'Validating…' : 'Validate'}
          </button>
        </div>

        {selectedRowTags.length ? (
          <div className="tag-chip-list" aria-label="Alias tags">
            {selectedRowTags.map((t) => {
              const isInvalid = selectedRowInvalidLower.has(String(t).toLowerCase());
              return (
                <span key={t} className={`tag-chip ${isInvalid ? 'is-invalid' : ''}`}>
                  <code className="tag-chip-code">{t}</code>
                  <button
                    type="button"
                    className="tag-chip-remove"
                    onClick={() => {
                      const idx = rows.findIndex((r) => r.id === selectedRow.id);
                      if (idx !== -1) {
                        updateRow(idx, 'text', removeTagFromText(selectedRow.text || '', t));
                      }
                    }}
                    aria-label={`Remove ${t}`}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <div className="sheet-hint">Tip: Use the Tag library to add validated tags quickly.</div>
        )}

        {!tagCheck.loading && Array.isArray(tagCheck.invalid) && tagCheck.invalid.length ? (
          <div className="tag-invalid-panel" role="alert">
            <div className="tag-invalid-title">
              Invalid tags ({tagCheck.invalid.length})
            </div>
            <div className="tag-invalid-body">
              {tagCheck.invalid.map((bad) => {
                const sugg = tagCheck?.suggestions?.[bad] || [];
                return (
                  <div key={bad} className="tag-invalid-row">
                    <div className="tag-invalid-tag">
                      <code>{bad}</code>
                      <button
                        type="button"
                        className="ui-button is-tiny is-ghost"
                        onClick={() => goToTagLibrary(bad)}
                      >
                        Find
                      </button>
                    </div>
                    {Array.isArray(sugg) && sugg.length ? (
                      <div className="tag-invalid-suggestions">
                        {sugg.slice(0, 6).map((s) => (
                          <button
                            key={`${bad}-${s}`}
                            type="button"
                            className="tag-suggestion"
                            onClick={() => {
                              const idx = rows.findIndex((r) => r.id === selectedRow.id);
                              if (idx !== -1) {
                                updateRow(idx, 'text', replaceTagInText(selectedRow.text || '', bad, s));
                              }
                            }}
                            title={`Replace ${bad} with ${s}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="sheet-hint">No suggestions found for this tag.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="sheet-section">
        <button
          type="button"
          className="ui-button is-danger"
          onClick={() => {
            const idx = rows.findIndex((r) => r.id === selectedRow.id);
            if (idx !== -1) {
              removeRow(idx);
              setEditorOpen(false);
            }
          }}
        >
          Delete alias
        </button>
        <div className="sheet-hint">
          Deleting removes it from your library. Use Save changes to persist.
        </div>
      </div>
    </div>
  ) : (
    <div className="alias-editor-empty">
      Select an alias to edit, or create a new one.
    </div>
  );

  return (
    <>
      <div className="page-shell page-stack alias-page">
        <div className="page-bar">
          <h1 className="page-bar-title">Aliases</h1>
          <div className="page-bar-actions">
            <button
              type="button"
              className="page-bar-btn"
              onClick={() => openTagLibrary({ query: query || '', targetId: '' })}
              title="Browse danbooru tags"
            >
              Tags
            </button>
            <button
              type="button"
              className="page-bar-btn is-primary"
              onClick={addRow}
            >
              Add
            </button>
          </div>
        </div>
        <div className="library-toolbar screen-sticky">
          <div className="library-toolbar-inner">
            <div className="composer-filters">
              <div className="input-with-action">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="composer-search ui-control ui-input"
                  placeholder="Search aliases"
                  aria-label="Search aliases"
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setQuery('')}
                  disabled={!query}
                >
                  Clear
                </button>
              </div>
              <select
                className="composer-subcategory-select ui-control ui-select is-compact"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="All">Category: All</option>
                <option value="">Uncategorized</option>
                {availableCategories.map((cat) => (
                  <option key={cat || 'uncat'} value={cat}>
                    {cat ? formatCategoryLabel(cat) : 'Uncategorized'}
                  </option>
                ))}
              </select>
              <select
                className="composer-subcategory-select ui-control ui-select is-compact"
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                aria-label="Filter by subcategory"
              >
                <option value="All">Subcategory: All</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {formatSubcategoryLabel(sub)}
                  </option>
                ))}
              </select>
              {dirty ? (
                <button
                  type="button"
                  className="ui-button is-compact is-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              ) : null}
            </div>
            {error ? (
              <div className="library-toolbar-status is-error">
                Could not load aliases. Try again later.
              </div>
            ) : null}
            {status ? (
              <div className="library-toolbar-status">{status}</div>
            ) : null}
          </div>
        </div>

        <div className="alias-layout">
          <div className="alias-list">
            {rows.length === 0 && !loading ? (
              <section className="ui-panel text-center py-16">
                <p className="text-base text-[rgba(159,178,215,0.8)]">
                  No aliases yet. Add your first one.
                </p>
              </section>
            ) : (
              <div className="composer-alias-list" role="list">
                {filteredRows.length === 0 ? (
                  <div className="composer-alias-empty">
                    No aliases match your filters.
                  </div>
                ) : null}
                {filteredRows.map((row) => {
                  const cat = (row.category || '').trim();
                  const aliasToken = cat ? `${cat}:${row.name}` : row.name;
                  const short = (row.text || '').slice(0, 140) + ((row.text || '').length > 140 ? '…' : '');
                  return (
                    <button
                      key={row.id}
                      type="button"
                      role="listitem"
                      className={`composer-alias-item ${selectedId === row.id ? 'is-selected' : ''}`}
                      onClick={() => openEditorForRow(row)}
                    >
                      <div className="composer-alias-header">
                        <div className="composer-alias-name">
                          {formatAliasFriendlyName({ name: row.name }) || row.name || 'Untitled'}
                        </div>
                        {cat ? <span className="composer-alias-category">{formatCategoryLabel(cat)}</span> : null}
                      </div>
                      <div className="composer-alias-token">${aliasToken || 'alias'}$</div>
                      <div className="composer-alias-text">{short || '—'}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="alias-editor-panel">
            <div className="alias-editor-card ui-panel">
              {editorContent}
              {selectedRow ? (
                <div className="alias-editor-footer">{editorFooter}</div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      <BottomSheet
        open={editorOpen && !!selectedRow && !isDesktop}
        onClose={closeEditor}
        title="Alias"
        variant="fullscreen"
        footer={editorFooter}
      >
        {editorContent}
      </BottomSheet>

      <BottomSheet
        open={categoriesOpen}
        onClose={() => {
          setCategoriesOpen(false);
          setNewCategoryName('');
          setStatus('');
        }}
        title="Categories"
        variant="sheet"
        footer={(
          <div className="sheet-hint">
            Categories help you organize aliases and improve the Insert alias picker.
          </div>
        )}
      >
        <div className="sheet-stack">
          <div className="sheet-section">
            <div className="sheet-label">Add category</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. styles"
                className="sheet-input ui-control ui-input"
              />
              <button
                type="button"
                className="ui-button is-primary is-compact"
                onClick={addCategory}
              >
                Add
              </button>
            </div>
          </div>

          <div className="sheet-section">
            <div className="sheet-label">Existing</div>
            {availableCategories.length === 0 ? (
              <div className="sheet-hint">No categories yet.</div>
            ) : (
              <select
                className="sheet-select ui-control ui-select"
                defaultValue=""
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) return;
                  setCategoryFilter(next);
                  setCategoriesOpen(false);
                }}
              >
                <option value="">Select a category…</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={invalidReportOpen}
        onClose={() => setInvalidReportOpen(false)}
        title="Fix invalid tags"
        variant="fullscreen"
        footer={(
          <div className="flex gap-2">
            <button
              type="button"
              className="ui-button is-muted w-full"
              onClick={() => setInvalidReportOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="ui-button is-primary w-full"
              onClick={() => {
                const invalidLower = new Set((invalidReport?.invalidLower || []).map((t) => String(t).toLowerCase()));
                if (!invalidLower.size) {
                  setInvalidReportOpen(false);
                  return;
                }
                setRows((prev) =>
                  prev.map((row) => {
                    const tags = splitTags(row?.text || '');
                    const next = tags.filter((t) => !invalidLower.has(String(t).toLowerCase()));
                    const nextText = joinTags(next);
                    return nextText === (row?.text || '') ? row : { ...row, text: nextText };
                  })
                );
                setDirty(true);
                setInvalidReportOpen(false);
                setStatus('Removed invalid tags. Review and save again.');
              }}
            >
              Remove invalid tags
            </button>
          </div>
        )}
      >
        <div className="sheet-stack">
          <div className="sheet-section">
            <div className="sheet-hint">
              These aliases contain tags not found in <code className="font-mono">danbooru_tags.md</code>. Fix them before saving.
            </div>
          </div>

          {invalidReport?.rows?.length ? (
            <div className="sheet-section">
              <div className="sheet-label">Aliases with issues</div>
              <div className="composer-alias-list" role="list">
                {invalidReport.rows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="listitem"
                    className="composer-alias-item"
                    onClick={() => {
                      setSelectedId(r.id);
                      setEditorOpen(true);
                      setInvalidReportOpen(false);
                    }}
                  >
                    <div className="composer-alias-header">
                      <div className="composer-alias-name">{r.friendlyName}</div>
                      {r.category ? (
                        <span className="composer-alias-category">{formatCategoryLabel(r.category)}</span>
                      ) : null}
                    </div>
                    <div className="composer-alias-token">${r.token}$</div>
                    <div className="tag-invalid-inline">
                      {r.invalid.map((t) => (
                        <span key={`${r.id}-${t}`} className="tag-chip is-invalid">
                          <code className="tag-chip-code">{t}</code>
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
