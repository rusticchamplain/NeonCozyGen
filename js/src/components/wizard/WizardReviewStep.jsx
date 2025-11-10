import React, { useMemo } from 'react';

export default function WizardReviewStep({
  workflowName,
  formData,
  imageInputs = [],
  isGenerating,
  statusText,
  progressValue,
  progressMax,
}) {
  const populatedImages = useMemo(
    () =>
      imageInputs.filter((input) => formData[input.inputs.param_name]) || [],
    [imageInputs, formData]
  );

  return (
    <div className="wizard-card">
      <div className="wizard-card-header">
        <div>
          <h2 className="wizard-title">Review</h2>
          <p className="wizard-subtitle">Confirm settings, then queue the run.</p>
        </div>
      </div>

      <div className="wizard-summary-grid">
        <div className="wizard-summary-card">
          <div className="wizard-summary-label">Workflow</div>
          <div className="wizard-summary-value">
            {workflowName || 'Not selected'}
          </div>
        </div>
        <div className="wizard-summary-card">
          <div className="wizard-summary-label">Parameters touched</div>
          <div className="wizard-summary-value">
            {Object.keys(formData || {}).length}
          </div>
        </div>
        <div className="wizard-summary-card">
          <div className="wizard-summary-label">Source images</div>
          <div className="wizard-summary-value">
            {populatedImages.length}/{imageInputs.length}
          </div>
        </div>
      </div>

      <div className="wizard-status-bar">
        <div className="wizard-status-label">
          {isGenerating ? 'Rendering...' : 'Standing by'}
        </div>
        <div className="wizard-status-text">
          {statusText || (isGenerating ? 'Sending job to CozyGen' : 'Tap render when ready')}
        </div>
        {isGenerating && (
          <div className="wizard-progress-track">
            <div
              className="wizard-progress-fill"
              style={{
                width: progressMax
                  ? `${Math.min(100, (progressValue / progressMax) * 100)}%`
                  : '30%',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
