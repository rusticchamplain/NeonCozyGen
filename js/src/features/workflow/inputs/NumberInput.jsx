import { memo } from 'react';

const sanitizeForId = (value) => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value)
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || undefined;
};

function NumberInput({
  name,
  label,        // DynamicForm renders label
  description,  // DynamicForm renders help text
  value,
  onChange,
  disabled = false,
  min,
  max,
  step,
  isFloat = false,
  inputId,
}) {
  const numericStep = step ?? (isFloat ? 0.01 : 1);
  const fieldId = inputId ?? sanitizeForId(name);

  const parseValue = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      return '';
    }
    const n = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (Number.isNaN(n)) return '';
    return n;
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    const parsed = parseValue(raw);
    onChange?.(parsed);
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();

    const current =
      typeof value === 'number'
        ? value
        : parseValue(String(value ?? '')) || 0;

    const delta = e.key === 'ArrowUp' ? numericStep : -numericStep;
    let next = current + delta;

    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);

    // avoid floating-point noise
    if (isFloat) {
      const digits =
        typeof numericStep === 'number'
          ? (String(numericStep).split('.')[1] || '').length
          : 2;
      next = parseFloat(next.toFixed(Math.max(digits, 2)));
    }

    onChange?.(next);
  };

  return (
    <div className="w-full flex items-center gap-2">
      <input
        id={fieldId}
        name={name}
        type="number"
        inputMode={isFloat ? 'decimal' : 'numeric'}
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        min={min}
        max={max}
        step={numericStep}
        aria-label={label || name}
        aria-describedby={
          description
            ? `${fieldId || sanitizeForId(name) || name}-description`
            : undefined
        }
        className="ui-control ui-input"
      />
      {typeof min === 'number' || typeof max === 'number' ? (
        <div className="hidden sm:flex flex-col text-[10px] text-[#6A6FA8] text-right leading-tight">
          {typeof min === 'number' && <span>min {min}</span>}
          {typeof max === 'number' && <span>max {max}</span>}
        </div>
      ) : null}
    </div>
  );
}

export default memo(NumberInput);
