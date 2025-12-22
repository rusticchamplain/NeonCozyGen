import Button from '../../../ui/primitives/Button';

export default function ComposerSelectionBar({
  className = '',
  style,
  label,
  status,
  applyLabel,
  onClear,
  onApply,
  disabled = false,
}) {
  return (
    <div className={`composer-tag-collection-bar ${className}`.trim()} style={style}>
      <div>
        <div className="composer-tag-collection-label">
          {label}
        </div>
        {status ? (
          <div className="composer-tag-collection-status">{status}</div>
        ) : null}
      </div>
      <div className="composer-tag-collection-actions">
        <Button
          size="xs"
          variant="muted"
          onClick={onClear}
          disabled={disabled}
        >
          Clear
        </Button>
        <Button
          size="xs"
          variant="primary"
          onClick={onApply}
          disabled={disabled}
        >
          {applyLabel}
        </Button>
      </div>
    </div>
  );
}
