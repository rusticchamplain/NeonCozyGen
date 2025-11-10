import React from 'react';
import DynamicForm from '../../DynamicForm';

function normalizeInputs(inputs) {
  return (inputs || []).map((input) => {
    if (
      [
        'CozyGenFloatInput',
        'CozyGenIntInput',
        'CozyGenStringInput',
        'CozyGenChoiceInput',
      ].includes(input.class_type)
    ) {
      let param_type = input.class_type
        .replace('CozyGen', '')
        .replace('Input', '')
        .toUpperCase();
      if (param_type === 'CHOICE') param_type = 'DROPDOWN';
      return {
        ...input,
        inputs: {
          ...input.inputs,
          param_type,
          Multiline: input.inputs?.display_multiline || false,
        },
      };
    }
    // Dynamic inputs keep their server-provided param_type
    return input;
  });
}

export default function CoreControlsPanel({
  dynamicInputs,
  formData,
  onFormChange,
}) {
  const coreInputs = normalizeInputs(
    (dynamicInputs || []).filter(
      (input) =>
        input.class_type !== 'CozyGenImageInput' &&
        !input.inputs?.advanced_only
    )
  );

  return (
    <div className="surface-section">
      <header className="section-header">
        <div className="section-header-main">
          <div className="section-label">CORE CONTROLS</div>
          <p className="section-caption">
            Prompt, strength, frames and other key knobs.
          </p>
        </div>
      </header>
      <DynamicForm
        inputs={coreInputs}
        formData={formData}
        onFormChange={onFormChange}
      />
    </div>
  );
}
