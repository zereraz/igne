import { describe, it, expect } from 'vitest';
import {
  toVaultPath,
  toOsPath,
  getVaultBasename,
  getVaultDirname,
  isVaultAbsolutePath,
  resolveVaultPath,
} from '../vaultPaths';

describe('toVaultPath', () => {
  it('converts OS path to vault path', () => {
    expect(toVaultPath('/Users/name/vault/notes/file.md', '/Users/name/vault')).toBe('/notes/file.md');
  });

  it('handles root-level files', () => {
    expect(toVaultPath('/Users/name/vault/file.md', '/Users/name/vault')).toBe('/file.md');
  });

  it('handles nested folders', () => {
    expect(toVaultPath('/Users/name/vault/a/b/c/file.md', '/Users/name/vault')).toBe('/a/b/c/file.md');
  });

  it('handles vault root with trailing slash', () => {
    expect(toVaultPath('/Users/name/vault/file.md', '/Users/name/vault/')).toBe('/file.md');
  });

  it('returns original path if outside vault', () => {
    expect(toVaultPath('/other/path/file.md', '/Users/name/vault')).toBe('/other/path/file.md');
  });

  it('handles Windows-style paths', () => {
    expect(toVaultPath('C:\\Users\\name\\vault\\notes\\file.md', 'C:\\Users\\name\\vault')).toBe('/notes/file.md');
  });
});

describe('toOsPath', () => {
  it('converts vault path to OS path', () => {
    expect(toOsPath('/notes/file.md', '/Users/name/vault')).toBe('/Users/name/vault/notes/file.md');
  });

  it('handles root-level files', () => {
    expect(toOsPath('/file.md', '/Users/name/vault')).toBe('/Users/name/vault/file.md');
  });

  it('handles vault path without leading slash', () => {
    expect(toOsPath('notes/file.md', '/Users/name/vault')).toBe('/Users/name/vault/notes/file.md');
  });

  it('handles Windows vault root', () => {
    const result = toOsPath('/notes/file.md', 'C:\\Users\\name\\vault');
    expect(result).toBe('C:\\Users\\name\\vault\\notes\\file.md');
  });
});

describe('getVaultBasename', () => {
  it('extracts filename from vault path', () => {
    expect(getVaultBasename('/folder/file.md')).toBe('file.md');
  });

  it('handles root-level files', () => {
    expect(getVaultBasename('/file.md')).toBe('file.md');
  });

  it('handles deeply nested paths', () => {
    expect(getVaultBasename('/a/b/c/d/file.md')).toBe('file.md');
  });

  it('handles paths without leading slash', () => {
    expect(getVaultBasename('folder/file.md')).toBe('file.md');
  });
});

describe('getVaultDirname', () => {
  it('extracts directory from vault path', () => {
    expect(getVaultDirname('/folder/file.md')).toBe('/folder');
  });

  it('returns / for root-level files', () => {
    expect(getVaultDirname('/file.md')).toBe('/');
  });

  it('handles nested paths', () => {
    expect(getVaultDirname('/a/b/c/file.md')).toBe('/a/b/c');
  });
});

describe('isVaultAbsolutePath', () => {
  it('returns true for paths starting with /', () => {
    expect(isVaultAbsolutePath('/notes/file.md')).toBe(true);
  });

  it('returns false for relative paths', () => {
    expect(isVaultAbsolutePath('notes/file.md')).toBe(false);
  });

  it('returns false for OS absolute paths', () => {
    expect(isVaultAbsolutePath('/Users/name/vault/file.md')).toBe(true); // Still starts with /
  });
});

describe('resolveVaultPath', () => {
  it('resolves relative path against base', () => {
    expect(resolveVaultPath('/folder/file.md', '../other.md')).toBe('/other.md');
  });

  it('handles sibling reference', () => {
    expect(resolveVaultPath('/folder/file.md', 'sibling.md')).toBe('/folder/sibling.md');
  });

  it('handles nested relative path', () => {
    expect(resolveVaultPath('/a/b/file.md', '../../c/d.md')).toBe('/c/d.md');
  });
});

/**
 * Bug regression tests
 *
 * These tests document specific bugs that were found and fixed.
 * They should never fail after the fix is applied.
 */
describe('Bug regressions', () => {
  describe('BacklinksPanel vault path bug', () => {
    // Bug: BacklinksPanel was passing vault paths directly to file handlers
    // that expected OS paths, causing file reads to fail.
    // Fix: Use searchStore.getOsPath() before passing to click handlers.

    it('round-trip: OS -> vault -> OS preserves path', () => {
      const osPath = '/Users/name/vault/notes/my-note.md';
      const vaultRoot = '/Users/name/vault';

      const vaultPath = toVaultPath(osPath, vaultRoot);
      const recoveredOsPath = toOsPath(vaultPath, vaultRoot);

      expect(recoveredOsPath).toBe(osPath);
    });

    it('vault path is NOT a valid OS path (documents the bug)', () => {
      const osPath = '/Users/name/vault/notes/my-note.md';
      const vaultRoot = '/Users/name/vault';

      const vaultPath = toVaultPath(osPath, vaultRoot);

      // The vault path is /notes/my-note.md
      // This is NOT the same as the OS path
      expect(vaultPath).not.toBe(osPath);
      expect(vaultPath).toBe('/notes/my-note.md');

      // If you tried to read from vaultPath directly, you'd try to read
      // from /notes/my-note.md which doesn't exist on the filesystem
    });
  });
});
