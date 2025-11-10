import React from 'react';

export default function WizardWorkflowStep({
  workflows = [],
  selectedWorkflow,
  onSelectWorkflow,
  loading,
}) {
  if (loading) {
    return (
      <div className="wizard-card">
        <p className="wizard-subtitle">Loading workflows…</p>
      </div>
    );
  }

  if (!workflows.length) {
    return (
      <div className="wizard-card">
        <h2 className="wizard-title">No workflows found</h2>
        <p className="wizard-subtitle">Add a workflow JSON and refresh.</p>
      </div>
    );
  }

  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div>
          <h2 className="wizard-title">Select a workflow</h2>
          <p className="wizard-subtitle">Each file is a different graph.</p>
        </div>
      </div>
      <div className="wizard-grid">
        {workflows.map((workflow) => {
          const isActive = workflow === selectedWorkflow;
          return (
            <button
              key={workflow}
              type="button"
              onClick={() => onSelectWorkflow(workflow)}
              className={[
                'wizard-workflow-card',
                isActive ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="wizard-workflow-name">{workflow}</div>
              <div className="wizard-workflow-hint">
                {isActive ? 'Selected' : 'Select'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
