import BottomSheet from '../../../ui/primitives/BottomSheet';
import Button from '../../../ui/primitives/Button';
import Select from '../../../ui/primitives/Select';
import { formatCategoryLabel, formatSubcategoryLabel } from '../../../utils/aliasPresentation';

export default function StringInputAliasPicker({
  open,
  onClose,
  isPromptLike,
  pickerSearch,
  onSearchChange,
  pickerSearchRef,
  categories,
  pickerCategory,
  onCategoryChange,
  subcategories,
  pickerSubcategory,
  onSubcategoryChange,
  filteredAliases,
  visibleAliases,
  visibleCount,
  onShowMore,
  listItemVisibilityStyles,
  onInsertAlias,
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isPromptLike ? 'Insert alias' : 'Aliases'}
      footer={(
        <Button variant="primary" className="w-full" onClick={onClose}>
          Done
        </Button>
      )}
    >
      <div className="sheet-stack">
        <div className="sheet-section">
          <div className="sheet-label">Search</div>
          <div className="composer-filters">
            <input
              ref={pickerSearchRef}
              type="text"
              value={pickerSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search aliases…"
              className="composer-search ui-control ui-input"
              aria-label="Search aliases"
            />
            <Select
              value={pickerCategory}
              onChange={onCategoryChange}
              className="composer-subcategory-select"
              aria-label="Filter by category"
              size="sm"
              options={['All', ...categories.filter((c) => c !== 'All')].map((c) => ({
                value: c,
                label: c === 'All' ? 'Category: All' : formatCategoryLabel(c),
              }))}
            />
            {subcategories.length > 2 ? (
              <Select
                value={pickerSubcategory}
                onChange={onSubcategoryChange}
                className="composer-subcategory-select"
                size="sm"
                options={subcategories.map((c) => ({
                  value: c,
                  label: c === 'All' ? 'All subcategories' : formatSubcategoryLabel(c),
                }))}
              />
            ) : null}
          </div>
        </div>

        <div className="sheet-section">
          <div className="sheet-label">Results</div>
          <div className="composer-alias-list">
            {filteredAliases.length === 0 ? (
              <div className="composer-alias-empty">No aliases found.</div>
            ) : (
              <>
                {visibleAliases.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => onInsertAlias(entry.token, { closeAfter: !isPromptLike })}
                    className="composer-alias-item"
                    style={listItemVisibilityStyles}
                  >
                    <div className="composer-alias-header">
                      <div className="composer-alias-name">
                        {entry.displayName || entry.token}
                      </div>
                      {entry.category ? (
                        <span className="composer-alias-category">
                          {formatCategoryLabel(entry.category)}
                        </span>
                      ) : null}
                    </div>
                    <div className="composer-alias-token">${entry.token}$</div>
                    <div className="composer-alias-text">{entry.text}</div>
                  </button>
                ))}

                {visibleCount < filteredAliases.length ? (
                  <Button
                    variant="muted"
                    className="w-full"
                    onClick={onShowMore}
                  >
                    Show more ({filteredAliases.length - visibleCount} left)
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
