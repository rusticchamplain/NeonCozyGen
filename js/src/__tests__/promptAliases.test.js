import { describe, expect, it } from 'vitest';
import { applyPromptAliases } from '../utils/promptAliases';

describe('promptAliases', () => {
  it('expands weighted aliases into per-tag weights', () => {
    const aliases = { hero: 'tag_one, tag_two' };
    const input = '($hero$:0.7), background';
    const output = applyPromptAliases(input, aliases);
    expect(output).toBe('(tag_one:0.7), (tag_two:0.7), background');
  });

  it('replaces unweighted aliases as before', () => {
    const aliases = { hero: 'tag_one, tag_two' };
    const input = '$hero$, background';
    const output = applyPromptAliases(input, aliases);
    expect(output).toBe('tag_one, tag_two, background');
  });

  it('overrides existing tag weights inside weighted aliases', () => {
    const aliases = { hero: '(tag_one:1.2), tag_two' };
    const input = '($hero$:0.7)';
    const output = applyPromptAliases(input, aliases);
    expect(output).toBe('(tag_one:0.7), (tag_two:0.7)');
  });

  it('expands nested aliases up to the max pass', () => {
    const aliases = { a: '$b$', b: 'tag_one, tag_two' };
    const input = '$a$';
    const output = applyPromptAliases(input, aliases);
    expect(output).toBe('tag_one, tag_two');
  });

  it('falls back to unqualified alias names when unique', () => {
    const aliases = { 'PROMPTS::scene': 'tag_one, tag_two' };
    const input = '$scene$';
    const output = applyPromptAliases(input, aliases);
    expect(output).toBe('tag_one, tag_two');
  });

  it('keeps ambiguous unqualified aliases untouched', () => {
    const aliases = { 'PROMPTS::scene': 'tag_one', 'CHAR::scene': 'tag_two' };
    const input = '$scene$';
    const output = applyPromptAliases(input, aliases);
    expect(output).toBe('$scene$');
  });

  it('expands bare category::alias tokens when mapped', () => {
    const aliases = { 'media_char::movies_lara_croft': 'tag_one' };
    const input = 'media_char::movies_lara_croft, tag_two';
    const output = applyPromptAliases(input, aliases);
    expect(output).toBe('tag_one, tag_two');
  });

  it('strips category prefix for unknown bare aliases', () => {
    const aliases = { 'media_char::movies_lara_croft': 'tag_one' };
    const input = 'lighting::particle_sunbeam_dust, tag_two';
    const output = applyPromptAliases(input, aliases);
    expect(output).toBe('particle_sunbeam_dust, tag_two');
  });
});
