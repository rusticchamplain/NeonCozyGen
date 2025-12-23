import { useEffect, useMemo, useState } from 'react';
import BottomSheet from '../primitives/BottomSheet';
import Button from '../primitives/Button';
import { formatTokenWeight } from '../../utils/tokenWeights';

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export default function TokenStrengthSheet({
  open,
  onClose,
  title = 'Alias strength',
  tokenLabel = '',
  weight = 1,
  onApply,
  onRemoveWeight,
  onDeleteToken,
}) {
  const initial = useMemo(() => clamp(weight || 1, 0.2, 2.0), [weight]);
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
  }, [open, initial]);

  const pretty = formatTokenWeight(draft);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <div className="flex gap-2">
          <Button variant="muted" className="w-full" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              onApply?.(draft);
              onClose?.();
            }}
          >
            Done
          </Button>
        </div>
      )}
    >
      <div className="sheet-stack token-strength-sheet">
        <div className="sheet-section">
          <div className="sheet-label">Alias</div>
          <div className="sheet-hint">{tokenLabel || '—'}</div>
        </div>

        <div className="sheet-section">
          <div className="sheet-label">Strength</div>
          <div className="token-strength-row">
            <Button
              size="sm"
              variant="muted"
              onClick={() => setDraft((v) => clamp(v - 0.05, 0.2, 2.0))}
            >
              −
            </Button>
            <div className="token-strength-value tabular-nums">
              {pretty}×
            </div>
            <Button
              size="sm"
              variant="muted"
              onClick={() => setDraft((v) => clamp(v + 0.05, 0.2, 2.0))}
            >
              +
            </Button>
          </div>
          <input
            type="range"
            min={0.2}
            max={2.0}
            step={0.05}
            value={draft}
            onChange={(e) => setDraft(clamp(e.target.value, 0.2, 2.0))}
            className="ui-range"
            aria-label="Alias strength"
          />
          <div className="sheet-hint token-strength-hint">
            1.0× is normal. Increase to emphasize or reduce to soften.
          </div>
        </div>

        <div className="sheet-section">
          <div className="sheet-label">Actions</div>
          <div className="token-strength-actions">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDraft(1)}
            >
              Reset
            </Button>
            <span className="token-strength-divider" aria-hidden="true">|</span>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onDeleteToken?.();
                onClose?.();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
