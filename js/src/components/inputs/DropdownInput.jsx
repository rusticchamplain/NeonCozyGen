import { memo, useEffect, useMemo, useState } from 'react';
import Select from '../ui/Select';
import { formatFileBaseName, isFilePathLike, splitFilePath } from '../../utils/modelDisplay';
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

  const getOptionPath = (opt) => {
    const valueStr = typeof opt?.value === 'string' || typeof opt?.value === 'number'
      ? String(opt.value)
      : '';
    const labelStr = typeof opt?.label === 'string' || typeof opt?.label === 'number'
      ? String(opt.label)
      : '';
    if (isFilePathLike(valueStr)) return valueStr;
    if (isFilePathLike(labelStr)) return labelStr;
    return '';
  };

  const optionMeta = useMemo(
    () =>
      normalizedOptions.map((opt) => {
        const path = getOptionPath(opt);
        if (!path) {
          return { opt, path: '', base: '', folderPath: '' };
        }
        const { folderPath, base } = splitFilePath(path);
        return { opt, path, base, folderPath: folderPath || 'root' };
      }),
    [normalizedOptions]
  );

  const folderOptions = useMemo(() => {
    const set = new Set(['All']);
    optionMeta.forEach(({ path, folderPath }) => {
      if (path) set.add(folderPath || 'root');
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [optionMeta]);
  const showFolderFilter = folderOptions.length > 2;

  useEffect(() => {
    if (!showFolderFilter) {
      if (selectedFolder !== 'All') {
        setSelectedFolder('All');
      }
      return;
    }
    if (!folderOptions.includes(selectedFolder)) {
      setSelectedFolder('All');
    }
  }, [folderOptions, selectedFolder, showFolderFilter]);

  useEffect(() => {
    saveDropdownFolder(workflowName, name, selectedFolder);
  }, [workflowName, name, selectedFolder]);

  const baseCounts = useMemo(() => {
    const map = new Map();
    optionMeta.forEach(({ base }) => {
      if (!base) return;
      const key = base.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [optionMeta]);

  const filteredOptions = useMemo(() => {
    const items = [];
    const disambiguate = showFolderFilter && selectedFolder === 'All';
    optionMeta.forEach(({ opt, path, base, folderPath }) => {
      if (!path) {
        items.push(opt);
        return;
      }
      const folder = folderPath || 'root';
      if (showFolderFilter && selectedFolder !== 'All' && folder !== selectedFolder) return;
      let label = base || formatFileBaseName(path) || opt.label;
      if (disambiguate && base) {
        const key = base.toLowerCase();
        if (baseCounts.get(key) > 1) {
          const folderLabel = folder === 'root' ? 'root' : folder.split('/').pop() || folder;
          label = `${label} (${folderLabel})`;
        }
      }
      items.push({ ...opt, label });
    });
    return items.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
  }, [optionMeta, baseCounts, selectedFolder, showFolderFilter]);

  const hasValueInFiltered = useMemo(() => {
    if (valueStr === '' || valueStr === null || valueStr === undefined) return true;
    return filteredOptions.some((opt) => String(opt.value) === String(valueStr));
  }, [filteredOptions, valueStr]);

  const handleChange = (next) => {
    const value = next && next.target ? next.target.value : next;
    onChange?.(value);
  };

  return (
    <div className="w-full space-y-2">
      {showFolderFilter ? (
        <div className="relative w-full">
          <Select
            value={selectedFolder}
            onChange={setSelectedFolder}
            disabled={disabled}
            aria-label={`Choose folder for ${label || name}`}
            size="sm"
            options={folderOptions.map((folder) => ({ value: folder, label: folder }))}
          />
        </div>
      ) : null}

      <div className="relative w-full">
        <Select
          key={`${name || 'field'}:${selectedFolder}`}
          id={name}
          name={name}
          value={valueStr}
          onChange={handleChange}
          disabled={disabled}
          aria-label={label || name}
          aria-describedby={description ? `${name}-description` : undefined}
          placeholder={filteredOptions.length > 0 && (valueStr === undefined || valueStr === '') ? 'Select...' : undefined}
          emptyLabel="No matches"
          options={[
            ...(!hasValueInFiltered && valueStr !== ''
              ? [{ value: valueStr, label: formatFileBaseName(String(valueStr)) }]
              : []),
            ...filteredOptions,
          ]}
        />
      </div>
    </div>
  );
}

export default memo(DropdownInput);
