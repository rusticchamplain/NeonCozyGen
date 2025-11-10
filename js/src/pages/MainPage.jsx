// js/src/pages/MainPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import BottomBar from '../components/BottomBar';
import WorkflowHeader from '../components/workflow/WorkflowHeader';
import AdvancedModeLayout from '../components/workflow/AdvancedModeLayout';

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
  const [studioExpanded, setStudioExpanded] = useState(false);
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
    setFormData((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      if (selectedWorkflow) {
        saveFormState(selectedWorkflow, next);
      }
      return next;
    });
  };

  const readCurrentValues = () => ({ ...(formData || {}) });

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

  const queueState = statusPhase || (isLoading ? 'Rendering' : 'Idle');
  const queueDetail =
    statusText ||
    (selectedWorkflow ? 'Ready when you are' : 'Pick a workflow to begin');
  const rawProgress = progressMax
    ? Math.min(100, Math.round((progressValue / progressMax) * 100))
    : 0;
  const commandProgress = isLoading ? Math.max(5, rawProgress) : rawProgress;

  const heroActionLabel = studioExpanded ? 'Hide Studio' : 'Open Studio';

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
    <div className="page-shell page-stack">
      <section className="ui-panel space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="ui-kicker">Live queue</p>
            <div className="text-2xl font-semibold text-white">{queueState}</div>
            <p className="ui-hint">{queueDetail}</p>
          </div>
          <div className="flex flex-col gap-3 min-w-[220px]">
            <div>
              <div className="h-2 rounded-full bg-[#1C2140] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF60D0] to-[#3EF0FF]"
                  style={{ width: `${commandProgress}%` }}
                />
              </div>
              <div className="text-right text-[11px] text-[#9DA3FFCC] mt-1">
                {`${commandProgress}%`}
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                className="ui-button is-muted is-compact"
                onClick={() => setStudioExpanded((prev) => !prev)}
              >
                {heroActionLabel}
              </button>
              <button
                type="button"
                aria-pressed={walkthroughMode}
                onClick={() => setWalkthroughMode((prev) => !prev)}
                className="ui-button is-ghost is-compact"
              >
                {walkthroughMode ? 'Guide On' : 'Guide Off'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/presets" className="ui-pill is-soft">Presets</Link>
          <Link to="/gallery" className="ui-pill is-soft">Gallery</Link>
          <Link to="/personalize" className="ui-pill is-soft">Layout</Link>
        </div>
      </section>

      {studioExpanded && (
        <section className="ui-panel space-y-4" ref={workflowSectionRef}>
          <WorkflowHeader
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={handleWorkflowSelect}
            walkthroughMode={walkthroughMode}
            setWalkthroughMode={setWalkthroughMode}
          />
          <div className="rounded-xl border border-[#262B4D] bg-[#080A1F] px-3 py-3 text-[12px] text-[#C3C7FF]">
            Advanced Studio surfaces the same graph inputs you see in ComfyUI, now organized into collapsible panels.
          </div>
        </section>
      )}

      {studioExpanded ? (
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
              walkthroughFocusId={null}
              imageSectionRef={imageSectionRef}
            />
          ) : (
            <div className="rounded-2xl border border-[#2A2E4A] bg-[#050716] px-3 py-6 text-[12px] text-[#9DA3FFCC] text-center">
              Select a workflow to begin.
            </div>
          )}
        </section>
      ) : (
        <section className="ui-panel text-center space-y-2">
          <p className="ui-hint">
            Studio mode is tucked away until you need it. Use the button above to reveal the full control surface.
          </p>
          <Link to="/" className="ui-button is-primary is-compact mx-auto">
            Run the Wizard
          </Link>
        </section>
      )}

      {studioExpanded && (
        <section ref={bottomBarRef} className="dock-panel">
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
      )}
    </div>
  );
}

export default MainPage;
