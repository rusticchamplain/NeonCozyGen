// js/src/config/loraPairs.js
// Auto-generate LoRA high/low pairs for numbered params like:
// "Lora High - 1" / "Lora Low - 1"
// "Lora High Strength - 1" / "Lora Low Strength - 1"
//
// Increase MAX_LORA_INDEX if you ever need more pairs.

const MAX_LORA_INDEX = 16;

export const LORA_PAIRS = Array.from({ length: MAX_LORA_INDEX }, (_, i) => {
  const idx = i + 1;
  const suffix = ` - ${idx}`;

  return {
    id: `video_lora_${idx}`,
    label: `Video LoRA ${idx}`,

    // These must match inputs.param_name in your workflow
    highParam: `Lora High${suffix}`,
    lowParam: `Lora Low${suffix}`,

    // Optional strength params (also by param_name)
    highStrengthParam: `Lora High Strength${suffix}`,
    lowStrengthParam: `Lora Low Strength${suffix}`,
  };
});
