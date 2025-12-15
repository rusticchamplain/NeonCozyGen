// js/src/pages/Aliases.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import usePromptAliases from '../hooks/usePromptAliases';
import { normalizeAliasMap } from '../utils/promptAliases';

const CATEGORY_KEY = 'cozygen_alias_categories';
const CATEGORY_LIST_KEY = 'cozygen_alias_category_list';
const DELIM = '::';

function makeRowId() {
  return `alias-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function loadAliasCategories() {
  try {
    const raw = window.localStorage.getItem(CATEGORY_KEY) || '{}';
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveAliasCategories(map) {
  try {
    window.localStorage.setItem(CATEGORY_KEY, JSON.stringify(map || {}));
  } catch {
    // ignore
  }
}

function loadCategoryList() {
  try {
    const raw = window.localStorage.getItem(CATEGORY_LIST_KEY) || '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCategoryList(list) {
  try {
    window.localStorage.setItem(CATEGORY_LIST_KEY, JSON.stringify(list || []));
  } catch {
    // ignore
  }
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
  } = usePromptAliases();

  const [rows, setRows] = useState(() => rowsFromAliases(aliases));
  const [categories, setCategories] = useState(() => loadAliasCategories());
  const [categoryList, setCategoryList] = useState(() => loadCategoryList());
  const [selectedId, setSelectedId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editMode, setEditMode] = useState(false);
  const [status, setStatus] = useState('');
  const nameInputRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const initialMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isMobile, setIsMobile] = useState(initialMobile);
  const lastIsMobile = useRef(initialMobile);

  useEffect(() => {
    if (dirty) return;
    setCategories(aliasCategories || {});
  }, [aliasCategories, dirty]);

  useEffect(() => {
    if (dirty) return;
    if (Array.isArray(persistedCategoryList)) {
      setCategoryList(persistedCategoryList);
    }
  }, [persistedCategoryList, dirty]);

  useEffect(() => {
    if (dirty) return;
    const nextRows = rowsFromAliases(aliases, categories);
    setRows(nextRows);
    if (selectedId && !nextRows.some((r) => r.id === selectedId)) {
      setSelectedId('');
    }
  }, [aliases, categories, selectedId, dirty]);

  const draftAliases = useMemo(() => rowsToAliasMap(rows), [rows]);

  const addRow = () => {
    const newRow = { id: makeRowId(), name: '', text: '', category: '' };
    setRows((prev) => [...prev, newRow]);
    setSelectedId(newRow.id);
    setEditMode(true);
    setStatus('Editing new alias');
    setDirty(true);
  };

  const updateRow = (index, field, value) => {
    if (!editMode && field !== 'category') return;
    setDirty(true);
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removeRow = (index) => {
    setDirty(true);
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const nextCategories = rowsToCategories(next);
      setCategories(nextCategories);
      saveAliasCategories(nextCategories);
      if (next.length === 0) {
        setSelectedId('');
        setEditMode(false);
      } else if (selectedId === prev[index]?.id) {
        setSelectedId(next[0].id);
        setEditMode(false);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setStatus('');
    try {
      const nextCats = rowsToCategories(rows);
      await persistAliases({ items: draftAliases, categories: nextCats });
      setCategories(nextCats);
      saveAliasCategories(nextCats);
      setDirty(false);
      setEditMode(false);
      setStatus('Saved');
    } catch {
      setStatus('Unable to save right now.');
    }
  };

  const filteredRows = useMemo(() => {
    const base = rows.filter((row) => {
      if (categoryFilter !== 'All' && (row.category || '') !== categoryFilter) {
        return false;
      }
      return true;
    });

    const order = [...base];
    order.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return order;
  }, [rows, categoryFilter]);

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

  // Autofocus when entering edit mode on a selection
  useEffect(() => {
    if (editMode && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editMode, selectedId]);

  useEffect(() => {
    const syncSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      lastIsMobile.current = mobile;
    };
    syncSize();
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, []);

  const applyCategoryToSelected = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setStatus('Enter a category name.');
      return;
    }
    const nextCategoryList = Array.from(new Set([...(categoryList || []), name]));
    saveCategoryList(nextCategoryList);
    setCategoryList(nextCategoryList);
    setShowCategoryInput(false);
    setNewCategoryName('');
    setStatus('Saved category. Use the dropdown on a card to assign it.');

    // Persist the new category list alongside current aliases/categories
    const items = rowsToAliasMap(rows);
    const cats = rowsToCategories(rows);
    setDirty(true);
    try {
      await persistAliases({ items, categories: cats, categoryList: nextCategoryList });
      setDirty(false);
      setStatus('Saved category. Use the dropdown on a card to assign it.');
    } catch {
      setStatus('Unable to save right now.');
    }
  };

  return (
    <>
      <div className="page-shell page-stack">
        <div className="neon-card p-4 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Alias library</h2>
              </div>
            </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={addRow}
                className="btn-touch h-9 px-3 rounded-lg border border-[#2A2E4A] bg-[#0C1222] text-sm font-semibold text-[#E5E7FF]"
              >
                + Add alias
              </button>
              <div className="flex items-center gap-2 h-9 bg-[#0C1222] border border-[#2A2E4A] rounded-lg px-2 text-xs text-[#7F91B6] flex-wrap w-full sm:w-auto">
                <span>Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-sm text-[#E5E7FF] focus:outline-none h-7"
                >
                  <option value="All">All</option>
                  <option value="">Uncategorized</option>
                  {availableCategories.map((cat) => (
                    <option key={cat || 'uncat'} value={cat}>
                      {cat || 'Uncategorized'}
                    </option>
                  ))}
                </select>
                {showCategoryInput ? (
                  <div className="flex items-center gap-1 w-full sm:w-auto">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category"
                      className="flex-1 min-w-[140px] rounded-md border border-[#2A2E4A] bg-[#050716] px-2 py-1 text-xs text-[#E5E7FF] placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
                    />
                    <button
                      type="button"
                      onClick={applyCategoryToSelected}
                      className="h-8 px-2 rounded-md bg-[#0F1A2F] border border-[#2A2E4A] text-[11px] font-semibold text-[#E5E7FF]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryInput(false);
                        setNewCategoryName('');
                      }}
                      className="h-8 px-2 rounded-md text-[11px] font-semibold text-[#7F91B6] hover:text-[#E5E7FF]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-[#0F1A2F] border border-[#2A2E4A] text-[#E5E7FF] text-[11px] font-semibold"
                    onClick={() => {
                      setShowCategoryInput(true);
                      setNewCategoryName('');
                    }}
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
            {status && !selectedRow ? (
              <p className="text-[11px] text-[#A9B6D9]">{status}</p>
            ) : null}
            {selectedRow ? (
              <div className={`rounded-xl border border-[#2A2E4A] bg-[#0B1226] p-3 sm:p-4 shadow-[0_10px_30px_rgba(4,7,16,0.35)] space-y-3 ${isMobile ? 'hidden sm:block' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#E5E7FF] leading-tight">
                      {selectedRow.name || 'Untitled alias'}
                    </h3>
                    {selectedRow.category ? (
                      <p className="text-[11px] text-[#7F91B6]">
                        Category: {selectedRow.category}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#7F91B6]">
                  <button
                    type="button"
                    onClick={() => {
                      if (editMode) {
                        handleSave();
                      } else {
                        setEditMode(true);
                        setStatus('Editing');
                      }
                    }}
                    className="underline hover:text-[#5EF1D4] transition-colors"
                  >
                    {editMode ? (saving ? 'Saving…' : 'Save') : 'Edit'}
                  </button>
                  <span className="text-[#2A2E4A]">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = rows.findIndex((r) => r.id === selectedRow.id);
                      if (idx !== -1) removeRow(idx);
                    }}
                    className="underline hover:text-[#FF8F70] transition-colors"
                  >
                    Remove
                  </button>
                  <span className="text-[#2A2E4A]">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId('');
                      setEditMode(false);
                      setStatus('');
                    }}
                    className="underline hover:text-[#E5E7FF] transition-colors"
                  >
                    Hide
                  </button>
                  {status ? <span className="text-[11px] text-[#A9B6D9]">{status}</span> : null}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-[#7F91B6] block mb-1">
                      Alias name
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={selectedRow.name || ''}
                      onChange={(e) => {
                        const idx = rows.findIndex((r) => r.id === selectedRow.id);
                        if (idx !== -1) updateRow(idx, 'name', e.target.value);
                      }}
                      placeholder="e.g. cherry_fruit"
                      disabled={!editMode}
                      className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm text-[#E5E7FF] placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-[#7F91B6] block mb-1">
                      Category (optional)
                    </label>
                    <select
                      value={selectedRow.category || ''}
                      onChange={(e) => {
                        const idx = rows.findIndex((r) => r.id === selectedRow.id);
                        if (idx !== -1) updateRow(idx, 'category', e.target.value);
                      }}
                      className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm text-[#E5E7FF] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
                    >
                      <option value="">Uncategorized</option>
                      {availableCategories.map((cat) => (
                        <option key={cat || 'uncat'} value={cat}>
                          {cat || 'Uncategorized'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-[#7F91B6] block mb-1">
                      Expands to
                    </label>
                    <textarea
                      value={selectedRow.text}
                      onChange={(e) => {
                        const idx = rows.findIndex((r) => r.id === selectedRow.id);
                        if (idx !== -1) updateRow(idx, 'text', e.target.value);
                      }}
                      placeholder="Prompt text for this alias"
                      rows={2}
                      disabled={!editMode}
                      className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm text-[#E5E7FF] placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80] resize-y min-h-[72px]"
                    />
                  </div>
                  <div className="text-[11px] text-[#7F91B6]">
                    Invoke with:{' '}
                    <code className="text-[#E5E7FF] bg-[#0F1A2F] px-1 py-0.5 rounded">
                      {selectedRow.category ? `${selectedRow.category}:${selectedRow.name}` : selectedRow.name || 'alias'}
                    </code>
                  </div>
                </div>
              </div>
            ) : null}
            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#2A2E4A] px-4 py-6 text-center text-sm text-[#A9B6D9]">
                No aliases yet. Add your first one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredRows.map((row) => {
                  const isActive = row.id === selectedId;
                  const aliasToken = row.category ? `${row.category}:${row.name}` : row.name;
                  const short = (row.text || '').slice(0, 96) + ((row.text || '').length > 96 ? '…' : '');
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId((prev) => (prev === row.id ? '' : row.id))}
                      className={`text-left rounded-xl border px-3 py-3 transition-all btn-touch ${
                        isActive
                          ? 'border-[#5EF1D4] bg-[#0F1A2F] shadow-[0_12px_34px_rgba(5,7,22,0.35)]'
                          : 'border-[#27304A] bg-[#0C1222]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-sm font-semibold text-[#E5E7FF] truncate">
                          {row.name || 'Untitled'}
                        </div>
                        {isActive ? <span className="text-xs text-[#5EF1D4]">•</span> : null}
                      </div>
                      <div className="text-xs text-[#A9B6D9] line-clamp-2">
                        {short || '—'}
                      </div>
                      <div className="mt-2 text-[11px] text-[#7F91B6] font-mono">
                        ${aliasToken || 'alias'}$
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </div>

        {error ? (
          <p className="text-xs text-[#FF8F70]">
            Could not load aliases. Try again later.
          </p>
        ) : null}
        {loading ? (
          <p className="text-xs text-[#A9B6D9]">Loading aliases…</p>
        ) : null}
      </div>

      {selectedRow && isMobile ? (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setSelectedId('');
              setEditMode(false);
              setStatus('');
            }}
          />
          <div
            className="absolute left-2 right-2 bg-[#0B1226] border border-[#2A2E4A] rounded-2xl shadow-[0_-10px_30px_rgba(4,7,16,0.35)] p-3 space-y-3 pb-3 overflow-y-auto"
            style={{ maxHeight: '80vh', bottom: '72px' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#E5E7FF] leading-tight">
                  {selectedRow.name || 'Untitled alias'}
                </h3>
                {selectedRow.category ? (
                  <p className="text-[11px] text-[#7F91B6]">Category: {selectedRow.category}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedId('');
                  setEditMode(false);
                  setStatus('');
                }}
                className="text-sm text-[#E5E7FF] underline"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#7F91B6]">
              <button
                type="button"
                onClick={() => {
                  if (editMode) {
                    handleSave();
                  } else {
                    setEditMode(true);
                    setStatus('Editing');
                  }
                }}
                className="underline hover:text-[#5EF1D4] transition-colors"
              >
                {editMode ? (saving ? 'Saving…' : 'Save') : 'Edit'}
              </button>
              <span className="text-[#2A2E4A]">|</span>
              <button
                type="button"
                onClick={() => {
                  const idx = rows.findIndex((r) => r.id === selectedRow.id);
                  if (idx !== -1) removeRow(idx);
                }}
                className="underline hover:text-[#FF8F70] transition-colors"
              >
                Remove
              </button>
              {status ? <span className="text-[11px] text-[#A9B6D9]">{status}</span> : null}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-[#7F91B6] block mb-1">
                  Alias name
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={selectedRow.name || ''}
                  onChange={(e) => {
                    const idx = rows.findIndex((r) => r.id === selectedRow.id);
                    if (idx !== -1) updateRow(idx, 'name', e.target.value);
                  }}
                  placeholder="e.g. cherry_fruit"
                  disabled={!editMode}
                  className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm text-[#E5E7FF] placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#7F91B6] block mb-1">
                  Category (optional)
                </label>
                <select
                  value={selectedRow.category || ''}
                  onChange={(e) => {
                    const idx = rows.findIndex((r) => r.id === selectedRow.id);
                    if (idx !== -1) updateRow(idx, 'category', e.target.value);
                  }}
                  className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm text-[#E5E7FF] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
                >
                  <option value="">Uncategorized</option>
                  {availableCategories.map((cat) => (
                    <option key={cat || 'uncat'} value={cat}>
                      {cat || 'Uncategorized'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#7F91B6] block mb-1">
                  Expands to
                </label>
                <textarea
                  value={selectedRow.text}
                  onChange={(e) => {
                    const idx = rows.findIndex((r) => r.id === selectedRow.id);
                    if (idx !== -1) updateRow(idx, 'text', e.target.value);
                  }}
                  placeholder="Prompt text for this alias"
                  rows={2}
                  disabled={!editMode}
                  className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm text-[#E5E7FF] placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80] resize-y min-h-[72px]"
                />
              </div>
              <div className="text-[11px] text-[#7F91B6]">
                Invoke with:{' '}
                <code className="text-[#E5E7FF] bg-[#0F1A2F] px-1 py-0.5 rounded">
                  {selectedRow.category ? `${selectedRow.category}:${selectedRow.name}` : selectedRow.name || 'alias'}
                </code>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
