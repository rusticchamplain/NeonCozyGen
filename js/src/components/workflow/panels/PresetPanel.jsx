import React, { forwardRef } from 'react';
import PresetSelector from '../../PresetSelector';

function PresetPanel(
  {
    workflow,
    presetsOpen,
    setPresetsOpen,
    onApplyPresetPatch,
    readCurrentValues,
  },
  ref
) {
  return (
    <section className="surface-section scroll-mt-28" ref={ref}>
      <header className="section-header">
        <div className="section-header-main">
          <div className="section-label">PRESET PANEL</div>
          <p className="section-caption">
            Save and recall full parameter sets for this workflow.
          </p>
        </div>
        <button
          type="button"
          className="section-chip-button"
          onClick={() => setPresetsOpen((v) => !v)}
        >
          {presetsOpen ? 'COLLAPSE' : 'EXPAND'}
        </button>
      </header>
      {presetsOpen && (
        <PresetSelector
          workflow={workflow || 'default'}
          onApply={onApplyPresetPatch}
          readCurrentValues={readCurrentValues}
        />
      )}
    </section>
  );
}

export default forwardRef(PresetPanel);
