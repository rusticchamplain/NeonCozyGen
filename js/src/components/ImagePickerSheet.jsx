// js/src/components/ImagePickerSheet.jsx
import React, { useEffect } from 'react';
import { inputFileUrl } from '../hooks/useImagePicker';

export default function ImagePickerSheet({
  open,
  cwd,
  setCwd,
  page,
  setPage,
  perPage,
  setPerPage,
  totalPages,
  topDirs,
  loading,
  imagesOnly,
  setImagesOnly,
  search,
  setSearch,
  shownEntries,
  onSelect,
  onClose,

  // NEW: which logical source we’re browsing (inputs vs outputs)
  // expected values: 'inputs' | 'outputs'
  pickerSource,
  setPickerSource,
}) {
  // lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const effectiveSource = pickerSource || 'inputs';
  const hasSourceToggle = typeof setPickerSource === 'function';

  const handleRootClick = () => {
    setCwd('');
    setPage(1);
  };

  const switchSource = (nextSource) => {
    if (!hasSourceToggle) return;
    if (nextSource === effectiveSource) return;
    setPickerSource(nextSource);
    setCwd('');
    setPage(1);
  };

  const parts = cwd.split('/').filter(Boolean);

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div className="relative w-full h-full sm:h-[90vh] sm:max-w-5xl sm:mx-auto sm:mt-8">
        <div className="flex flex-col w-full h-full rounded-none sm:rounded-3xl border border-[#3D4270] bg-[#050716] shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* header */}
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 border-b border-[#3D4270] bg-[#050716F2]">
            <button
              type="button"
              className="text-[11px] sm:text-xs font-medium tracking-[0.16em] uppercase text-[#9CF7FF] hover:text-[#FFFFFF]"
              onClick={onClose}
            >
              Close
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.18em] uppercase text-[#9DA3FFCC]">
                {effectiveSource === 'outputs' ? 'Output Browser' : 'Input Browser'}
              </div>
              <div className="mt-1 text-[10px] text-[#C3C7FF] overflow-x-auto whitespace-nowrap no-scrollbar">
                <button
                  type="button"
                  className="hover:text-[#FFFFFF]"
                  onClick={handleRootClick}
                >
                  /
                </button>
                {parts.map((seg, idx) => {
                  const path = parts.slice(0, idx + 1).join('/');
                  return (
                    <span key={path}>
                      <span className="mx-1 text-[#555A96]">/</span>
                      <button
                        type="button"
                        className="hover:text-[#FFFFFF]"
                        onClick={() => {
                          setCwd(path);
                          setPage(1);
                        }}
                      >
                        {seg}
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3">
              {/* NEW: source toggle */}
              {hasSourceToggle && (
                <div className="inline-flex rounded-full border border-[#3D4270] bg-[#050716] p-[2px] text-[10px]">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full tracking-[0.14em] uppercase ${
                      effectiveSource === 'inputs'
                        ? 'bg-[linear-gradient(90deg,#FF60D0,#3EF0FF)] text-[#050716]'
                        : 'text-[#C3C7FF] hover:text-[#FFFFFF]'
                    }`}
                    onClick={() => switchSource('inputs')}
                  >
                    Inputs
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full tracking-[0.14em] uppercase ${
                      effectiveSource === 'outputs'
                        ? 'bg-[linear-gradient(90deg,#FF60D0,#3EF0FF)] text-[#050716]'
                        : 'text-[#C3C7FF] hover:text-[#FFFFFF]'
                    }`}
                    onClick={() => switchSource('outputs')}
                  >
                    Outputs
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#3EF0FF]"
                    checked={imagesOnly}
                    onChange={(e) => {
                      setImagesOnly(e.target.checked);
                      setPage(1);
                    }}
                  />
                  <span className="text-[10px] sm:text-[11px] text-[#9DA3FFCC]">
                    Images only
                  </span>
                </label>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-28 sm:w-44 rounded-full border border-[#3D4270] bg-[#050716] px-3 py-1.5 text-[11px] text-[#E5E7FF] placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
                />
                <select
                  className="rounded-full border border-[#3D4270] bg-[#050716] px-2.5 py-1.5 text-[11px] text-[#C3C7FF]"
                  value={perPage}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10) || 50;
                    setPerPage(n);
                    setPage(1);
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-full border border-[#3D4270] bg-[#050716] text-[11px] text-[#C3C7FF] hover:bg-[#111325] disabled:opacity-40"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ←
                </button>
                <span className="text-[11px] text-[#9DA3FFCC]">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-full border border-[#3D4270] bg-[#050716] text-[11px] text-[#C3C7FF] hover:bg-[#111325] disabled:opacity-40"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* quick folder chips */}
          {topDirs.length > 0 && (
            <div className="px-3 sm:px-4 py-2 border-b border-[#3D4270] flex gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[0.16em] uppercase ${
                  cwd === ''
                    ? 'bg-[linear-gradient(90deg,#FF60D0,#3EF0FF)] text-[#050716]'
                    : 'border border-[#3D4270] bg-[#050716] text-[#C3C7FF] hover:border-[#3EF0FF80]'
                }`}
                onClick={handleRootClick}
              >
                Root
              </button>
              {topDirs.map((d) => (
                <button
                  key={d.rel_path}
                  type="button"
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[0.16em] uppercase ${
                    cwd === d.rel_path
                      ? 'bg-[linear-gradient(90deg,#FF60D0,#3EF0FF)] text-[#050716]'
                      : 'border border-[#3D4270] bg-[#050716] text-[#C3C7FF] hover:border-[#3EF0FF80]'
                  }`}
                  onClick={() => {
                    setCwd(d.rel_path);
                    setPage(1);
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}

          {/* body */}
          <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4">
            {loading && (
              <div className="py-10 text-center text-[11px] text-[#9DA3FFCC]">
                Scanning {effectiveSource === 'outputs' ? 'output' : 'input'} folders…
              </div>
            )}

            {!loading && shownEntries.length === 0 && (
              <div className="py-10 text-center text-[11px] text-[#9DA3FFCC]">
                Nothing here yet. Try a different folder or turn off “Images only”.
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {!loading &&
                shownEntries.map((it) => (
                  <button
                    key={it.rel_path}
                    type="button"
                    className="text-left rounded-xl border border-[#3D4270] bg-[#050716] px-2.5 py-2 transition hover:border-[#3EF0FF80]"
                    onClick={() => {
                      if (it.is_dir) {
                        setCwd(it.rel_path);
                        setPage(1);
                      } else {
                        onSelect(it.rel_path);
                      }
                    }}
                  >
                    {it.is_dir ? (
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-[radial-gradient(circle_at_0%_0%,#3EF0FF,transparent_55%),radial-gradient(circle_at_100%_100%,#FF60D0,transparent_55%)] opacity-90" />
                        <div className="text-[11px] text-[#E5E7FF] truncate">
                          {it.name}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="aspect-square w-full rounded-lg overflow-hidden mb-2 bg-[#111325] flex items-center justify-center">
                          <img
                            className="w-full h-full object-cover"
                            alt={it.name}
                            src={inputFileUrl(it.rel_path)}
                          />
                        </div>
                        <div className="text-[10px] text-[#C3C7FF] truncate">
                          {it.name}
                        </div>
                      </>
                    )}
                  </button>
                ))}
            </div>
          </div>

          {/* mobile paging footer */}
          <div className="sm:hidden border-t border-[#3D4270] px-3 py-2 flex items-center justify-between text-[10px] text-[#9DA3FFCC]">
            <span>
              Page {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded-full border border-[#3D4270] bg-[#050716] hover:bg-[#111325] disabled:opacity-40"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ←
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded-full border border-[#3D4270] bg-[#050716] hover:bg-[#111325] disabled:opacity-40"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
