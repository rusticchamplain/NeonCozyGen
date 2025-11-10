import React, { forwardRef } from 'react';
import PresetSelector from '../../PresetSelector';

function PresetPanel(
  {
    workflow,
    presetsOpen,
    setPresetsOpen,
    onApplyPresetPatch,
    readCurrentValues,
    walkthroughMode,
    guideActive,
  },
  ref
) {
  const sectionClass = [
    'ui-panel scroll-mt-28 space-y-4',
    walkthroughMode ? 'guide-surface' : '',
    walkthroughMode && guideActive ? 'guide-focus' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClass} ref={ref}>
      <header className="ui-section-head">
        <div className="ui-section-text">
          <span className="ui-kicker">Presets</span>
          <p className="ui-hint">Save or reuse full stacks.</p>
          {walkthroughMode && (
            <p className="guide-hint">
              Pull a saved setup or capture the current values.
            </p>
          )}
        </div>
        <button
          type="button"
          className="ui-button is-ghost is-compact"
          onClick={() => setPresetsOpen((v) => !v)}
        >
          {presetsOpen ? 'Collapse' : 'Expand'}
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
