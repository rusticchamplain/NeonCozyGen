import { memo, useEffect, useMemo, useRef } from 'react';

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
  const buttonRefs = useRef([]);

  useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, items.length);
  }, [items.length]);

  const enabledIndices = useMemo(
    () => items.map((item, idx) => (!item.disabled ? idx : null)).filter((idx) => idx !== null),
    [items]
  );
  const activeIndex = useMemo(
    () => items.findIndex((item) => item.key === value && !item.disabled),
    [items, value]
  );
  const fallbackIndex = enabledIndices.length ? enabledIndices[0] : -1;
  const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;

  const focusIndex = (idx) => {
    const btn = buttonRefs.current[idx];
    btn?.focus?.();
  };

  const getNextEnabledIndex = (startIdx, delta) => {
    if (!items.length) return startIdx;
    let next = startIdx;
    for (let i = 0; i < items.length; i += 1) {
      next = (next + delta + items.length) % items.length;
      if (!items[next]?.disabled) return next;
    }
    return startIdx;
  };

  return (
    <div className={classes} role={role} aria-label={ariaLabel}>
      {items.map((item, idx) => {
        const isActive = item.key === value;
        const label = item.label ? String(item.label) : '';
        return (
          <button
            key={item.key}
            type="button"
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            role={tabRole}
            aria-selected={role === 'tablist' ? isActive : undefined}
            aria-pressed={role !== 'tablist' ? isActive : undefined}
            aria-controls={role === 'tablist' ? item.controls : undefined}
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
            onKeyDown={(e) => {
              if (role !== 'tablist') return;
              if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
              e.preventDefault();
              if (!items.length) return;
              let nextIdx = idx;
              if (e.key === 'Home') {
                nextIdx = enabledIndices.length ? enabledIndices[0] : nextIdx;
              } else if (e.key === 'End') {
                nextIdx = enabledIndices.length ? enabledIndices[enabledIndices.length - 1] : nextIdx;
              } else if (e.key === 'ArrowRight') {
                nextIdx = getNextEnabledIndex(nextIdx, 1);
              } else if (e.key === 'ArrowLeft') {
                nextIdx = getNextEnabledIndex(nextIdx, -1);
              }
              const nextItem = items[nextIdx];
              if (!nextItem || nextItem.disabled) return;
              onChange?.(nextItem.key);
              focusIndex(nextIdx);
            }}
            disabled={item.disabled}
            title={item.title || label || item.ariaLabel}
            aria-label={item.ariaLabel}
            tabIndex={role === 'tablist' ? (idx === currentIndex ? 0 : -1) : undefined}
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
