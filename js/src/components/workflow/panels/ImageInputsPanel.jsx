import React from 'react';
import ImageInput from '../../ImageInput';

export default function ImageInputsPanel({
  imageInputs,
  imagesOpen,
  setImagesOpen,
  formData,
  onFormChange,
}) {
  const allImageInputs = imageInputs || [];

  return (
    <section className="surface-section">
      <header className="section-header">
        <div className="section-header-main">
          <div className="section-label">IMAGE INPUTS</div>
          <p className="section-caption">
            Source images used by this workflow.
          </p>
        </div>
        <button
          type="button"
          className="section-chip-button"
          onClick={() => setImagesOpen((v) => !v)}
        >
          {imagesOpen ? 'COLLAPSE' : 'EXPAND'}
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
              This workflow has no image input nodes.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
