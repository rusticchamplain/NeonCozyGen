// js/src/hooks/useGallery.js
import { useEffect, useMemo, useState, useCallback } from 'react';
import { getGallery } from '../api';

const isHidden = (name = '') => name.startsWith('.');
const isImage = (name = '') =>
  /\.(png|jpe?g|gif|webp|bmp|tif?f)$/i.test(name);
const isVideo = (name = '') => /\.(mp4|webm|mov|mkv)$/i.test(name);

export function useGallery() {
  const [path, setPath] = useState(localStorage.getItem('galleryPath') || '');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPageState] = useState(
    parseInt(localStorage.getItem('galleryPageSize') || '30', 10) || 30
  );

  const [kind, setKindState] = useState('all'); // all | image | video
  const [showHidden, setShowHidden] = useState(false);
  const [query, setQueryState] = useState('');

  // fetch gallery data when path/page/perPage changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getGallery(path, page, perPage);
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
    localStorage.setItem('galleryPath', path);
    localStorage.setItem('galleryPageSize', String(perPage));

    return () => {
      cancelled = true;
    };
  }, [path, page, perPage]);

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

  const setQuery = useCallback((value) => {
    setQueryState(value);
    setPage(1);
  }, []);

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
    goBack,
    goRoot,
    goToPath,
    selectDir,
  };
}

