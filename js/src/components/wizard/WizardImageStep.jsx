import React from 'react';
import ImageInput from '../ImageInput';

export default function WizardImageStep({
  imageInputs = [],
  formData,
  onFormChange,
}) {
  if (!imageInputs.length) {
    return (
      <div className="wizard-card">
        <h2 className="wizard-title">No source images</h2>
        <p className="wizard-subtitle">This workflow skips references.</p>
      </div>
    );
  }

  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div>
          <h2 className="wizard-title">Image inputs</h2>
          <p className="wizard-subtitle">
            Drop the guides this workflow expects.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {imageInputs.map((imgInput) => (
          <ImageInput
            key={imgInput.id}
            input={imgInput}
            value={formData[imgInput.inputs.param_name] || ''}
            onFormChange={onFormChange}
          />
        ))}
      </div>
    </div>
  );
}
