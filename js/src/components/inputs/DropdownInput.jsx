import { useMemo, useState } from 'react';

export default function DropdownInput({
  name,
  label,        // DynamicForm renders label
  description,  // DynamicForm renders help text
  value,
  onChange,
  disabled = false,
  options = [],
}) {
  const [selectedFolder, setSelectedFolder] = useState('All');

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

  const getFolder = (label = '') => {
    if (typeof label !== 'string') return 'Other';
    if (!label.includes('/')) return 'root';
    const parts = label.split('/');
    return parts.slice(0, parts.length - 1).join('/') || 'root';
  };

  const folders = useMemo(() => {
    const set = new Set(['All']);
    normalizedOptions.forEach((opt) => set.add(getFolder(opt.label)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [normalizedOptions]);

  const filteredOptions = useMemo(
    () => {
      const stripExt = (s) => s.replace(/\.[^.]+$/, '');
      return normalizedOptions
        .filter((opt) => {
          const folder = getFolder(opt.label);
          return selectedFolder === 'All' || folder === selectedFolder;
        })
        .map((opt) => {
          if (selectedFolder === 'All') return opt;
          const parts = (opt.label || '').split('/');
          const nameOnly = stripExt(parts[parts.length - 1] || opt.label);
          return { ...opt, label: nameOnly };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    [normalizedOptions, selectedFolder]
  );

  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  return (
    <div className="relative w-full space-y-2">
      <select
        value={selectedFolder}
        onChange={(e) => setSelectedFolder(e.target.value)}
        className="w-full rounded-lg border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-[13px] sm:text-sm text-[#E5E7FF] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80] transition-shadow shadow-[0_0_12px_rgba(5,7,22,0.6)]"
        aria-label={`Choose folder for ${label || name}`}
      >
        {folders.map((folder) => (
          <option key={folder} value={folder}>
            {folder}
          </option>
        ))}
      </select>

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
        {filteredOptions.length > 0 && (value === undefined || value === '') && (
          <option value="">Select…</option>
        )}
        {filteredOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {filteredOptions.length === 0 && <option value="">No matches</option>}
      </select>

      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <span className="inline-block h-[6px] w-[10px] border-x-[5px] border-t-[6px] border-x-transparent border-t-[#9CF7FF]" />
      </div>
    </div>
  );
}
