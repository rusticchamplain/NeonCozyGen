import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  resolveConfig,
  resolveParamName,
} from '../components/DynamicForm';
import PresetCard from '../components/presets/PresetCard';
import PresetImageInputRow from '../components/presets/PresetImageInputRow';
import LoraPairInput from '../components/inputs/LoraPairInput';
import {
  listPresets,
  savePreset,
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
import { LORA_PAIRS, matchLoraParam } from '../config/loraPairs';
import usePromptAliases from '../hooks/usePromptAliases';

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

function resolvePreviewSource(meta) {
  if (meta?.preview?.kind === 'data' && meta.preview.data) {
    return meta.preview.data;
  }
  return buildPreviewUrl(meta?.example);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const IMAGE_VALUE_REGEX = /\.(png|jpe?g|webp|gif|bmp)$/i;
const VIDEO_VALUE_REGEX = /\.(mp4|webm|mov|mkv)$/i;

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

const MAX_QUICK_CONTROLS = 4;
const QUICK_PARAM_RULES = [
  {
    id: 'prompt',
    weight: 1,
    test: (cfg) =>
      /prompt/i.test(cfg.label || '') &&
      !/negative/i.test(cfg.label || ''),
  },
  {
    id: 'negative_prompt',
    weight: 2,
    test: (cfg) =>
      /negative/i.test(cfg.label || '') &&
      /prompt/i.test(cfg.label || ''),
  },
  {
    id: 'steps',
    weight: 3,
    test: (cfg) => /step/i.test(cfg.label || cfg.paramName || ''),
  },
  {
    id: 'cfg',
    weight: 4,
    test: (cfg) =>
      /cfg|guidance/i.test(cfg.label || cfg.paramName || ''),
  },
  {
    id: 'seed',
    weight: 5,
    test: (cfg) => /seed/i.test(cfg.label || cfg.paramName || ''),
  },
  {
    id: 'sampler',
    weight: 6,
    test: (cfg) =>
      /sampler|schedule/i.test(cfg.label || cfg.paramName || ''),
  },
  {
    id: 'frames',
    weight: 7,
    test: (cfg) => /frame/i.test(cfg.label || cfg.paramName || ''),
  },
  {
    id: 'dimensions',
    weight: 8,
    test: (cfg) =>
      /width|height|resolution/i.test(cfg.label || cfg.paramName || ''),
  },
];

function selectQuickInputs(inputs = [], preset) {
  if (!inputs.length) return [];

  const byName = new Map();
  inputs.forEach((input) => {
    const name = resolveParamName(input);
    if (name) byName.set(name, input);
  });

  const explicitList = Array.isArray(preset?.meta?.quick_params)
    ? preset.meta.quick_params
        .map((name) => String(name || '').trim())
        .filter((name) => !!name && byName.has(name))
    : null;

  if (explicitList && explicitList.length) {
    return explicitList.slice(0, MAX_QUICK_CONTROLS).map((name) => {
      const input = byName.get(name);
      return {
        cfg: resolveConfig(input),
        input,
      };
    });
  }

  const candidates = [];
  inputs.forEach((input) => {
    if (!input || input.class_type === 'CozyGenImageInput') return;
    const cfg = resolveConfig(input);
    const priority = QUICK_PARAM_RULES.reduce((score, rule) => {
      if (score !== Infinity) return score;
      return rule.test(cfg) ? rule.weight : Infinity;
    }, Infinity);
    if (priority === Infinity) return;
    candidates.push({
      cfg,
      input,
      priority,
    });
  });

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.slice(0, MAX_QUICK_CONTROLS);
}

function renderQuickField(field, value, onChange) {
  const inputId = `quick-${field.paramName}`;
  const commonProps = {
    id: inputId,
    name: field.paramName,
    className: 'quick-field-control',
    placeholder:
      typeof field.placeholder === 'string' ? field.placeholder : '',
  };

  if (field.paramType === 'DROPDOWN') {
    const choices = Array.isArray(field.choices) ? field.choices : [];
    return (
      <select
        {...commonProps}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Preset value</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    );
  }

  if (field.paramType === 'BOOLEAN') {
    return (
      <label className="quick-field-boolean" htmlFor={inputId}>
        <input
          id={inputId}
          name={field.paramName}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>Enable</span>
      </label>
    );
  }

  const inputType = field.paramType === 'NUMBER' ? 'number' : 'text';
  return (
    <input
      {...commonProps}
      type={inputType}
      value={
        typeof value === 'number' && Number.isFinite(value)
          ? value
          : value ?? ''
      }
      onChange={(e) => onChange(e.target.value)}
      min={field.min}
      max={field.max}
      step={field.step || (field.paramType === 'NUMBER' ? 'any' : undefined)}
    />
  );
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
  const { aliasLookup } = usePromptAliases();

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
    promptAliases: aliasLookup,
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
  const [savingPresetKey, setSavingPresetKey] = useState(null);
  const [libraryCollapsed, setLibraryCollapsed] = useState(true);
  const [quickEditKey, setQuickEditKey] = useState('');
  const [quickOverrides, setQuickOverrides] = useState({});
  const [presetSelectionCollapsed, setPresetSelectionCollapsed] = useState(true);
  const imageSectionRefs = useRef({});
  const pendingImageFocusRef = useRef(null);

  const orderedDynamicInputs = useMemo(
    () => applyFieldOrder(selectedWorkflow, dynamicInputs),
    [selectedWorkflow, dynamicInputs]
  );

  const handleUpdateMeta = useCallback(
    async (workflow, presetName, nextMeta) => {
      const entries = presetLibrary[workflow] || [];
      const target = entries.find((p) => p.name === presetName);
      if (!target) return;
      setSavingPresetKey(`${workflow}::${presetName}`);
      try {
        await savePreset(workflow, presetName, target.values || {}, nextMeta || {});
        setPresetLibrary((prev) => ({
          ...prev,
          [workflow]: (prev[workflow] || []).map((p) =>
            p.name === presetName ? { ...p, meta: nextMeta || {} } : p
          ),
        }));
      } catch (err) {
        console.error('Failed to update preset metadata', err);
        setLibraryError('Failed to update preset metadata');
      } finally {
        setSavingPresetKey(null);
      }
    },
    [presetLibrary]
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
    if (quickEditKey && quickEditKey !== selectedPresetKey) {
      setQuickEditKey('');
    }
  }, [quickEditKey, selectedPresetKey]);

  const scrollImageSection = useCallback((key) => {
    if (!key) return;
    const node = imageSectionRefs.current[key];
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.classList.add('preset-card-section--highlight');
    setTimeout(() => {
      node.classList.remove('preset-card-section--highlight');
    }, 800);
  }, []);

  useEffect(() => {
    if (!pendingPreset) return;
    if (!workflowData) return;
    if (pendingPreset.workflow !== selectedWorkflow) return;
    const values = pendingPreset.values || {};
    setFormData(values);
    if (selectedWorkflow) {
      saveFormState(selectedWorkflow, values);
    }
    setPendingPreset(null);
  }, [pendingPreset, selectedWorkflow, workflowData, setFormData]);

  useEffect(() => {
    if (!selectedPresetKey) return;
    if (pendingImageFocusRef.current === selectedPresetKey) {
      scrollImageSection(selectedPresetKey);
      pendingImageFocusRef.current = null;
    }
  }, [selectedPresetKey, scrollImageSection]);

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
      const highMatch = matchLoraParam(byName, pair.highParamAliases || pair.highParam);
      const lowMatch = matchLoraParam(byName, pair.lowParamAliases || pair.lowParam);
      if (!highMatch || !lowMatch) return;

      const highCfg = resolveConfig(highMatch.input);
      const lowCfg = resolveConfig(lowMatch.input);
      if (
        highCfg.paramType !== 'DROPDOWN' ||
        lowCfg.paramType !== 'DROPDOWN' ||
        !(highCfg.choices?.length) ||
        !(lowCfg.choices?.length)
      ) {
        return;
      }

      const highStrengthMatch = matchLoraParam(
        byName,
        pair.highStrengthParamAliases || pair.highStrengthParam
      );
      const lowStrengthMatch = matchLoraParam(
        byName,
        pair.lowStrengthParamAliases || pair.lowStrengthParam
      );

      result.push({
        ...pair,
        highParam: highMatch.name,
        lowParam: lowMatch.name,
        highStrengthParam: highStrengthMatch?.name,
        lowStrengthParam: lowStrengthMatch?.name,
        highCfg,
        lowCfg,
      });
    });
    return result;
  }, [builderReady, orderedDynamicInputs]);

  const clearSelection = useCallback(() => {
    setQuickEditKey((prev) => (prev === selectedPresetKey ? '' : prev));
    setQuickOverrides((prev) => {
      if (!selectedPresetKey || !prev[selectedPresetKey]) return prev;
      const next = { ...prev };
      delete next[selectedPresetKey];
      return next;
    });
    setSelectedPresetKey('');
  }, [selectedPresetKey]);

  const applyPreset = useCallback(
    (workflow, preset) => {
      if (!preset?.name) return;
      const key = `${workflow}::${preset.name}`;
      if (selectedPresetKey === key) {
        clearSelection();
        return;
      }
      setSelectedPresetKey(key);
      setPendingPreset({ workflow, values: preset.values || {} });
      if (workflow !== selectedWorkflow) {
        selectWorkflow(workflow);
      } else {
        const nextState = preset.values || {};
        setFormData(nextState);
        if (workflow) {
          saveFormState(workflow, nextState);
        }
      }
    },
    [selectedPresetKey, clearSelection, selectWorkflow, selectedWorkflow, setFormData]
  );

  const focusImageSection = useCallback(
    (card) => {
      if (!card?.name) return;
      const key = `${card.workflow}::${card.name}`;
      if (selectedPresetKey !== key) {
        pendingImageFocusRef.current = key;
        applyPreset(card.workflow, card);
      } else {
        scrollImageSection(key);
      }
    },
    [applyPreset, scrollImageSection, selectedPresetKey]
  );

  const handleQuickOverrideChange = useCallback(
    (key, paramName, rawValue, paramType) => {
      const normalizeValue = () => {
        if (paramType === 'NUMBER') {
          if (rawValue === '' || rawValue === null || typeof rawValue === 'undefined') {
            return '';
          }
          const num = Number(rawValue);
          return Number.isNaN(num) ? '' : num;
        }
        if (paramType === 'BOOLEAN') {
          return !!rawValue;
        }
        if (rawValue === '' || rawValue === null || typeof rawValue === 'undefined') {
          return '';
        }
        return rawValue;
      };

      const nextValue = normalizeValue();
      setQuickOverrides((prev) => {
        const next = { ...prev };
        const entry = { ...(prev[key] || {}) };
        if (typeof nextValue === 'undefined') {
          delete entry[paramName];
        } else {
          entry[paramName] = nextValue;
        }
        if (Object.keys(entry).length === 0) {
          delete next[key];
        } else {
          next[key] = entry;
        }
        return next;
      });
    },
    []
  );

  const handleClearQuickOverrides = useCallback((key) => {
    setQuickOverrides((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleQuickEditToggle = useCallback(
    (card) => {
      if (!card?.name) return;
      const key = `${card.workflow}::${card.name}`;
      if (selectedPresetKey !== key) {
        applyPreset(card.workflow, card);
      }
      setQuickEditKey((prev) => (prev === key ? '' : key));
    },
    [selectedPresetKey, applyPreset]
  );

  const handleCardPreviewUpload = useCallback(
    async (workflow, preset, file) => {
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        const nextMeta = {
          ...(preset.meta || {}),
          preview: {
            kind: 'data',
            data: dataUrl,
            mime: file.type,
            name: file.name,
            updatedAt: Date.now(),
          },
        };
        await handleUpdateMeta(workflow, preset.name, nextMeta);
      } catch (err) {
        console.error('Preview upload failed', err);
        setLibraryError('Preview upload failed');
      }
    },
    [handleUpdateMeta]
  );

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
        <details className="ui-panel collapsible-card">
          <summary className="collapsible-card-summary">
            <span className="collapsible-card-summary-label">Preset library</span>
          </summary>
          <div className="collapsible-card-body text-center text-sm text-[#9DA3FFCC]">
            Loading workflows…
          </div>
        </details>
      </div>
    );
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="page-shell">
        <details className="ui-panel collapsible-card">
          <summary className="collapsible-card-summary">
            <span className="collapsible-card-summary-label">Preset library</span>
          </summary>
          <div className="collapsible-card-body text-center text-sm text-[#9DA3FFCC]">
            No workflows found. Drop workflow JSON files into CozyGen/workflows and refresh.
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="page-shell page-stack">
      <details
        className="ui-panel collapsible-card"
        open={!libraryCollapsed}
        onToggle={(event) => setLibraryCollapsed(!event.target.open)}
      >
        <summary className="collapsible-card-summary">
          <span className="collapsible-card-summary-label">Preset library</span>
        </summary>
        <div className="collapsible-card-body space-y-4">
          <div className="ui-section-text">
            <span className="ui-kicker">Preset library</span>
            <h1 className="ui-title">Pick, tap, launch.</h1>
          </div>
          <div className="flex items-center gap-2">
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
        </div>
      </details>

      <details
        className="ui-panel collapsible-card"
        open={!presetSelectionCollapsed}
        onToggle={(event) => setPresetSelectionCollapsed(!event.target.open)}
      >
        <summary className="collapsible-card-summary">
          <span className="collapsible-card-summary-label">Preset selection</span>
        </summary>
        <div className="collapsible-card-body space-y-4">
          {presetLoading ? (
            <div className="ui-card text-center text-sm text-[#9DA3FFCC]">
              Loading presets…
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="ui-card text-center text-sm text-[#9DA3FFCC]">
              No presets yet. Save one from Studio to get started.
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
              const previewSrc = resolvePreviewSource(card.meta);
              const previewType =
                card.meta?.preview?.mime?.startsWith('video') ||
                (card.meta?.example?.filename &&
                  VIDEO_VALUE_REGEX.test(card.meta.example.filename)) ||
                (previewSrc && previewSrc.startsWith('data:video'))
                  ? 'video'
                  : 'image';
              const requiresImages =
                (card.meta?.requires_images ??
                  Object.values(card.values || {}).some(
                    (val) => typeof val === 'string' && IMAGE_VALUE_REGEX.test(val)
                  )) || false;
              const quickOverridesForCard = quickOverrides[key] || {};
              let readyToRender = false;
              const previewSaving = savingPresetKey === key;
              const bindImageSectionRef = (node) => {
                if (node) {
                  imageSectionRefs.current[key] = node;
                } else {
                  delete imageSectionRefs.current[key];
                }
              };

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
                  readyToRender =
                    builderReady &&
                    (!needsImageInput || !missingImages) &&
                    !isGenerating;
                  const quickFields =
                    quickEditKey === key
                      ? selectQuickInputs(orderedDynamicInputs, card)
                      : [];
                  const showQuickFields =
                    quickEditKey === key && quickFields.length > 0;

                  cardBody = (
                    <>
                      {quickEditKey === key && (
                        <div className="preset-card-section">
                          <h4>Quick tweaks</h4>
                          {showQuickFields ? (
                            <div className="quick-field-grid">
                              {quickFields.map(({ cfg }) => {
                                const fallbackValue =
                                  formData[cfg.paramName] ??
                                  card.values?.[cfg.paramName] ??
                                  '';
                                const hasExplicitOverride = Object.prototype.hasOwnProperty.call(
                                  quickOverridesForCard,
                                  cfg.paramName
                                );
                                const overrideValue = quickOverridesForCard[cfg.paramName];
                                const liveValue = hasExplicitOverride ? overrideValue : fallbackValue;
                                const placeholder =
                                  !hasExplicitOverride &&
                                  (typeof fallbackValue === 'number' || typeof fallbackValue === 'string')
                                    ? `Preset: ${fallbackValue}`
                                    : '';
                                return (
                                  <div key={cfg.paramName} className="quick-field">
                                    <label
                                      htmlFor={`quick-${cfg.paramName}`}
                                      className="quick-field-label"
                                    >
                                      {cfg.label}
                                    </label>
                                    {renderQuickField(
                                      { ...cfg, placeholder },
                                      liveValue,
                                      (nextVal) =>
                                        handleQuickOverrideChange(
                                          key,
                                          cfg.paramName,
                                          nextVal,
                                          cfg.paramType
                                        )
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                          <div className="quick-field-footer">
                            <button
                              type="button"
                              className="ui-button is-ghost is-compact"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearQuickOverrides(key);
                              }}
                              disabled={
                                !quickOverridesForCard ||
                                !Object.keys(quickOverridesForCard).length
                              }
                            >
                              Reset overrides
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="preset-card-section" ref={bindImageSectionRef}>
                        <h4>Image inputs</h4>
                        {imageInputs.length ? (
                          <div className="preset-image-list">
                            {imageInputs.map((imgInput) => {
                              const paramName = imgInput.inputs.param_name;
                              const presetValue = selectedPresetInfo.values?.[paramName];
                              const value =
                                formData[paramName] ||
                                (typeof presetValue === 'string' ? presetValue : '');
                              return (
                                <PresetImageInputRow
                                  key={imgInput.id}
                                  input={imgInput}
                                  value={value}
                                  onFormChange={handleFormChange}
                                />
                              );
                            })}
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
                              const highStrengthValue = pair.highStrengthParam
                                ? formData[pair.highStrengthParam]
                                : undefined;
                              const lowStrengthValue = pair.lowStrengthParam
                                ? formData[pair.lowStrengthParam]
                                : undefined;
                              const strengthValue =
                                highStrengthValue ?? lowStrengthValue ?? 1.0;
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
                                  highStrengthValue={highStrengthValue}
                                  lowStrengthValue={lowStrengthValue}
                                  onChangeHighStrength={
                                    pair.highStrengthParam
                                      ? (val) =>
                                          handleFormChange(pair.highStrengthParam, val)
                                      : undefined
                                  }
                                  onChangeLowStrength={
                                    pair.lowStrengthParam
                                      ? (val) =>
                                          handleFormChange(pair.lowStrengthParam, val)
                                      : undefined
                                  }
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
                  previewSrc={previewSrc}
                  previewType={previewType}
                  isSelected={isActive}
                  tags={tags}
                  requiresImages={requiresImages}
                  onActivate={() => applyPreset(card.workflow, card)}
                  onQuickEdit={() => handleQuickEditToggle(card)}
                  quickEditActive={quickEditKey === key}
                  onAssignMode={(mode) => handleAssignMode(card.workflow, mode)}
                  onUploadPreview={(file) =>
                    handleCardPreviewUpload(card.workflow, card, file)
                  }
                  onImages={() => focusImageSection(card)}
                  onClear={clearSelection}
                  savingMode={typeSaving === card.workflow}
                  description={(card.meta?.description || '').trim()}
                  previewSaving={previewSaving}
                >
                  {cardBody}
                </PresetCard>
              );
            })}
          </div>
        )}
        </div>
      </details>
    </div>
  );
}
