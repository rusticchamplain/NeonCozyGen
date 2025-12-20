// js/src/pages/MainPage.jsx
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomBar from '../components/BottomBar';
import ImageInput from '../components/ImageInput';
import FieldSpotlight from '../components/FieldSpotlight';
import WorkflowFormLayout from '../components/workflow/WorkflowFormLayout';
import CollapsibleSection from '../components/CollapsibleSection';
import RunLogsSheet from '../components/RunLogsSheet';
import { IconControls, IconImages, IconArrowUp } from '../components/Icons';
import { loadLastEditedParam, saveFormState, saveLastEditedParam } from '../utils/storage';
import { useStudioContext } from '../contexts/StudioContext';
import { deleteWorkflowPreset, getWorkflowPresets, saveWorkflowPreset } from '../api';

const WorkflowSelectorBar = memo(function WorkflowSelectorBar({
  workflows,
  selectedWorkflow,
  onWorkflowChange,
  workflowData,
  presets,
  presetName,
  onPresetNameChange,
  selectedPresetId,
  onPresetSelect,
  onPresetSave,
  onPresetApply,
  onPresetDelete,
  presetStatus,
}) {
  const presetCount = presets.length;
  const presetLabel = presetCount ? `${presetCount} saved` : 'No presets yet';
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);
  return (
    <div className="controls-context">
      <div className="controls-context-row">
        <div className="controls-context-field">
          <label className="controls-context-label" htmlFor="workflow-select">
            Workflow
          </label>
          <select
            id="workflow-select"
            value={selectedWorkflow || ''}
            onChange={(e) => onWorkflowChange(e.target.value)}
            className="controls-context-select"
            aria-label="Workflow"
          >
            <option value="">Select workflow…</option>
            {workflows.map((wf) => (
              <option key={wf} value={wf}>{wf}</option>
            ))}
          </select>
        </div>
        <div className="controls-context-field">
          <label className="controls-context-label" htmlFor="preset-select">
            Preset
          </label>
          <select
            id="preset-select"
            value={selectedPresetId || ''}
            onChange={(e) => onPresetSelect(e.target.value)}
            className="controls-context-select"
            aria-label="Workflow preset"
            disabled={!workflowData}
          >
            <option value="">Presets…</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
        </div>
        <div className="controls-context-actions">
          <button
            type="button"
            className="controls-context-btn is-primary"
            onClick={onPresetApply}
            disabled={!workflowData || !selectedPresetId}
          >
            Apply
          </button>
          <div className="controls-context-menu">
            <button
              type="button"
              className="controls-context-btn is-ghost"
              onClick={toggleMenu}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              ⋯
            </button>
            {menuOpen ? (
              <div className="controls-context-menu-items" role="menu">
                <div className="controls-context-menu-row">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => onPresetNameChange(e.target.value)}
                    className="controls-context-input"
                    placeholder="Preset name"
                    aria-label="Preset name"
                    disabled={!workflowData}
                  />
                  <button
                    type="button"
                    className="controls-context-menu-btn"
                    onClick={() => { onPresetSave(); closeMenu(); }}
                    disabled={!workflowData || !presetName.trim()}
                    role="menuitem"
                  >
                    Save
                  </button>
                </div>
                <button
                  type="button"
                  className="controls-context-menu-btn is-danger"
                  onClick={() => { onPresetDelete(); closeMenu(); }}
                  disabled={!workflowData || !selectedPresetId}
                  role="menuitem"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="controls-context-meta">
        <span>{presetLabel}</span>
        {presetStatus ? <span className="controls-context-status">{presetStatus}</span> : null}
      </div>
    </div>
  );
});

