import { IconChevronLeft, IconChevronRight } from '../../../ui/primitives/Icons';

export default function MediaViewerStage({
  showNav,
  canPrev,
  canNext,
  onPrev,
  onNext,
  isClip,
  url,
  filename,
}) {
  return (
    <div className="media-viewer-stage">
      {showNav ? (
        <button
          type="button"
          className={`media-stage-nav is-left ${canPrev ? '' : 'is-disabled'}`}
          onClick={onPrev}
          aria-label="Previous"
          disabled={!canPrev}
        >
          <IconChevronLeft size={18} />
        </button>
      ) : null}
      <div className="media-viewer-frame">
        {isClip ? (
          <video
            src={url}
            controls
            className="media-viewer-media"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img
            src={url}
            alt={filename}
            className="media-viewer-media"
            decoding="async"
          />
        )}
      </div>
      {showNav ? (
        <button
          type="button"
          className={`media-stage-nav is-right ${canNext ? '' : 'is-disabled'}`}
          onClick={onNext}
          aria-label="Next"
          disabled={!canNext}
        >
          <IconChevronRight size={18} />
        </button>
      ) : null}
    </div>
  );
}
