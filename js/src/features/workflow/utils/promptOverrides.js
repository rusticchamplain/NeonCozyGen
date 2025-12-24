import { cloneWorkflow } from './workflowGraph';

const SEED_KEYS = ['seed', 'noise_seed'];
const CHECKPOINT_KEYS = ['ckpt_name', 'checkpoint', 'ckpt', 'model_name'];
const LORA_KEYS = ['lora_name'];
const WIDTH_KEYS = ['width', 'image_width'];
const HEIGHT_KEYS = ['height', 'image_height'];
const PROMPT_PARAM_RE = /(prompt|positive|text)/i;
const NEGATIVE_PARAM_RE = /(negative|neg)/i;

const toLower = (value) => String(value || '').toLowerCase();

const isDynamicChoiceNode = (node) =>
  node?.class_type === 'CozyGenDynamicInput' || node?.class_type === 'CozyGenChoiceInput';

const getChoiceType = (node) => toLower(node?.inputs?.choice_type);

const setChoiceValue = (node, value) => {
  if (!node?.inputs) return;
  if ('default_value' in node.inputs) {
    node.inputs.default_value = value;
  }
  if ('value' in node.inputs) {
    node.inputs.value = value;
  }
};

const isCheckpointLoader = (node) => toLower(node?.class_type).includes('checkpoint');
const isLoraLoader = (node) => toLower(node?.class_type).includes('lora');
const isSeedNode = (node) => toLower(node?.class_type).includes('seed');

const resolveScalarSeed = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveScalarSize = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getNodeScalarValue = (node) => {
  if (!node?.inputs) return null;
  if ('default_value' in node.inputs) {
    return resolveScalarSize(node.inputs.default_value);
  }
  if ('value' in node.inputs) {
    return resolveScalarSize(node.inputs.value);
  }
  return null;
};

const getParamName = (node) => toLower(node?.inputs?.param_name);
const getParamLabel = (node) => String(node?.inputs?.param_name || '').trim();

const setScalarInputValue = (node, value) => {
  if (!node?.inputs) return false;
  let touched = false;
  if ('default_value' in node.inputs && resolveScalarSize(node.inputs.default_value) !== null) {
    node.inputs.default_value = value;
    touched = true;
  }
  if ('value' in node.inputs && resolveScalarSize(node.inputs.value) !== null) {
    node.inputs.value = value;
    touched = true;
  }
  return touched;
};

const isPromptParamName = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return false;
  if (NEGATIVE_PARAM_RE.test(raw)) return false;
  return PROMPT_PARAM_RE.test(raw);
};

const resolvePromptFields = (inputs) => {
  if (!inputs) return [];
  const fields = [];
  if (typeof inputs.default_value === 'string') fields.push('default_value');
  if (typeof inputs.value === 'string' && inputs.value !== inputs.default_value) {
    fields.push('value');
  }
  return fields;
};

const isTextEncodeNode = (node) => toLower(node?.class_type).includes('textencode');

const updateSeedInputs = (node, seed) => {
  if (!node?.inputs) return false;
  let touched = false;
  SEED_KEYS.forEach((key) => {
    if (!(key in node.inputs)) return;
    const current = node.inputs[key];
    if (Array.isArray(current)) return;
    if (resolveScalarSeed(current) === null) return;
    node.inputs[key] = seed;
    touched = true;
  });
  return touched;
};

const updateSeedGraph = (graph, seed) => {
  const linkedTargets = new Set();
  Object.values(graph || {}).forEach((node) => {
    if (!node?.inputs) return;
    SEED_KEYS.forEach((key) => {
      if (!(key in node.inputs)) return;
      const current = node.inputs[key];
      if (Array.isArray(current) && current.length) {
        linkedTargets.add(current[0]);
        return;
      }
      if (resolveScalarSeed(current) !== null) {
        node.inputs[key] = seed;
      }
    });

    if (isSeedNode(node)) {
      updateSeedInputs(node, seed);
    }
  });

  linkedTargets.forEach((targetId) => {
    const target = graph?.[targetId];
    if (target) updateSeedInputs(target, seed);
  });
};

