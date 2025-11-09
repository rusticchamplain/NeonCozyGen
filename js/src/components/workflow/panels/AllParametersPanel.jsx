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

export default function AllParametersPanel({
  dynamicInputs,
  formData,
  randomizeState,
  bypassedState,
  onFormChange,
  onRandomizeToggle,
  onBypassToggle,
}) {
  const allInputs = normalizeInputs(
    (dynamicInputs || []).filter(
      (input) => input.class_type !== 'CozyGenImageInput'
    )
  );

  return (
    <section className="surface-section">
      <header className="section-header">
        <div className="section-header-main">
          <div className="section-label">ALL PARAMETERS</div>
          <p className="section-caption">
            Every exposed CozyGen control for this workflow.
          </p>
        </div>
      </header>
      <DynamicForm
        inputs={allInputs}
        formData={formData}
        randomizeState={randomizeState}
        bypassedState={bypassedState}
        onFormChange={onFormChange}
        onRandomizeToggle={onRandomizeToggle}
        onBypassToggle={onBypassToggle}
      />
    </section>
  );
}
