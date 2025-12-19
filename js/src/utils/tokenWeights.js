export function formatTokenWeight(weight) {
  const n = Number(weight);
  if (!Number.isFinite(n)) return '1';
  const fixed = n.toFixed(2);
  return fixed.replace(/\.?0+$/u, '');
}

/**
 * Parse a prompt into unified elements (aliases and plain tags).
 * Each element: { type: 'alias'|'tag', text: string, start: number, end: number }
 */
export function parsePromptElements(text = '') {
  const raw = String(text || '');
  if (!raw.trim()) return [];

  const elements = [];
  let i = 0;

  while (i < raw.length) {
    // Skip leading whitespace and commas
    while (i < raw.length && /[\s,]/.test(raw[i])) i++;
    if (i >= raw.length) break;

    let start = i;
    let end = i;
    let type = 'tag';
    let content = '';

    // Check for weight wrapper: (content:weight)
    const hasWeightWrapper = raw[i] === '(';
    if (hasWeightWrapper) {
      start = i;
      i++; // skip '('
    }

    // Check for alias: $...$
    if (raw[i] === '$') {
      type = 'alias';
      const aliasStart = i;
      i++; // skip opening $
      while (i < raw.length && raw[i] !== '$' && raw[i] !== ',' && raw[i] !== '\n') {
        content += raw[i];
        i++;
      }
      if (raw[i] === '$') {
        i++; // skip closing $
      }
      if (!hasWeightWrapper) {
        start = aliasStart;
      }
    } else {
      // Plain tag: read until comma, $, or end (or : if in weight wrapper)
      type = 'tag';
      const tagStart = i;
      while (i < raw.length) {
        if (raw[i] === ',' || raw[i] === '$' || raw[i] === '\n') break;
        if (hasWeightWrapper && raw[i] === ':') break;
        if (!hasWeightWrapper && raw[i] === '(') break;
        content += raw[i];
        i++;
      }
      content = content.trim();
      if (!hasWeightWrapper) {
        start = tagStart;
      }
    }

    // Handle weight suffix if in wrapper
    if (hasWeightWrapper && raw[i] === ':') {
      i++; // skip ':'
      while (i < raw.length && raw[i] !== ')' && raw[i] !== ',' && raw[i] !== '\n') {
        i++;
      }
      if (raw[i] === ')') {
        i++; // skip ')'
      }
    }

    end = i;

    if (content) {
      elements.push({ type, text: content, start, end });
    }
  }

  return elements;
}

/**
 * Get weight info for a parsed element.
 * Returns { weight, wrapperStart, wrapperEnd } or null if no weight.
 */
export function getElementWeight(text = '', element) {
  if (!element || typeof element.start !== 'number' || typeof element.end !== 'number') return null;
  const raw = String(text || '');
  const fullText = raw.slice(element.start, element.end);

  // Check if wrapped: (content:weight)
  if (!fullText.startsWith('(') || !fullText.includes(':')) return null;

  const colonIdx = fullText.lastIndexOf(':');
  if (colonIdx === -1) return null;

  const afterColon = fullText.slice(colonIdx + 1);
  if (!afterColon.endsWith(')')) return null;

  const numStr = afterColon.slice(0, -1).trim();
  if (!/^\d+(\.\d+)?$/u.test(numStr)) return null;

  const weight = Number.parseFloat(numStr);
  if (!Number.isFinite(weight)) return null;

  return {
    weight,
    wrapperStart: element.start,
    wrapperEnd: element.end,
  };
}

/**
 * Set weight for a parsed element. Returns updated text.
 */
export function setElementWeight(text = '', element, nextWeight) {
  const raw = String(text || '');
  if (!element || typeof element.start !== 'number' || typeof element.end !== 'number') return raw;

  const normalizedWeight = nextWeight === null || nextWeight === undefined
    ? null
    : Number(nextWeight);
  const shouldRemove = normalizedWeight === null || !Number.isFinite(normalizedWeight) || Math.abs(normalizedWeight - 1) < 1e-6;

  // Build the core content (without weight wrapper)
  const coreContent = element.type === 'alias' ? `$${element.text}$` : element.text;

  if (shouldRemove) {
    // Remove weight, keep just the content
    return raw.slice(0, element.start) + coreContent + raw.slice(element.end);
  }

  const formatted = formatTokenWeight(normalizedWeight);
  const wrapped = `(${coreContent}:${formatted})`;
  return raw.slice(0, element.start) + wrapped + raw.slice(element.end);
}

