import React from 'react';
import StylePresetsPanel from './panels/StylePresetsPanel';
import CoreControlsPanel from './panels/CoreControlsPanel';
import PrimaryImagePanel from './panels/PrimaryImagePanel';

export default function SimpleModeLayout({
  workflowName,
  dynamicInputs,
  formData,
  randomizeState,
  bypassedState,
  onFormChange,
  onRandomizeToggle,
  onBypassToggle,
  primaryImageInput,
  onApplyPresetPatch,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
      {/* Left: presets + core controls */}
      <section className="space-y-4">
        <StylePresetsPanel
          workflow={workflowName}
          onApplyPresetPatch={onApplyPresetPatch}
        />
        <CoreControlsPanel
          dynamicInputs={dynamicInputs}
          formData={formData}
          randomizeState={randomizeState}
          bypassedState={bypassedState}
          onFormChange={onFormChange}
          onRandomizeToggle={onRandomizeToggle}
          onBypassToggle={onBypassToggle}
        />
      </section>

      {/* Right: image input + helper */}
      <section className="space-y-4">
        <PrimaryImagePanel
          primaryImageInput={primaryImageInput}
          formData={formData}
          onFormChange={onFormChange}
        />

        <div className="surface-section">
          <div className="section-header-main">
            <div className="section-label">RENDER NOTES</div>
            <p className="section-caption">
              Latest frames land in the <span className="font-semibold">Gallery</span>.
              Use collections to keep experiments tidy.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
