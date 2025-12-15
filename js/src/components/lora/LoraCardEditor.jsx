import { useState } from 'react';
import ImagePickerSheet from '../ImagePickerSheet';
import { useImagePicker } from '../../hooks/useImagePicker';

const emptyExample = () => ({
  title: '',
  text: '',
  negative: '',
  weightTip: '',
});

function splitList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function PromptExamplesEditor({ examples, onChange }) {
  const safeExamples = examples.length ? examples : [emptyExample()];

  const updateExample = (index, field, value) => {
    const next = safeExamples.map((example, idx) =>
      idx === index ? { ...example, [field]: value } : example
    );
    onChange(next);
  };

  const removeExample = (index) => {
    const next = safeExamples.filter((_, idx) => idx !== index);
    onChange(next.length ? next : [emptyExample()]);
  };

  const addExample = () => {
    onChange([...safeExamples, emptyExample()]);
  };

  return (
    <div className="lora-editor-prompts">
      {safeExamples.map((example, index) => (
        <div key={`example-${index}`} className="lora-editor-prompt-card">
          <div className="lora-editor-field">
            <label htmlFor={`prompt-title-${index}`}>Title</label>
            <input
              id={`prompt-title-${index}`}
              type="text"
              value={example.title}
              onChange={(event) =>
                updateExample(index, 'title', event.target.value)
              }
            />
          </div>
          <div className="lora-editor-field">
            <label htmlFor={`prompt-text-${index}`}>Prompt text</label>
            <textarea
              id={`prompt-text-${index}`}
              value={example.text}
              rows={3}
              onChange={(event) =>
                updateExample(index, 'text', event.target.value)
              }
            />
          </div>
          <div className="lora-editor-field two-col">
            <div>
              <label htmlFor={`prompt-weight-${index}`}>Weight tip</label>
              <input
                id={`prompt-weight-${index}`}
                type="text"
                value={example.weightTip}
                onChange={(event) =>
                  updateExample(index, 'weightTip', event.target.value)
                }
              />
            </div>
            <div>
              <label htmlFor={`prompt-negative-${index}`}>Negative hint</label>
              <input
                id={`prompt-negative-${index}`}
                type="text"
                value={example.negative}
                onChange={(event) =>
                  updateExample(index, 'negative', event.target.value)
                }
              />
            </div>
          </div>
          <button
            type="button"
            className="lora-editor-remove"
            onClick={() => removeExample(index)}
            disabled={safeExamples.length === 1}
          >
            Remove example
          </button>
        </div>
      ))}
      <button type="button" className="ui-button is-muted" onClick={addExample}>
        Add prompt example
      </button>
    </div>
  );
}

