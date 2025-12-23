import { memo, useMemo, useState } from 'react';

const normalizeOptions = (options = []) =>
  (options || []).map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return {
      value: opt?.value ?? opt?.id ?? '',
      label: opt?.label ?? opt?.name ?? String(opt?.value ?? ''),
      disabled: Boolean(opt?.disabled),
    };
  });

const filterOptions = (options, query) => {
  if (!query) return options;
  const term = query.trim().toLowerCase();
  if (!term) return options;
  return options.filter((opt) => {
    const label = String(opt.label || '').toLowerCase();
    const value = String(opt.value || '').toLowerCase();
    return label.includes(term) || value.includes(term);
  });
};

function Select({
  value,
  onChange,
  options,
  children,
  placeholder,
  emptyLabel = 'No matches',
  disabled = false,
  size = 'md',
  className = '',
  wrapperClassName = '',
  searchable = false,
  searchThreshold = 0,
  searchPlaceholder = 'Search options...',
  searchValue,
  onSearchChange,
  searchAriaLabel = 'Search options',
  ...props
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const query = typeof searchValue === 'string' ? searchValue : internalSearch;
  const setQuery = onSearchChange || setInternalSearch;

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const shouldSearch = searchable
    || (typeof searchThreshold === 'number' && searchThreshold > 0 && normalizedOptions.length > searchThreshold);
  const filteredOptions = useMemo(
    () => (shouldSearch ? filterOptions(normalizedOptions, query) : normalizedOptions),
    [normalizedOptions, query, shouldSearch]
  );

  const selectClasses = [
    'ui-control',
    'ui-select',
    size === 'sm' ? 'is-compact' : '',
    className,
    !shouldSearch ? wrapperClassName : '',
  ]
    .filter(Boolean)
    .join(' ');

  const renderOptions = () => {
    if (children) return children;
    if (!filteredOptions.length) {
      return (
        <option value="" disabled>
          {emptyLabel}
        </option>
      );
    }
    return filteredOptions.map((opt) => (
      <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
        {opt.label}
      </option>
    ));
  };

  const selectElement = (
    <select
      {...props}
      className={selectClasses}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {renderOptions()}
    </select>
  );

  if (!shouldSearch) {
    return selectElement;
  }

  return (
    <div className={['ui-select-stack', wrapperClassName].filter(Boolean).join(' ')}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="ui-control ui-input is-compact"
        aria-label={searchAriaLabel}
        disabled={disabled}
      />
      {selectElement}
    </div>
  );
}

export default memo(Select);
