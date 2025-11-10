// js/src/pages/MainPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import BottomBar from '../components/BottomBar';
import WorkflowHeader from '../components/workflow/WorkflowHeader';
import AdvancedModeLayout from '../components/workflow/AdvancedModeLayout';
import ProcessIndex from '../components/workflow/ProcessIndex';
import ParameterMiniMap from '../components/workflow/panels/ParameterMiniMap';

import { useWorkflows } from '../hooks/useWorkflows';
import { useWorkflowForm } from '../hooks/useWorkflowForm';
import { useExecutionQueue } from '../hooks/useExecutionQueue';
import { saveFormState } from '../utils/storage';
import { applyFieldOrder } from '../utils/fieldOrder';

function MainPage() {
  const {
    workflows = [],
    selectedWorkflow,
    selectWorkflow,
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
    isLoading,
    progressValue,
    progressMax,
    statusText,
    statusPhase,
    handleGenerate,
  } = useExecutionQueue({
    selectedWorkflow,
    workflowData,
    dynamicInputs,
    imageInputs,
    formData,
    setFormData,
  });

  const [walkthroughMode, setWalkthroughMode] = useState(
    () => localStorage.getItem('cozygen_walkthrough_mode') === '1'
  );
  const [presetsOpen, setPresetsOpen] = useState(true);
  const [imagesOpen, setImagesOpen] = useState(true);
  const workflowSectionRef = useRef(null);
  const presetSectionRef = useRef(null);
  const parameterSectionRef = useRef(null);
  const imageSectionRef = useRef(null);
  const bottomBarRef = useRef(null);
  const [parameterNav, setParameterNav] = useState(null);

  useEffect(() => {
    localStorage.setItem('cozygen_walkthrough_mode', walkthroughMode ? '1' : '0');
  }, [walkthroughMode]);

  const handleWorkflowSelect = (name) => {
    if (!name || name === selectedWorkflow) return;
    if (selectedWorkflow) {
      saveFormState(selectedWorkflow, formData || {});
    }
    selectWorkflow(name);
  };

  const applyFormPatch = (patch) => {
    if (!patch) return;
    setFormData((prev) => ({ ...(prev || {}), ...patch }));
  };

  const readCurrentValues = () => ({
    formData,
  });

  // Apply user-defined ordering + hiding
  const orderedDynamicInputs = useMemo(
    () => applyFieldOrder(selectedWorkflow, dynamicInputs),
    [selectedWorkflow, dynamicInputs]
  );

  const scrollToSection = useCallback((ref) => {
    if (!ref?.current) return;
    const offset = 80;
    const top = ref.current.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const handleParameterNavReady = useCallback((navState) => {
    setParameterNav((prev) => {
      if (!navState) return null;
      if (
        prev &&
        prev.items === navState.items &&
        prev.activeId === navState.activeId &&
        prev.onJump === navState.onJump
      ) {
        return prev;
      }
      return navState;
    });
  }, []);

  const processSteps = useMemo(() => {
    const workflowReady = !!selectedWorkflow;
    const workflowLoaded = !!workflowData;
    const paramsAvailable = !!(parameterNav && parameterNav.items?.length);
    const hasImages = !!(imageInputs && imageInputs.length);

    return [
      {
        id: 'workflow',
        title: 'Select Workflow',
        description: 'Pick the graph to run.',
        guideText: 'Choose a workflow.',
        status: workflowReady ? 'done' : 'active',
        statusLabel: workflowReady ? 'Ready' : 'Start',
        onJump: () => scrollToSection(workflowSectionRef),
      },
      {
        id: 'presets',
        title: 'Apply Preset (optional)',
        description: 'Load or capture a stack.',
        guideText: 'Tap a preset or skip.',
        status: workflowLoaded ? 'active' : 'locked',
        statusLabel: workflowLoaded ? 'Optional' : 'Locked',
        onJump: () => scrollToSection(presetSectionRef),
        disabled: !workflowLoaded,
      },
      {
        id: 'parameters',
        title: 'Input Parameters',
        description: 'Adjust exposed controls.',
        guideText: workflowLoaded
          ? 'Set what matters; the rest can wait.'
          : 'Load a workflow to reveal controls.',
        status: workflowLoaded ? 'active' : 'locked',
        statusLabel: workflowLoaded ? 'Active' : 'Locked',
        onJump: () => scrollToSection(parameterSectionRef),
        disabled: !workflowLoaded,
        content: paramsAvailable ? (
          <ParameterMiniMap
            items={parameterNav.items}
            activeId={parameterNav.activeId}
            onJump={parameterNav.onJump}
            variant="inline"
            title="Parameter Map"
          />
        ) : (
          <div className="rounded-xl border border-[#1F2342] bg-[#050716] px-3 py-2 text-[10px] text-[#6C719C]">
            Load a workflow to see its parameters.
          </div>
        ),
      },
      {
        id: 'images',
        title: 'Add Source Images',
        description: 'Attach references if required.',
        guideText: hasImages
          ? 'Drop the guides this workflow expects.'
          : 'This one skips image inputs.',
        status: workflowLoaded ? (hasImages ? 'active' : 'skip') : 'locked',
        statusLabel: hasImages ? 'Active' : workflowLoaded ? 'Skip' : 'Locked',
        onJump: hasImages ? () => scrollToSection(imageSectionRef) : undefined,
        disabled: !workflowLoaded || !hasImages,
      },
      {
        id: 'render',
        title: 'Render',
        description: 'Queue the job and stream updates.',
        guideText: workflowLoaded
          ? 'Hit render to send the run.'
          : 'Select a workflow first.',
        status: workflowLoaded ? 'active' : 'locked',
        statusLabel: workflowLoaded ? 'Ready' : 'Locked',
        onJump: workflowLoaded ? () => scrollToSection(bottomBarRef) : undefined,
        disabled: !workflowLoaded,
      },
    ];
  }, [selectedWorkflow, workflowData, parameterNav, scrollToSection, imageInputs]);

  const guideFocusId = useMemo(() => {
    if (!walkthroughMode || !processSteps.length) return null;
    const focusStep =
      processSteps.find(
        (step) => !['done', 'skip'].includes(step.status)
      ) || processSteps[processSteps.length - 1];
    return focusStep?.id || null;
  }, [walkthroughMode, processSteps]);

  const queueState = statusPhase || (isLoading ? 'Rendering' : 'Idle');
  const queueDetail =
    statusText ||
    (selectedWorkflow ? 'Ready when you are' : 'Pick a workflow to begin');
  const rawProgress = progressMax
    ? Math.min(100, Math.round((progressValue / progressMax) * 100))
    : 0;
  const commandProgress = isLoading ? Math.max(5, rawProgress) : rawProgress;

  const stackClasses = (id, extra = '') =>
    [
      'stack-card',
      extra,
      walkthroughMode && guideFocusId === id ? 'guide-focus' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const bottomSectionClasses = [
    'dock-panel',
    walkthroughMode ? 'guide-surface' : '',
    walkthroughMode && guideFocusId === 'render' ? 'guide-focus' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const quickLinks = [
    { label: 'Presets', hint: 'Library', to: '/presets' },
    { label: 'Gallery', hint: 'Outputs', to: '/gallery' },
    { label: 'Layout', hint: 'Arrange', to: '/personalize' },
  ];

  if (!workflows || workflows.length === 0) {
    return (
      <div className="page-shell">
        <div className="neon-card px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-sm text-[#9DA3FFCC]">
            No workflows found. Add a workflow file to your CozyGen folder and refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell mobile-prism">
      <section className="command-strip">
        <div className="command-main">
          <p className="command-eyebrow">Live queue</p>
          <div className="command-status">{queueState}</div>
          <p className="command-sub">{queueDetail}</p>
        </div>
        <div className="command-meter">
          <div className="command-bar">
            <div className="command-bar-fill" style={{ width: `${commandProgress}%` }} />
          </div>
          <p className="command-sub">{`${commandProgress}%`}</p>
        </div>
        <button
          type="button"
          aria-pressed={walkthroughMode}
          onClick={() => setWalkthroughMode((prev) => !prev)}
          className="command-toggle"
        >
          {walkthroughMode ? 'Guide on' : 'Guide off'}
        </button>
      </section>

      <section className="stack-grid">
        <div
          ref={workflowSectionRef}
          className={stackClasses('workflow', 'scroll-mt-24')}
        >
          <WorkflowHeader
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={handleWorkflowSelect}
            walkthroughMode={walkthroughMode}
            setWalkthroughMode={setWalkthroughMode}
          />
        </div>

        <div className="stack-card action-links">
          {quickLinks.map((link) => (
            <Link key={link.label} to={link.to} className="action-link">
              <div className="command-eyebrow">{link.hint}</div>
              <div>{link.label}</div>
            </Link>
          ))}
        </div>

        {processSteps.length > 0 && (
          <div className={stackClasses('parameters', 'full')}>
            <ProcessIndex
              steps={processSteps}
              mode={walkthroughMode ? 'guide' : 'default'}
              focusId={walkthroughMode ? guideFocusId : null}
            />
          </div>
        )}
      </section>

      <section className="control-shell">
        {workflowData ? (
          <AdvancedModeLayout
            workflowName={selectedWorkflow}
            dynamicInputs={orderedDynamicInputs}
            imageInputs={imageInputs}
            formData={formData}
            onFormChange={handleFormChange}
            presetsOpen={presetsOpen}
            setPresetsOpen={setPresetsOpen}
            imagesOpen={imagesOpen}
            setImagesOpen={setImagesOpen}
            onApplyPresetPatch={applyFormPatch}
            readCurrentValues={readCurrentValues}
            presetSectionRef={presetSectionRef}
            parameterSectionRef={parameterSectionRef}
            onParameterNavReady={handleParameterNavReady}
            walkthroughMode={walkthroughMode}
            walkthroughFocusId={walkthroughMode ? guideFocusId : null}
            imageSectionRef={imageSectionRef}
          />
        ) : (
          <div className="rounded-2xl border border-[#2A2E4A] bg-[#050716] px-3 py-6 text-[12px] text-[#9DA3FFCC] text-center">
            Select a workflow to begin.
          </div>
        )}
      </section>

      <section ref={bottomBarRef} className={bottomSectionClasses}>
        {walkthroughMode && (
          <div className="guide-hint">Ready? Render handles the queue.</div>
        )}
        <BottomBar
          busy={isLoading}
          progressValue={progressValue}
          progressMax={progressMax}
          statusText={statusText}
          statusPhase={statusPhase}
          primaryLabel="Render"
          onPrimary={handleGenerate}
        />
      </section>
    </div>
  );
}

export default MainPage;
