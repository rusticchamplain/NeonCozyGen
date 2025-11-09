import React, { useMemo } from 'react';

export default function DropdownInput({
  name,
  label,        // DynamicForm renders label
  description,  // DynamicForm renders help text
  value,
  onChange,
  disabled = false,
  options = [],
}) {
  const normalizedOptions = useMemo(
    () =>
      (options || []).map((opt) => {
        if (typeof opt === 'string') {
          return { value: opt, label: opt };
        }
        return {
          value: opt.value ?? opt.name ?? '',
          label: opt.label ?? opt.name ?? String(opt.value ?? ''),
        };
      }),
    [options]
  );

  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  return (
    <div className="relative w-full">
      <select
        id={name}
        name={name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        aria-label={label || name}
        aria-describedby={description ? `${name}-description` : undefined}
        className={
          'w-full rounded-xl border border-[#2A2E4A] bg-[#050716] ' +
          'px-3 py-2.5 pr-8 text-[13px] sm:text-sm text-[#E5E7FF] ' +
          'focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80] ' +
          'appearance-none transition-shadow shadow-[0_0_18px_rgba(5,7,22,0.7)]'
        }
      >
        {normalizedOptions.length > 0 && (value === undefined || value === '') && (
          <option value="">Select…</option>
        )}
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <span className="inline-block h-[6px] w-[10px] border-x-[5px] border-t-[6px] border-x-transparent border-t-[#9CF7FF]" />
      </div>
    </div>
  );
}
