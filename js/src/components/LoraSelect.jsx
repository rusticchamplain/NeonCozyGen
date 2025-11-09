import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * LoraSelect
 * - choices: string[] or {label,value}[]
 * - value: string
 * - onChange(value: string)
 * - storageKey: string (unique per-workflow-param)
 *
 * Adds:
 * - Folder sections are collapsible (expanded state persisted per storageKey).
 * - Expand All / Collapse All in the sheet header.
 * - Keeps Favorites / Recent sections.
 */
export default function LoraSelect({ choices, value, onChange, storageKey }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const sheetRef = useRef(null);

    // ---- normalize choices to {label,value, folder} ----
    const normalized = useMemo(() => {
        const list = (choices || []).map((c) => {
            if (typeof c === 'string') {
                return { label: c, value: c };
            }
            return { label: c.label ?? String(c.value), value: c.value ?? String(c.label) };
        });
        // deduce folder from path segments
        return list.map((it) => {
            const parts = (it.value || '').split(/[\\/]/).filter(Boolean);
            const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
            return { ...it, folder };
        });
    }, [choices]);

    // ---- favorites & recents persistence ----
    const [favorites, setFavorites] = useState(() => {
        try {
            const raw = localStorage.getItem(`${storageKey}_favorites`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const [recents, setRecents] = useState(() => {
        try {
            const raw = localStorage.getItem(`${storageKey}_recents`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(`${storageKey}_favorites`, JSON.stringify(favorites));
        } catch {}
    }, [favorites, storageKey]);

    useEffect(() => {
        try {
            localStorage.setItem(`${storageKey}_recents`, JSON.stringify(recents));
        } catch {}
    }, [recents, storageKey]);

    // ---- folder expanded state (persisted) ----
    const [expanded, setExpanded] = useState(() => {
        try {
            const raw = localStorage.getItem(`${storageKey}_folders_open`);
            if (raw) return JSON.parse(raw);
        } catch {}
        // default: expand the folder of current selection (if any)
        const cur = normalized.find((n) => n.value === value);
        return cur ? { [cur.folder]: true } : {};
    });

    useEffect(() => {
        try {
            localStorage.setItem(`${storageKey}_folders_open`, JSON.stringify(expanded));
        } catch {}
    }, [expanded, storageKey]);

    const setAllFolders = (openAll, foldersArr) => {
        const next = {};
        if (openAll) foldersArr.forEach((f) => (next[f] = true));
        setExpanded(next);
    };

    // record a recent on selection
    const pushRecent = (val) => {
        setRecents((prev) => {
            const nxt = [val, ...prev.filter((x) => x !== val)];
            return nxt.slice(0, 10);
        });
    };

    const isFav = useMemo(() => new Set(favorites), [favorites]);
    const favList = useMemo(
        () => normalized.filter((n) => isFav.has(n.value)),
                            [normalized, isFav]
    );

    const recentList = useMemo(
        () => recents.map((r) => normalized.find((n) => n.value === r)).filter(Boolean),
                               [recents, normalized]
    );

    // search filter
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return normalized;
        return normalized.filter(
            (n) =>
            n.label.toLowerCase().includes(needle) ||
            n.value.toLowerCase().includes(needle) ||
            n.folder.toLowerCase().includes(needle)
        );
    }, [normalized, q]);

    // group by folder (avoiding dupes with Fav/Recent in their sections)
    const favSet = useMemo(() => new Set(favList.map((f) => f.value)), [favList]);
    const recentSet = useMemo(() => new Set(recentList.map((r) => r.value)), [recentList]);

    const folderGroups = useMemo(() => {
        const map = new Map();
        for (const item of filtered) {
            if (favSet.has(item.value) || recentSet.has(item.value)) continue;
            if (!map.has(item.folder)) map.set(item.folder, []);
            map.get(item.folder).push(item);
        }
        // stable sort folders A→Z
        const entries = Array.from(map.entries()).sort(([a], [b]) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
        );
        // sort items within folder by label
        for (const [, arr] of entries) {
            arr.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
        }
        return entries;
    }, [filtered, favSet, recentSet]);

    // if searching, auto-expand folders that have matches
    useEffect(() => {
        if (!q.trim()) return;
        const next = { ...expanded };
        for (const [folder, items] of folderGroups) {
            if (items.length > 0) next[folder] = true;
        }
        setExpanded(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    // close on outside click
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (!sheetRef.current) return;
            if (!sheetRef.current.contains(e.target)) setOpen(false);
        };
            document.addEventListener('mousedown', onDown);
            return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const currentLabel = useMemo(() => {
        const hit = normalized.find((n) => n.value === value);
        return hit ? hit.label : '(none)';
    }, [normalized, value]);

    const selectValue = (val) => {
        onChange?.(val);
        pushRecent(val);
        setOpen(false);
    };

    const toggleFavorite = (val) => {
        setFavorites((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
    };

    const allFolderNames = useMemo(() => folderGroups.map(([f]) => f), [folderGroups]);

    return (
        <div className="relative">
        <button
        type="button"
        className="w-full justify-between items-center px-3 py-2 rounded-md border border-base-300 bg-base-100 text-left text-sm flex"
        onClick={() => setOpen(true)}
        >
        <span className="truncate">{currentLabel}</span>
        <span className="opacity-60 text-xs">▼</span>
        </button>

        {open && (
            <div
            ref={sheetRef}
            className="absolute left-0 right-0 z-30 mt-2 rounded-xl border border-base-300 bg-base-100 shadow-xl max-h-[70vh] overflow-hidden"
            >
            {/* Header + search + bulk controls */}
            <div className="p-2 border-b border-base-300 sticky top-0 bg-base-100">
            <div className="flex items-center gap-2">
            <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search LoRA…"
            className="flex-1 px-3 py-2 rounded-md bg-base-200 border border-base-300 text-sm"
            />
            <button
            type="button"
            className="px-2 py-2 rounded-md bg-base-200 border border-base-300 text-xs"
            onClick={() => setOpen(false)}
            title="Close"
            >
            Close
            </button>
            </div>
            {/* expand/collapse all (folders) */}
            {allFolderNames.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                <button
                type="button"
                className="px-2 py-1 rounded-md bg-base-200 border border-base-300"
                onClick={() => setAllFolders(true, allFolderNames)}
                >
                Expand all
                </button>
                <button
                type="button"
                className="px-2 py-1 rounded-md bg-base-200 border border-base-300"
                onClick={() => setAllFolders(false, allFolderNames)}
                >
                Collapse all
                </button>
                </div>
            )}
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-2 space-y-3">
            {/* Favorites */}
            {favList.length > 0 && (
                <Section title="★ Favorites">
                {favList.map((item) => (
                    <Row
                    key={`fav-${item.value}`}
                    item={item}
                    active={item.value === value}
                    onPick={() => selectValue(item.value)}
                    favored
                    onToggleFav={() => toggleFavorite(item.value)}
                    />
                ))}
                </Section>
            )}

            {/* Recent */}
            {recentList.length > 0 && (
                <Section title="Recent">
                {recentList.map((item) => (
                    <Row
                    key={`rec-${item.value}`}
                    item={item}
                    active={item.value === value}
                    onPick={() => selectValue(item.value)}
                    favored={isFav.has(item.value)}
                    onToggleFav={() => toggleFavorite(item.value)}
                    />
                ))}
                </Section>
            )}

            {/* By folder (collapsible) */}
            {folderGroups.map(([folder, items]) => {
                const isOpen = !!expanded[folder];
                return (
                    <div key={folder} className="border border-base-300 rounded-md overflow-hidden">
                    <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 bg-base-200 hover:bg-base-300 text-sm"
                    onClick={() =>
                        setExpanded((prev) => ({ ...prev, [folder]: !prev[folder] }))
                    }
                    title={isOpen ? 'Collapse' : 'Expand'}
                    >
                    <span className="truncate">{folder}</span>
                    <span className="opacity-70">{isOpen ? '▾' : '▸'}</span>
                    </button>
                    {isOpen && (
                        <div className="divide-y divide-base-300 bg-base-100">
                        {items.map((item) => (
                            <Row
                            key={item.value}
                            item={item}
                            active={item.value === value}
                            onPick={() => selectValue(item.value)}
                            favored={isFav.has(item.value)}
                            onToggleFav={() => toggleFavorite(item.value)}
                            />
                        ))}
                        </div>
                    )}
                    </div>
                );
            })}

            {/* Empty state */}
            {favList.length === 0 &&
                recentList.length === 0 &&
                folderGroups.length === 0 && (
                    <div className="text-center text-sm text-base-content/60 py-8">
                    No matches.
                    </div>
                )}
                </div>
                </div>
        )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div>
        <div className="px-2 py-1 text-xs uppercase tracking-wide text-base-content/60">
        {title}
        </div>
        <div className="divide-y divide-base-300 rounded-md overflow-hidden border border-base-300">
        {children}
        </div>
        </div>
    );
}

function Row({ item, active, onPick, favored, onToggleFav }) {
    return (
        <button
        type="button"
        className={
            'w-full flex items-center justify-between px-3 py-2 text-left text-sm ' +
            (active ? 'bg-accent/20' : 'bg-base-100 hover:bg-base-200')
        }
        onClick={onPick}
        >
        <div className="min-w-0">
        <div className="truncate">{item.label}</div>
        <div className="text-[10px] opacity-60 truncate">{item.value}</div>
        </div>
        <div className="pl-2 shrink-0">
        <button
        type="button"
        className={
            'px-2 py-1 rounded-full text-[10px] border ' +
            (favored
            ? 'bg-amber-400/90 text-black border-amber-400'
            : 'bg-base-200 text-base-content/80 border-base-300')
        }
        title={favored ? 'Unfavorite' : 'Favorite'}
        onClick={(e) => {
            e.stopPropagation();
            onToggleFav?.();
        }}
        >
        {favored ? '★' : '☆'}
        </button>
        </div>
        </button>
    );
}
