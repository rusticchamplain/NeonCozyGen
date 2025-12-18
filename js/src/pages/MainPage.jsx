// js/src/pages/MainPage.jsx
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import BottomBar from '../components/BottomBar';
import ImageInput from '../components/ImageInput';
import FieldSpotlight from '../components/FieldSpotlight';
import PromptComposer from '../components/PromptComposer';
import WorkflowFormLayout from '../components/workflow/WorkflowFormLayout';
import CollapsibleSection from '../components/CollapsibleSection';
import RunLogsSheet from '../components/RunLogsSheet';
import { IconControls, IconImages, IconArrowUp, IconActivity } from '../components/Icons';
import { resolveConfig } from '../components/DynamicForm';
import { isModelFileLike } from '../utils/modelDisplay';

import { useWorkflows } from '../hooks/useWorkflows';
import { useWorkflowForm } from '../hooks/useWorkflowForm';
import { useExecutionQueue } from '../hooks/useExecutionQueue';
import { loadLastEditedParam, saveFormState, saveLastEditedParam } from '../utils/storage';
import { applyFieldOrder } from '../utils/fieldOrder';
import usePromptAliases from '../hooks/usePromptAliases';
import { presentAliasEntry } from '../utils/aliasPresentation';

const WorkflowSelectorBar = memo(function WorkflowSelectorBar({
  workflows,
  selectedWorkflow,
  onWorkflowChange,
  workflowData,
}) {
  return (
    <div className="context-bar">
      <div className="context-chip">
        <select
          value={selectedWorkflow || ''}
          onChange={(e) => onWorkflowChange(e.target.value)}
          className="context-select"
          aria-label="Workflow"
        >
          <option value="">Select workflow…</option>
          {workflows.map((wf) => (
            <option key={wf} value={wf}>{wf}</option>
          ))}
        </select>
      </div>
    </div>
  );
});

