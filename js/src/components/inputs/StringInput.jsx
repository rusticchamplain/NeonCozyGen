import React from 'react';

export default function StringInput({
  name,
  label,        // DynamicForm handles visible label
  description,  // DynamicForm handles help text / tooltip
  value,
  onChange,
  disabled = false,
  multiline = false,
}) {
  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  const commonProps = {
    id: name,
    name,
    value: value ?? '',
    onChange: handleChange,
    disabled,
    className:
      'w-full rounded-xl border border-[#2A2E4A] bg-[#050716] ' +
      'px-3 py-2.5 text-[13px] sm:text-sm text-[#E5E7FF] ' +
      'placeholder-[#6A6FA8] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80] ' +
      'transition-shadow shadow-[0_0_18px_rgba(5,7,22,0.7)]',
    placeholder: '',
    'aria-label': label || name,
    'aria-describedby': description ? `${name}-description` : undefined,
  };

  if (multiline) {
    return (
      <textarea
        {...commonProps}
        rows={3}
        className={
          commonProps.className +
          ' resize-y min-h-[88px] max-h-[260px] leading-relaxed'
        }
      />
    );
  }

  return (
    <input
      {...commonProps}
      type="text"
      inputMode="text"
      autoComplete="off"
    />
  );
}
