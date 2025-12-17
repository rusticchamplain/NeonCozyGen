const MODEL_EXT_RE = /\.(safetensors|ckpt|pt|pth)$/i;

export function isModelFileLike(value) {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  const normalized = s.replace(/\\/g, '/');
  const last = normalized.split('/').filter(Boolean).pop() || '';
  return MODEL_EXT_RE.test(last);
}

export function splitModelDisplayName(value) {
  if (typeof value !== 'string') {
    return { folder: '', base: '' };
  }
  const normalized = value.trim().replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const filename = parts.pop() || '';
  const base = filename.replace(/\.[^.]+$/, '');
  const folder = parts.join(' ').trim();
  return { folder, base };
}

export function formatModelDisplayName(value) {
  if (!isModelFileLike(value)) return value;
  const { folder, base } = splitModelDisplayName(value);
  if (!base) return value;
  if (!folder) return base;

  const folderWords = folder.split(/\s+/).filter(Boolean);
  const lastWord = folderWords[folderWords.length - 1] || '';
  if (lastWord && base.toLowerCase().startsWith(lastWord.toLowerCase())) {
    const remainder = base.slice(lastWord.length);
    return remainder ? `${folder}${remainder}` : folder;
  }

  return `${folder} ${base}`.trim();
}

