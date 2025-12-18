import { forwardRef } from 'react';
import { IconChevronRight } from './Icons';

const CollapsibleSection = forwardRef(function CollapsibleSection(
  {
    title,
    kicker,
    meta,
    defaultOpen = true,
    variant = 'card',
    className = '',
    bodyClassName,
    children,
  },
  ref
) {
  const isBare = variant === 'bare';

  const detailClasses = (
    isBare
      ? ['collapsible-section', 'collapsible-section--bare', className]
      : ['ui-panel', 'collapsible-card', 'sectioned-card', className]
  )
    .filter(Boolean)
    .join(' ');

  const bodyClasses = (
    isBare
      ? ['collapsible-section-body', bodyClassName ? bodyClassName : 'space-y-4']
      : ['collapsible-card-body', bodyClassName ? bodyClassName : 'space-y-4']
  )
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
      <summary className={isBare ? 'collapsible-section-summary' : 'collapsible-card-summary'}>
        <div className="flex flex-col gap-1">
          {kicker ? <span className="ui-kicker">{kicker}</span> : null}
          <span className="text-sm font-semibold tracking-wide">{title}</span>
        </div>
        {metaContent}
        {isBare ? (
          <span className="collapsible-section-chevron" aria-hidden="true">
            <IconChevronRight size={16} />
          </span>
        ) : null}
      </summary>
      <div className={bodyClasses}>{children}</div>
    </details>
  );
});

export default CollapsibleSection;
