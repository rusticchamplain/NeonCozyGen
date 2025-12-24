import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TagLibrarySheet from '../components/TagLibrarySheet';
import Button from '../../../ui/primitives/Button';

export default function TagLibrary({ inline = false }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQuery = params.get('q') || '';

  const pageTitle = useMemo(() => (
    initialQuery ? `Tag Library — “${initialQuery}”` : 'Tag Library'
  ), [initialQuery]);

  if (inline) {
    return (
      <TagLibrarySheet
        inline
        initialQuery={initialQuery}
        title=""
        onSelectTag={null}
      />
    );
  }

  return (
    <div className="page-shell page-stack">
      <div className="page-bar">
        <h1 className="page-bar-title">{pageTitle}</h1>
        <div className="page-bar-actions">
          <Button
            size="xs"
            onClick={() => navigate('/library?tab=aliases')}
          >
            Aliases
          </Button>
          <Button
            size="xs"
            onClick={() => navigate('/compose')}
          >
            Composer
          </Button>
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
