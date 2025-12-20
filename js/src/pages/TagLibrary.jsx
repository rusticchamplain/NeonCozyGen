import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TagLibrarySheet from '../components/TagLibrarySheet';

export default function TagLibrary() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQuery = params.get('q') || '';

  const pageTitle = useMemo(() => (
    initialQuery ? `Tag Library — “${initialQuery}”` : 'Tag Library'
  ), [initialQuery]);

  return (
    <div className="page-shell page-stack">
      <div className="page-bar">
        <h1 className="page-bar-title">{pageTitle}</h1>
        <div className="page-bar-actions">
          <button
            type="button"
            className="page-bar-btn"
            onClick={() => navigate('/aliases')}
          >
            Aliases
          </button>
          <button
            type="button"
            className="page-bar-btn"
            onClick={() => navigate('/compose')}
          >
            Composer
          </button>
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
