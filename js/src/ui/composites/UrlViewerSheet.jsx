import BottomSheet from '../primitives/BottomSheet';

export default function UrlViewerSheet({
  open,
  onClose,
  title,
  url,
  kind = 'image',
}) {
  if (!url) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title || 'Preview'}
      variant="fullscreen"
      footer={(
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="ui-button is-muted w-full text-center">
            Open
          </a>
          <button type="button" className="ui-button is-primary w-full" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    >
      <div className="url-viewer-stage">
        {kind === 'video' ? (
          <video src={url} controls className="url-viewer-media" autoPlay />
        ) : (
          <img src={url} alt={title || 'Preview'} className="url-viewer-media" />
        )}
      </div>
    </BottomSheet>
  );
}
