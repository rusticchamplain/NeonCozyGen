// js/src/hooks/useImagePicker.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { uploadImage, getGallery } from '../api';

/* ---------- constants ---------- */

const DEFAULT_EXTS = 'jpg,jpeg,png,webp,gif,bmp,tif,tiff';

const isImage = (name = '') =>
  /\.(png|jpe?g|gif|webp|bmp|tif?f)$/i.test(name);
const isVideo = (name = '') => /\.(mp4|webm|mov|mkv)$/i.test(name);

/* ---------- /cozygen/input client ---------- */

async function getInputItems({
  subfolder = '',
  page = 1,
  perPage = 50,
  exts = DEFAULT_EXTS, // '' -> show all files
} = {}) {
  const params = new URLSearchParams({
    subfolder,
    page: String(page),
    per_page: String(perPage),
    exts,
  });
  const res = await fetch(`/cozygen/input?${params.toString()}`);
  if (!res.ok) throw new Error(`Input list failed: ${res.status}`);
  return res.json();
}

/* ---------- URL helper (unchanged) ---------- */

export const inputFileUrl = (relPath) =>
  `/cozygen/input/file?path=${encodeURIComponent(relPath)}`;

/* ---------- localStorage helpers ---------- */

const ls = {
  get(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // ignore
    }
  },
};

/* ---------- hook ---------- */

