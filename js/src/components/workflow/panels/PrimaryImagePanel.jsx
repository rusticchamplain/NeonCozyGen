import ImageInput from '../../ImageInput';

export default function PrimaryImagePanel({
  primaryImageInput,
  formData,
  onFormChange,
}) {
  return (
    <div className="surface-section">
      <header className="section-header">
        <div className="section-header-main">
          <div className="section-label">IMAGE INPUTS</div>
          <p className="section-caption">
            Source images used by this workflow.
          </p>
        </div>
      </header>
      {primaryImageInput ? (
        <ImageInput
          input={primaryImageInput}
          value={formData[primaryImageInput.inputs.param_name] || ''}
          onFormChange={onFormChange}
        />
      ) : (
        <div className="text-[11px] text-[#9DA3FFCC]">
          This workflow has no image inputs.
        </div>
      )}
    </div>
  );
}
