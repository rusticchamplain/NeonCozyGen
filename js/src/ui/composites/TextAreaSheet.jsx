import { useMemo } from 'react';
import BottomSheet from '../primitives/BottomSheet';
import Button from '../primitives/Button';

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
        <Button variant="primary" className="w-full" onClick={onClose}>
          Done
        </Button>
      )}
    >
      {description ? (
        <div className="text-[12px] text-[rgba(159,178,215,0.75)] mb-3">
          {description}
        </div>
      ) : null}
      <textarea
        id={textareaId}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="sheet-textarea ui-control ui-textarea"
        rows={12}
      />
    </BottomSheet>
  );
}