const PromptPreviewCard = memo(function PromptPreviewCard({
  workflowData,
  expandedPrompt,
  onOpenComposer,
  promptFieldName,
}) {
  if (!workflowData) return null;
  return (
    <div className="studio-preview-card">
      <div className="studio-preview-head">
        <span className="studio-preview-title">Expanded prompt</span>
        <button
          type="button"
          onClick={() => onOpenComposer(promptFieldName)}
          className="ui-button is-muted is-compact"
        >
          <span>Open composer</span>
        </button>
      </div>
      <div className="studio-preview-body">
        {expandedPrompt || '—'}
      </div>
    </div>
  );
});

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
  const { aliases, aliasCategories, aliasLookup, aliasOptions } = usePromptAliases();

  const {
    isLoading,
    progressValue,
    progressMax,
    statusText,
    statusPhase,
    handleGenerate,
    logEntries,
    clearLogs,
  } = useExecutionQueue({
    selectedWorkflow,
    workflowData,
    dynamicInputs,
    imageInputs,
    formData,
    setFormData,
    promptAliases: aliasLookup,
  });

  const parameterSectionRef = useRef(null);
  const imageSectionRef = useRef(null);
  const [collapseAllState, setCollapseAllState] = useState({ key: 0, collapsed: true });
  const [lastEditedParam, setLastEditedParam] = useState(() => {
    return loadLastEditedParam();
  });
  const [spotlight, setSpotlight] = useState(null);
  const spotlightName = spotlight?.name || '';
  const handleCloseSpotlight = useCallback(() => setSpotlight(null), []);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerField, setComposerField] = useState('prompt');
  const [logsOpen, setLogsOpen] = useState(false);
  const [visibleParams, setVisibleParams] = useState([]);
  const spotlightCacheRef = useRef(new Map());
  const previewFormData = formData || {};

  // Find the best prompt field to edit (also used for preview)
  const orderedDynamicInputs = useMemo(
    () => applyFieldOrder(selectedWorkflow, dynamicInputs),
    [selectedWorkflow, dynamicInputs]
  );

  const promptFieldName = useMemo(() => {
    const inputs = (orderedDynamicInputs || dynamicInputs || []).filter(
      (inp) => inp?.class_type !== 'CozyGenImageInput'
    );

    const bannedRe = /\b(checkpoint|ckpt|lora|model|vae|embedding|clip|sampler|scheduler|seed)\b/i;
    const scoreField = (cfg) => {
      const name = String(cfg?.paramName || '').toLowerCase();
      const label = String(cfg?.label || '').toLowerCase();
      const combined = `${name} ${label}`;
      const value = formData?.[cfg?.paramName];
      const strVal = typeof value === 'string' ? value : '';

      let score = 0;
      if (combined.includes('prompt')) score += 100;
      if (combined.includes('negative') && combined.includes('prompt')) score -= 15;
      if (cfg?.multiline) score += 10;
      if (strVal.includes('$')) score += 20;
      if (bannedRe.test(combined)) score -= 200;
      if (isModelFileLike(strVal)) score -= 200;
      return score;
    };

    // Prefer the canonical 'prompt' field when present and string-like.
    if (typeof formData?.prompt === 'string') return 'prompt';

    const candidates = inputs
      .map((inp) => resolveConfig(inp))
      .filter((cfg) => cfg?.paramType === 'STRING' && cfg?.paramName);

    if (!candidates.length) {
      // Fall back to legacy heuristic when no schema exists.
      const withAlias = Object.entries(formData || {}).find(
        ([, v]) => typeof v === 'string' && v.includes('$') && !isModelFileLike(v)
      );
      if (withAlias) return withAlias[0];
      const firstString = Object.entries(formData || {}).find(
        ([, v]) => typeof v === 'string' && !isModelFileLike(v)
      );
      return firstString?.[0] || 'prompt';
    }

    let best = candidates[0];
    let bestScore = scoreField(best);
    for (let i = 1; i < candidates.length; i++) {
      const cfg = candidates[i];
      const score = scoreField(cfg);
      if (score > bestScore) {
        best = cfg;
        bestScore = score;
      }
    }
    return best?.paramName || 'prompt';
  }, [dynamicInputs, formData, orderedDynamicInputs]);

  const aliasCatalog = useMemo(() => {
    const entries = [];
    Object.entries(aliases || {}).forEach(([key, text]) => {
      const parts = String(key).split('::');
      const hasCat = parts.length > 1;
      const category = (aliasCategories && aliasCategories[key]) || (hasCat ? parts[0] : '');
      const name = hasCat ? parts.slice(1).join('::') : key;
      const base = {
        key,
        name,
        category,
        text,
        token: category ? `${category}:${name}` : name,
      };
      entries.push({ ...base, ...presentAliasEntry(base) });
    });
    return entries;
  }, [aliases, aliasCategories]);

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

  const previewField = useMemo(() => {
    // Prefer the resolved prompt field (works even when the key isn't literally "prompt")
    if (promptFieldName && typeof previewFormData?.[promptFieldName] === 'string') {
      return promptFieldName;
    }

    // Prefer the canonical prompt field when present.
    if (typeof previewFormData?.prompt === 'string') return 'prompt';

    // Otherwise use first string with $alias$.
    const withAlias = Object.entries(previewFormData || {}).find(
      ([, v]) => typeof v === 'string' && v.includes('$')
    );
    if (withAlias) return withAlias[0];

    // Finally: show *some* string field rather than blanking the card.
    const firstString = Object.entries(previewFormData || {}).find(
      ([, v]) => typeof v === 'string'
    );
    return firstString?.[0] || '';
  }, [previewFormData, promptFieldName]);

  const previewPromptText = useMemo(() => {
    if (!previewField) return '';
    const promptText = previewFormData?.[previewField] || '';
    return typeof promptText === 'string' ? promptText : String(promptText ?? '');
  }, [previewField, previewFormData]);

  const deferredPreviewPromptText = useDeferredValue(previewPromptText);

  const expandedPrompt = useMemo(() => {
    const MAX_PREVIEW_CHARS = 2600;
    const truncate = (s) => (s && s.length > MAX_PREVIEW_CHARS ? `${s.slice(0, MAX_PREVIEW_CHARS)}…` : s);
    const text = deferredPreviewPromptText || '';

    if (!text) return '';
    if (!aliasLookup || !text.includes('$')) return truncate(text);

    try {
      const expanded = text.replace(/\$([a-z0-9_:-]+)\$/gi, (match, key) => {
        const val = aliasLookup.get(key.toLowerCase());
        return typeof val === 'string' ? val : match;
      });
      return truncate(expanded);
    } catch {
      return truncate(text);
    }
  }, [aliasLookup, deferredPreviewPromptText]);

  const handleWorkflowSelect = useCallback((name) => {
    if (!name || name === selectedWorkflow) return;
    if (selectedWorkflow) {
      saveFormState(selectedWorkflow, formData || {}, { immediate: true });
    }
    selectWorkflow(name);
  }, [formData, selectedWorkflow, selectWorkflow]);

  const applyFormPatch = useCallback((patch) => {
    if (!patch) return;
    setFormData((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      if (selectedWorkflow) {
        saveFormState(selectedWorkflow, next);
      }
      return next;
    });
  }, [selectedWorkflow, setFormData]);

  // Prompt Composer handlers
  const openComposer = useCallback((fieldName = 'prompt') => {
    setComposerField(fieldName);
    setComposerOpen(true);
  }, []);

  const handleComposerChange = useCallback((newValue) => {
    if (composerField) {
      handleFormChange(composerField, newValue);
    }
  }, [composerField, handleFormChange]);

  const openDefaultComposer = useCallback(() => {
    openComposer(promptFieldName || 'prompt');
  }, [openComposer, promptFieldName]);

  // Apply user-defined ordering + hiding
  const safeImageInputs = imageInputs || [];
  const hasWorkflowLoaded = Boolean(workflowData && selectedWorkflow);
  const hasImageInputs = safeImageInputs.length > 0;
  const imageMeta = workflowData
    ? hasImageInputs
      ? `${safeImageInputs.length} slots`
      : 'No inputs'
    : 'Waiting';
  const controlMeta = workflowData ? '' : 'Waiting';

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
    const handler = (evt) => {
      const fieldName = evt?.detail?.fieldName;
      if (typeof fieldName === 'string' && fieldName.trim()) {
        openComposer(fieldName.trim());
        return;
      }
      openDefaultComposer();
    };
    window.addEventListener('cozygen:open-composer', handler);
    return () => window.removeEventListener('cozygen:open-composer', handler);
  }, [openComposer, openDefaultComposer]);

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
    <div className="page-shell page-stack has-dock">
      <CollapsibleSection
        kicker="Parameters"
        title={<><IconControls size={18} className="inline-block mr-2 align-text-bottom" />Controls</>}
        meta={controlMeta}
        bodyClassName="control-shell"
        defaultOpen
        variant="bare"
      >
        <WorkflowSelectorBar
          workflows={workflows}
          selectedWorkflow={selectedWorkflow}
          onWorkflowChange={handleWorkflowSelect}
          workflowData={workflowData}
        />

        {workflowData ? (
          <div className="controls-toolbar">
            <div className="controls-toolbar-row">
              <button
                type="button"
                className="ui-button is-muted is-compact"
                onClick={() => setCollapseAllState((prev) => ({ key: prev.key + 1, collapsed: true }))}
              >
                Collapse all
              </button>
              <button
                type="button"
                className="ui-button is-muted is-compact"
                onClick={() => setCollapseAllState((prev) => ({ key: prev.key + 1, collapsed: false }))}
              >
                Expand all
              </button>
            </div>
            <div className="controls-toolbar-row">
              <button
                type="button"
                className="ui-button is-ghost is-compact"
                onClick={() => openComposer(promptFieldName)}
              >
                Open composer
              </button>
              <button
                type="button"
                className="ui-button is-ghost is-compact"
                onClick={() => parameterSectionRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })}
              >
                Jump to top
              </button>
            </div>
          </div>
        ) : null}

        {workflowData ? (
          <WorkflowFormLayout
            workflowName={selectedWorkflow}
            dynamicInputs={orderedDynamicInputs}
            formData={formData}
            onFormChange={handleFormChange}
            parameterSectionRef={parameterSectionRef}
            compactControls
            collapseAllState={collapseAllState}
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
        <PromptPreviewCard
          workflowData={workflowData}
          expandedPrompt={expandedPrompt}
          onOpenComposer={openComposer}
          promptFieldName={promptFieldName}
        />
      </CollapsibleSection>

      <CollapsibleSection
        kicker="Run"
        title={<><IconActivity size={18} className="inline-block mr-2 align-text-bottom" />Status</>}
        meta={statusText || 'Idle'}
        defaultOpen={false}
        className="studio-status-card is-compact"
      >
        <div className="run-status-strip">
          <div className="run-status-left">
            <div className={`run-status-dot is-${statusPhase || 'idle'}`} aria-hidden="true" />
            <div className="run-status-text">
              <div className="run-status-phase">{statusPhase || 'idle'}</div>
              <div className="run-status-msg">{statusText || 'Idle'}</div>
            </div>
          </div>
          <div className="run-status-actions">
            {isLoading && progressMax > 0 ? (
              <div className="run-status-meter" aria-label="Progress">
                <div
                  className="run-status-meter-fill"
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
              className="ui-button is-muted is-compact"
              onClick={() => setLogsOpen(true)}
            >
              View logs
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {hasImageInputs ? (
        <CollapsibleSection
          ref={imageSectionRef}
          className="scroll-mt-24 is-compact"
          kicker="Assets"
          title={<><IconImages size={18} className="inline-block mr-2 align-text-bottom" />Images</>}
          meta={imageMeta}
          defaultOpen={false}
          variant="bare"
        >
          {workflowData ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

      <PromptComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        value={formData?.[composerField] || ''}
        onChange={handleComposerChange}
        aliasOptions={aliasOptions}
        aliasCatalog={aliasCatalog}
        aliasLookup={aliasLookup}
        fieldLabel={composerField}
      />

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
