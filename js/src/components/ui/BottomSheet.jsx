import Modal from 'react-modal';

Modal.setAppElement('#root');

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'sheet', // 'sheet' | 'fullscreen'
  className = '',
  contentClassName = '',
  shouldCloseOnOverlayClick = true,
}) {
  const contentClasses = [
    'bottom-sheet-content',
    variant === 'fullscreen' ? 'is-fullscreen' : 'is-sheet',
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Modal
      isOpen={!!open}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={shouldCloseOnOverlayClick}
      overlayClassName={['bottom-sheet-overlay', className].filter(Boolean).join(' ')}
      className={contentClasses}
      contentLabel={title || 'Sheet'}
    >
      <div className="bottom-sheet-panel" role="dialog" aria-modal="true">
        <header className="bottom-sheet-head">
          <div className="bottom-sheet-title">
            {title || ''}
          </div>
          <button type="button" className="bottom-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="bottom-sheet-body">{children}</div>

        {footer ? <footer className="bottom-sheet-foot">{footer}</footer> : null}
      </div>
    </Modal>
  );
}

