import React from 'react';
import PresetPanel from './panels/PresetPanel';
import AllParametersPanel from './panels/AllParametersPanel';
import ImageInputsPanel from './panels/ImageInputsPanel';

export default function AdvancedModeLayout({
  workflowName,
  dynamicInputs,
  imageInputs,
  formData,
  onFormChange,
  presetsOpen,
  setPresetsOpen,
  imagesOpen,
  setImagesOpen,
  onApplyPresetPatch,
  readCurrentValues,
  presetSectionRef,
  parameterSectionRef,
  onParameterNavReady,
  walkthroughMode,
  walkthroughFocusId,
  imageSectionRef,
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
        walkthroughMode={walkthroughMode}
        guideActive={walkthroughMode && walkthroughFocusId === 'presets'}
      />

      <AllParametersPanel
        dynamicInputs={dynamicInputs}
        formData={formData}
        onFormChange={onFormChange}
        sectionRef={parameterSectionRef}
        onParameterNavReady={onParameterNavReady}
        walkthroughMode={walkthroughMode}
        guideActive={walkthroughMode && walkthroughFocusId === 'parameters'}
      />

      <ImageInputsPanel
        imageInputs={imageInputs}
        imagesOpen={imagesOpen}
        setImagesOpen={setImagesOpen}
        formData={formData}
        onFormChange={onFormChange}
        sectionRef={imageSectionRef}
        walkthroughMode={walkthroughMode}
        guideActive={walkthroughMode && walkthroughFocusId === 'images'}
      />
    </div>
  );
}
