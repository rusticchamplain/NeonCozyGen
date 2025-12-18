export function formatTokenWeight(weight) {
  const n = Number(weight);
  if (!Number.isFinite(n)) return '1';
  const fixed = n.toFixed(2);
  return fixed.replace(/\.?0+$/u, '');
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

