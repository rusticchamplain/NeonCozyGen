import { formatModelDisplayName } from '../../../utils/modelDisplay';

const getParamType = (input) => {
  const raw = input?.inputs?.param_type || input?.inputs?.Param_type;
  const t = String(raw || 'STRING').toUpperCase();
  if (['NUMBER', 'FLOAT', 'INT'].includes(t)) return 'NUMBER';
  if (['BOOLEAN', 'BOOL'].includes(t)) return 'BOOLEAN';
  if (['DROPDOWN', 'CHOICE', 'SELECT'].includes(t)) return 'DROPDOWN';
  return 'STRING';
};

export const resolveLabel = (input) => {
  const i = input?.inputs || {};
  return (
    i.label ||
    i.display_name ||
    i.title ||
    i.param_name ||
    input?.title ||
    input?.class_type ||
    'Parameter'
  );
};

const resolveDescription = (input) => {
  const i = input?.inputs || {};
  return (
    i.description ||
    i.help ||
    i.tooltip ||
    i.doc ||
    ''
  );
};

export const resolveParamName = (input) => {
  const i = input?.inputs || {};
  return (
    i.param_name ||
    i.name ||
    i.key ||
    i.id ||
    `param_${input?.id || 'unknown'}`
  );
};

export const resolveConfig = (input) => {
  const i = input?.inputs || {};
  const choices = i.choices || i.options || [];
  const inferredDefault =
    i.default_value ??
    i.value ??
    i.default_choice ??
    (choices && choices.length ? choices[0] : '') ??
    '';
  return {
    paramName: resolveParamName(input),
    label: resolveLabel(input),
    description: resolveDescription(input),
    paramType: getParamType(input),
    multiline: !!i.multiline,
    min: typeof i.min === 'number' ? i.min : undefined,
    max: typeof i.max === 'number' ? i.max : undefined,
    step: typeof i.step === 'number' ? i.step : undefined,
    choices,
    defaultValue: inferredDefault,
  };
};

export const formatParamPreview = (cfg, value) => {
  if (cfg?.paramType === 'BOOLEAN') return value ? 'On' : 'Off';
  if (value === null || value === undefined || value === '') return 'Empty';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'Empty';
    // Avoid rendering massive previews and keep updates cheap.
    const MAX_SCAN = 240;
    const MAX_PREVIEW = 140;
    const snippet = trimmed.length > MAX_SCAN ? trimmed.slice(0, MAX_SCAN) : trimmed;
    const needsNormalize = /[\r\n\t]/.test(snippet) || /\s{2,}/u.test(snippet);
    const normalized = needsNormalize ? snippet.replace(/\s+/gu, ' ').trim() : snippet;

    if (normalized.length > MAX_PREVIEW) {
      return `${normalized.slice(0, MAX_PREVIEW)}…`;
    }
    const label = formatModelDisplayName(normalized);
    return trimmed.length > MAX_SCAN ? `${label}…` : label;
  }
  return String(value);
};
