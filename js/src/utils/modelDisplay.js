const MODEL_EXT_RE = /\.(safetensors|ckpt|pt|pth)$/i;
const FILE_EXT_RE = /\.([a-z0-9]{2,16})$/i;

const hasLetter = (value) => /[a-z]/i.test(value);
const normalizePath = (value) => value.replace(/\\/g, '/');
const formatDisplayName = (value) => {
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
};

export function isModelFileLike(value) {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  const normalized = normalizePath(s);
  const last = normalized.split('/').filter(Boolean).pop() || '';
  return MODEL_EXT_RE.test(last);
}

export function isFilePathLike(value) {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  const normalized = normalizePath(s);
  const last = normalized.split('/').filter(Boolean).pop() || '';
  const match = last.match(FILE_EXT_RE);
  if (!match) return false;
  return hasLetter(match[1]);
}

export function splitFilePath(value) {
  if (typeof value !== 'string') {
    return { folderPath: '', base: '', filename: '' };
  }
  const normalized = normalizePath(value.trim());
  if (!normalized) {
    return { folderPath: '', base: '', filename: '' };
  }
  const parts = normalized.split('/').filter(Boolean);
  const filename = parts.pop() || '';
  const base = filename.replace(/\.[^.]+$/, '');
  const folderPath = parts.join('/');
  return { folderPath, base, filename };
}

export function getFileFolder(value) {
  if (!isFilePathLike(value)) return '';
  const { folderPath } = splitFilePath(value);
  return folderPath || 'root';
}

export function splitModelDisplayName(value) {
  if (typeof value !== 'string') {
    return { folder: '', base: '' };
  }
  const normalized = normalizePath(value.trim());
  const parts = normalized.split('/').filter(Boolean);
  const filename = parts.pop() || '';
  const base = filename.replace(/\.[^.]+$/, '');
  const folder = parts.join(' ').trim();
  return { folder, base };
}

export function formatModelDisplayName(value) {
  if (!isModelFileLike(value)) return value;
  return formatDisplayName(value);
}

export function formatFileDisplayName(value) {
  if (!isFilePathLike(value)) return value;
  return formatDisplayName(value);
}

export function formatFileBaseName(value) {
  if (!isFilePathLike(value)) return value;
  const { base } = splitFilePath(value);
  if (base) return base;
  return formatFileDisplayName(value);
}
