// js/src/utils/presets.js

export const WORKFLOW_MODE_OPTIONS = [
  { id: 'text-to-image', label: 'Text to Image' },
  { id: 'image-to-image', label: 'Image to Image' },
  { id: 'text-to-video', label: 'Text to Video' },
  { id: 'image-to-video', label: 'Image to Video' },
];

export const WORKFLOW_MODE_LABELS = WORKFLOW_MODE_OPTIONS.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

function extractValuesBlock(raw = {}) {
  if (raw && typeof raw === 'object' && raw.formData && typeof raw.formData === 'object') {
    return { ...raw.formData };
  }
  return { ...(raw || {}) };
}

export function normalizePresetValue(raw) {
  if (!raw || typeof raw !== 'object') {
    return { values: raw || {}, meta: {} };
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'values')) {
    const valuesBlock =
      raw.values && typeof raw.values === 'object' ? raw.values : {};
    const values = extractValuesBlock(valuesBlock);
    const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
    return { values, meta };
  }
  return { values: extractValuesBlock(raw), meta: {} };
}

export function normalizePresetItems(items = {}) {
  return Object.entries(items || {}).map(([name, value]) => ({
    name,
    ...normalizePresetValue(value),
  }));
}
