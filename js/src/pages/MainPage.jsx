// js/src/pages/MainPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import BottomBar from '../components/BottomBar';
import WorkflowHeader from '../components/workflow/WorkflowHeader';
import SimpleModeLayout from '../components/workflow/SimpleModeLayout';
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
    primaryImageInput,
    formData,
    randomizeState,
    bypassedState,
    setFormData,
    handleFormChange,
    handleRandomizeToggle,
    handleBypassToggle,
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
    randomizeState,
    bypassedState,
    setFormData,
  });

  const [simpleMode, setSimpleMode] = useState(
    () => localStorage.getItem('cozygen_simple_mode') === '1'
  );
  const [presetsOpen, setPresetsOpen] = useState(true);
  const [imagesOpen, setImagesOpen] = useState(true);
  const workflowSectionRef = useRef(null);
  const presetSectionRef = useRef(null);
  const parameterSectionRef = useRef(null);
  const [parameterNav, setParameterNav] = useState(null);

  useEffect(() => {
    localStorage.setItem('cozygen_simple_mode', simpleMode ? '1' : '0');
  }, [simpleMode]);

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
    randomizeState,
    bypassedState,
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
    if (simpleMode) return [];

    const workflowReady = !!selectedWorkflow;
    const workflowLoaded = !!workflowData;
    const paramsAvailable = !!(parameterNav && parameterNav.items?.length);

    return [
      {
        id: 'workflow',
        title: 'Select Workflow',
        description: 'Choose the Comfy pipeline that defines your graph.',
        status: workflowReady ? 'done' : 'active',
        statusLabel: workflowReady ? 'Ready' : 'Start',
        onJump: () => scrollToSection(workflowSectionRef),
      },
      {
        id: 'presets',
        title: 'Select Presets (optional)',
        description: 'Recall saved parameter sets or capture new ones.',
        status: workflowLoaded ? 'active' : 'locked',
        statusLabel: workflowLoaded ? 'Active' : 'Locked',
        onJump: () => scrollToSection(presetSectionRef),
        disabled: !workflowLoaded,
      },
      {
        id: 'parameters',
        title: 'Input Parameters',
        description: 'Fine tune every exposed control before rendering.',
        status: paramsAvailable ? 'active' : workflowLoaded ? 'active' : 'locked',
        statusLabel: paramsAvailable ? 'Navigate' : workflowLoaded ? 'Ready' : 'Locked',
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
            Workflow parameters will appear here once a workflow is loaded.
          </div>
        ),
      },
    ];
  }, [
    simpleMode,
    selectedWorkflow,
    workflowData,
    parameterNav,
    scrollToSection,
  ]);

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
    <div className="page-shell">
      <div className="neon-card px-3 py-3 sm:px-4 sm:py-4 space-y-4">
        {!simpleMode && processSteps.length > 0 && (
          <ProcessIndex steps={processSteps} />
        )}

        <section ref={workflowSectionRef} className="scroll-mt-28 space-y-2">
          <WorkflowHeader
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={handleWorkflowSelect}
            simpleMode={simpleMode}
            setSimpleMode={setSimpleMode}
          />

          {/* Tiny, unobtrusive link to layout studio */}
          <div className="flex justify-end -mt-2">
            <Link
              to="/personalize"
              className="text-[10px] sm:text-[11px] text-[#8EA3FFCC] hover:text-[#C7D2FF] underline decoration-dotted decoration-[#8EA3FF80]"
            >
              Customize control layout
            </Link>
          </div>
        </section>

        {workflowData ? (
          simpleMode ? (
            <SimpleModeLayout
              workflowName={selectedWorkflow}
              dynamicInputs={orderedDynamicInputs}
              imageInputs={imageInputs}
              primaryImageInput={primaryImageInput}
              formData={formData}
              randomizeState={randomizeState}
              bypassedState={bypassedState}
              onFormChange={handleFormChange}
              onRandomizeToggle={handleRandomizeToggle}
              onBypassToggle={handleBypassToggle}
            />
          ) : (
            <AdvancedModeLayout
              workflowName={selectedWorkflow}
              dynamicInputs={orderedDynamicInputs}
              imageInputs={imageInputs}
              formData={formData}
              randomizeState={randomizeState}
              bypassedState={bypassedState}
              onFormChange={handleFormChange}
              onRandomizeToggle={handleRandomizeToggle}
              onBypassToggle={handleBypassToggle}
              presetsOpen={presetsOpen}
              setPresetsOpen={setPresetsOpen}
              imagesOpen={imagesOpen}
              setImagesOpen={setImagesOpen}
              onApplyPresetPatch={applyFormPatch}
              readCurrentValues={readCurrentValues}
              presetSectionRef={presetSectionRef}
              parameterSectionRef={parameterSectionRef}
              onParameterNavReady={handleParameterNavReady}
            />
          )
        ) : (
          <div className="rounded-2xl border border-[#2A2E4A] bg-[#050716] px-3 py-6 text-[12px] text-[#9DA3FFCC] text-center">
            Select a workflow to begin.
          </div>
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
      </div>
    </div>
  );
}

export default MainPage;
