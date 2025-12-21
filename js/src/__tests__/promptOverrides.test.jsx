import { describe, expect, it } from 'vitest';
import { analyzePromptGraph, applyPromptOverrides } from '../utils/promptOverrides';

const buildPrompt = () => ({
  10: {
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: ['25', 0] },
  },
  12: {
    class_type: 'LoraLoaderModelOnly',
    inputs: { lora_name: ['30', 0], model: ['10', 0] },
  },
  16: {
    class_type: 'KSampler',
    inputs: { seed: ['24', 0], steps: 20 },
  },
  24: {
    class_type: 'Seed (rgthree)',
    inputs: { seed: 123 },
  },
  25: {
    class_type: 'CozyGenDynamicInput',
    inputs: { choice_type: 'checkpoints', default_value: 'Base.ckpt' },
  },
  30: {
    class_type: 'CozyGenDynamicInput',
    inputs: { choice_type: 'loras', default_value: 'OldLoRA.safetensors' },
  },
  40: {
    class_type: 'EmptyLatentImage',
    inputs: { width: ['41', 0], height: ['42', 0], batch_size: 1 },
  },
  41: {
    class_type: 'CozyGenDynamicInput',
    inputs: { param_name: 'Width', default_value: 512 },
  },
  42: {
    class_type: 'CozyGenIntInput',
    inputs: { param_name: 'Height', default_value: 768 },
  },
});

describe('promptOverrides', () => {
  it('analyzes prompt capabilities', () => {
    const prompt = buildPrompt();
    const info = analyzePromptGraph(prompt);
    expect(info.hasSeed).toBe(true);
    expect(info.hasCheckpoint).toBe(true);
    expect(info.hasLora).toBe(true);
    expect(info.hasSize).toBe(true);
    expect(info.checkpoint).toBe('Base.ckpt');
    expect(info.loras).toContain('OldLoRA.safetensors');
    expect(info.width).toBe(512);
    expect(info.height).toBe(768);
  });

  it('applies seed, checkpoint, and lora overrides without mutation', () => {
    const prompt = buildPrompt();
    const next = applyPromptOverrides(prompt, {
      seedMode: 'random',
      checkpoint: 'New.ckpt',
      lora: 'NewLoRA.safetensors',
      width: 1024,
      height: 640,
    });

    expect(prompt[24].inputs.seed).toBe(123);
    expect(prompt[25].inputs.default_value).toBe('Base.ckpt');
    expect(prompt[30].inputs.default_value).toBe('OldLoRA.safetensors');
    expect(prompt[41].inputs.default_value).toBe(512);
    expect(prompt[42].inputs.default_value).toBe(768);

    expect(next[24].inputs.seed).toBe(-1);
    expect(next[25].inputs.default_value).toBe('New.ckpt');
    expect(next[30].inputs.default_value).toBe('NewLoRA.safetensors');
    expect(next[41].inputs.default_value).toBe(1024);
    expect(next[42].inputs.default_value).toBe(640);
  });
});
