import { describe, expect, it } from 'vitest';
import { formatFileBaseName, formatFileDisplayName, getFileFolder, isFilePathLike } from '../utils/modelDisplay';

describe('modelDisplay file labels', () => {
  it('simplifies file paths for dropdown labels', () => {
    expect(formatFileDisplayName('PONY/PONYV6-PONY.safetensors')).toBe('PONYV6-PONY');
    expect(formatFileBaseName('PONY/PONYV6-PONY.safetensors')).toBe('PONYV6-PONY');
    expect(getFileFolder('PONY/PONYV6-PONY.safetensors')).toBe('PONY');
    expect(formatFileDisplayName('models/foo/bar.ckpt')).toBe('models foo bar');
  });

  it('ignores non-file strings', () => {
    expect(isFilePathLike('v1.5')).toBe(false);
    expect(formatFileDisplayName('v1.5')).toBe('v1.5');
  });
});
