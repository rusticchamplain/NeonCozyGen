// js/src/pages/Aliases.jsx
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePromptAliases from '../hooks/usePromptAliases';
import { validateDanbooruTags } from '../../../services/api';
import BottomSheet from '../../../ui/primitives/BottomSheet';
import Button from '../../../ui/primitives/Button';
import Select from '../../../ui/primitives/Select';
import { IconTag, IconX } from '../../../ui/primitives/Icons';
import useMediaQuery from '../../../hooks/useMediaQuery';
import {
  deriveAliasSubcategory,
  formatCategoryLabel,
  formatSubcategoryLabel,
} from '../../../utils/aliasPresentation';
import { useVirtualList } from '../../../hooks/useVirtualList';
import AliasRow from '../components/AliasRow';
import {
  addTagToText,
  joinTags,
  makeRowId,
  removeTagFromText,
  replaceTagInText,
  rowsFromAliases,
  rowsToAliasMap,
  rowsToCategories,
  splitTags,
} from '../utils/aliasRows';

const listItemVisibilityStyles = {
  contentVisibility: 'auto',
  containIntrinsicSize: '240px 120px',
};

export default function Aliases({ inline = false }) {
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
  const deferredQuery = useDeferredValue(query);

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
    const q = deferredQuery.trim().toLowerCase();
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
  }, [rows, categoryFilter, subcategoryFilter, deferredQuery]);
  const {
    containerRef: aliasListRef,
    startIndex: aliasStart,
    endIndex: aliasEnd,
    topSpacer: aliasTopSpacer,
    bottomSpacer: aliasBottomSpacer,
    virtualized: aliasesVirtualized,
  } = useVirtualList({
    itemCount: filteredRows.length,
    enabled: true,
    estimateRowHeight: 86,
    overscan: 8,
    minItems: 120,
  });
  const visibleRows = aliasesVirtualized ? filteredRows.slice(aliasStart, aliasEnd) : filteredRows;

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
    return Array.from(set).sort((a, b) =>
      formatCategoryLabel(a).localeCompare(formatCategoryLabel(b))
    );
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
    const params = new URLSearchParams();
    params.set('tab', 'tags');
    if (q) params.set('q', q);
    navigate(`/library?${params.toString()}`);
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

  const openEditorForRow = useCallback((row) => {
    if (!row) return;
    setSelectedId(row.id);
    setEditorOpen(true);
    setStatus('');
  }, []);

  const rowById = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      if (!row?.id) return;
      map.set(row.id, row);
    });
    return map;
  }, [rows]);

  const handleOpenRow = useCallback((id) => {
    const row = rowById.get(id);
    if (!row) return;
    openEditorForRow(row);
  }, [openEditorForRow, rowById]);

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
      <Button
        variant="muted"
        className="w-full"
        onClick={closeEditor}
      >
        {isDesktop ? 'Clear selection' : 'Close'}
      </Button>
      <Button
        variant="primary"
        className="w-full"
        onClick={handleSave}
        disabled={saving || !dirty}
      >
        {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
      </Button>
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
          <Button
            size="xs"
            variant="muted"
            onClick={() => jumpToRow(prevRow)}
            disabled={!prevRow}
            title="Previous alias"
          >
            Prev
          </Button>
          <Button
            size="xs"
            variant="muted"
            onClick={() => jumpToRow(nextRow)}
            disabled={!nextRow}
            title="Next alias"
          >
            Next
          </Button>
          <Button
            size="xs"
            variant="ghost"
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
          </Button>
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
        <Select
          value={selectedRow.category || ''}
          onChange={(value) => {
            const idx = rows.findIndex((r) => r.id === selectedRow.id);
            if (idx !== -1) updateRow(idx, 'category', value);
          }}
          size="sm"
          searchThreshold={0}
          options={[
            { value: '', label: 'Uncategorized' },
            ...availableCategories.filter(Boolean).map((cat) => ({
              value: cat,
              label: formatCategoryLabel(cat),
            })),
          ]}
        />
        <Button
          size="xs"
          variant="muted"
          onClick={() => setCategoriesOpen(true)}
        >
          Manage categories
        </Button>
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
          <Button
            size="sm"
            variant="primary"
            onClick={addQuickTags}
            disabled={!quickTagInput.trim()}
          >
            Add
          </Button>
        </div>
          <div className="tag-editor-actions">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => goToTagLibrary('')}
            >
              <span className="inline-flex items-center gap-2">
                <IconTag size={14} />
                Open tag library
              </span>
            </Button>
            <Button
              size="xs"
              variant="muted"
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
          </Button>
        </div>

        {selectedRowTags.length ? (
          <div className="tag-chip-list" aria-label="Alias tags">
            {selectedRowTags.map((t) => {
              const isInvalid = selectedRowInvalidLower.has(String(t).toLowerCase());
              return (
                <span key={t} className={`ui-chip ${isInvalid ? 'is-invalid' : ''}`}>
                  <code className="ui-chip-code">{t}</code>
                  <Button
                    size="mini"
                    variant="danger"
                    onClick={() => {
                      const idx = rows.findIndex((r) => r.id === selectedRow.id);
                      if (idx !== -1) {
                        updateRow(idx, 'text', removeTagFromText(selectedRow.text || '', t));
                      }
                    }}
                    aria-label={`Remove ${t}`}
                    title="Remove"
                  >
                    <IconX size={12} />
                  </Button>
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
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => goToTagLibrary(bad)}
                      >
                        Find
                      </Button>
                    </div>
                    {Array.isArray(sugg) && sugg.length ? (
                      <div className="tag-invalid-suggestions">
                        {sugg.slice(0, 6).map((s) => (
                          <Button
                            key={`${bad}-${s}`}
                            size="xs"
                            variant="chip"
                            onClick={() => {
                              const idx = rows.findIndex((r) => r.id === selectedRow.id);
                              if (idx !== -1) {
                                updateRow(idx, 'text', replaceTagInText(selectedRow.text || '', bad, s));
                              }
                            }}
                            title={`Replace ${bad} with ${s}`}
                          >
                            {s}
                          </Button>
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
        <Button
          variant="danger"
          onClick={() => {
            const idx = rows.findIndex((r) => r.id === selectedRow.id);
            if (idx !== -1) {
              removeRow(idx);
              setEditorOpen(false);
            }
          }}
        >
          Delete alias
        </Button>
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

  const shellClassName = inline ? 'page-stack alias-page' : 'page-shell page-stack alias-page';

  return (
    <>
      <div className={shellClassName}>
        {!inline ? (
          <div className="page-bar">
            <h1 className="page-bar-title">Aliases</h1>
            <div className="page-bar-actions">
              <Button
                size="xs"
                onClick={() => goToTagLibrary(query || '')}
                title="Browse danbooru tags"
              >
                Tags
              </Button>
              <Button
                size="xs"
                variant="primary"
                onClick={addRow}
              >
                Add
              </Button>
            </div>
          </div>
        ) : null}
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
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setQuery('')}
                  disabled={!query}
                >
                  Clear
                </Button>
              </div>
              <Select
                wrapperClassName="composer-subcategory-select"
                value={categoryFilter}
                onChange={setCategoryFilter}
                aria-label="Filter by category"
                size="sm"
                searchThreshold={0}
                options={[
                  { value: 'All', label: 'Category: All' },
                  { value: '', label: 'Uncategorized' },
                  ...availableCategories.filter(Boolean).map((cat) => ({
                    value: cat,
                    label: formatCategoryLabel(cat),
                  })),
                ]}
              />
              <Select
                wrapperClassName="composer-subcategory-select"
                value={subcategoryFilter}
                onChange={setSubcategoryFilter}
                aria-label="Filter by subcategory"
                size="sm"
                searchThreshold={0}
                options={[
                  { value: 'All', label: 'Subcategory: All' },
                  ...availableSubcategories.map((sub) => ({
                    value: sub,
                    label: formatSubcategoryLabel(sub),
                  })),
                ]}
              />
              {inline ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={addRow}
                >
                  Add alias
                </Button>
              ) : null}
              {dirty ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
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
              <div className="composer-alias-list" role="list" ref={aliasListRef}>
                {filteredRows.length === 0 ? (
                  <div className="composer-alias-empty">
                    No aliases match your filters.
                  </div>
                ) : null}
                {aliasesVirtualized && aliasTopSpacer > 0 ? (
                  <div aria-hidden style={{ height: `${aliasTopSpacer}px` }} />
                ) : null}
                {visibleRows.map((row) => (
                  <AliasRow
                    key={row.id}
                    id={row.id}
                    name={row.name}
                    category={(row.category || '').trim()}
                    text={row.text || ''}
                    isSelected={selectedId === row.id}
                    onOpen={handleOpenRow}
                    visibilityStyle={listItemVisibilityStyles}
                  />
                ))}
                {aliasesVirtualized && aliasBottomSpacer > 0 ? (
                  <div aria-hidden style={{ height: `${aliasBottomSpacer}px` }} />
                ) : null}
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
              <Button
                size="sm"
                variant="primary"
                onClick={addCategory}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="sheet-section">
            <div className="sheet-label">Existing</div>
            {availableCategories.length === 0 ? (
              <div className="sheet-hint">No categories yet.</div>
            ) : (
              <Select
                value=""
                onChange={(value) => {
                  if (!value) return;
                  setCategoryFilter(value);
                  setCategoriesOpen(false);
                }}
                size="sm"
                searchThreshold={0}
                placeholder="Select a category…"
                options={availableCategories.filter(Boolean).map((cat) => ({
                  value: cat,
                  label: formatCategoryLabel(cat),
                }))}
              />
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
            <Button
              variant="muted"
              className="w-full"
              onClick={() => setInvalidReportOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              className="w-full"
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
            </Button>
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
                        <span key={`${r.id}-${t}`} className="ui-chip is-invalid">
                          <code className="ui-chip-code">{t}</code>
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
