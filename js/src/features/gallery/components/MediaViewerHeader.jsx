import Button from '../../../ui/primitives/Button';
import { IconX } from '../../../ui/primitives/Icons';

export default function MediaViewerHeader({
  filename,
  locationLabel,
  isClip,
  url,
  canRerun,
  rerunBusy,
  canDelete,
  deleteBusy,
  metaRows,
  metaOpen,
  onToggleMeta,
  onOpenOptions,
  onDelete,
  onClose,
  closeButtonRef,
}) {
  return (
    <header className="media-viewer-head">
      <div className="media-viewer-head-bar bottom-sheet-head">
        <div className="media-viewer-meta">
          <div className="media-viewer-title" title={filename}>
            {filename}
          </div>
          <div className="media-viewer-sub">
            <span className="media-chip">{locationLabel}</span>
            <span className={`media-chip ${isClip ? 'is-clip' : 'is-still'}`}>
              {isClip ? 'Video' : 'Image'}
            </span>
          </div>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          className="bottom-sheet-close media-viewer-close"
          onClick={onClose}
          aria-label="Close"
        >
          <IconX size={16} />
        </button>
      </div>
      <div className="media-viewer-actions">
        {canRerun ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenOptions}
            disabled={rerunBusy}
            aria-label="Re-run generation"
          >
            {rerunBusy ? 'Re-running…' : 'Re-run'}
          </Button>
        ) : null}
        {metaRows.length ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMeta}
            aria-expanded={metaOpen}
            aria-label={metaOpen ? 'Hide metadata' : 'Show metadata'}
          >
            {metaOpen ? 'Hide metadata' : 'Metadata'}
          </Button>
        ) : null}
        <Button
          as="a"
          href={url}
          target="_blank"
          rel="noreferrer"
          variant="ghost"
          size="sm"
        >
          Open
        </Button>
        {canDelete ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            disabled={deleteBusy}
          >
            {deleteBusy ? 'Deleting…' : 'Delete'}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
