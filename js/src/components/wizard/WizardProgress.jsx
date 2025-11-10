import React from 'react';

export default function WizardProgress({ steps = [] }) {
  if (!steps.length) return null;

  return (
    <div className="wizard-progress">
      {steps.map((step, index) => {
        const isActive = step.status === 'active';
        const isDone = step.status === 'done';

        return (
          <div key={step.id} className="wizard-progress-step">
            <div
              className={[
                'wizard-progress-dot',
                isActive ? 'is-active' : '',
                isDone ? 'is-done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{index + 1}</span>
            </div>
            <div className="wizard-progress-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
