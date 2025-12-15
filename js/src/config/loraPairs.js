// js/src/config/loraPairs.js
// Auto-generate LoRA high/low pairs for numbered params like:
// "Lora High - 1" / "Lora Low - 1"
// "Lora High Strength - 1" / "Lora Low Strength - 1"
//
// Increase MAX_LORA_INDEX if you ever need more pairs.

const MAX_LORA_INDEX = 16;
const INDEX_JOINERS = [' - ', ' ', '-', '_'];

const uniq = (list) => [...new Set(list.filter(Boolean))];

const buildIndexVariants = (base, idx) => {
  const root = String(base || '').trim();
  const variants = INDEX_JOINERS.map((joiner) => `${root}${joiner}${idx}`);
  variants.push(`${root}${idx}`);
  return uniq(variants);
};

const buildStrengthVariants = (base, idx) => {
  const beforeIdx = buildIndexVariants(`${base} Strength`, idx);
  const afterIdx = buildIndexVariants(base, idx).map((name) => `${name} Strength`);
  return uniq([...beforeIdx, ...afterIdx]);
};

const normalizeToken = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

export const matchLoraParam = (byName, candidates = []) => {
  if (!byName) return null;
  const names = Array.isArray(candidates) ? candidates : [candidates];
  for (const name of names) {
    if (!name) continue;
    const input = byName.get(name);
    if (input) return { name, input };
  }

  // Fallback to normalized comparison so "Lora High - 1" and "Lora High 1" can match.
  const normalizedCandidates = new Map();
  names.forEach((name) => {
    if (!name) return;
    normalizedCandidates.set(normalizeToken(name), name);
  });

  for (const [actualName, input] of byName.entries()) {
    const key = normalizeToken(actualName);
    if (normalizedCandidates.has(key)) {
      return { name: actualName, input };
    }
  }

  return null;
};

export const LORA_PAIRS = Array.from({ length: MAX_LORA_INDEX }, (_, i) => {
  const idx = i + 1;
  const highNames = buildIndexVariants('Lora High', idx);
  const lowNames = buildIndexVariants('Lora Low', idx);
  const highStrengthNames = buildStrengthVariants('Lora High', idx);
  const lowStrengthNames = buildStrengthVariants('Lora Low', idx);

  return {
    id: `video_lora_${idx}`,
    label: `Video LoRA ${idx}`,

    // These must match inputs.param_name in your workflow
    highParam: highNames[0],
    lowParam: lowNames[0],
    highParamAliases: highNames,
    lowParamAliases: lowNames,

    // Optional strength params (also by param_name)
    highStrengthParam: highStrengthNames[0],
    lowStrengthParam: lowStrengthNames[0],
    highStrengthParamAliases: highStrengthNames,
    lowStrengthParamAliases: lowStrengthNames,
  };
});
