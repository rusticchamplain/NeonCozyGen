// js/src/pages/WizardPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import WizardProgress from '../components/wizard/WizardProgress';
import WizardWorkflowStep from '../components/wizard/WizardWorkflowStep';
import WizardPresetStep from '../components/wizard/WizardPresetStep';
import WizardParameterStep from '../components/wizard/WizardParameterStep';
import WizardImageStep from '../components/wizard/WizardImageStep';
import WizardReviewStep from '../components/wizard/WizardReviewStep';
import { useWorkflows } from '../hooks/useWorkflows';
import { useWorkflowForm } from '../hooks/useWorkflowForm';
import { useExecutionQueue } from '../hooks/useExecutionQueue';
import { applyFieldOrder } from '../utils/fieldOrder';
import { saveFormState } from '../utils/storage';

const STEP_LABELS = {
  workflow: 'Workflow',
  presets: 'Presets',
  parameters: 'Parameters',
  images: 'Images',
  review: 'Review',
};

export default function WizardPage() {
  const {
    workflows,
    selectedWorkflow,
    selectWorkflow,
    loading: workflowsLoading,
  } = useWorkflows();

  const {
    workflowData,
    dynamicInputs = [],
    imageInputs = [],
    formData,
    setFormData,
    handleFormChange,
  } = useWorkflowForm(selectedWorkflow);

  const {
    isLoading: isGenerating,
    progressValue,
    progressMax,
    statusText,
    handleGenerate,
  } = useExecutionQueue({
    selectedWorkflow,
    workflowData,
    dynamicInputs,
    imageInputs,
    formData,
    setFormData,
  });

  const orderedDynamicInputs = useMemo(
    () => applyFieldOrder(selectedWorkflow, dynamicInputs),
    [selectedWorkflow, dynamicInputs]
  );

  const [activeStepId, setActiveStepId] = useState(null);

  const readCurrentValues = useCallback(
    () => ({
      formData,
    }),
    [formData]
  );

  const handleWorkflowSelect = useCallback(
    (name) => {
      if (!name || name === selectedWorkflow) return;
      if (selectedWorkflow) {
        saveFormState(selectedWorkflow, formData || {});
      }
      selectWorkflow(name);
    },
    [selectedWorkflow, formData, selectWorkflow]
  );

  const applyFormPatch = useCallback(
    (patch) => {
      if (!patch) return;
      setFormData((prev) => ({ ...(prev || {}), ...patch }));
    },
    [setFormData]
  );

  const stepConfigs = useMemo(() => {
    const workflowLoaded = !!workflowData;
    const hasImages = (imageInputs || []).length > 0;

    return [
      {
        id: 'workflow',
        label: STEP_LABELS.workflow,
        caption: '',
        optional: false,
        canContinue: () => !!selectedWorkflow,
        render: () => (
          <WizardWorkflowStep
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={handleWorkflowSelect}
            loading={workflowsLoading}
          />
        ),
      },
      {
        id: 'presets',
        label: STEP_LABELS.presets,
        caption: '',
        optional: true,
        canContinue: () => true,
        render: () => (
          <WizardPresetStep
            workflowName={selectedWorkflow}
            onApplyPresetPatch={applyFormPatch}
            readCurrentValues={readCurrentValues}
          />
        ),
      },
      {
        id: 'parameters',
        label: STEP_LABELS.parameters,
        caption: '',
        optional: false,
        canContinue: () => workflowLoaded,
        render: () => (
          <WizardParameterStep
            dynamicInputs={orderedDynamicInputs}
            formData={formData}
            onFormChange={handleFormChange}
          />
        ),
      },
      {
        id: 'images',
        label: STEP_LABELS.images,
        caption: '',
        optional: !hasImages,
        shouldSkip: () => !hasImages,
        canContinue: () => true,
        render: () => (
          <WizardImageStep
            imageInputs={imageInputs}
            formData={formData}
            onFormChange={handleFormChange}
          />
        ),
      },
      {
        id: 'review',
        label: STEP_LABELS.review,
        caption: '',
        optional: false,
        canContinue: () => !!selectedWorkflow && workflowLoaded && !isGenerating,
        render: () => (
          <WizardReviewStep
            workflowName={selectedWorkflow}
            formData={formData}
            imageInputs={imageInputs}
            isGenerating={isGenerating}
            statusText={statusText}
            progressValue={progressValue}
            progressMax={progressMax}
          />
        ),
      },
    ];
  }, [
    workflows,
    selectedWorkflow,
    handleWorkflowSelect,
    workflowsLoading,
    applyFormPatch,
    readCurrentValues,
    orderedDynamicInputs,
    formData,
    handleFormChange,
    imageInputs,
    workflowData,
    isGenerating,
    statusText,
    progressValue,
    progressMax,
  ]);

  const visibleSteps = useMemo(
    () =>
      stepConfigs.filter((step) => !(typeof step.shouldSkip === 'function' && step.shouldSkip())),
    [stepConfigs]
  );

  useEffect(() => {
    if (!visibleSteps.length) return;
    if (!activeStepId) {
      setActiveStepId(visibleSteps[0].id);
      return;
    }

    const stillExists = visibleSteps.some((step) => step.id === activeStepId);
    if (!stillExists) {
      setActiveStepId(visibleSteps[0].id);
    }
  }, [visibleSteps, activeStepId]);

  const activeIndex = visibleSteps.findIndex((step) => step.id === activeStepId);
  const activeStep = visibleSteps[activeIndex] || visibleSteps[0];

  const progressSteps = visibleSteps.map((step, idx) => ({
    id: step.id,
    label: step.label,
    caption: step.caption,
    status:
      idx < activeIndex ? 'done' : idx === activeIndex ? 'active' : 'locked',
  }));

  const goRelative = (delta) => {
    if (!visibleSteps.length) return;
    const nextIndex = Math.min(
      visibleSteps.length - 1,
      Math.max(0, activeIndex + delta)
    );
    setActiveStepId(visibleSteps[nextIndex].id);
  };

  const handleBack = () => {
    goRelative(-1);
  };

  const handleNext = () => {
    if (!activeStep) return;
    const isLast = activeIndex === visibleSteps.length - 1;
    if (isLast) {
      if (!isGenerating) {
        handleGenerate();
      }
      return;
    }
    goRelative(1);
  };

  const handleSkip = () => {
    goRelative(1);
  };

  const canContinue = activeStep?.canContinue
    ? activeStep.canContinue()
    : true;
  const isLastStep = activeIndex === visibleSteps.length - 1;

  const primaryLabel = isLastStep ? 'Render' : 'Next';
  const secondaryLabel = activeStep?.optional ? 'Skip' : null;

  return (
    <div className="wizard-shell-lite">
      <header className="wizard-header">
        <div className="wizard-header-info">
          <span className="wizard-tag">Wizard</span>
          <h1>{activeStep?.label || 'Workflow'}</h1>
        </div>
        <Link to="/studio" className="wizard-header-link">
          Studio
        </Link>
      </header>

      <WizardProgress steps={progressSteps} />

      <section className="wizard-stage-lite">
        {activeStep?.render ? activeStep.render() : null}
      </section>

      <div className="wizard-actions">
        <button
          type="button"
          onClick={handleBack}
          disabled={activeIndex <= 0}
          className="wizard-btn subtle"
        >
          Back
        </button>
        {secondaryLabel && (
          <button
            type="button"
            onClick={handleSkip}
            className="wizard-btn ghost"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canContinue}
          className="wizard-btn primary"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
