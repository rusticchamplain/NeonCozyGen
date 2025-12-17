import { useMemo } from 'react';
import BottomSheet from './BottomSheet';

export default function TextAreaSheet({
  open,
  onClose,
  title,
  value,
  onChange,
  placeholder = '',
  description,
}) {
  const label = title || 'Edit';
  const textareaId = useMemo(
    () => `sheet-textarea-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={label}
      variant="fullscreen"
      footer={(
        <button type="button" className="ui-button is-primary w-full" onClick={onClose}>
          Done
        </button>
      )}
    >
      {description ? (
        <div className="text-[12px] text-[#9DA3FFCC] mb-3">
          {description}
        </div>
      ) : null}
      <textarea
        id={textareaId}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="sheet-textarea"
        rows={12}
        autoFocus
      />
    </BottomSheet>
  );
}

