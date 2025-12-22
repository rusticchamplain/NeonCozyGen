import { useEffect, useMemo, useState } from 'react';
import BottomSheet from '../primitives/BottomSheet';
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
          <button type="button" className="ui-button is-muted w-full" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-button is-primary w-full"
            onClick={() => {
              onApply?.(draft);
              onClose?.();
            }}
          >
            Done
          </button>
        </div>
      )}
    >
      <div className="sheet-stack">
        <div className="sheet-section">
          <div className="sheet-label">Alias</div>
          <div className="sheet-hint">{tokenLabel || '—'}</div>
        </div>

        <div className="sheet-section">
          <div className="sheet-label">Strength</div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="ui-button is-muted is-compact"
              onClick={() => setDraft((v) => clamp(v - 0.05, 0.2, 2.0))}
            >
              −
            </button>
            <div className="text-sm text-[rgba(237,242,255,0.92)] tabular-nums">
              {pretty}×
            </div>
            <button
              type="button"
              className="ui-button is-muted is-compact"
              onClick={() => setDraft((v) => clamp(v + 0.05, 0.2, 2.0))}
            >
              +
            </button>
          </div>
          <input
            type="range"
            min={0.2}
            max={2.0}
            step={0.05}
            value={draft}
            onChange={(e) => setDraft(clamp(e.target.value, 0.2, 2.0))}
            className="w-full"
            aria-label="Alias strength"
          />
          <div className="sheet-hint">1.0× is normal. Increase to emphasize or reduce to soften.</div>
        </div>

        <div className="sheet-section">
          <div className="sheet-label">Actions</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="ui-button is-ghost is-compact"
              onClick={() => setDraft(1)}
            >
              Reset to 1.0×
            </button>
            <button
              type="button"
              className="ui-button is-ghost is-compact"
              onClick={() => {
                onRemoveWeight?.();
                onClose?.();
              }}
            >
              Remove strength
            </button>
            <button
              type="button"
              className="ui-button is-danger is-compact"
              onClick={() => {
                onDeleteToken?.();
                onClose?.();
              }}
            >
              Remove alias
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
