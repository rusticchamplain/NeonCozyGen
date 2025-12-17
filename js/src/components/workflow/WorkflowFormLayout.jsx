import AllParametersPanel from './panels/AllParametersPanel';

export default function WorkflowFormLayout({
  dynamicInputs,
  formData,
  onFormChange,
  parameterSectionRef,
  compactControls = true,
  collapseAllState = null,
  onSpotlight,
  spotlightName,
  onCloseSpotlight,
  onVisibleParamsChange,
  aliasOptions = [],
  aliasCatalog = [],
  onOpenComposer,
}) {
  return (
    <div className="space-y-4">
      <AllParametersPanel
        dynamicInputs={dynamicInputs}
        formData={formData}
        onFormChange={onFormChange}
        sectionRef={parameterSectionRef}
        compactControls={compactControls}
        collapseAllState={collapseAllState}
        onSpotlight={onSpotlight}
        spotlightName={spotlightName}
        onCloseSpotlight={onCloseSpotlight}
        onVisibleParamsChange={onVisibleParamsChange}
        aliasOptions={aliasOptions}
        aliasCatalog={aliasCatalog}
        onOpenComposer={onOpenComposer}
      />
    </div>
  );
}
