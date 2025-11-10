import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  resolveConfig,
  resolveParamName,
} from '../components/DynamicForm';
import ImageInput from '../components/ImageInput';
import PresetCard from '../components/presets/PresetCard';
import LoraPairInput from '../components/inputs/LoraPairInput';
import {
  listPresets,
  getWorkflowTypes,
  saveWorkflowType,
} from '../api';
import { useWorkflows } from '../hooks/useWorkflows';
import { useWorkflowForm } from '../hooks/useWorkflowForm';
import { useExecutionQueue } from '../hooks/useExecutionQueue';
import { applyFieldOrder } from '../utils/fieldOrder';
import {
  normalizePresetItems,
  WORKFLOW_MODE_OPTIONS,
} from '../utils/presets';
import { saveFormState } from '../utils/storage';
import { LORA_PAIRS } from '../config/loraPairs';

function buildPreviewUrl(example) {
  if (!example || !example.filename) return null;
  const params = new URLSearchParams({
    type: example.type || 'output',
    subfolder: example.subfolder || '',
    filename: example.filename,
    w: '640',
  });
  return `/cozygen/thumb?${params.toString()}`;
}

const IMAGE_VALUE_REGEX = /\.(png|jpe?g|webp|gif|bmp)$/i;

function deriveCardTags(card) {
  const values = card?.values || {};
  const metaTags = Array.isArray(card?.meta?.tags) ? card.meta.tags : [];
  const tags = [];
  metaTags.forEach((tag) => {
    if (typeof tag === 'string' && tag.trim()) {
      tags.push(tag.trim().slice(0, 24));
    }
  });

  const needsImage = Object.values(values).some(
    (val) => typeof val === 'string' && IMAGE_VALUE_REGEX.test(val)
  );
  if (needsImage) tags.push('Image Input');

  const frameCount = values['Frame Count'] || values.frames;
  if (frameCount) tags.push(`${frameCount} frames`);

  const steps = values.Steps || values['Sampling Steps'] || values.steps;
  if (steps) tags.push(`${steps} steps`);

  const seed = values.Seed || values.seed;
  if (typeof seed !== 'undefined') tags.push(`Seed ${seed}`);

  const fps = values['FPS'] || values['Video FPS'];
  if (fps) tags.push(`${fps} fps`);

  return [...new Set(tags)].slice(0, 4);
}

