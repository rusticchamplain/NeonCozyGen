import ImageInput from '../../ImageInput';

export default function ImageInputsPanel({
  imageInputs,
  imagesOpen,
  setImagesOpen,
  formData,
  onFormChange,
  sectionRef,
}) {
  const allImageInputs = imageInputs || [];

  return (
    <details
      className="ui-panel collapsible-card scroll-mt-28 space-y-4"
      ref={sectionRef}
      open={imagesOpen}
      onToggle={(event) => setImagesOpen?.(event.target.open)}
    >
      <summary className="collapsible-card-summary">
        <span className="collapsible-card-summary-label">Image inputs</span>
      </summary>
      {imagesOpen && (
        <div className="collapsible-card-body space-y-3">
          <div className="ui-section-text">
            <span className="ui-kicker">Image inputs</span>
            <p className="ui-hint">Only fill these if the workflow needs them.</p>
          </div>
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
    </details>
  );
}
