export function createPromptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(16).slice(2);
  const time = Date.now().toString(16);
  return `cozy-${time}-${rand}`;
}
