// js/src/components/MediaViewerModal.jsx
import Modal from 'react-modal';

Modal.setAppElement('#root');

const isVideo = (name = '') => /\.(mp4|webm|mov|mkv)$/i.test(name);

const mediaUrl = (item) => {
  if (!item) return '';
  const filename = item.filename || '';
  const subfolder = item.subfolder || '';
  const type = item.type || 'output';
  const v = item.mtime ? `&v=${encodeURIComponent(String(item.mtime))}` : '';
  return `/view?filename=${encodeURIComponent(
    filename
  )}&subfolder=${encodeURIComponent(
    subfolder
  )}&type=${encodeURIComponent(type)}${v}`;
};

export default function MediaViewerModal({
  isOpen,
  media,
  onClose,
  onPrev,
  onNext,
}) {
  if (!media) return null;

  const url = mediaUrl(media);
  const locationLabel = media.subfolder || 'Gallery';
  const isClip = isVideo(media.filename);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="react-modal-overlay"
      className="react-modal-content"
      contentLabel="Preview"
    >
      <div className="media-viewer-panel">
        <header className="media-viewer-head">
          <div className="media-viewer-meta">
            <div className="media-viewer-title" title={media.filename}>
              {media.filename}
            </div>
            <div className="media-viewer-sub">
              <span className="media-chip">{locationLabel}</span>
              <span className={`media-chip ${isClip ? 'is-clip' : 'is-still'}`}>
                {isClip ? 'Video' : 'Image'}
              </span>
            </div>
          </div>
          <div className="media-viewer-actions">
            <button
              type="button"
              className="media-btn ghost"
              onClick={onPrev}
              aria-label="Previous item"
            >
              ←
            </button>
            <button
              type="button"
              className="media-btn ghost"
              onClick={onNext}
              aria-label="Next item"
            >
              →
            </button>
            <a href={url} target="_blank" rel="noreferrer" className="media-btn">
              Open
            </a>
            <button type="button" className="media-btn solid" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <div className="media-viewer-stage">
          <button
            type="button"
            className="media-stage-nav is-left"
            onClick={onPrev}
            aria-label="Previous"
          >
            ←
          </button>
          <div className="media-viewer-frame">
            {isClip ? (
              <video src={url} controls className="media-viewer-media" autoPlay />
            ) : (
              <img src={url} alt={media.filename} className="media-viewer-media" />
            )}
          </div>
          <button
            type="button"
            className="media-stage-nav is-right"
            onClick={onNext}
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>
    </Modal>
  );
}
