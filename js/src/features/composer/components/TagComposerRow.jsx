import { memo, useCallback } from 'react';
import { formatSubcategoryLabel } from '../../../utils/aliasPresentation';

const TagComposerRow = memo(function TagComposerRow({
  tag,
  category,
  count,
  isCollected,
  onToggle,
  visibilityStyle,
}) {
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onToggle(tag);
  }, [onToggle, tag]);

  return (
    <button
      type="button"
      className={`composer-alias-item composer-tag-item ${isCollected ? 'is-collected' : ''}`}
      onClick={handleClick}
      style={visibilityStyle}
      data-virtual-row="true"
    >
      <div className="composer-alias-header">
        <div className="composer-alias-name composer-tag-name">
          <code className="composer-tag-code">{tag}</code>
        </div>
        {category ? (
          <span className="composer-alias-category">
            {formatSubcategoryLabel(category)}
          </span>
        ) : null}
      </div>
      <div className="composer-alias-token composer-tag-count">{Number(count || 0).toLocaleString()}</div>
    </button>
  );
});

export default TagComposerRow;
