import { forwardRef } from 'react';

const CollapsibleSection = forwardRef(function CollapsibleSection(
  {
    title,
    kicker,
    meta,
    defaultOpen = true,
    className = '',
    bodyClassName,
    children,
  },
  ref
) {
  const detailClasses = ['ui-panel', 'collapsible-card', 'sectioned-card', className]
    .filter(Boolean)
    .join(' ');
  const bodyClasses = [
    'collapsible-card-body',
    bodyClassName ? bodyClassName : 'space-y-4',
  ]
    .filter(Boolean)
    .join(' ');

  const metaContent =
    meta !== undefined && meta !== null ? (
      <div className="collapsible-card-summary-meta">
        {meta}
      </div>
    ) : null;

  return (
    <details ref={ref} className={detailClasses} open={defaultOpen}>
      <summary className="collapsible-card-summary">
        <div className="flex flex-col gap-1">
          {kicker ? <span className="ui-kicker">{kicker}</span> : null}
          <span className="text-sm font-semibold tracking-wide">{title}</span>
        </div>
        {metaContent}
      </summary>
      <div className={bodyClasses}>{children}</div>
    </details>
  );
});

export default CollapsibleSection;
