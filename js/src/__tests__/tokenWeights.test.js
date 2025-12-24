import { describe, expect, it } from 'vitest';
import { getElementWeight, parsePromptElements } from '../utils/tokenWeights';

describe('tokenWeights', () => {
  it('keeps weighted groups with commas together', () => {
    const text = '(tag_one, tag_two:1.2), third';
    const elements = parsePromptElements(text);
    expect(elements.length).toBe(2);
    expect(elements[0].text).toBe('tag_one, tag_two');
    const weight = getElementWeight(text, elements[0]);
    expect(weight?.weight).toBe(1.2);
  });

  it('parses weighted aliases as a single alias element', () => {
    const text = '($alias_key$:1.5), tag';
    const elements = parsePromptElements(text);
    expect(elements[0].type).toBe('alias');
    expect(elements[0].text).toBe('alias_key');
  });
});
