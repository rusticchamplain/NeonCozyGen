import React from 'react';
import ImageInput from '../../ImageInput';

export default function ImageInputsPanel({
  imageInputs,
  imagesOpen,
  setImagesOpen,
  formData,
  onFormChange,
  sectionRef,
  walkthroughMode,
  guideActive,
}) {
  const allImageInputs = imageInputs || [];
  const sectionClass = [
    'ui-panel scroll-mt-28 space-y-4',
    walkthroughMode ? 'guide-surface' : '',
    walkthroughMode && guideActive ? 'guide-focus' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClass} ref={sectionRef}>
      <header className="ui-section-head">
        <div className="ui-section-text">
          <span className="ui-kicker">Image inputs</span>
          <p className="ui-hint">Only fill these if the workflow needs them.</p>
          {walkthroughMode && (
            <p className="guide-hint">
              Drop references when required; otherwise keep moving.
            </p>
          )}
        </div>
        <button
          type="button"
          className="ui-button is-ghost is-compact"
          onClick={() => setImagesOpen((v) => !v)}
        >
          {imagesOpen ? 'Collapse' : 'Expand'}
        </button>
      </header>
      {imagesOpen && (
        <div className="space-y-3">
          {allImageInputs.length > 0 ? (
            allImageInputs.map((imgInput) => (
              <ImageInput
                key={imgInput.id}
                input={imgInput}
                value={formData[imgInput.inputs.param_name] || ''}
                onFormChange={onFormChange}
              />
            ))
          ) : (
            <div className="text-[11px] text-[#9DA3FFCC]">
              This workflow has no image inputs.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