export function useImagePicker({ input, value, onFormChange }) {
  const param = input?.inputs?.param_name || 'Image Input';
  const classType = input?.class_type || 'CozyGenImageInput';

  const LS_LAST_CWD = `cg_last_input_cwd::${param}`;
  const LS_LAST_SOURCE = `cg_last_picker_source::${param}`;

  const [previewUrl, setPreviewUrl] = useState('');
  const [imgReady, setImgReady] = useState(false);

  const [serverOpen, setServerOpen] = useState(false);
  const [cwd, setCwd] = useState(ls.get(LS_LAST_CWD, ''));
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [entries, setEntries] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [topDirs, setTopDirs] = useState([]);
  const [imagesOnly, setImagesOnly] = useState(true);

  // NEW: source toggle (inputs vs outputs)
  const [pickerSourceState, setPickerSourceState] = useState(() => {
    const saved = ls.get(LS_LAST_SOURCE, 'inputs');
    return saved === 'outputs' ? 'outputs' : 'inputs';
  });

  const pickerSource = pickerSourceState;

  const setPickerSource = useCallback((source) => {
    const next = source === 'outputs' ? 'outputs' : 'inputs';
    setPickerSourceState(next);
    ls.set(LS_LAST_SOURCE, next);
    // reset navigation when switching sources
    setCwd('');
    setPage(1);
  }, []);

  const displayName = useMemo(() => {
    if (previewUrl) {
      try {
        const u = new URL(previewUrl, window.location.origin);
        const path =
          u.searchParams.get('path') ||
          u.searchParams.get('filename') ||
          u.pathname.split('/').pop() ||
          '';
        return path.split('/').pop() || 'No file selected.';
      } catch {
        // ignore and fall through to value
      }
    }

    if (!value) return 'No file selected.';
    if (typeof value === 'string') return value.split('/').pop();
    if (value?.path) return value.path.split('/').pop();
    return 'No file selected.';
  }, [previewUrl, value]);

  // keep preview in sync with form value
  useEffect(() => {
    if (typeof value === 'string' && value) {
      setPreviewUrl(inputFileUrl(value));
      setImgReady(false);
    } else if (value?.url) {
      setPreviewUrl(value.url);
      setImgReady(false);
    } else {
      setPreviewUrl('');
      setImgReady(false);
    }
  }, [value]);

  const handleUpload = useCallback(
    async (file) => {
      const resp = await uploadImage(file);
      // existing input behaviour: use /view with type=input
      const url = `/view?filename=${resp.filename}&type=input`;
      setPreviewUrl(url);
      setImgReady(false);
      ls.set(LS_LAST_CWD, '');

      if (classType === 'CozyGenImageInput') {
        onFormChange(param, resp.filename);
      } else {
        onFormChange(param, { source: 'Upload', path: resp.filename, url });
      }
    },
    [classType, onFormChange, param]
  );

  const clearImage = useCallback(() => {
    setPreviewUrl('');
    setImgReady(false);

    if (classType === 'CozyGenImageInput') {
      onFormChange(param, '');
    } else {
      onFormChange(param, { source: 'Upload', path: '', url: '' });
    }
  }, [classType, onFormChange, param]);

  const openServer = useCallback(() => {
    // try to open near the currently selected value
    const parent = (
      typeof value === 'string' ? value : value?.path || ''
    )
      .split('/')
      .slice(0, -1)
      .join('/');
    const start = parent || ls.get(LS_LAST_CWD, '');
    setCwd(start);
    setPage(1);
    setServerOpen(true);

    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [value]);

  const closeServer = useCallback(() => {
    setServerOpen(false);
  }, []);

  // quick chips for top-level dirs (inputs only)
  useEffect(() => {
    if (!serverOpen) return;
    if (pickerSource !== 'inputs') {
      setTopDirs([]);
      return;
    }

    (async () => {
      try {
        const root = await getInputItems({
          subfolder: '',
          page: 1,
          perPage: 0,
          exts: '',
        });
        setTopDirs((root.items || []).filter((i) => i.is_dir));
      } catch {
        // ignore
      }
    })();
  }, [serverOpen, pickerSource]);

  // directory / listing loader
  useEffect(() => {
    if (!serverOpen) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (pickerSource === 'outputs') {
          // Outputs: reuse the same gallery endpoint as the Gallery page
          const data = await getGallery(cwd, page, perPage);
          if (cancelled) return;

          const items = (data && data.items) || [];
          const mapped = items.map((item) => {
            const filename = item.filename || '';
            const subfolder = item.subfolder || '';
            const isDir = item.type === 'directory';

            const relPath = isDir
              ? subfolder || filename
              : [subfolder, filename].filter(Boolean).join('/');

            const name = filename || subfolder || relPath || 'Untitled';

            return {
              ...item,
              name,
              rel_path: relPath,
              is_dir: isDir,
              is_image: !isDir && isImage(filename),
              is_video: !isDir && isVideo(filename),
              source: 'output',
            };
          });

          if (!cancelled) {
            setEntries(mapped);
            setTotalPages((data && data.total_pages) || 1);
          }
        } else {
          // Inputs: preserve existing behaviour
          const exts = imagesOnly ? DEFAULT_EXTS : '';
          const resp = await getInputItems({
            subfolder: cwd,
            page,
            perPage,
            exts,
          });

          const hasFile = (resp.items || []).some((it) => !it.is_dir);

          // if imagesOnly and nothing found, automatically broaden
          if (imagesOnly && !hasFile) {
            const broad = await getInputItems({
              subfolder: cwd,
              page,
              perPage,
              exts: '',
            });
            if (!cancelled) {
              setEntries(broad.items || []);
              setTotalPages(broad.total_pages || 1);
              setImagesOnly(false);
            }
            return;
          }

          if (!cancelled) {
            setEntries(resp.items || []);
            setTotalPages(resp.total_pages || 1);
          }
        }
      } catch (err) {
        console.error(
          pickerSource === 'outputs'
            ? 'Failed to load output directory'
            : 'Failed to load input directory',
          err
        );
        if (!cancelled) {
          setEntries([]);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [serverOpen, cwd, page, perPage, imagesOnly, pickerSource]);

  // filtered view for the sheet
  const shownEntries = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = entries;

    if (imagesOnly) {
      list = list.filter((it) => {
        if (it.is_dir) return true;
        const name =
          it.name || it.filename || it.rel_path || '';
        return isImage(String(name));
      });
    }

    if (!q) return list;

    return list.filter((it) => {
      const name =
        (it.name || it.filename || it.rel_path || '').toLowerCase();
      return name.includes(q);
    });
  }, [entries, search, imagesOnly]);

  const selectServer = useCallback(
    (relPath) => {
      const url = inputFileUrl(relPath);
      setPreviewUrl(url);
      setImgReady(false);
      ls.set(
        LS_LAST_CWD,
        relPath.split('/').slice(0, -1).join('/')
      );

      if (classType === 'CozyGenImageInput') {
        onFormChange(param, relPath);
      } else {
        onFormChange(param, { source: 'Server', path: relPath, url });
      }

      setServerOpen(false);
    },
    [classType, onFormChange, param]
  );

  return {
    param,
    previewUrl,
    imgReady,
    setImgReady,
    displayName,

    serverOpen,
    openServer,
    closeServer,

    cwd,
    setCwd,
    page,
    setPage,
    perPage,
    setPerPage,
    totalPages,
    loading,
    search,
    setSearch,
    topDirs,
    imagesOnly,
    setImagesOnly,
    shownEntries,

    // NEW: source toggle for the unified picker pane
    pickerSource,
    setPickerSource,

    handleUpload,
    clearImage,
    selectServer,
  };
}