export default function LoraCardEditor({
  card,
  onCancel,
  onSave,
  onDelete,
  saving = false,
}) {
  const [name, setName] = useState(card?.name || card?.baseName || '');
  const [modelName, setModelName] = useState(card?.modelName || '');
  const [category, setCategory] = useState(card?.category || '');
  const [description, setDescription] = useState(card?.description || '');
  const [recommendedWeight, setRecommendedWeight] = useState(
    card?.recommendedWeight || ''
  );
  const [tagsInput, setTagsInput] = useState((card?.tags || []).join(', '));
  const [keywordsInput, setKeywordsInput] = useState(
    (card?.keywords || []).join(', ')
  );
  const [sourceLabel, setSourceLabel] = useState(card?.sourceLabel || '');
  const [sourceUrl, setSourceUrl] = useState(card?.sourceUrl || '');
  const [previewSrc, setPreviewSrc] = useState(card?.preview?.src || '');
  const [previewAlt, setPreviewAlt] = useState(card?.preview?.alt || '');
  const [notes, setNotes] = useState(card?.notes || '');
  const [examples, setExamples] = useState(
    card?.promptExamples?.length ? card.promptExamples : [emptyExample()]
  );
  const [galleryValue, setGalleryValue] = useState(
    card?.preview?.src ? { url: card.preview.src } : ''
  );

  const files = card?.files || {};
  const otherFiles = Array.isArray(files?.others) ? files.others : [];

  const handleGalleryChange = (_param, selection) => {
    if (!selection) return;
    setGalleryValue(selection);
    if (typeof selection === 'string') {
      setPreviewSrc(selection);
      return;
    }
    if (selection.url) {
      setPreviewSrc(selection.url);
    }
    if (selection.alt) {
      setPreviewAlt(selection.alt);
    }
  };

  const galleryPicker = useImagePicker({
    input: {
      inputs: { param_name: 'lora_preview' },
      class_type: 'LoraPreview',
    },
    value: galleryValue,
    onFormChange: handleGalleryChange,
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (typeof onSave !== 'function') return;
    const filteredExamples = examples.filter((example) =>
      Object.values(example || {}).some((value) => (value || '').trim())
    );

    const payload = {
      name,
      modelName,
      category,
      description,
      recommendedWeight,
      tags: splitList(tagsInput),
      keywords: splitList(keywordsInput),
      sourceLabel,
      sourceUrl,
      notes,
      preview: {
        src: previewSrc,
        alt: previewAlt,
      },
      promptExamples: filteredExamples,
    };
    onSave(payload);
  };

  return (
    <form className="ui-panel lora-editor" onSubmit={handleSubmit}>
      <header className="lora-editor-head">
        <div>
          <span className="ui-kicker">Editing</span>
          <h2>{card?.name || card?.baseName || card?.id}</h2>
          <p className="text-sm text-slate-200/80">
            Fill in keywords, prompt examples, and source links. Changes are
            stored in <code>data/lora_library.json</code>.
          </p>
        </div>
        <div className="lora-editor-actions">
          {typeof onDelete === 'function' && card?.status !== 'detected' && (
            <button
              type="button"
              className="ui-button is-ghost"
              disabled={saving}
              onClick={() => onDelete()}
            >
              Reset card
            </button>
          )}
          <button
            type="button"
            className="ui-button is-muted"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="ui-button is-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save card'}
          </button>
        </div>
      </header>

      <div className="lora-editor-grid">
        <div className="lora-editor-section">
          <div className="lora-editor-field">
            <label htmlFor="lora-name">Display name</label>
            <input
              id="lora-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="lora-editor-field">
            <label htmlFor="lora-model">Model name</label>
            <input
              id="lora-model"
              type="text"
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
            />
          </div>
          <div className="lora-editor-field">
            <label htmlFor="lora-category">Category</label>
            <input
              id="lora-category"
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. Stylized, Motion, Utility"
            />
          </div>
          <div className="lora-editor-field">
            <label htmlFor="lora-description">Description</label>
            <textarea
              id="lora-description"
              value={description}
              rows={4}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="lora-editor-field">
            <label htmlFor="lora-weight">Recommended weight</label>
            <input
              id="lora-weight"
              type="text"
              value={recommendedWeight}
              onChange={(event) => setRecommendedWeight(event.target.value)}
              placeholder="0.65 - 0.85"
            />
          </div>
        </div>

        <div className="lora-editor-section">
          <div className="lora-editor-field">
            <label htmlFor="lora-tags">Tags (comma separated)</label>
            <input
              id="lora-tags"
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
            />
          </div>
          <div className="lora-editor-field">
            <label htmlFor="lora-keywords">Keywords (comma separated)</label>
            <input
              id="lora-keywords"
              type="text"
              value={keywordsInput}
              onChange={(event) => setKeywordsInput(event.target.value)}
            />
          </div>
          <div className="lora-editor-field two-col">
            <div>
              <label htmlFor="lora-source-label">Source label</label>
              <input
                id="lora-source-label"
                type="text"
                value={sourceLabel}
                onChange={(event) => setSourceLabel(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lora-source-url">Source URL</label>
              <input
                id="lora-source-url"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />
            </div>
          </div>
          <div className="lora-editor-field two-col">
            <div>
              <label htmlFor="lora-preview-src">Preview image URL</label>
              <input
                id="lora-preview-src"
                type="text"
                value={previewSrc}
                onChange={(event) => {
                  const next = event.target.value;
                  setPreviewSrc(next);
                  setGalleryValue(next ? { url: next } : '');
                }}
              />
            </div>
            <div>
              <label htmlFor="lora-preview-alt">Preview alt text</label>
              <input
                id="lora-preview-alt"
                type="text"
                value={previewAlt}
                onChange={(event) => setPreviewAlt(event.target.value)}
              />
            </div>
          </div>
          <div className="lora-editor-field">
            <label htmlFor="lora-notes">Notes (internal)</label>
            <textarea
              id="lora-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="lora-editor-field">
            <label>Example from gallery</label>
            <button
              type="button"
              className="ui-button is-muted"
              onClick={galleryPicker.openServer}
            >
              Choose from gallery
            </button>
            {galleryPicker.previewUrl && (
              <div className="mt-2 text-[11px] text-[#C3C7FF]">
                Using: {galleryPicker.displayName}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="lora-editor-section">
        <header>
          <span className="ui-kicker">Prompt examples</span>
        </header>
        <PromptExamplesEditor examples={examples} onChange={setExamples} />
      </section>

      <section className="lora-editor-files">
        <header>
          <span className="ui-kicker">Detected files</span>
          <span className="lora-editor-chip">{card?.pairState || 'unknown'}</span>
        </header>
        <div className="lora-editor-filelist">
          {files?.high && (
            <div className="lora-editor-file">
              <strong>High</strong>
              <span>{files.high}</span>
            </div>
          )}
          {files?.low && (
            <div className="lora-editor-file">
              <strong>Low</strong>
              <span>{files.low}</span>
            </div>
          )}
          {otherFiles.map((file) => (
            <div key={file} className="lora-editor-file">
              <span>{file}</span>
            </div>
          ))}
          {!files?.high && !files?.low && otherFiles.length === 0 && (
            <p>No files detected in the LoRA directory yet.</p>
          )}
        </div>
      </section>

      <ImagePickerSheet
        open={galleryPicker.serverOpen}
        cwd={galleryPicker.cwd}
        setCwd={galleryPicker.setCwd}
        page={galleryPicker.page}
        setPage={galleryPicker.setPage}
        perPage={galleryPicker.perPage}
        setPerPage={galleryPicker.setPerPage}
        totalPages={galleryPicker.totalPages}
        topDirs={galleryPicker.topDirs}
        loading={galleryPicker.loading}
        imagesOnly={galleryPicker.imagesOnly}
        setImagesOnly={galleryPicker.setImagesOnly}
        search={galleryPicker.search}
        setSearch={galleryPicker.setSearch}
        shownEntries={galleryPicker.shownEntries}
        onSelect={galleryPicker.selectServer}
        onClose={galleryPicker.closeServer}
        pickerSource={galleryPicker.pickerSource}
        setPickerSource={galleryPicker.setPickerSource}
      />
    </form>
  );
}
