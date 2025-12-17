import { useNavigate } from 'react-router-dom';
import BottomSheet from './ui/BottomSheet';

export default function LibrarySheet({ open, onClose }) {
  const navigate = useNavigate();

  const go = (to) => {
    onClose?.();
    navigate(to);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Library"
      footer={(
        <button type="button" className="ui-button is-primary w-full" onClick={onClose}>
          Close
        </button>
      )}
    >
      <div className="sheet-stack">
        <div className="sheet-section">
          <div className="sheet-label">Collections</div>
          <button type="button" className="ui-button is-muted w-full" onClick={() => go('/presets')}>
            ✨ Presets
          </button>
          <button type="button" className="ui-button is-muted w-full" onClick={() => go('/aliases')}>
            🔖 Aliases
          </button>
          <button type="button" className="ui-button is-muted w-full" onClick={() => go('/lora-library')}>
            🧩 LoRA Library
          </button>
        </div>

        <div className="sheet-section">
          <div className="sheet-hint">
            Tip: keep Studio open while you browse; apply presets/aliases from their screens.
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

