import BottomSheet from '../primitives/BottomSheet';
import Button from '../primitives/Button';

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
          <Button
            href={url}
            target="_blank"
            rel="noreferrer"
            variant="muted"
            className="w-full text-center"
          >
            Open
          </Button>
          <Button variant="primary" className="w-full" onClick={onClose}>
            Close
          </Button>
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
