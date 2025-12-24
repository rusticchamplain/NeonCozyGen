import Button from '../../../ui/primitives/Button';
import { IconTrash, IconX } from '../../../ui/primitives/Icons';

export default function MediaViewerHeader({
  filename,
  locationLabel,
  isClip,
  url,
  canRerun,
  rerunOpen,
  canDelete,
  deleteBusy,
  metaRows,
  metaOpen,
  onToggleMeta,
  onToggleRerun,
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
        {metaRows.length ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMeta}
            aria-expanded={metaOpen}
          >
            Metadata
          </Button>
        ) : null}
        {canRerun ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRerun}
            aria-expanded={rerunOpen}
            aria-label="Tweak generation"
          >
            Tweak
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="media-viewer-action-icon media-viewer-action-delete"
            onClick={onDelete}
            disabled={deleteBusy}
            aria-label="Delete item"
            title="Delete item"
          >
            {deleteBusy ? <span className="loading-spinner" aria-hidden="true" /> : <IconTrash size={16} />}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