const updateCheckpointGraph = (graph, checkpoint) => {
  const linkedTargets = new Set();
  Object.values(graph || {}).forEach((node) => {
    if (!node?.inputs) return;

    if (isDynamicChoiceNode(node) && getChoiceType(node) === 'checkpoints') {
      setChoiceValue(node, checkpoint);
    }

    if (isCheckpointLoader(node)) {
      CHECKPOINT_KEYS.forEach((key) => {
        if (!(key in node.inputs)) return;
        const current = node.inputs[key];
        if (Array.isArray(current) && current.length) {
          linkedTargets.add(current[0]);
          return;
        }
        if (typeof current === 'string' || typeof current === 'number') {
          node.inputs[key] = checkpoint;
        }
      });
    }
  });

  linkedTargets.forEach((targetId) => {
    const target = graph?.[targetId];
    if (target && isDynamicChoiceNode(target) && getChoiceType(target) === 'checkpoints') {
      setChoiceValue(target, checkpoint);
    }
  });
};

const updateLoraGraph = (graph, lora) => {
  const linkedTargets = new Set();
  Object.values(graph || {}).forEach((node) => {
    if (!node?.inputs) return;

    if (isDynamicChoiceNode(node) && getChoiceType(node) === 'loras') {
      setChoiceValue(node, lora);
    }

    if (isLoraLoader(node) || LORA_KEYS.some((key) => key in node.inputs)) {
      LORA_KEYS.forEach((key) => {
        if (!(key in node.inputs)) return;
        const current = node.inputs[key];
        if (Array.isArray(current) && current.length) {
          linkedTargets.add(current[0]);
          return;
        }
        if (typeof current === 'string' || typeof current === 'number') {
          node.inputs[key] = lora;
        }
      });
    }
  });

  linkedTargets.forEach((targetId) => {
    const target = graph?.[targetId];
    if (target && isDynamicChoiceNode(target) && getChoiceType(target) === 'loras') {
      setChoiceValue(target, lora);
    }
  });
};

const updateSizeGraph = (graph, width, height) => {
  if (width === null && height === null) return;
  const linkedWidth = new Set();
  const linkedHeight = new Set();

  Object.values(graph || {}).forEach((node) => {
    if (!node?.inputs) return;
    const inputs = node.inputs;
    const paramName = getParamName(node);

    if (width !== null && paramName === 'width') {
      setScalarInputValue(node, width);
    }
    if (height !== null && paramName === 'height') {
      setScalarInputValue(node, height);
    }

    if (width !== null) {
      WIDTH_KEYS.forEach((key) => {
        if (!(key in inputs)) return;
        const current = inputs[key];
        if (Array.isArray(current) && current.length) {
          linkedWidth.add(current[0]);
          return;
        }
        if (resolveScalarSize(current) !== null) {
          inputs[key] = width;
        }
      });
    }

    if (height !== null) {
      HEIGHT_KEYS.forEach((key) => {
        if (!(key in inputs)) return;
        const current = inputs[key];
        if (Array.isArray(current) && current.length) {
          linkedHeight.add(current[0]);
          return;
        }
        if (resolveScalarSize(current) !== null) {
          inputs[key] = height;
        }
      });
    }
  });

  linkedWidth.forEach((targetId) => {
    const target = graph?.[targetId];
    if (target) setScalarInputValue(target, width);
  });

  linkedHeight.forEach((targetId) => {
    const target = graph?.[targetId];
    if (target) setScalarInputValue(target, height);
  });
};

export function getPromptTargets(prompt) {
  if (!prompt) return [];
  const entries = Object.entries(prompt || {})
    .sort((a, b) => {
      const ai = Number(a[0]);
      const bi = Number(b[0]);
      if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
      return String(a[0]).localeCompare(String(b[0]));
    });
  const targets = [];

  entries.forEach(([id, node]) => {
    if (!node?.inputs) return;
    const inputs = node.inputs;
    const classType = String(node?.class_type || '');
    const paramName = getParamLabel(node);
    const paramNameLower = getParamName(node);

    if (paramNameLower && isPromptParamName(paramNameLower)) {
      const fields = resolvePromptFields(inputs);
      if (fields.length) {
        const text = inputs[fields[0]];
        if (typeof text === 'string') {
          targets.push({
            id: String(id),
            key: `${id}:${fields[0]}`,
            label: paramName || `Prompt ${id}`,
            text,
            fields,
            classType,
          });
        }
      }
      return;
    }

    if (isTextEncodeNode(node) && typeof inputs.text === 'string') {
      targets.push({
        id: String(id),
        key: `${id}:text`,
        label: `${classType || 'Text Encode'} ${id}`,
        text: inputs.text,
        fields: ['text'],
        classType,
      });
    }
  });

  return targets;
}

