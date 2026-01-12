// =============================================================================
// Vault Tools Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../test/setup';

import { readFile, writeFile, createFile, deleteFile, renameFile, statPath, listDir } from '../vault';
import type { ToolContext } from '../types';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args?: unknown) => mockInvoke(cmd, args),
}));

const invoke = mockInvoke as ReturnType<typeof vi.fn>;

describe('Vault Tools', () => {
  const mockContext: ToolContext = {
    vaultPath: '/test/vault',
    source: 'ui',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readFile', () => {
    it('should read file content from backend', async () => {
      invoke.mockResolvedValue('file content');

      const result = await readFile.execute(mockContext, { path: '/test/file.md' });

      expect(result.success).toBe(true);
      expect(result.data).toBe('file content');
      expect(invoke).toHaveBeenCalledWith('read_file', { path: '/test/file.md' });
    });

    it('should return error on failure', async () => {
      invoke.mockRejectedValue(new Error('File not found'));

      const result = await readFile.execute(mockContext, { path: '/test/file.md' });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('File not found');
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      invoke.mockResolvedValue(undefined);

      const result = await writeFile.execute(mockContext, {
        path: '/test/file.md',
        content: 'new content',
      });

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith('write_file', {
        path: '/test/file.md',
        content: 'new content',
      });
    });

    it('should return error on write failure', async () => {
      invoke.mockRejectedValue(new Error('Permission denied'));

      const result = await writeFile.execute(mockContext, {
        path: '/test/file.md',
        content: 'new content',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Permission denied');
    });
  });

  describe('createFile', () => {
    it('should create new file with content', async () => {
      invoke.mockResolvedValue(undefined);

      const result = await createFile.execute(mockContext, {
        path: '/test/new-file.md',
        content: 'initial content',
      });

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith('write_file', {
        path: '/test/new-file.md',
        content: 'initial content',
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      invoke.mockResolvedValue(undefined);

      const result = await deleteFile.execute(mockContext, { path: '/test/file.md' });

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith('delete_file', { path: '/test/file.md' });
    });

    it('should return error on delete failure', async () => {
      invoke.mockRejectedValue(new Error('File in use'));

      const result = await deleteFile.execute(mockContext, { path: '/test/file.md' });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('File in use');
    });
  });

  describe('renameFile', () => {
    it('should rename file', async () => {
      invoke.mockResolvedValue(undefined);

      const result = await renameFile.execute(mockContext, {
        oldPath: '/test/old.md',
        newPath: '/test/new.md',
      });

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith('rename_file', {
        oldPath: '/test/old.md',
        newPath: '/test/new.md',
      });
    });
  });

  describe('statPath', () => {
    it('should get file metadata', async () => {
      const mockMetadata = {
        exists: true,
        isFile: true,
        isDir: false,
        size: 1024,
        mtime: 1234567890,
      };
      invoke.mockResolvedValue(mockMetadata);

      const result = await statPath.execute(mockContext, { path: '/test/file.md' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetadata);
      expect(invoke).toHaveBeenCalledWith('stat_path', { path: '/test/file.md' });
    });
  });

  describe('listDir', () => {
    it('should list directory contents non-recursively', async () => {
      const mockEntries = [
        { path: '/test/file1.md', name: 'file1.md', isDir: false },
        { path: '/test/file2.md', name: 'file2.md', isDir: false },
        { path: '/test/subfolder', name: 'subfolder', isDir: true },
      ];
      invoke.mockResolvedValue(mockEntries);

      const result = await listDir.execute(mockContext, {
        path: '/test',
        recursive: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEntries);
      expect(invoke).toHaveBeenCalledWith('read_directory', {
        path: '/test',
        recursive: false,
      });
    });

    it('should list directory contents recursively', async () => {
      const mockEntries = [
        { path: '/test/file1.md', name: 'file1.md', isDir: false },
        { path: '/test/subfolder/file2.md', name: 'file2.md', isDir: false },
      ];
      invoke.mockResolvedValue(mockEntries);

      const result = await listDir.execute(mockContext, {
        path: '/test',
        recursive: true,
      });

      expect(result.success).toBe(true);
      expect(invoke).toHaveBeenCalledWith('read_directory', {
        path: '/test',
        recursive: true,
      });
    });

    it('should default to non-recursive', async () => {
      const mockEntries = [{ path: '/test/file1.md', name: 'file1.md', isDir: false }];
      invoke.mockResolvedValue(mockEntries);

      await listDir.execute(mockContext, { path: '/test' });

      expect(invoke).toHaveBeenCalledWith('read_directory', {
        path: '/test',
        recursive: false,
      });
    });
  });

  describe('Tool Properties', () => {
    it('should have correct tool properties', () => {
      expect(readFile.id).toBe('vault.readFile');
      expect(readFile.name).toBe('Read File');
      expect(readFile.description).toBeDefined();

      expect(writeFile.id).toBe('vault.writeFile');
      expect(writeFile.name).toBe('Write File');

      expect(createFile.id).toBe('vault.createFile');
      expect(createFile.name).toBe('Create File');

      expect(deleteFile.id).toBe('vault.deleteFile');
      expect(deleteFile.name).toBe('Delete File');

      expect(renameFile.id).toBe('vault.renameFile');
      expect(renameFile.name).toBe('Rename File');

      expect(statPath.id).toBe('vault.statPath');
      expect(statPath.name).toBe('Stat Path');

      expect(listDir.id).toBe('vault.listDir');
      expect(listDir.name).toBe('List Directory');
    });
  });
});
