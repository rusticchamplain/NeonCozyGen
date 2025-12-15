const STATUS_PILL = {
  done: 'ui-pill is-soft',
  active: 'ui-pill',
  locked: 'ui-pill is-muted',
  skip: 'ui-pill is-muted',
};

export default function ProcessIndex({ steps = [], mode = 'default', focusId }) {
  if (!steps.length) return null;

  const containerClasses = [
    'ui-panel collapsible-card',
    mode === 'guide' ? 'guide-surface' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <details className={containerClasses}>
      <summary className="collapsible-card-summary">
        <span className="collapsible-card-summary-label">
          {mode === 'guide' ? 'Inline guide' : 'Flow index'}
        </span>
      </summary>
      <div className="collapsible-card-body space-y-3">
        <div className="ui-section-head">
          <div className="ui-section-text">
            <span className="ui-kicker">
              {mode === 'guide' ? 'Inline guide' : 'Flow index'}
            </span>
            <div className="ui-title">Steps</div>
          </div>
          <span className="ui-pill is-muted">{steps.length} steps</span>
        </div>
        <div className="space-y-2.5">
          {steps.map((step, idx) => {
          const pillClass =
            STATUS_PILL[step.status] || STATUS_PILL.locked;
          const isDisabled = step.disabled;
          const isGuideFocus = mode === 'guide' && focusId === step.id;
          const detailCopy =
            (mode === 'guide' ? step.guideText : step.description) ||
            step.description ||
            '';
          const buttonLabel =
            step.buttonLabel || (mode === 'guide' ? 'Go' : 'Jump');
          const cardClasses = [
            'ui-card space-y-2',
            mode === 'guide' ? 'guide-surface' : '',
            isGuideFocus ? 'guide-focus' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={step.id || idx} className={cardClasses}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="ui-kicker text-[10px]">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={pillClass}>
                      {step.statusLabel || step.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[#F0F4FF]">
                    {step.title}
                  </div>
                  {detailCopy && <p className="ui-hint">{detailCopy}</p>}
                </div>
                {step.onJump && (
                  <button
                    type="button"
                    onClick={step.onJump}
                    disabled={isDisabled}
                    className="ui-button is-muted is-compact"
                  >
                    {buttonLabel}
                  </button>
                )}
              </div>
              {step.content && <div>{step.content}</div>}
            </div>
          );
        })}
        </div>
      </div>
    </details>
  );
}
