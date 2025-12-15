import { useMemo } from 'react';
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
  onFormChange,
  sectionRef,
  compactControls = false,
  collapseAllState = null,
  onSpotlight,
  spotlightName,
  onCloseSpotlight,
  onVisibleParamsChange,
  aliasOptions = [],
  aliasCatalog = [],
}) {
  const allInputs = useMemo(
    () =>
      normalizeInputs(
        (dynamicInputs || []).filter(
          (input) => input.class_type !== 'CozyGenImageInput'
        )
      ),
    [dynamicInputs]
  );
  return (
    <section className="control-arena scroll-mt-24" ref={sectionRef}>
      <div className="control-stack">
        <DynamicForm
          inputs={allInputs}
        formData={formData}
        onFormChange={onFormChange}
        compactControls={compactControls}
        collapseAllKey={collapseAllState?.key ?? 0}
        collapseAllCollapsed={collapseAllState?.collapsed ?? true}
        onSpotlight={onSpotlight}
        spotlightName={spotlightName}
        onCloseSpotlight={onCloseSpotlight}
        onVisibleParamsChange={onVisibleParamsChange}
        aliasOptions={aliasOptions}
        aliasCatalog={aliasCatalog}
      />
      </div>
    </section>
  );
}
