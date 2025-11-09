import React from 'react';
import PresetPanel from './panels/PresetPanel';
import AllParametersPanel from './panels/AllParametersPanel';
import ImageInputsPanel from './panels/ImageInputsPanel';

export default function AdvancedModeLayout({
  workflowName,
  dynamicInputs,
  imageInputs,
  formData,
  randomizeState,
  bypassedState,
  onFormChange,
  onRandomizeToggle,
  onBypassToggle,
  presetsOpen,
  setPresetsOpen,
  imagesOpen,
  setImagesOpen,
  onApplyPresetPatch,
  readCurrentValues,
  presetSectionRef,
  parameterSectionRef,
  onParameterNavReady,
}) {
  return (
    <div className="space-y-4">
      <PresetPanel
        ref={presetSectionRef}
        workflow={workflowName}
        presetsOpen={presetsOpen}
        setPresetsOpen={setPresetsOpen}
        onApplyPresetPatch={onApplyPresetPatch}
        readCurrentValues={readCurrentValues}
      />

      <AllParametersPanel
        dynamicInputs={dynamicInputs}
        formData={formData}
        randomizeState={randomizeState}
        bypassedState={bypassedState}
        onFormChange={onFormChange}
        onRandomizeToggle={onRandomizeToggle}
        onBypassToggle={onBypassToggle}
        sectionRef={parameterSectionRef}
        onParameterNavReady={onParameterNavReady}
      />

      <ImageInputsPanel
        imageInputs={imageInputs}
        imagesOpen={imagesOpen}
        setImagesOpen={setImagesOpen}
        formData={formData}
        onFormChange={onFormChange}
      />
    </div>
  );
}
