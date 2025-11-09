import React from 'react';

export default function NumberInput({
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
}) {
  const numericStep = step ?? (isFloat ? 0.01 : 1);

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
        id={name}
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
        aria-describedby={description ? `${name}-description` : undefined}
        className={
          'w-full rounded-xl border border-[#2A2E4A] bg-[#050716] ' +
          'px-3 py-2.5 text-[13px] sm:text-sm text-[#E5E7FF] ' +
          'placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80] ' +
          'transition-shadow shadow-[0_0_18px_rgba(5,7,22,0.7)]'
        }
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
