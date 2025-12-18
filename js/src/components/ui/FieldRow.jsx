import { memo } from 'react';
import { IconChevronRight } from '../Icons';

function FieldRow({
  id,
  label,
  description,
  preview,
  expanded = false,
  onToggle,
  children,
  trailing,
  className = '',
}) {
  const isCollapsible = typeof onToggle === 'function';
  const descriptionId = id ? `${id}-description` : undefined;
  const panelId = id ? `${id}-panel` : undefined;
  const normalizedLabel =
    typeof label === 'string'
      ? label.trim().replace(/\s+/gu, ' ').replace(/:\s*$/u, '')
      : label;
  const normalizedDescription =
    typeof description === 'string'
      ? description.trim().replace(/\s+/gu, ' ')
      : description;
  const previewTitle =
    typeof preview === 'string' || typeof preview === 'number'
      ? String(preview)
      : undefined;

  const HeadTag = isCollapsible ? 'button' : 'div';
  const headProps = isCollapsible
    ? {
        type: 'button',
        onClick: onToggle,
        'aria-expanded': expanded,
        'aria-controls': panelId,
        'aria-describedby': normalizedDescription ? descriptionId : undefined,
      }
    : {};

  return (
    <div className={['field-row', className].filter(Boolean).join(' ')}>
      <HeadTag
        {...headProps}
        className={[
          'field-row-head',
          isCollapsible ? 'is-collapsible' : 'is-static',
          expanded ? 'is-expanded' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="field-row-main">
          <div className="field-row-label">{normalizedLabel}</div>
          {normalizedDescription ? (
            <div id={descriptionId} className="field-row-description">
              {normalizedDescription}
            </div>
          ) : null}
        </div>

        <div className="field-row-trailing">
          {trailing ? <div className="field-row-trailing-control">{trailing}</div> : null}
          {preview ? <div className="field-row-preview" title={previewTitle}>{preview}</div> : null}
          {isCollapsible ? (
            <div className="field-row-chevron" aria-hidden="true">
              <IconChevronRight size={16} />
            </div>
          ) : null}
        </div>
      </HeadTag>

      {isCollapsible && expanded ? (
        <div id={panelId} className="field-row-body">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default memo(FieldRow);