function MainPage() {
  const navigate = useNavigate();
  const {
    workflows = [],
    selectedWorkflow,
    selectWorkflow,
    workflowData,
    dynamicInputs = [],
    imageInputs = [],
    formData,
    setFormData,
    handleFormChange,
    aliasOptions,
    aliasCatalog,
    isLoading,
    progressValue,
    progressMax,
    statusText,
    statusPhase,
    handleGenerate,
    logEntries,
    clearLogs,
    promptFieldName,
    orderedDynamicInputs,
  } = useStudioContext();

  const parameterSectionRef = useRef(null);
  const imageSectionRef = useRef(null);
  const [lastEditedParam, setLastEditedParam] = useState(() => loadLastEditedParam());
  const [spotlight, setSpotlight] = useState(null);
  const spotlightName = spotlight?.name || '';
  const handleCloseSpotlight = useCallback(() => setSpotlight(null), []);
  const [logsOpen, setLogsOpen] = useState(false);
  const [visibleParams, setVisibleParams] = useState([]);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetStatus, setPresetStatus] = useState('');
  const spotlightCacheRef = useRef(new Map());
  const openComposer = useCallback(
    (fieldName = '') => {
      const target = fieldName || promptFieldName || 'prompt';
      const query = target ? `?field=${encodeURIComponent(target)}` : '';
      navigate(`/compose${query}`);
    },
    [navigate, promptFieldName]
  );

  useEffect(() => {
    if (statusPhase === 'finished') {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('cozygen_gallery_pending', '1');
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event('cozygen:gallery-pending'));
      }
    }
  }, [statusPhase]);

  const handleWorkflowSelect = useCallback((name) => {
    if (!name || name === selectedWorkflow) return;
    if (selectedWorkflow) {
      saveFormState(selectedWorkflow, formData || {}, { immediate: true });
    }
    setPresetName('');
    setSelectedPresetId('');
    setPresetStatus('');
    selectWorkflow(name);
  }, [formData, selectedWorkflow, selectWorkflow]);

  const handlePresetSelect = useCallback((id) => {
    setSelectedPresetId(id);
    const preset = presets.find((entry) => entry.id === id);
    setPresetName(preset?.name || '');
  }, [presets]);

  // Apply user-defined ordering + hiding
  const safeImageInputs = imageInputs || [];
  const hasWorkflowLoaded = Boolean(workflowData && selectedWorkflow);
  const hasImageInputs = safeImageInputs.length > 0;
  const buildSpotlightState = useCallback(
    (name, payload) => {
      const cache = spotlightCacheRef.current;
      if (payload && name) {
        cache.set(name, payload);
      }
      const navOrder = visibleParams.length ? visibleParams : payload?.order || [];
      const total = navOrder.length;
      const index = total > 0 ? navOrder.indexOf(name) : -1;
      const prevName = index > 0 ? navOrder[index - 1] : null;
      const nextName = index >= 0 && index < total - 1 ? navOrder[index + 1] : null;
      const prevPayload = prevName ? cache.get(prevName) : null;
      const nextPayload = nextName ? cache.get(nextName) : null;
      return {
        ...payload,
        index: index >= 0 ? index : 0,
        total,
        onPrev: prevPayload
          ? () => setSpotlight(buildSpotlightState(prevName, prevPayload))
          : null,
        onNext: nextPayload
          ? () => setSpotlight(buildSpotlightState(nextName, nextPayload))
          : null,
        onRender: handleGenerate,
      };
    },
    [visibleParams, handleGenerate]
  );

  const handleVisibleParamsChange = useCallback((order) => {
    const safeOrder = order || [];
    setVisibleParams((prev) => {
      if (
        prev.length === safeOrder.length &&
        prev.every((val, idx) => val === safeOrder[idx])
      ) {
        return prev;
      }
      return safeOrder;
    });
  }, []);

  const handleParamEdited = useCallback((name) => {
    const nextName = name || '';
    setLastEditedParam(nextName);
    saveLastEditedParam(nextName);
  }, []);

  const handleSpotlight = useCallback((payload) => {
    if (!payload?.name) return;
    setSpotlight(buildSpotlightState(payload.name, payload));
  }, [buildSpotlightState]);

  const availablePresetKeys = useMemo(() => {
    const inputs = [...(orderedDynamicInputs || []), ...(imageInputs || [])];
    const keys = inputs
      .map((input) => input?.inputs?.param_name)
      .filter((key) => key && typeof key === 'string');
    return new Set(keys);
  }, [orderedDynamicInputs, imageInputs]);

  const loadPresets = useCallback(async (workflowName) => {
    if (!workflowName) {
      setPresets([]);
      setSelectedPresetId('');
      return;
    }
    try {
      const data = await getWorkflowPresets(workflowName);
      const next = Array.isArray(data?.presets) ? data.presets : [];
      setPresets(next);
      setSelectedPresetId((prev) => (prev && next.some((p) => p.id === prev) ? prev : ''));
      setPresetMenuOpen(false);
    } catch (err) {
      console.error('Failed to load workflow presets', err);
      setPresets([]);
      setPresetStatus('Presets unavailable.');
    }
  }, []);

  useEffect(() => {
    loadPresets(selectedWorkflow);
  }, [selectedWorkflow, loadPresets]);

  const handlePresetSave = useCallback(async () => {
    if (!selectedWorkflow) return;
    const name = presetName.trim();
    if (!name) {
      setPresetStatus('Name a preset to save.');
      return;
    }
    const values = {};
    const allowedKeys = availablePresetKeys;
    Object.entries(formData || {}).forEach(([key, value]) => {
      if (!allowedKeys.size || allowedKeys.has(key)) {
        values[key] = value;
      }
    });
    const selectedPreset = presets.find((p) => p.id === selectedPresetId);
    const targetId = selectedPreset && selectedPreset.name.toLowerCase() === name.toLowerCase()
      ? selectedPreset.id
      : undefined;
    try {
      const data = await saveWorkflowPreset(selectedWorkflow, {
        id: targetId,
        name,
        values,
      });
      const next = Array.isArray(data?.presets) ? data.presets : [];
      const saved = data?.preset;
      setPresets(next);
      if (saved?.id) {
        setSelectedPresetId(saved.id);
      }
      setPresetStatus(`Saved "${name}".`);
    } catch (err) {
      console.error('Failed to save preset', err);
      setPresetStatus('Save failed.');
    }
  }, [availablePresetKeys, formData, presetName, presets, selectedPresetId, selectedWorkflow]);

  const handlePresetApply = useCallback(() => {
    if (!selectedWorkflow || !selectedPresetId) return;
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset?.values) return;
    const allowedKeys = availablePresetKeys;
    const nextValues = {};
    Object.entries(preset.values).forEach(([key, value]) => {
      if (!allowedKeys.size || allowedKeys.has(key)) {
        nextValues[key] = value;
      }
    });
    setFormData((prev) => {
      const next = { ...prev, ...nextValues };
      saveFormState(selectedWorkflow, next, { immediate: true });
      return next;
    });
    setPresetStatus(`Applied "${preset.name}".`);
  }, [availablePresetKeys, presets, selectedPresetId, selectedWorkflow, setFormData]);

  const handlePresetDelete = useCallback(async () => {
    if (!selectedWorkflow || !selectedPresetId) return;
    try {
      const data = await deleteWorkflowPreset(selectedWorkflow, selectedPresetId);
      const next = Array.isArray(data?.presets) ? data.presets : [];
      setPresets(next);
      setSelectedPresetId('');
      setPresetStatus('Preset deleted.');
    } catch (err) {
      console.error('Failed to delete preset', err);
      setPresetStatus('Delete failed.');
    }
  }, [selectedPresetId, selectedWorkflow]);

  const renderSpotlightContent = useCallback(
    () => spotlight?.render?.(formData),
    [spotlight, formData]
  );

  useEffect(() => {
    const handler = () => {
      if (!hasWorkflowLoaded || isLoading) return;
      handleGenerate();
    };
    window.addEventListener('cozygen:request-render', handler);
    return () => window.removeEventListener('cozygen:request-render', handler);
  }, [handleGenerate, hasWorkflowLoaded, isLoading]);

  useEffect(() => {
    const active =
      statusPhase === 'queued' ||
      statusPhase === 'running' ||
      isLoading;
    try {
      window.dispatchEvent(
        new CustomEvent('cozygen:render-state', {
          detail: { active },
        })
      );
    } catch {
      // ignore
    }
  }, [statusPhase, isLoading]);

  if (!workflows || workflows.length === 0) {
    return (
      <div className="page-shell">
        <div className="neon-card px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-sm text-[#9DA3FFCC]">
            No workflows found. Drop a workflow file in CozyGen and refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell page-stack has-dock controls-page">
      <div className="page-bar controls-bar">
        <h1 className="page-bar-title">Controls</h1>
        <div className="page-bar-actions">
          {lastEditedParam ? (
            <span className="controls-meta">Last: {lastEditedParam}</span>
          ) : null}
        </div>
      </div>

      <section className="controls-board">
        <CollapsibleSection
          title={<><IconControls size={18} className="inline-block mr-2 align-text-bottom" />Parameters</>}
          bodyClassName="control-shell controls-body"
          defaultOpen
          className="controls-panel"
        >
          <WorkflowSelectorBar
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onWorkflowChange={handleWorkflowSelect}
            workflowData={workflowData}
            presets={presets}
            presetName={presetName}
            onPresetNameChange={setPresetName}
            selectedPresetId={selectedPresetId}
            onPresetSelect={handlePresetSelect}
            onPresetSave={handlePresetSave}
            onPresetApply={handlePresetApply}
            onPresetDelete={handlePresetDelete}
            presetStatus={presetStatus}
          />

          {workflowData ? (
            <WorkflowFormLayout
              workflowName={selectedWorkflow}
              dynamicInputs={orderedDynamicInputs}
              formData={formData}
              onFormChange={handleFormChange}
              parameterSectionRef={parameterSectionRef}
              compactControls
              lastEditedParam={lastEditedParam}
              spotlightName={spotlightName}
              onCloseSpotlight={handleCloseSpotlight}
              onVisibleParamsChange={handleVisibleParamsChange}
              aliasOptions={aliasOptions}
              aliasCatalog={aliasCatalog}
              onOpenComposer={openComposer}
              onParamEdited={handleParamEdited}
              onSpotlight={handleSpotlight}
            />
          ) : (
            <div className="empty-state-inline">
              <span className="empty-state-arrow"><IconArrowUp size={20} /></span>
              <span>Select a workflow above to get started</span>
            </div>
          )}
        </CollapsibleSection>

        {hasImageInputs ? (
          <CollapsibleSection
            ref={imageSectionRef}
            className="scroll-mt-24 controls-panel controls-subpanel"
            title={<><IconImages size={18} className="inline-block mr-2 align-text-bottom" />Images</>}
            defaultOpen={false}
            variant="bare"
          >
            {workflowData ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {safeImageInputs.map((imgInput) => (
                  <ImageInput
                    key={imgInput.id}
                    input={imgInput}
                    value={formData[imgInput.inputs.param_name] || ''}
                    onFormChange={handleFormChange}
                  />
                ))}
              </div>
            ) : null}
          </CollapsibleSection>
        ) : null}
      </section>

      <div className="controls-status-strip">
        <div className="controls-status-left">
          <span className={`controls-status-dot is-${statusPhase || 'idle'}`} aria-hidden="true" />
          <div className="controls-status-text">
            <span className="controls-status-phase">{statusPhase || 'idle'}</span>
            <span className="controls-status-msg">{statusText || 'Idle'}</span>
          </div>
        </div>
        <div className="controls-status-right">
          {isLoading && progressMax > 0 ? (
            <div className="controls-status-meter" aria-label="Progress">
              <div
                className="controls-status-meter-fill"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, Math.round(((progressValue || 0) / progressMax) * 100))
                  )}%`,
                }}
              />
            </div>
          ) : null}
          <button
            type="button"
            className="controls-status-btn"
            onClick={() => setLogsOpen(true)}
          >
            Logs
          </button>
        </div>
      </div>

      <section className="dock-panel">
        <BottomBar
          busy={isLoading}
          progressValue={progressValue}
          progressMax={progressMax}
          statusText={statusText}
          statusPhase={statusPhase}
          primaryLabel="Render"
          onPrimary={handleGenerate}
          primaryDisabled={!hasWorkflowLoaded}
          onLogs={() => setLogsOpen(true)}
        />
      </section>

      <FieldSpotlight
        open={!!spotlight}
        onClose={handleCloseSpotlight}
        title={spotlight?.label}
        description={spotlight?.description}
        render={renderSpotlightContent}
        index={spotlight?.index ?? 0}
        total={spotlight?.total ?? 0}
        onPrev={spotlight?.onPrev || null}
        onNext={spotlight?.onNext || null}
        onRender={spotlight?.onRender || null}
      >
        {null}
      </FieldSpotlight>

      <RunLogsSheet
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        logs={logEntries}
        onClear={clearLogs}
      />
    </div>
  );
}

export default MainPage;
