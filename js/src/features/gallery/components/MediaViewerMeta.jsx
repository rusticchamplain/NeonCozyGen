export default function MediaViewerMeta({ metaRows = [] }) {
  if (!metaRows.length) return null;

  return (
    <div className="media-viewer-info" aria-label="Generation metadata">
      {metaRows.map((row) => (
        <div key={row.label} className="media-info-row">
          <span className="media-info-label">{row.label}</span>
          <span className={`media-info-value ${row.isPrompt ? 'is-prompt' : ''}`}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
