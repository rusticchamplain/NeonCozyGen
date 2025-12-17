import { useEffect, useMemo, useState } from 'react';
import { formatModelDisplayName, isModelFileLike, splitModelDisplayName } from '../../utils/modelDisplay';
import { loadDropdownFolder, saveDropdownFolder } from '../../utils/storage';

export default function DropdownInput({
  workflowName,
  name,
  label,        // DynamicForm renders label
  description,  // DynamicForm renders help text
  value,
  onChange,
  disabled = false,
  options = [],
}) {
  const valueStr = value ?? '';
  const [selectedFolder, setSelectedFolder] = useState(() => {
    const stored = loadDropdownFolder(workflowName, name);
    return stored || 'All';
  });

  useEffect(() => {
    const stored = loadDropdownFolder(workflowName, name);
    setSelectedFolder(stored || 'All');
    // Only respond to identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowName, name]);

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

  useEffect(() => {
    if (!folders.includes(selectedFolder)) {
      setSelectedFolder('All');
    }
  }, [folders, selectedFolder]);

  useEffect(() => {
    saveDropdownFolder(workflowName, name, selectedFolder);
  }, [workflowName, name, selectedFolder]);

  const filteredOptions = useMemo(
    () => {
      const stripExt = (s) => s.replace(/\.[^.]+$/, '');
      return normalizedOptions
        .filter((opt) => {
          const folder = getFolder(opt.label);
          return selectedFolder === 'All' || folder === selectedFolder;
        })
        .map((opt) => {
          const rawLabel = opt.label || '';
          if (isModelFileLike(rawLabel)) {
            const { base } = splitModelDisplayName(rawLabel);
            const withFolder = formatModelDisplayName(rawLabel);
            const nextLabel = selectedFolder === 'All' ? withFolder : (base || withFolder);
            return { ...opt, label: nextLabel };
          }
          if (selectedFolder === 'All') return opt;
          const parts = rawLabel.split('/');
          const nameOnly = stripExt(parts[parts.length - 1] || rawLabel);
          return { ...opt, label: nameOnly };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    [normalizedOptions, selectedFolder]
  );

  const hasValueInFiltered = useMemo(() => {
    if (valueStr === '' || valueStr === null || valueStr === undefined) return true;
    return filteredOptions.some((opt) => String(opt.value) === String(valueStr));
  }, [filteredOptions, valueStr]);

  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full">
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          disabled={disabled}
          className={
            'w-full rounded-lg border border-[#2A2E4A] bg-[#050716] ' +
            'px-3 py-2 pr-8 text-[13px] sm:text-sm text-[#E5E7FF] ' +
            'focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80] ' +
            'appearance-none transition-shadow shadow-[0_0_12px_rgba(5,7,22,0.6)]'
          }
          aria-label={`Choose folder for ${label || name}`}
        >
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <span className="inline-block h-[6px] w-[10px] border-x-[5px] border-t-[6px] border-x-transparent border-t-[#9CF7FF]" />
        </div>
      </div>

      <div className="relative w-full">
        <select
          key={`${name || 'field'}:${selectedFolder}`}
          id={name}
          name={name}
          value={valueStr}
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
          {!hasValueInFiltered && valueStr !== '' && (
            <option value={valueStr}>{formatModelDisplayName(String(valueStr))}</option>
          )}
          {filteredOptions.length > 0 && (valueStr === undefined || valueStr === '') && (
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
    </div>
  );
}
