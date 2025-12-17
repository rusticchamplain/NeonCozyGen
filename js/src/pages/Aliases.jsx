// js/src/pages/Aliases.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import usePromptAliases from '../hooks/usePromptAliases';
import { normalizeAliasMap } from '../utils/promptAliases';
import BottomSheet from '../components/ui/BottomSheet';
import { IconTag, IconRefresh } from '../components/Icons';
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
  const {
    aliases,
    aliasCategories,
    categoryList: persistedCategoryList,
    loading,
    saving,
    error,
    persistAliases,
    refreshAliases,
  } = usePromptAliases();

  const [rows, setRows] = useState(() => rowsFromAliases(aliases, aliasCategories));
  const [categoryList, setCategoryList] = useState(() => Array.isArray(persistedCategoryList) ? persistedCategoryList : []);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [subcategoryFilter, setSubcategoryFilter] = useState('All');
  const [query, setQuery] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [status, setStatus] = useState('');
  const nameInputRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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
    if (editorOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editorOpen, selectedId]);

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
    setEditorOpen(false);
    setStatus('');
  };

  const countsLabel = useMemo(() => {
    const total = rows.length;
    const shown = filteredRows.length;
    if (loading) return 'Loading…';
    if (total === shown) return `${total} aliases`;
    return `${shown} of ${total} aliases`;
  }, [rows.length, filteredRows.length, loading]);

  return (
    <>
      <div className="page-shell page-stack">
        <div className="screen-sticky">
          <div className="space-y-3 py-3">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="ui-kicker">Library</div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <IconTag size={18} />
                  <span className="truncate">Aliases</span>
                </h2>
                <div className="text-[11px] text-[#9DA3FFCC] mt-1">{countsLabel}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="ui-button is-tiny is-muted"
                  onClick={() => setCategoriesOpen(true)}
                >
                  Categories
                </button>
                <button
                  type="button"
                  className="ui-button is-tiny is-ghost"
                  onClick={refreshAliases}
                  disabled={loading}
                  title="Refresh"
                >
                  <span className="inline-flex items-center gap-2">
                    <IconRefresh size={14} />
                    Refresh
                  </span>
                </button>
                <button
                  type="button"
                  className="ui-button is-tiny is-primary"
                  onClick={addRow}
                >
                  Add
                </button>
              </div>
            </header>

            <div className="composer-filters">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="composer-search"
                placeholder="Search aliases"
                aria-label="Search aliases"
              />
              <select
                className="composer-subcategory-select"
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
                className="composer-subcategory-select"
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
              <div className="text-xs text-[#FF8F70]">
                Could not load aliases. Try again later.
              </div>
            ) : null}
            {status ? (
              <div className="text-xs text-[#9DA3FFCC]">{status}</div>
            ) : null}
          </div>
        </div>

        {rows.length === 0 && !loading ? (
          <section className="ui-panel text-center py-16">
            <p className="text-base text-slate-200/80">
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
                  className="composer-alias-item"
                  onClick={() => openEditorForRow(row)}
                >
                  <div className="composer-alias-header">
                    <div className="composer-alias-name">
                      {formatAliasFriendlyName({ name: row.name }) || row.name || 'Untitled'}
                    </div>
                    {cat ? <span className="composer-alias-category">{cat}</span> : null}
                  </div>
                  <div className="composer-alias-token">${aliasToken || 'alias'}$</div>
                  <div className="composer-alias-text">{short || '—'}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomSheet
        open={editorOpen && !!selectedRow}
        onClose={closeEditor}
        title="Alias"
        variant="fullscreen"
        footer={(
          <div className="flex gap-2">
            <button
              type="button"
              className="ui-button is-muted w-full"
              onClick={closeEditor}
            >
              Close
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
        )}
      >
        {selectedRow ? (
          <div className="sheet-stack">
            <div className="sheet-section">
              <div className="sheet-label">Token</div>
              <div className="composer-token">
                ${selectedRow.category ? `${selectedRow.category}:${selectedRow.name}` : selectedRow.name || 'alias'}$
              </div>
              {deriveAliasSubcategory(selectedRow.name || '', selectedRow.category || '') ? (
                <div className="sheet-hint">
                  Subcategory: {formatSubcategoryLabel(deriveAliasSubcategory(selectedRow.name || '', selectedRow.category || ''))}
                </div>
              ) : null}
            </div>

            <div className="sheet-section">
              <div className="sheet-label">Friendly name</div>
              <div className="composer-field">
                {formatAliasFriendlyName({ name: selectedRow.name }) || selectedRow.name || 'Alias'}
              </div>
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
                className="sheet-input"
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
                className="sheet-select"
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
                className="sheet-textarea is-compact"
                rows={6}
              />
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
        ) : null}
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
                className="sheet-input"
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
                className="sheet-select"
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
    </>
  );
}