export function applyPromptTextOverrides(prompt, targets = [], drafts = {}, options = {}) {
  if (!prompt || !targets.length) return prompt;
  const { mutate = false } = options || {};
  const next = mutate ? prompt : cloneWorkflow(prompt);

  targets.forEach((target) => {
    if (!target?.id || !target?.fields?.length) return;
    const nextText = typeof drafts?.[target.key] === 'string' ? drafts[target.key] : target.text;
    if (typeof nextText !== 'string') return;
    const node = next?.[target.id];
    if (!node?.inputs) return;
    target.fields.forEach((field) => {
      if (typeof node.inputs[field] === 'string') {
        node.inputs[field] = nextText;
      }
    });
  });

  return next;
}

export function analyzePromptGraph(prompt) {
  const summary = {
    hasSeed: false,
    hasCheckpoint: false,
    hasLora: false,
    checkpoint: '',
    loras: [],
    hasSize: false,
    width: null,
    height: null,
  };

  const checkpoints = new Set();
  const loras = new Set();

  Object.values(prompt || {}).forEach((node) => {
    const inputs = node?.inputs || {};
    if (!inputs) return;

    SEED_KEYS.forEach((key) => {
      if (key in inputs) summary.hasSeed = true;
    });

    if (isCheckpointLoader(node)) {
      summary.hasCheckpoint = true;
      CHECKPOINT_KEYS.forEach((key) => {
        const val = inputs[key];
        if (typeof val === 'string' && val) checkpoints.add(val);
      });
    }

    if (isLoraLoader(node) || LORA_KEYS.some((key) => key in inputs)) {
      summary.hasLora = true;
      const val = inputs.lora_name;
      if (typeof val === 'string' && val) loras.add(val);
    }

    if (isDynamicChoiceNode(node)) {
      const choiceType = getChoiceType(node);
      const value = inputs.default_value ?? inputs.value;
      if (choiceType === 'checkpoints') {
        summary.hasCheckpoint = true;
        if (typeof value === 'string' && value) checkpoints.add(value);
      }
      if (choiceType === 'loras') {
        summary.hasLora = true;
        if (typeof value === 'string' && value) loras.add(value);
      }
    }

    if (isSeedNode(node) && 'seed' in inputs) {
      summary.hasSeed = true;
    }

    if (summary.width === null && getParamName(node) === 'width') {
      const value = getNodeScalarValue(node);
      if (value !== null) summary.width = value;
    }

    if (summary.height === null && getParamName(node) === 'height') {
      const value = getNodeScalarValue(node);
      if (value !== null) summary.height = value;
    }

    if (summary.width === null) {
      WIDTH_KEYS.forEach((key) => {
        if (!(key in inputs) || summary.width !== null) return;
        const current = inputs[key];
        if (Array.isArray(current) && current.length) {
          const linked = prompt?.[current[0]];
          const linkedValue = getNodeScalarValue(linked);
          if (linkedValue !== null) summary.width = linkedValue;
          return;
        }
        const value = resolveScalarSize(current);
        if (value !== null) summary.width = value;
      });
    }

    if (summary.height === null) {
      HEIGHT_KEYS.forEach((key) => {
        if (!(key in inputs) || summary.height !== null) return;
        const current = inputs[key];
        if (Array.isArray(current) && current.length) {
          const linked = prompt?.[current[0]];
          const linkedValue = getNodeScalarValue(linked);
          if (linkedValue !== null) summary.height = linkedValue;
          return;
        }
        const value = resolveScalarSize(current);
        if (value !== null) summary.height = value;
      });
    }
  });

  summary.checkpoint = checkpoints.values().next().value || '';
  summary.loras = Array.from(loras);
  summary.hasSize = summary.width !== null || summary.height !== null;
  return summary;
}

export function applyPromptOverrides(prompt, overrides = {}) {
  if (!prompt) return prompt;
  const next = cloneWorkflow(prompt);
  const {
    seedMode = 'keep',
    seedValue = null,
    checkpoint = null,
    lora = null,
    width = null,
    height = null,
  } = overrides;

  if (seedMode && seedMode !== 'keep') {
    const seed =
      seedMode === 'random'
        ? Math.floor(Math.random() * 4294967295)
        : resolveScalarSeed(seedValue);
    if (seed !== null) {
      updateSeedGraph(next, seed);
    }
  }

  if (checkpoint) {
    updateCheckpointGraph(next, checkpoint);
  }

  if (lora) {
    updateLoraGraph(next, lora);
  }

  const resolvedWidth = resolveScalarSize(width);
  const resolvedHeight = resolveScalarSize(height);
  if (resolvedWidth !== null || resolvedHeight !== null) {
    updateSizeGraph(next, resolvedWidth, resolvedHeight);
  }

  return next;
}
