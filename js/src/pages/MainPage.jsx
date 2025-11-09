// js/src/pages/MainPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import BottomBar from '../components/BottomBar';
import WorkflowHeader from '../components/workflow/WorkflowHeader';
import SimpleModeLayout from '../components/workflow/SimpleModeLayout';
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
