// js/src/hooks/useGallery.js
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getGallery } from '../api';

const isHidden = (name = '') => name.startsWith('.');
const isImage = (name = '') =>
  /\.(png|jpe?g|gif|webp|bmp|tif?f)$/i.test(name);
const isVideo = (name = '') => /\.(mp4|webm|mov|mkv)$/i.test(name);

export function useGallery() {
  const safeGet = (key, fallback = '') => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) || fallback : fallback;
    } catch {
      return fallback;
    }
  };

  const safeSet = (key, value) => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  };

  const [path, setPath] = useState(safeGet('galleryPath', ''));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPageState] = useState(() => {
    const raw = safeGet('galleryPageSize', '30');
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 30;
  });

  const [kind, setKindState] = useState('all'); // all | image | video
  const [showHidden, setShowHidden] = useState(false);
  const [query, setQueryState] = useState('');
  const [recursive, setRecursive] = useState(() => {
    const raw = safeGet('galleryRecursive', '0');
    return raw === '1';
  });

  const [reloadKey, setReloadKey] = useState(0);

  // fetch gallery data when path/page/perPage changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getGallery(
          path,
          page,
          perPage,
          showHidden,
          recursive,
          kind,
          reloadKey
        );
        if (cancelled) return;
        if (data && data.items) {
          setItems(data.items);
          setTotalPages(data.total_pages || 1);
        } else {
          setItems([]);
          setTotalPages(1);
        }
      } catch (err) {
        console.error('Failed to load gallery', err);
        if (!cancelled) {
          setItems([]);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    safeSet('galleryPath', path);
    safeSet('galleryPageSize', String(perPage));

    return () => {
      cancelled = true;
    };
  }, [path, page, perPage, reloadKey, showHidden, recursive, kind]);

  // breadcrumbs from current path
  const crumbs = useMemo(() => {
    if (!path) return [];
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    const res = [];
    for (let i = 0; i < parts.length; i++) {
      res.push({
        name: parts[i],
        path: parts.slice(0, i + 1).join('/'),
      });
    }
    return res;
  }, [path]);

  // directories for quick collection chips
  const dirChips = useMemo(
    () =>
      items
        .filter((i) => i.type === 'directory')
        .map((d) => ({
          filename: d.filename,
          subfolder: d.subfolder,
        })),
    [items]
  );

  // filter items by type / hidden / search
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();

    return items.filter((item) => {
      const name = (item.filename || '').toLowerCase();

      if (!showHidden && isHidden(name)) return false;

      if (item.type !== 'directory') {
        if (kind === 'image' && !isImage(name)) return false;
        if (kind === 'video' && !isVideo(name)) return false;
      }

      if (q && !name.includes(q)) return false;

      return true;
    });
  }, [items, showHidden, kind, query]);

  const mediaItems = useMemo(
    () => filtered.filter((i) => i.type !== 'directory'),
    [filtered]
  );

  // navigation helpers
  const goBack = useCallback(() => {
    if (!path) return;
    const idx = path.replace(/\\/g, '/').lastIndexOf('/');
    const parent = idx === -1 ? '' : path.slice(0, idx);
    setPath(parent);
    setPage(1);
  }, [path]);

  const goRoot = useCallback(() => {
    setPath('');
    setPage(1);
  }, []);

  const goToPath = useCallback((p) => {
    setPath(p || '');
    setPage(1);
  }, []);

  const selectDir = useCallback((subfolder) => {
    setPath(subfolder);
    setPage(1);
  }, []);

  const setPerPage = useCallback((value) => {
    const n = parseInt(String(value), 10) || 30;
    setPerPageState(n);
    setPage(1);
  }, []);

  const setKind = useCallback((value) => {
    setKindState(value);
    setPage(1);
  }, []);

  const setRecursiveFlag = useCallback((value) => {
    const v = !!value;
    setRecursive(v);
    setPage(1);
    safeSet('galleryRecursive', v ? '1' : '0');
  }, []);

  const setQuery = useCallback((value) => {
    setQueryState(value);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  // Refresh when a generation finishes (event emitted by useExecutionQueue).
  useEffect(() => {
    const handler = () => refresh();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('cozygen:queue-finished', handler);
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('cozygen:queue-finished', handler);
      }
    };
  }, [refresh]);

  // Auto-refresh when new outputs land: prefer SSE, fall back to polling.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let stopped = false;
    let es;
    let pollTimer;

    const stopTimers = () => {
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const schedulePoll = (delay = 8000) => {
      stopTimers();
      pollTimer = window.setTimeout(() => {
        if (stopped) return;
        refresh();
        schedulePoll(8000);
      }, delay);
    };

    const openSSE = () => {
      if (!('EventSource' in window)) {
        schedulePoll();
        return;
      }
      const qs = new URLSearchParams({
        subfolder: path || '',
        recursive: recursive ? '1' : '0',
        show_hidden: showHidden ? '1' : '0',
      });
      es = new EventSource(`/cozygen/api/gallery/stream?${qs.toString()}`);
      es.onmessage = () => {
        if (stopped) return;
        refresh();
      };
      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
        schedulePoll();
      };
    };

    openSSE();

    return () => {
      stopped = true;
      stopTimers();
      if (es) {
        es.close();
        es = null;
      }
    };
  }, [path, recursive, showHidden, refresh]);

  return {
    // raw state
    path,
    items,
    loading,
    page,
    totalPages,
    perPage,
    kind,
    showHidden,
    query,
    recursive,

    // derived
    crumbs,
    dirChips,
    filtered,
    mediaItems,

    // setters / actions
    setPage,
    setPerPage,
    setShowHidden,
    setQuery,
    setKind,
    setRecursive: setRecursiveFlag,
    goBack,
    goRoot,
    goToPath,
    selectDir,
    refresh,
  };
}
