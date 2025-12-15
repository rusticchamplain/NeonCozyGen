import SimplePresetPicker from '../../SimplePresetPicker';

export default function StylePresetsPanel({
  workflow,
  onApplyPresetPatch,
}) {
  return (
    <div className="surface-section">
      <header className="section-header">
        <div className="section-header-main">
          <div className="section-label">STYLE PRESETS</div>
          <p className="section-caption">
            Pick a look, then tweak the essentials.
          </p>
        </div>
      </header>
      <SimplePresetPicker
        workflow={workflow || 'default'}
        onApply={onApplyPresetPatch}
        className="mt-1"
      />
    </div>
  );
}
