export default function BooleanInput({
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
      className={
        'inline-flex items-center justify-between gap-2 rounded-full ' +
        'border border-[#3D4270] bg-[#050716] px-2.5 py-1.5 ' +
        'text-[10px] sm:text-[11px] text-[#C3C7FF] ' +
        'transition-colors shadow-[0_0_16px_rgba(5,7,22,0.9)] ' +
        (checked
          ? 'bg-[radial-gradient(circle_at_0%_0%,#3EF0FF,transparent_60%),radial-gradient(circle_at_100%_100%,#FF60D0,transparent_60%)] text-[#050716]'
          : 'hover:border-[#3EF0FF80]')
      }
    >
      <span
        className={
          'relative inline-flex h-4 w-8 items-center rounded-full ' +
          (checked ? 'bg-[#3EF0FF]' : 'bg-[#2A2E4A]')
        }
      >
        <span
          className={
            'h-3 w-3 rounded-full bg-[#050716] shadow-[0_0_6px_rgba(0,0,0,0.6)] ' +
            'transform transition-transform ' +
            (checked ? 'translate-x-[14px]' : 'translate-x-[2px]')
          }
        />
      </span>
      <span className="uppercase tracking-[0.16em]">
        {checked ? 'TRUE' : 'FALSE'}
      </span>
    </button>
  );
}
