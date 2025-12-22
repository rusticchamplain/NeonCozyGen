import FieldRow from '../../../ui/composites/FieldRow';
import BooleanInput from '../inputs/BooleanInput';
import DropdownInput from '../inputs/DropdownInput';
import NumberInput from '../inputs/NumberInput';
import StringInput from '../inputs/StringInput';

export default function ParamFieldRow({
  paramName,
  cfg,
  formData,
  workflowName,
  spotlightName,
  spotlightRenderKey,
  aliasOptions,
  aliasCatalog,
  onOpenComposer,
  changeHandlers,
  enterHandlers,
  collapsed,
  previewValue,
  onToggle,
}) {
  const value = formData[paramName];
  const commonFieldProps = {
    name: paramName,
    label: cfg.label,
    description: cfg.description,
    value,
    disabled: false,
    defaultValue: cfg.defaultValue,
  };

  const renderField = (currentForm = formData, expanded = false) => {
    const liveProps = { ...commonFieldProps, value: currentForm?.[paramName] };
    if (cfg.paramType === 'NUMBER') {
      return (
        <NumberInput
          key={`field-${paramName}-number-${spotlightRenderKey}`}
          {...liveProps}
          inputId={paramName}
          onChange={changeHandlers.get(paramName)}
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          isFloat={true}
        />
      );
    }
    if (cfg.paramType === 'BOOLEAN') {
      return (
        <BooleanInput
          key={`field-${paramName}-bool-${spotlightRenderKey}`}
          {...liveProps}
          onChange={changeHandlers.get(paramName)}
        />
      );
    }
    if (cfg.paramType === 'DROPDOWN') {
      return (
        <DropdownInput
          key={`field-${paramName}-dropdown-${spotlightRenderKey}`}
          {...liveProps}
          workflowName={workflowName}
          onChange={changeHandlers.get(paramName)}
          options={cfg.choices || []}
        />
      );
    }
    return (
      <StringInput
        key={`field-${paramName}-string-${spotlightRenderKey}`}
        {...liveProps}
        aliasOptions={aliasOptions}
        aliasCatalog={aliasCatalog}
        onOpenComposer={onOpenComposer}
        onChange={changeHandlers.get(paramName)}
        onEnter={enterHandlers.get(paramName)}
        multiline={cfg.multiline || spotlightName === paramName || expanded}
      />
    );
  };

  const anchorId = paramName ? `param-${paramName}` : undefined;

  if (cfg.paramType === 'BOOLEAN') {
    return (
      <div
        id={anchorId}
        data-param-name={paramName}
        data-param-label={cfg.label}
        data-param-type="single"
        className="settings-row"
      >
        <FieldRow
          id={paramName}
          label={cfg.label}
          description={cfg.description}
          trailing={renderField(formData, true)}
        />
      </div>
    );
  }

  return (
    <div
      id={anchorId}
      data-param-name={paramName}
      data-param-label={cfg.label}
      data-param-type="single"
      className="settings-row"
    >
      <FieldRow
        id={paramName}
        label={cfg.label}
        description={cfg.description}
        preview={previewValue}
        expanded={!collapsed}
        onToggle={onToggle}
      >
        {!collapsed ? renderField(formData, true) : null}
      </FieldRow>
    </div>
  );
}