export default function Presets() {
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
    formData = {},
    setFormData,
    handleFormChange,
  } = useWorkflowForm(selectedWorkflow);

  const {
    isLoading: isGenerating,
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
  const handleBuilderGenerate = useCallback(() => {
    if (!selectedWorkflow) return;
    handleGenerate();
  }, [selectedWorkflow, handleGenerate]);

  const [presetLibrary, setPresetLibrary] = useState({});
  const [presetLoading, setPresetLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [selectedPresetKey, setSelectedPresetKey] = useState('');
  const [pendingPreset, setPendingPreset] = useState(null);
  const [workflowTypes, setWorkflowTypes] = useState({});
  const [typeSaving, setTypeSaving] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const orderedDynamicInputs = useMemo(
    () => applyFieldOrder(selectedWorkflow, dynamicInputs),
    [selectedWorkflow, dynamicInputs]
  );

  const loadPresetLibrary = useCallback(async () => {
    if (!workflows || workflows.length === 0) {
      setPresetLibrary({});
      return;
    }
    setPresetLoading(true);
    setLibraryError('');
    const next = {};
    for (const wf of workflows) {
      try {
        const data = await listPresets(wf);
        next[wf] = normalizePresetItems(data?.items || {});
      } catch (err) {
        console.error('Failed to load presets for', wf, err);
        next[wf] = [];
        setLibraryError('Some presets could not be loaded.');
      }
    }
    setPresetLibrary(next);
    setPresetLoading(false);
  }, [workflows]);

  useEffect(() => {
    loadPresetLibrary();
  }, [loadPresetLibrary]);

  useEffect(() => {
    const handler = () => {
      loadPresetLibrary();
    };
    window.addEventListener('cozygen:preset-changed', handler);
    return () => window.removeEventListener('cozygen:preset-changed', handler);
  }, [loadPresetLibrary]);

  useEffect(() => {
    let cancelled = false;
    async function loadTypes() {
      try {
        const data = await getWorkflowTypes();
        if (!cancelled) {
          setWorkflowTypes(data?.workflows || {});
        }
      } catch (err) {
        console.error('Failed to load workflow types', err);
      }
    }
    loadTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPresetKey) return;
    const [wf, name] = selectedPresetKey.split('::');
    const exists = (presetLibrary[wf] || []).some((p) => p.name === name);
    if (!exists) {
      setSelectedPresetKey('');
    }
  }, [presetLibrary, selectedPresetKey]);

  useEffect(() => {
    if (!pendingPreset) return;
    if (!workflowData) return;
    if (pendingPreset.workflow !== selectedWorkflow) return;
    const values = pendingPreset.values || {};
    const nextState = { ...(formData || {}), ...values };
    setFormData(nextState);
    if (selectedWorkflow) {
      saveFormState(selectedWorkflow, nextState);
    }
    setPendingPreset(null);
  }, [pendingPreset, selectedWorkflow, workflowData, setFormData, formData]);

  const presetCards = useMemo(
    () =>
      Object.entries(presetLibrary).flatMap(([workflow, presets]) =>
        (presets || []).map((preset) => ({ workflow, ...preset }))
      ),
    [presetLibrary]
  );

  const filteredCards = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return presetCards.filter((card) => {
      const mode = workflowTypes[card.workflow] || '';
      if (filterMode !== 'all' && mode !== filterMode) return false;
      if (!needle) return true;
      const haystack = `${card.name} ${card.workflow} ${card.meta?.description || ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [presetCards, filterMode, searchTerm, workflowTypes]);

  const selectedPresetInfo = useMemo(() => {
    if (!selectedPresetKey) return null;
    const [wf, name] = selectedPresetKey.split('::');
    const preset = (presetLibrary[wf] || []).find((p) => p.name === name);
    if (!preset) return null;
    return { workflow: wf, ...preset };
  }, [selectedPresetKey, presetLibrary]);

  const builderReady =
    !!selectedPresetInfo &&
    !!workflowData &&
    selectedWorkflow === selectedPresetInfo.workflow;

  const activeLoraPairs = useMemo(() => {
    if (!builderReady) return [];
    const byName = new Map();
    (orderedDynamicInputs || []).forEach((input) => {
      const name = resolveParamName(input);
      if (name) byName.set(name, input);
    });
    const result = [];
    LORA_PAIRS.forEach((pair) => {
      const highInput = byName.get(pair.highParam);
      const lowInput = byName.get(pair.lowParam);
      if (!highInput || !lowInput) return;

      const highCfg = resolveConfig(highInput);
      const lowCfg = resolveConfig(lowInput);
      if (
        highCfg.paramType !== 'DROPDOWN' ||
        lowCfg.paramType !== 'DROPDOWN' ||
        !(highCfg.choices?.length) ||
        !(lowCfg.choices?.length)
      ) {
        return;
      }

      result.push({
        ...pair,
        highCfg,
        lowCfg,
      });
    });
    return result;
  }, [builderReady, orderedDynamicInputs]);

  const canQuickLaunch = builderReady && !isGenerating;

  const applyPreset = useCallback(
    (workflow, preset) => {
      if (!preset?.name) return;
      const key = `${workflow}::${preset.name}`;
      setSelectedPresetKey(key);
      setPendingPreset({ workflow, values: preset.values || {} });
      if (workflow !== selectedWorkflow) {
        selectWorkflow(workflow);
      } else {
        const nextState = {
          ...(formData || {}),
          ...(preset.values || {}),
        };
        setFormData(nextState);
        if (workflow) {
          saveFormState(workflow, nextState);
        }
      }
    },
    [selectWorkflow, selectedWorkflow, setFormData, formData]
  );

  const clearSelection = useCallback(() => {
    setSelectedPresetKey('');
  }, []);

  const handleAssignMode = useCallback(async (workflow, mode) => {
    setTypeSaving(workflow);
    try {
      await saveWorkflowType(workflow, mode);
      setWorkflowTypes((prev) => {
        const next = { ...prev };
        if (mode) next[workflow] = mode;
        else delete next[workflow];
        return next;
      });
    } catch (err) {
      console.error('Failed to save workflow type', err);
      setLibraryError('Workflow type update failed');
    } finally {
      setTypeSaving(null);
    }
  }, []);

  if (workflowsLoading) {
    return (
      <div className="page-shell">
        <div className="ui-panel text-center text-sm text-[#9DA3FFCC]">
          Loading workflows…
        </div>
      </div>
    );
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="page-shell">
        <div className="ui-panel text-center text-sm text-[#9DA3FFCC]">
          No workflows found. Drop workflow JSON files into CozyGen/workflows and refresh.
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell page-stack">
      <section className="ui-panel space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="ui-section-text">
            <span className="ui-kicker">Preset library</span>
            <h1 className="ui-title">Pick, tap, launch.</h1>
            <p className="ui-hint">Reuse or capture full parameter stacks.</p>
          </div>
          <button
            type="button"
            onClick={loadPresetLibrary}
            className="ui-button is-ghost is-compact"
          >
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7C82BF]">
          <span>{filteredCards.length} presets</span>
          {libraryError && <span className="text-[#FF9BEA]">{libraryError}</span>}
        </div>
        <div className="filter-rail flex items-center gap-2 overflow-x-auto rounded-full border border-[#1F2342] bg-[#050716] px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#9DA3FF]">
          {[{ id: 'all', label: 'All' }, ...WORKFLOW_MODE_OPTIONS].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setFilterMode(mode.id)}
              className={`shrink-0 rounded-full px-3 py-1 border ${
                filterMode === mode.id
                  ? 'bg-[#11152C] border-[#3EF0FF99] text-[#F8F4FF]'
                  : 'border-transparent text-[#8B90C9]'
              }`}
            >
              {mode.label}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-[#1F2342]" />
          <label className="flex items-center gap-1 rounded-full bg-[#0C0F2C] px-3 py-1 text-[#C3C7FF]">
            <span className="text-xs">Search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keywords"
              className="w-24 bg-transparent text-[11px] text-[#F8F4FF] placeholder-[#61679B] focus:outline-none"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        {presetLoading ? (
          <div className="ui-card text-center text-sm text-[#9DA3FFCC]">Loading presets…</div>
        ) : filteredCards.length === 0 ? (
          <div className="ui-card text-center text-sm text-[#9DA3FFCC]">
            No presets yet. Save one from Studio or the Wizard.
          </div>
        ) : (
          <div
            className={[
              'preset-grid',
              'grid gap-5 sm:grid-cols-2 xl:grid-cols-3',
              selectedPresetInfo ? 'has-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {filteredCards.map((card) => {
              const key = `${card.workflow}::${card.name}`;
              const tags = deriveCardTags(card);
              const isActive = selectedPresetKey === key;
              const requiresImages =
                (card.meta?.requires_images ??
                  Object.values(card.values || {}).some(
                    (val) => typeof val === 'string' && IMAGE_VALUE_REGEX.test(val)
                  )) || false;

              let cardBody = null;
              if (isActive) {
                if (!builderReady || card.workflow !== selectedWorkflow) {
                  cardBody = (
                    <div className="preset-card-section">
                      <p className="ui-hint">Loading workflow controls…</p>
                      <button
                        type="button"
                        className="ui-button is-ghost is-compact"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSelection();
                        }}
                      >
                        Clear selection
                      </button>
                    </div>
                  );
                } else {
                  const needsImageInput = imageInputs.length > 0;
                  const missingImages =
                    needsImageInput &&
                    imageInputs.some(
                      (imgInput) => !formData[imgInput.inputs.param_name]
                    );
                  const readyToRender =
                    builderReady &&
                    (!needsImageInput || !missingImages) &&
                    !isGenerating;

                  cardBody = (
                    <>
                      <div className="preset-card-section">
                        <h4>Image inputs</h4>
                        {imageInputs.length ? (
                          <div className="space-y-2">
                            {imageInputs.map((imgInput) => (
                              <ImageInput
                                key={imgInput.id}
                                input={imgInput}
                                value={formData[imgInput.inputs.param_name] || ''}
                                onFormChange={handleFormChange}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="ui-hint">This preset does not need reference images.</p>
                        )}
                      </div>

                      {activeLoraPairs.length > 0 && (
                        <div className="preset-card-section">
                          <h4>LoRA controls</h4>
                          <div className="space-y-2">
                            {activeLoraPairs.map((pair) => {
                              const strengthValue =
                                (pair.highStrengthParam &&
                                  formData[pair.highStrengthParam]) ??
                                (pair.lowStrengthParam &&
                                  formData[pair.lowStrengthParam]) ??
                                1.0;
                              return (
                                <LoraPairInput
                                  key={pair.id || pair.highParam}
                                  name={pair.id || pair.highParam}
                                  label={pair.label}
                                  highParam={pair.highParam}
                                  lowParam={pair.lowParam}
                                  highChoices={pair.highCfg.choices}
                                  lowChoices={pair.lowCfg.choices}
                                  formData={formData}
                                  onChangeParam={handleFormChange}
                                  highStrengthParam={pair.highStrengthParam}
                                  lowStrengthParam={pair.lowStrengthParam}
                                  strengthValue={strengthValue}
                                  onChangeStrength={(val) => {
                                    if (pair.highStrengthParam) {
                                      handleFormChange(pair.highStrengthParam, val);
                                    }
                                    if (pair.lowStrengthParam) {
                                      handleFormChange(pair.lowStrengthParam, val);
                                    }
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="preset-card-section preset-card-generate">
                        {needsImageInput && missingImages && (
                          <p className="ui-hint text-[#FF9BEA]">
                            Provide the required reference images to unlock render.
                          </p>
                        )}
                        <button
                          type="button"
                          className="ui-button is-primary"
                          disabled={!readyToRender}
                          onClick={() => readyToRender && handleBuilderGenerate()}
                        >
                          {isGenerating ? 'Rendering…' : 'Generate'}
                        </button>
                        <div className="preset-card-status">
                          {statusText || (isGenerating ? 'Working…' : 'Idle')}
                        </div>
                        <button
                          type="button"
                          className="ui-button is-ghost is-compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSelection();
                          }}
                        >
                          Clear selection
                        </button>
                      </div>
                    </>
                  );
                }
              }

              return (
                <PresetCard
                  key={key}
                  workflow={card.workflow}
                  preset={card}
                  workflowMode={workflowTypes[card.workflow]}
                  modeOptions={WORKFLOW_MODE_OPTIONS}
                  previewUrl={buildPreviewUrl(card.meta?.example)}
                  isSelected={isActive}
                  tags={tags}
                  requiresImages={requiresImages}
                  autoFocus={isActive}
                  onSelect={() => applyPreset(card.workflow, card)}
                  onAssignMode={(mode) => handleAssignMode(card.workflow, mode)}
                  savingMode={typeSaving === card.workflow}
                  onClear={clearSelection}
                >
                  {cardBody}
                </PresetCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
