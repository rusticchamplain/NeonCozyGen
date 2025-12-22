import FieldRow from '../../../ui/composites/FieldRow';
import LoraPairInput from '../inputs/LoraPairInput';

export default function LoraPairFieldRow({
  paramName,
  cfg,
  formData,
  loraPair,
  collapsed,
  onToggle,
  formatPreview,
  onChangeParam,
  changeHandlers,
}) {
  const {
    id,
    label,
    highParam,
    lowParam,
    highStrengthParam,
    lowStrengthParam,
    highCfg,
    lowCfg,
  } = loraPair;
  const highStrengthValue = highStrengthParam ? formData[highStrengthParam] : undefined;
  const lowStrengthValue = lowStrengthParam ? formData[lowStrengthParam] : undefined;
  const valueStrength = highStrengthValue ?? lowStrengthValue ?? 1.0;
  const previewValue = collapsed
    ? formatPreview(
        cfg,
        [formData[highParam], formData[lowParam]].filter(Boolean).join(' • ')
      )
    : null;
  const anchorId = paramName ? `param-${paramName}` : undefined;

  return (
    <div
      id={anchorId}
      data-param-name={paramName}
      data-param-label={label || cfg.label}
      data-param-type="lora_pair"
      className="settings-row"
    >
      <FieldRow
        id={paramName}
        label={label || cfg.label}
        description={cfg.description}
        preview={previewValue}
        expanded={!collapsed}
        onToggle={onToggle}
      >
        {!collapsed ? (
          <LoraPairInput
            key={`lora-${paramName}`}
            name={id || highParam}
            label={label || cfg.label}
            highParam={highParam}
            lowParam={lowParam}
            highChoices={highCfg.choices}
            lowChoices={lowCfg.choices}
            formData={formData}
            onChangeParam={onChangeParam}
            highStrengthParam={highStrengthParam}
            lowStrengthParam={lowStrengthParam}
            strengthValue={valueStrength}
            highStrengthValue={highStrengthValue}
            lowStrengthValue={lowStrengthValue}
            onChangeHighStrength={
              highStrengthParam ? changeHandlers.get(highStrengthParam) : undefined
            }
            onChangeLowStrength={
              lowStrengthParam ? changeHandlers.get(lowStrengthParam) : undefined
            }
            disabled={false}
          />
        ) : null}
      </FieldRow>
    </div>
  );
}