/**
 * Reorder elements in the prompt text.
 */
export function reorderElements(text = '', elements, fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx === null || toIdx === null) return text;
  if (!elements?.length) return text;

  const raw = String(text || '');

  // Extract the full text slice for each element
  const slices = elements.map((el) => ({
    start: el.start,
    end: el.end,
    text: raw.slice(el.start, el.end),
  }));

  // Get separators between elements
  const separators = slices.slice(0, -1).map((slice, idx) => {
    const nextSlice = slices[idx + 1];
    return raw.slice(slice.end, nextSlice.start);
  });

  const prefix = slices.length ? raw.slice(0, slices[0].start) : '';
  const suffix = slices.length ? raw.slice(slices[slices.length - 1].end) : '';

  // Reorder
  const reordered = [...slices];
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(toIdx, 0, moved);

  // Rebuild
  let result = prefix + (reordered[0]?.text || '');
  for (let i = 1; i < reordered.length; i++) {
    result += (separators[i - 1] ?? ', ') + reordered[i].text;
  }
  result += suffix;

  return result;
}

/**
 * Remove an element from the prompt text.
 */
export function removeElement(text = '', element) {
  const raw = String(text || '');
  if (!element || typeof element.start !== 'number' || typeof element.end !== 'number') return raw;

  const before = raw.slice(0, element.start).replace(/[\s,]*$/, '');
  const after = raw.slice(element.end).replace(/^[\s,]*/, '');
  return before ? `${before}, ${after}`.trim() : after.trim();
}

export function getTokenWeightRange(text = '', tokenObj) {
  if (!tokenObj || typeof tokenObj.index !== 'number' || typeof tokenObj.length !== 'number') return null;
  const raw = String(text || '');
  const tokenStart = tokenObj.index;
  const tokenEnd = tokenObj.index + tokenObj.length;
  if (tokenStart <= 0) return null;

  // Match: ( $token$ : 1.2 )
  // Exact formatting enforced: `($token$:1.2)` to avoid ambiguous parsing.
  if (raw[tokenStart - 1] !== '(') return null;
  if (raw[tokenEnd] !== ':') return null;

  let i = tokenEnd + 1;
  let num = '';
  while (i < raw.length && raw[i] !== ')') {
    num += raw[i];
    i += 1;
    if (num.length > 12) return null;
  }
  if (i >= raw.length || raw[i] !== ')') return null;
  const trimmed = num.trim();
  if (!/^\d+(\.\d+)?$/u.test(trimmed)) return null;
  const weight = Number.parseFloat(trimmed);
  if (!Number.isFinite(weight)) return null;
  return {
    weight,
    wrapperStart: tokenStart - 1,
    wrapperEnd: i + 1, // exclusive
  };
}

export function setTokenWeight(text = '', tokenObj, nextWeight) {
  const raw = String(text || '');
  if (!tokenObj || typeof tokenObj.index !== 'number' || typeof tokenObj.length !== 'number') return raw;
  const tokenStart = tokenObj.index;
  const tokenEnd = tokenObj.index + tokenObj.length;
  const current = getTokenWeightRange(raw, tokenObj);

  const normalizedWeight = nextWeight === null || nextWeight === undefined
    ? null
    : Number(nextWeight);
  const shouldRemove = normalizedWeight === null || !Number.isFinite(normalizedWeight) || Math.abs(normalizedWeight - 1) < 1e-6;

  if (current) {
    if (shouldRemove) {
      // Remove wrapper, keep the $token$ portion intact.
      return raw.slice(0, current.wrapperStart) + raw.slice(tokenStart, tokenEnd) + raw.slice(current.wrapperEnd);
    }
    const formatted = formatTokenWeight(normalizedWeight);
    // Replace number between ':' and ')'
    return raw.slice(0, tokenEnd + 1) + formatted + raw.slice(current.wrapperEnd - 1);
  }

  if (shouldRemove) return raw;
  const formatted = formatTokenWeight(normalizedWeight);
  return raw.slice(0, tokenStart) + '(' + raw.slice(tokenStart, tokenEnd) + ':' + formatted + ')' + raw.slice(tokenEnd);
}
