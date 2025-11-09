import React from 'react';
import '../styles/mobile-helpers.css'; // keep for hide-scrollbar, etc.

// Small inline SVGs
const IconBack = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M15.5 19a1 1 0 0 1-.7-.3l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 1 1 1.4 1.4L10.9 12l5.3 5.3A1 1 0 0 1 15.5 19z"
    />
  </svg>
);

const IconSearch = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M10 18a8 8 0 1 1 5.3-14.1l4.9 4.9a1 1 0 1 1-1.4 1.4l-4.9-4.9A6 6 0 1 0 10 16a1 1 0 0 1 0 2z"
    />
  </svg>
);

// Neon “collection” icon (replaces yellow folder)
const IconCollection = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...props}>
    <rect
      x="3"
      y="5"
      width="10"
      height="14"
      rx="2.5"
      ry="2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <rect
      x="7"
      y="3"
      width="10"
      height="14"
      rx="2.5"
      ry="2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      opacity="0.8"
    />
    <circle cx="12" cy="11" r="2.3" fill="currentColor" opacity="0.9" />
  </svg>
);

// Segmented control button (synth-wave style)
function SegBtn({ active, children, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        'px-3 py-1.5 text-[11px] rounded-full font-medium tracking-[0.16em] uppercase transition-colors duration-150',
        active
          ? 'bg-[linear-gradient(90deg,#FF60D0,#3EF0FF)] text-[#050716] shadow-[0_0_14px_rgba(62,240,255,0.9)]'
          : 'bg-[#111325] text-[#C3C7FFB3] hover:text-[#FFFFFF] hover:bg-[#191C33]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/**
 * Props:
 * - subfolder: string
 * - crumbs: [{name, path}]
 * - dirChips: [{filename, subfolder}]
 * - kind: 'all' | 'image' | 'video'
 * - showHidden: boolean
 * - query: string
 * - onBack(), onRoot(), onCrumb(path), onSelectDir(subfolder)
 * - onKind(v), onShowHidden(bool), onQuery(v)
 */
export default function GalleryNav({
  subfolder,
  crumbs = [],
  dirChips = [],
  kind = 'all',
  showHidden = false,
  query = '',
  onBack,
  onRoot,
  onCrumb,
  onSelectDir,
  onKind,
  onShowHidden,
  onQuery,
}) {
  const hasPath = Boolean(subfolder);

  return (
    <div className="sticky top-0 z-20 bg-[#050716F2] backdrop-blur-md border-b border-[#3EF0FF33] shadow-[0_10px_30px_rgba(5,7,22,0.95)]">
      {/* neon bottom accent so it doesn't visually merge with cards */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-[2px] bg-[radial-gradient(ellipse_at_center,rgba(62,240,255,0.85)_0,transparent_70%)] opacity-70" />
        <div className="px-3 sm:px-4 pt-3 pb-3 space-y-3 text-[#F8F4FF]">
          {/* Row 1: Collections breadcrumb */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-[#3EF0FF40] bg-[#050716] px-3 py-1.5 text-[11px] tracking-[0.16em] uppercase text-[#C3C7FFCC] hover:bg-[#111325]"
                onClick={onBack}
                disabled={!hasPath}
              >
                <span className="text-[#3EF0FF]">
                  <IconBack />
                </span>
                <span className={hasPath ? '' : 'opacity-40'}>Back</span>
              </button>

              <nav className="flex items-center gap-1 text-[11px] tracking-[0.18em] uppercase text-[#9DA3FFCC]">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-[#111325] hover:bg-[#191C33] text-[#E7EBFF] inline-flex items-center gap-1.5"
                  onClick={onRoot}
                >
                  <span className="text-[#3EF0FF]">
                    <IconCollection />
                  </span>
                  <span>Collections</span>
                </button>
                {crumbs.map((c, idx) => (
                  <React.Fragment key={c.path}>
                    <span className="text-[#3EF0FF99]">/</span>
                    <button
                      type="button"
                      className={[
                        'px-3 py-1 rounded-full hover:bg-[#191C33] inline-flex items-center gap-1.5',
                        idx === crumbs.length - 1
                          ? 'bg-[#1B2544] text-[#F8F4FF]'
                          : 'bg-transparent text-[#C3C7FFCC]',
                      ].join(' ')}
                      onClick={() => onCrumb?.(c.path)}
                      title={c.path}
                    >
                      <span className="text-[#3EF0FFCC]">
                        <IconCollection />
                      </span>
                      <span>{c.name}</span>
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </div>

          {/* Row 2: Search + segmented file-type filter + Hidden toggle */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="flex-1 min-w-[180px] max-w-xl">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8FB8]">
                  <IconSearch />
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => onQuery?.(e.target.value)}
                  placeholder="Search in this collection…"
                  className="w-full text-xs sm:text-sm rounded-full bg-[#050716] border border-[#3D4270] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3EF0FFAA] placeholder:text-[#6E7399]"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 justify-end">
              <div className="inline-flex items-center gap-1 bg-[#050716] rounded-full border border-[#3D4270] px-1 py-1">
                <SegBtn
                  active={kind === 'all'}
                  onClick={() => onKind?.('all')}
                  ariaLabel="All media"
                >
                  All
                </SegBtn>
                <SegBtn
                  active={kind === 'image'}
                  onClick={() => onKind?.('image')}
                  ariaLabel="Images"
                >
                  Stills
                </SegBtn>
                <SegBtn
                  active={kind === 'video'}
                  onClick={() => onKind?.('video')}
                  ariaLabel="Video"
                >
                  Loops
                </SegBtn>
              </div>

              <label className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] text-[#9DA3FFCC] uppercase tracking-[0.16em]">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs border-[#3D4270] [--chkbg:#3EF0FF] [--chkfg:#050716]"
                  checked={showHidden}
                  onChange={(e) => onShowHidden?.(e.target.checked)}
                />
                <span>Hidden</span>
              </label>
            </div>
          </div>

          {/* Row 3: Quick collection chips */}
          {dirChips.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
              {dirChips.map((d) => (
                <button
                  key={`chip:${d.subfolder}`}
                  type="button"
                  className="btn-touch whitespace-nowrap inline-flex items-center gap-1.5 rounded-full border border-[#3D4270] bg-[#050716] px-3 py-1.5 text-[11px] text-[#D4D7FF] hover:border-[#3EF0FFAA] hover:bg-[#101528]"
                  onClick={() => onSelectDir?.(d.subfolder)}
                  title={d.subfolder}
                >
                  <span className="text-[#3EF0FF]">
                    <IconCollection />
                  </span>
                  <span className="truncate max-w-[40vw] sm:max-w-[16rem]">
                    {d.filename}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
