import { Fragment } from 'react';
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

/**
 * Props:
 * - subfolder: string
 * - crumbs: [{name, path}]
 * - dirChips: [{filename, subfolder}]
 * - onBack(), onRoot(), onCrumb(path), onSelectDir(subfolder)
 */
export default function GalleryNav({
  subfolder,
  crumbs = [],
  dirChips = [],
  onBack,
  onRoot,
  onCrumb,
  onSelectDir,
}) {
  return (
    <div className="space-y-3 text-[#F8F4FF]">
      <div className="flex items-center justify-start gap-2 flex-wrap" />

      <div
        className="flex items-center gap-2 flex-wrap text-[#C3C7FF]"
        role="navigation"
        aria-label="Gallery path"
      >
        {crumbs.map((crumb, idx) => (
          <Fragment key={crumb.path || crumb.name || idx}>
            <span className="text-[#6A6FA8]">/</span>
            <button
              type="button"
              className="gallery-chip-btn"
              onClick={() => onCrumb?.(crumb.path)}
              aria-current={idx === crumbs.length - 1 ? 'page' : undefined}
            >
              {crumb.name}
            </button>
          </Fragment>
        ))}
      </div>

      {dirChips.length > 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          {dirChips.map((dir) => (
            <button
              key={dir.subfolder || dir.filename}
              type="button"
              className="gallery-chip-btn"
              onClick={() => onSelectDir?.(dir.subfolder)}
            >
              {dir.filename || dir.subfolder || 'Collection'}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
