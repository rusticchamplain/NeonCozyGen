import { memo, useEffect, useMemo, useState } from 'react';
import { formatModelDisplayName, isModelFileLike, splitModelDisplayName } from '../../utils/modelDisplay';
import { loadDropdownFolder, saveDropdownFolder } from '../../utils/storage';

function DropdownInput({
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
            'ui-control ui-select is-compact'
          }
          aria-label={`Choose folder for ${label || name}`}
        >
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
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
            'ui-control ui-select'
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
      </div>
    </div>
  );
}

export default memo(DropdownInput);
