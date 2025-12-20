import { memo } from 'react';

function SegmentedTabs({
  items = [],
  value,
  onChange,
  ariaLabel,
  role = 'tablist',
  className = '',
  tabClassName = '',
  size = 'md',
  layout = 'equal',
  wrap = false,
}) {
  const classes = [
    'segmented-tabs',
    size === 'sm' ? 'is-compact' : '',
    layout === 'auto' ? 'is-auto' : '',
    layout === 'icon' ? 'is-icon' : '',
    wrap ? 'is-wrap' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const tabRole = role === 'tablist' ? 'tab' : 'button';

  return (
    <div className={classes} role={role} aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.key === value;
        const label = item.label ? String(item.label) : '';
        return (
          <button
            key={item.key}
            type="button"
            role={tabRole}
            aria-selected={role === 'tablist' ? isActive : undefined}
            aria-pressed={role !== 'tablist' ? isActive : undefined}
            className={[
              'segmented-tab',
              isActive ? 'is-active' : '',
              item.icon && !label ? 'is-icon' : '',
              item.className || '',
              tabClassName,
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (item.disabled) return;
              onChange?.(item.key);
            }}
            disabled={item.disabled}
            title={item.title || label || item.ariaLabel}
            aria-label={item.ariaLabel}
          >
            {item.icon ? <span className="segmented-tab-icon">{item.icon}</span> : null}
            {label ? <span className="segmented-tab-label">{label}</span> : null}
            {item.badge ? <span className="segmented-tab-badge">{item.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default memo(SegmentedTabs);
