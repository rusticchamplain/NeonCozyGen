import { createContext, useContext, useMemo } from 'react';
import { applyFieldOrder } from '../utils/fieldOrder';
import { resolveConfig } from '../components/DynamicForm';
import { isModelFileLike } from '../utils/modelDisplay';
import { useWorkflows } from '../hooks/useWorkflows';
import { useWorkflowForm } from '../hooks/useWorkflowForm';
import { useExecutionQueue } from '../hooks/useExecutionQueue';
import usePromptAliases from '../hooks/usePromptAliases';
import { presentAliasEntry } from '../utils/aliasPresentation';

const StudioContext = createContext(null);

export function useStudioContext() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudioContext must be used within a StudioProvider');
  }
  return context;
}

export function StudioProvider({ children }) {
  const {
    workflows,
    selectedWorkflow,
    selectWorkflow,
    loading: workflowsLoading,
    error: workflowsError,
  } = useWorkflows();

  const {
    workflowData,
    dynamicInputs,
    imageInputs,
    primaryImageInput,
    formData,
    setFormData,
    handleFormChange,
    loading: workflowLoading,
    error: workflowError,
  } = useWorkflowForm(selectedWorkflow);

  const aliasState = usePromptAliases();

  const aliasCatalog = useMemo(() => {
    const entries = [];
    Object.entries(aliasState.aliases || {}).forEach(([key, text]) => {
      const parts = String(key).split('::');
      const hasCat = parts.length > 1;
      const category = (aliasState.aliasCategories && aliasState.aliasCategories[key]) || (hasCat ? parts[0] : '');
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
  }, [aliasState.aliases, aliasState.aliasCategories]);

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

    if (typeof formData?.prompt === 'string') return 'prompt';

    const candidates = inputs
      .map((inp) => resolveConfig(inp))
      .filter((cfg) => cfg?.paramType === 'STRING' && cfg?.paramName);

    if (!candidates.length) return 'prompt';

    let best = candidates[0];
    let bestScore = scoreField(best);
    for (let i = 1; i < candidates.length; i += 1) {
      const cfg = candidates[i];
      const score = scoreField(cfg);
      if (score > bestScore) {
        best = cfg;
        bestScore = score;
      }
    }
    return best?.paramName || 'prompt';
  }, [dynamicInputs, formData, orderedDynamicInputs]);

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
    promptAliases: aliasState.aliasLookup,
  });

  const value = useMemo(
    () => ({
      workflows,
      selectedWorkflow,
      selectWorkflow,
      workflowsLoading,
      workflowsError,
      workflowData,
      dynamicInputs,
      orderedDynamicInputs,
      imageInputs,
      primaryImageInput,
      formData,
      setFormData,
      handleFormChange,
      workflowLoading,
      workflowError,
      promptFieldName,
      aliasOptions: aliasState.aliasOptions,
      aliasCatalog,
      aliasLookup: aliasState.aliasLookup,
      aliasCategories: aliasState.aliasCategories,
      aliasLoading: aliasState.loading,
      aliasSaving: aliasState.saving,
      aliasError: aliasState.error,
      refreshAliases: aliasState.refreshAliases,
      persistAliases: aliasState.persistAliases,
      isLoading,
      progressValue,
      progressMax,
      statusText,
      statusPhase,
      handleGenerate,
      logEntries,
      clearLogs,
    }),
    [
      workflows,
      selectedWorkflow,
      selectWorkflow,
      workflowsLoading,
      workflowsError,
      workflowData,
      dynamicInputs,
      orderedDynamicInputs,
      imageInputs,
      primaryImageInput,
      formData,
      setFormData,
      handleFormChange,
      workflowLoading,
      workflowError,
      promptFieldName,
      aliasState.aliasOptions,
      aliasState.aliasLookup,
      aliasState.aliasCategories,
      aliasCatalog,
      aliasState.loading,
      aliasState.saving,
      aliasState.error,
      aliasState.refreshAliases,
      aliasState.persistAliases,
      isLoading,
      progressValue,
      progressMax,
      statusText,
      statusPhase,
      handleGenerate,
      logEntries,
      clearLogs,
    ]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
