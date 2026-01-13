/**
 * Tests for safeJson utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readJsonSafe, writeJsonSafe, fileExists } from '../safeJson';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args: any) => mockInvoke(cmd, args),
}));

describe('safeJson', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('readJsonSafe', () => {
    it('should parse valid JSON and return typed object', async () => {
      const testData = { foo: 'bar', num: 42 };
      mockInvoke.mockResolvedValue(JSON.stringify(testData));

      const result = await readJsonSafe<{ foo: string; num: number }>('/test/path.json');

      expect(result).toEqual(testData);
      expect(mockInvoke).toHaveBeenCalledWith('read_file', { path: '/test/path.json' });
    });

    it('should return null for missing files', async () => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      mockInvoke.mockRejectedValue(error);

      const result = await readJsonSafe('/test/path.json');

      expect(result).toBeNull();
    });

    it('should return null for NOT_FOUND error code', async () => {
      const error: any = new Error('File not found');
      error.code = 'NOT_FOUND';
      mockInvoke.mockRejectedValue(error);

      const result = await readJsonSafe('/test/path.json');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      mockInvoke.mockResolvedValue('invalid json{');

      const result = await readJsonSafe('/test/path.json');

      expect(result).toBeNull();
    });

    it('should preserve unknown fields in parsed object', async () => {
      const testData = {
        knownField: 'value',
        unknownField: 'unknown',
        nestedUnknown: { deep: 'value' },
      };
      mockInvoke.mockResolvedValue(JSON.stringify(testData));

      type KnownType = { knownField: string };
      const result = await readJsonSafe<KnownType>('/test/path.json');

      expect(result).toEqual(testData);
      // @ts-expect-error - testing that unknown fields are preserved
      expect(result.unknownField).toBe('unknown');
    });
  });

  describe('writeJsonSafe', () => {
    it('should write JSON data', async () => {
      const testData = { foo: 'bar', num: 42 };
      mockInvoke.mockResolvedValue(undefined);

      await writeJsonSafe('/test/path.json', testData);

      expect(mockInvoke).toHaveBeenCalledWith('write_file', {
        path: '/test/path.json',
        content: JSON.stringify(testData, null, 2),
      });
    });

    it('should preserve unknown keys when preserveUnknown=true', async () => {
      const existingData = {
        knownField: 'old',
        unknownField: 'preserve me',
      };
      const newData = { knownField: 'new' };

      mockInvoke
        .mockResolvedValueOnce(JSON.stringify(existingData)) // read
        .mockResolvedValue(undefined); // write

      await writeJsonSafe('/test/path.json', newData, { preserveUnknown: true, merge: false });

      const writtenContent = JSON.parse(mockInvoke.mock.calls[1][1].content);
      expect(writtenContent).toEqual({
        knownField: 'new',
        unknownField: 'preserve me',
      });
    });

    it('should merge with existing data when merge=true', async () => {
      const existingData = {
        field1: 'keep',
        field2: 'replace',
        unknownField: 'keep me',
      };
      const newData = {
        field2: 'new value',
        field3: 'new field',
      };

      mockInvoke
        .mockResolvedValueOnce(JSON.stringify(existingData)) // read
        .mockResolvedValue(undefined); // write

      await writeJsonSafe('/test/path.json', newData, { preserveUnknown: true, merge: true });

      const writtenContent = JSON.parse(mockInvoke.mock.calls[1][1].content);
      expect(writtenContent).toEqual({
        field1: 'keep',
        field2: 'new value',
        field3: 'new field',
        unknownField: 'keep me',
      });
    });

    it('should not preserve unknown keys when preserveUnknown=false', async () => {
      const newData = { knownField: 'new' };

      mockInvoke.mockResolvedValue(undefined); // write only (no read when preserveUnknown=false and merge=false)

      await writeJsonSafe('/test/path.json', newData, { preserveUnknown: false, merge: false });

      const writtenContent = JSON.parse(mockInvoke.mock.calls[0][1].content);
      expect(writtenContent).toEqual({ knownField: 'new' });
    });

    it('should not merge when merge=false', async () => {
      const existingData = {
        field1: 'old',
        field2: 'old',
      };
      const newData = { field1: 'new' };

      mockInvoke
        .mockResolvedValueOnce(JSON.stringify(existingData)) // read
        .mockResolvedValue(undefined); // write

      await writeJsonSafe('/test/path.json', newData, { preserveUnknown: true, merge: false });

      const writtenContent = JSON.parse(mockInvoke.mock.calls[1][1].content);
      expect(writtenContent).toEqual({
        field1: 'new',
        field2: 'old', // preserved because preserveUnknown=true
      });
    });

    it('should handle missing existing file gracefully', async () => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      mockInvoke.mockRejectedValueOnce(error); // read fails
      mockInvoke.mockResolvedValue(undefined); // write succeeds

      const newData = { field1: 'new' };

      await writeJsonSafe('/test/path.json', newData, { preserveUnknown: true, merge: true });

      const writtenContent = JSON.parse(mockInvoke.mock.calls[1][1].content);
      expect(writtenContent).toEqual({ field1: 'new' });
    });

    it('should default to preserveUnknown=true and merge=true', async () => {
      const existingData = { field1: 'old', unknownField: 'keep' };
      const newData = { field1: 'new' };

      mockInvoke
        .mockResolvedValueOnce(JSON.stringify(existingData)) // read
        .mockResolvedValue(undefined); // write

      await writeJsonSafe('/test/path.json', newData);

      const writtenContent = JSON.parse(mockInvoke.mock.calls[1][1].content);
      expect(writtenContent).toEqual({
        field1: 'new',
        unknownField: 'keep',
      });
    });

    it('should throw error when write fails', async () => {
      mockInvoke.mockRejectedValue(new Error('Write failed'));

      await expect(writeJsonSafe('/test/path.json', { foo: 'bar' })).rejects.toThrow('Write failed');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockInvoke.mockResolvedValue({ exists: true });

      const result = await fileExists('/test/path.json');

      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('stat_path', { path: '/test/path.json' });
    });

    it('should return false when file does not exist', async () => {
      mockInvoke.mockResolvedValue({ exists: false });

      const result = await fileExists('/test/path.json');

      expect(result).toBe(false);
    });

    it('should return false when stat_path throws', async () => {
      mockInvoke.mockRejectedValue(new Error('Stat failed'));

      const result = await fileExists('/test/path.json');

      expect(result).toBe(false);
    });
  });
});
