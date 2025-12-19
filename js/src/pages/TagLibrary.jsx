import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TagLibrarySheet from '../components/TagLibrarySheet';
import { IconTag } from '../components/Icons';

export default function TagLibrary() {
  const [params] = useSearchParams();
  const initialQuery = params.get('q') || '';

  const pageTitle = useMemo(() => (
    initialQuery ? `Tag Library — “${initialQuery}”` : 'Tag Library'
  ), [initialQuery]);

  return (
    <div className="page-shell page-stack">
      <div className="page-header">
        <div className="page-title-row">
          <span className="page-title-icon" aria-hidden="true">
            <IconTag size={18} />
          </span>
          <div>
            <div className="page-kicker">Reference</div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">Browse, collect, and copy tags from the centralized library.</p>
          </div>
        </div>
      </div>

      <TagLibrarySheet
        inline
        initialQuery={initialQuery}
        title="Browse"
        onSelectTag={null}
      />
    </div>
  );
}
