// js/src/components/lora/LoraTarotCard.jsx

export default function LoraTarotCard({
  sectionTitle,
  name,
  description,
  preview,
  keywords = [],
  promptExamples = [],
  sourceUrl,
  sourceLabel = 'Visit source',
  tags = [],
  recommendedWeight,
  modelName,
  status = 'configured',
  files,
  pairState,
  folder,
  onEdit,
}) {
  const hasPreview = preview && preview.src;
  const previewAlt = preview?.alt || `${name} preview`;
  const hasKeywords = Array.isArray(keywords) && keywords.length > 0;
  const hasPrompts = Array.isArray(promptExamples) && promptExamples.length > 0;
  const otherFiles = Array.isArray(files?.others) ? files.others : [];
  const hasFileInfo =
    files?.high || files?.low || files?.single || otherFiles.length > 0;

  const statusLabel = (() => {
    if (status === 'detected') return 'Needs details';
    if (status === 'missing') return 'Missing files';
    return 'Published';
  })();

  return (
    <article className="lora-card">
      <div className="lora-card-media">
        {hasPreview ? (
          <img src={preview.src} alt={previewAlt} loading="lazy" />
        ) : (
          <div className="lora-card-media-placeholder">
            {name?.slice(0, 2) || 'LL'}
          </div>
        )}
        <div className="lora-card-media-badges">
          {sectionTitle && (
            <span className="lora-card-chip is-section">{sectionTitle}</span>
          )}
          {recommendedWeight && (
            <span className="lora-card-chip">{`Weight ${recommendedWeight}`}</span>
          )}
          <span className={`lora-card-chip is-status-${status}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="lora-card-body">
        <div className="lora-card-head">
          <div>
            <span className="ui-kicker">LoRA</span>
            <h3 className="lora-card-title">{name}</h3>
            {modelName && (
              <p className="lora-card-model">{modelName}</p>
            )}
            {folder && (
              <p className="lora-card-folder">Folder: {folder}</p>
            )}
            {pairState && (
              <p className="lora-card-folder">Pair: {pairState}</p>
            )}
          </div>
          {tags.length > 0 && (
            <div className="lora-card-tagcol">
              {tags.map((tag) => (
                <span key={tag} className="lora-card-chip is-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {description && (
          <p className="lora-card-description">{description}</p>
        )}

        {hasKeywords && (
          <section className="lora-card-section">
            <header>
              <span className="ui-kicker">Keywords</span>
            </header>
            <div className="lora-card-chiprow">
              {keywords.map((keyword) => (
                <span key={keyword} className="lora-card-chip is-soft">
                  {keyword}
                </span>
              ))}
            </div>
          </section>
        )}

        {hasPrompts && (
          <section className="lora-card-section">
            <header>
              <span className="ui-kicker">Prompt examples</span>
            </header>
            <div className="lora-card-prompts">
              {promptExamples.map((prompt, idx) => (
                <article key={prompt.title || idx} className="lora-card-prompt">
                  {prompt.title && (
                    <h4 className="lora-card-prompt-title">{prompt.title}</h4>
                  )}
                  {prompt.text && (
                    <p className="lora-card-prompt-text">{prompt.text}</p>
                  )}
                  {prompt.weightTip && (
                    <p className="lora-card-prompt-note">{prompt.weightTip}</p>
                  )}
                  {prompt.negative && (
                    <p className="lora-card-prompt-note is-negative">
                      Negative: {prompt.negative}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {hasFileInfo && (
          <section className="lora-card-section">
            <header>
              <span className="ui-kicker">Detected files</span>
            </header>
            <ul className="lora-card-files">
              {files?.high && (
                <li>
                  <strong>High:</strong> {files.high}
                </li>
              )}
              {files?.low && (
                <li>
                  <strong>Low:</strong> {files.low}
                </li>
              )}
              {otherFiles.map((file) => (
                <li key={file}>{file}</li>
              ))}
              {!files?.high && !files?.low && otherFiles.length === 0 && (
                <li>No files detected yet.</li>
              )}
            </ul>
          </section>
        )}

        {sourceUrl && (
          <section className="lora-card-section">
            <header>
              <span className="ui-kicker">Original website</span>
            </header>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="lora-card-link"
            >
              {sourceLabel}
            </a>
          </section>
        )}

        {typeof onEdit === 'function' && (
          <div className="lora-card-actions">
            <button
              type="button"
              className="ui-button is-muted is-compact"
              onClick={() => onEdit()}
            >
              {status === 'detected' ? 'Add details' : 'Edit card'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
