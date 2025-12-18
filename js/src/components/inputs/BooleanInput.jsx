import { memo } from 'react';

function BooleanInput({
  name,
  label,        // DynamicForm renders label
  description,  // DynamicForm renders help text
  value,
  onChange,
  disabled = false,
}) {
  const checked = !!value;

  const toggle = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <button
      id={name}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label || name}
      aria-describedby={description ? `${name}-description` : undefined}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`ui-switch ${checked ? 'is-on' : ''}`}
    >
      <span
        className="ui-switch-track"
      >
        <span className="ui-switch-knob" />
      </span>
      <span className="ui-switch-state">
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  );
}

export default memo(BooleanInput);
