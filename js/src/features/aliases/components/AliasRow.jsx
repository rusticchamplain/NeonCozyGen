import { memo, useCallback } from 'react';
import { formatAliasFriendlyName, formatCategoryLabel } from '../../../utils/aliasPresentation';

const AliasRow = memo(function AliasRow({
  id,
  name,
  category,
  text,
  isSelected,
  onOpen,
  visibilityStyle,
}) {
  const handleClick = useCallback(() => {
    onOpen(id);
  }, [id, onOpen]);

  const displayName = formatAliasFriendlyName({ name }) || name || 'Untitled';
  const aliasToken = category ? `${category}:${name}` : name;
  const short = `${(text || '').slice(0, 140)}${(text || '').length > 140 ? '…' : ''}`;

  return (
    <button
      type="button"
      role="listitem"
      className={`composer-alias-item ${isSelected ? 'is-selected' : ''}`}
      onClick={handleClick}
      style={visibilityStyle}
      data-virtual-row="true"
    >
      <div className="composer-alias-header">
        <div className="composer-alias-name">
          {displayName}
        </div>
        {category ? <span className="composer-alias-category">{formatCategoryLabel(category)}</span> : null}
      </div>
      <div className="composer-alias-token">${aliasToken || 'alias'}$</div>
      <div className="composer-alias-text">{short || '—'}</div>
    </button>
  );
});

export default AliasRow;
