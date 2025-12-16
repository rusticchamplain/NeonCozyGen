// js/src/pages/MainPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomBar from '../components/BottomBar';
import ImageInput from '../components/ImageInput';
import FieldSpotlight from '../components/FieldSpotlight';
import PromptComposer from '../components/PromptComposer';
import WorkflowHeader from '../components/workflow/WorkflowHeader';
import AdvancedModeLayout from '../components/workflow/AdvancedModeLayout';
import CollapsibleSection from '../components/CollapsibleSection';
import useGalleryPending from '../hooks/useGalleryPending';

import { useWorkflows } from '../hooks/useWorkflows';
import { useWorkflowForm } from '../hooks/useWorkflowForm';
import { useExecutionQueue } from '../hooks/useExecutionQueue';
import { saveFormState } from '../utils/storage';
import { applyFieldOrder } from '../utils/fieldOrder';
import usePromptAliases from '../hooks/usePromptAliases';
import { listPresets } from '../api';
import { normalizePresetItems } from '../utils/presets';

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
  } = useExecutionQueue({
    selectedWorkflow,
    workflowData,
    dynamicInputs,
    imageInputs,
    formData,
    setFormData,
    promptAliases: aliasLookup,
  });

  const [presetsOpen, setPresetsOpen] = useState(false);
  const workflowSectionRef = useRef(null);
  const parameterSectionRef = useRef(null);
  const imageSectionRef = useRef(null);
  const [inlinePresets, setInlinePresets] = useState([]);
  const [inlinePresetSel, setInlinePresetSel] = useState('');
  const [inlinePresetStatus, setInlinePresetStatus] = useState('');
  const inlinePresetTimer = useRef(null);
  const [collapseAllState] = useState({ key: 0, collapsed: true });
  const [lastEditedParam, setLastEditedParam] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem('cozygen_last_param') || '';
    } catch {
      return '';
    }
  });
  const [spotlight, setSpotlight] = useState(null);
  const spotlightName = spotlight?.name || '';
  const handleCloseSpotlight = useCallback(() => setSpotlight(null), []);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerField, setComposerField] = useState('prompt');
  const [visibleParams, setVisibleParams] = useState([]);
  const spotlightCacheRef = useRef(new Map());
  const galleryPending = useGalleryPending();

  const aliasCatalog = useMemo(() => {
    const entries = [];
    Object.entries(aliases || {}).forEach(([key, text]) => {
      const parts = String(key).split('::');
      const hasCat = parts.length > 1;
      const category = (aliasCategories && aliasCategories[key]) || (hasCat ? parts[0] : '');
      const name = hasCat ? parts.slice(1).join('::') : key;
      entries.push({
        key,
        name,
        category,
        text,
        token: category ? `${category}:${name}` : name,
      });
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
    // Prefer the main prompt field, otherwise use first string with $alias$ or any string
    if (typeof formData?.prompt === 'string') return 'prompt';
    const withAlias = Object.entries(formData || {}).find(
      ([, v]) => typeof v === 'string' && v.includes('$')
    );
    if (withAlias) return withAlias[0];
    // If no alias-bearing string exists, don't show a preview
    return '';
  }, [formData]);

  const expandedPrompt = useMemo(() => {
    if (!previewField) return '';
    const promptText = formData?.[previewField] || '';
    if (!promptText || !aliasLookup) return promptText;
    try {
      return promptText.replace(/\$([a-z0-9_:-]+)\$/gi, (match, key) => {
        const val = aliasLookup.get(key.toLowerCase());
        return typeof val === 'string' ? val : match;
      });
    } catch {
      return promptText;
    }
  }, [formData, aliasLookup, previewField]);

  const handleWorkflowSelect = (name) => {
    if (!name || name === selectedWorkflow) return;
    if (selectedWorkflow) {
      saveFormState(selectedWorkflow, formData || {}, { immediate: true });
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

  // Find the best prompt field to edit
  const promptFieldName = useMemo(() => {
    // Prefer explicit "prompt" field
    if (typeof formData?.prompt === 'string') return 'prompt';
    // Look for common prompt field names
    const promptLike = ['prompt', 'positive_prompt', 'text', 'positive'];
    for (const key of promptLike) {
      if (typeof formData?.[key] === 'string') return key;
    }
    // Fall back to first string field with an alias token
    const withAlias = Object.entries(formData || {}).find(
      ([, v]) => typeof v === 'string' && v.includes('$')
    );
    if (withAlias) return withAlias[0];
    // Or just the first string field
    const firstString = Object.entries(formData || {}).find(
      ([, v]) => typeof v === 'string'
    );
    return firstString?.[0] || 'prompt';
  }, [formData]);

  useEffect(() => {
    let cancelled = false;
    const loadInlinePresets = async () => {
      if (!selectedWorkflow) {
        setInlinePresets([]);
        setInlinePresetSel('');
        return;
      }
      try {
        const data = await listPresets(selectedWorkflow);
        const normalized = normalizePresetItems(data?.items || {});
        if (cancelled) return;
        setInlinePresets(normalized);
        const first = normalized[0]?.name || '';
        setInlinePresetSel((prev) =>
          prev && normalized.some((p) => p.name === prev) ? prev : first
        );
      } catch (err) {
        if (!cancelled) {
          setInlinePresets([]);
          setInlinePresetSel('');
        }
      }
    };
    loadInlinePresets();
    return () => {
      cancelled = true;
    };
  }, [selectedWorkflow]);

  const showInlinePresetStatus = useCallback((msg) => {
    clearTimeout(inlinePresetTimer.current);
    setInlinePresetStatus(msg);
    if (!msg) return;
    inlinePresetTimer.current = setTimeout(() => setInlinePresetStatus(''), 1600);
  }, []);

  const handleInlinePresetSelect = useCallback(
    (name) => {
      setInlinePresetSel(name);
      const entry = inlinePresets.find((p) => p.name === name);
      if (entry?.values) {
        applyFormPatch(entry.values);
        showInlinePresetStatus(`Applied "${name}"`);
      }
    },
    [inlinePresets, applyFormPatch, showInlinePresetStatus]
  );

  const readCurrentValues = () => ({ ...(formData || {}) });

  // Apply user-defined ordering + hiding
  const orderedDynamicInputs = useMemo(
    () => applyFieldOrder(selectedWorkflow, dynamicInputs),
    [selectedWorkflow, dynamicInputs]
  );

  const safeImageInputs = imageInputs || [];
  const hasWorkflowLoaded = Boolean(workflowData && selectedWorkflow);
  const hasImageInputs = safeImageInputs.length > 0;
  const workflowSummaryMeta = selectedWorkflow || 'Choose workflow';
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

  useEffect(() => {
    // Auto-collapse workflow after first successful load to keep focus on controls
    if (hasWorkflowLoaded && workflowSectionRef.current?.open) {
      workflowSectionRef.current.open = false;
    }
  }, [hasWorkflowLoaded]);

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

  const openSection = (sectionRef) => {
    const el = sectionRef?.current;
    if (el) {
      el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="page-shell page-stack">
      <CollapsibleSection
        kicker="Parameters"
        title="🎛️ Controls"
        meta={controlMeta}
        bodyClassName="control-shell"
        defaultOpen
      >
        {/* Minimal context bar for workflow/preset selection */}
        <div className="context-bar">
          <div className="context-chip">
            <select
              value={selectedWorkflow || ''}
              onChange={(e) => handleWorkflowSelect(e.target.value)}
              className="context-select"
              aria-label="Workflow"
            >
              <option value="">Select workflow…</option>
              {workflows.map((wf) => (
                <option key={wf} value={wf}>{wf}</option>
              ))}
            </select>
          </div>
          {workflowData && inlinePresets.length > 0 ? (
            <div className="context-chip is-secondary">
              <select
                value={inlinePresetSel}
                onChange={(e) => handleInlinePresetSelect(e.target.value)}
                className="context-select"
                aria-label="Preset"
              >
                <option value="">No preset</option>
                {inlinePresets.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              {inlinePresetStatus ? (
                <span className="context-status">{inlinePresetStatus}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {workflowData ? (
          <AdvancedModeLayout
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
            onVisibleParamsChange={(order) => setVisibleParams(order || [])}
            aliasOptions={aliasOptions}
            aliasCatalog={aliasCatalog}
            onOpenComposer={openComposer}
            onParamEdited={(name) => {
              setLastEditedParam(name || '');
              try {
                window.localStorage.setItem('cozygen_last_param', name || '');
              } catch {
                // ignore
              }
            }}
            onSpotlight={(payload) => {
              if (!payload?.name) return;
              setSpotlight(buildSpotlightState(payload.name, payload));
            }}
          />
        ) : (
          <div className="empty-state-inline">
            <span className="empty-state-arrow">↑</span>
            <span>Select a workflow above to get started</span>
          </div>
        )}
        {workflowData ? (
          <div className="mt-3 rounded-xl border border-[#2A2E4A] bg-[#0B1226] px-3 py-3 text-[12px] text-[#9DA3FFCC] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#E5E7FF]">
                Expanded prompt
              </span>
              <button
                type="button"
                onClick={() => openComposer(promptFieldName)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2A2E4A] bg-[#0F1A2F] text-[11px] font-medium text-[#E5E7FF] hover:border-[#5EF1D4] hover:bg-[#0F1A2F]/80 transition-colors"
              >
                <span>Compose</span>
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-[#D8DEFF] text-[12px] border border-[#1D2440] rounded-lg px-2 py-2 bg-[#080E1D]">
              {expandedPrompt || '—'}
            </div>
          </div>
        ) : null}
      </CollapsibleSection>

      {hasImageInputs ? (
        <CollapsibleSection
          ref={imageSectionRef}
          className="scroll-mt-24 is-compact"
          kicker="Assets"
          title="📸 Images"
          meta={imageMeta}
          defaultOpen={false}
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
        onClose={() => setSpotlight(null)}
        title={spotlight?.label}
        description={spotlight?.description}
        render={() => spotlight?.render?.(formData)}
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
    </div>
  );
}

export default MainPage;
