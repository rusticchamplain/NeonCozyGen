import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import PresetSelector from '../../PresetSelector';

function PresetPanel(
  {
    workflow,
    onApplyPresetPatch,
    readCurrentValues,
  },
  ref
) {
  return (
    <div className="ui-panel scroll-mt-28 space-y-3" ref={ref}>
      <div className="flex items-center justify-between">
        <div>
          <span className="ui-kicker">Presets</span>
          <h3 className="text-sm font-semibold text-[#F8F4FF] mt-1">Save or reuse a setup</h3>
        </div>
        <Link to="/presets" className="ui-button is-muted is-compact">
          Manage
        </Link>
      </div>
      <PresetSelector
        workflow={workflow || 'default'}
        onApply={onApplyPresetPatch}
        readCurrentValues={readCurrentValues}
      />
    </div>
  );
}

export default forwardRef(PresetPanel);
