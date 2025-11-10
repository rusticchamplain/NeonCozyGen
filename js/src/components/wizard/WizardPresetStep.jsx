import React from 'react';
import PresetSelector from '../PresetSelector';

export default function WizardPresetStep({
  workflowName,
  onApplyPresetPatch,
  readCurrentValues,
}) {
  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div>
          <h2 className="wizard-title">Presets</h2>
          <p className="wizard-subtitle">Drop in a saved stack or store this one.</p>
        </div>
      </div>

      <PresetSelector
        workflow={workflowName || 'default'}
        onApply={onApplyPresetPatch}
        readCurrentValues={readCurrentValues}
      />
    </div>
  );
}
