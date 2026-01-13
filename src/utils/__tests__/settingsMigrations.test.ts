/**
 * Tests for settings migrations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  splitThemeMigration,
  addAccentColorMigration,
  addAttachmentFolderMigration,
  applyMigrations,
  hasMigrationBeenApplied,
  markMigrationApplied,
  getMigrationsForFile,
  migrateSettingsFile,
} from '../settingsMigrations';
import type { Migration } from '../settingsMigrations';

// Mock safeJson functions
const mockReadJsonSafe = vi.fn();
const mockWriteJsonSafe = vi.fn();

vi.mock('../safeJson', () => ({
  readJsonSafe: (path: string) => mockReadJsonSafe(path),
  writeJsonSafe: (path: string, data: any, options?: any) => mockWriteJsonSafe(path, data, options),
}));

describe('settingsMigrations', () => {
  beforeEach(() => {
    mockReadJsonSafe.mockClear();
    mockWriteJsonSafe.mockClear();
  });

  describe('splitThemeMigration', () => {
    it('should split theme into baseTheme and cssTheme', () => {
      const oldData = { theme: 'moonstone', otherField: 'keep' };

      const result = splitThemeMigration.migrate(oldData);

      expect(result).toEqual({
        baseTheme: 'obsidian',
        cssTheme: 'moonstone',
        otherField: 'keep',
        __migrations: ['1.0.0-theme-split'],
      });
      expect(result.theme).toBeUndefined();
    });

    it('should not migrate if already has baseTheme', () => {
      const data = { baseTheme: 'dark', cssTheme: 'minimal' };

      const result = splitThemeMigration.migrate(data);

      expect(result).toEqual(data);
    });

    it('should not migrate if no theme field', () => {
      const data = { otherField: 'value' };

      const result = splitThemeMigration.migrate(data);

      expect(result).toEqual(data);
    });
  });

  describe('addAccentColorMigration', () => {
    it('should add accent color if missing', () => {
      const data = { baseTheme: 'dark' };

      const result = addAccentColorMigration.migrate(data);

      expect(result).toEqual({
        baseTheme: 'dark',
        accentColor: '#7c3aed',
        __migrations: ['1.0.0-accent-color'],
      });
    });

    it('should not add accent color if already present', () => {
      const data = { baseTheme: 'dark', accentColor: '#ff0000' };

      const result = addAccentColorMigration.migrate(data);

      expect(result).toEqual(data);
    });
  });

  describe('addAttachmentFolderMigration', () => {
    it('should add attachment folder path if missing', () => {
      const data = { useMarkdownLinks: true };

      const result = addAttachmentFolderMigration.migrate(data);

      expect(result).toEqual({
        useMarkdownLinks: true,
        attachmentFolderPath: 'attachments',
        __migrations: ['1.0.0-attachment-folder'],
      });
    });

    it('should not add if already present', () => {
      const data = { attachmentFolderPath: 'media' };

      const result = addAttachmentFolderMigration.migrate(data);

      expect(result).toEqual(data);
    });
  });

  describe('applyMigrations', () => {
    it('should apply multiple migrations in order', async () => {
      const migrations: Migration[] = [
        {
          version: '1.0.0-first',
          description: 'First migration',
          migrate: (data: any) => ({ ...data, step1: 'done', __migrations: [...(data.__migrations || []), '1.0.0-first'] }),
        },
        {
          version: '1.0.0-second',
          description: 'Second migration',
          migrate: (data: any) => ({ ...data, step2: 'done', __migrations: [...(data.__migrations || []), '1.0.0-second'] }),
        },
      ];

      mockReadJsonSafe.mockResolvedValue({ initial: 'data' });
      mockWriteJsonSafe.mockResolvedValue(undefined);

      const result = await applyMigrations('/test/path.json', migrations);

      expect(result).toEqual({
        initial: 'data',
        step1: 'done',
        step2: 'done',
        __migrations: ['1.0.0-first', '1.0.0-second'],
      });

      expect(mockWriteJsonSafe).toHaveBeenCalledWith(
        '/test/path.json',
        expect.objectContaining({
          step1: 'done',
          step2: 'done',
          __migrations: expect.arrayContaining(['1.0.0-first', '1.0.0-second']),
        }),
        { preserveUnknown: true, merge: false }
      );
    });

    it('should return null if file does not exist', async () => {
      const migrations: Migration[] = [];
      mockReadJsonSafe.mockResolvedValue(null);

      const result = await applyMigrations('/test/path.json', migrations);

      expect(result).toBeNull();
      expect(mockWriteJsonSafe).not.toHaveBeenCalled();
    });

    it('should handle migration errors gracefully', async () => {
      const migrations: Migration[] = [
        {
          version: '1.0.0-good',
          description: 'Good migration',
          migrate: (data: any) => ({ ...data, good: 'done', __migrations: [...(data.__migrations || []), '1.0.0-good'] }),
        },
        {
          version: '1.0.0-bad',
          description: 'Bad migration',
          migrate: () => {
            throw new Error('Migration failed');
          },
        },
        {
          version: '1.0.0-good2',
          description: 'Good migration 2',
          migrate: (data: any) => ({ ...data, good2: 'done', __migrations: [...(data.__migrations || []), '1.0.0-good2'] }),
        },
      ];

      mockReadJsonSafe.mockResolvedValue({ initial: 'data' });
      mockWriteJsonSafe.mockResolvedValue(undefined);

      const result = await applyMigrations('/test/path.json', migrations);

      // Should continue after error
      expect(result).toEqual({
        initial: 'data',
        good: 'done',
        good2: 'done',
        __migrations: ['1.0.0-good', '1.0.0-good2'],
      });
    });

    it('should not write if data unchanged', async () => {
      const migrations: Migration[] = [
        {
          version: '1.0.0-noop',
          description: 'No-op migration',
          migrate: (data: any) => data,
        },
      ];

      mockReadJsonSafe.mockResolvedValue({ initial: 'data' });
      mockWriteJsonSafe.mockResolvedValue(undefined);

      await applyMigrations('/test/path.json', migrations);

      expect(mockWriteJsonSafe).not.toHaveBeenCalled();
    });
  });

  describe('hasMigrationBeenApplied', () => {
    it('should return true if migration in list', () => {
      const data = { __migrations: ['1.0.0-first', '1.0.0-second'] };

      expect(hasMigrationBeenApplied(data, '1.0.0-first')).toBe(true);
      expect(hasMigrationBeenApplied(data, '1.0.0-second')).toBe(true);
    });

    it('should return false if migration not in list', () => {
      const data = { __migrations: ['1.0.0-first'] };

      expect(hasMigrationBeenApplied(data, '1.0.0-second')).toBe(false);
    });

    it('should return false if no migrations array', () => {
      const data = { field: 'value' };

      expect(hasMigrationBeenApplied(data, '1.0.0-first')).toBe(false);
    });
  });

  describe('markMigrationApplied', () => {
    it('should add migration to list', () => {
      const data = { __migrations: ['1.0.0-first'] };

      const result = markMigrationApplied(data, '1.0.0-second');

      expect(result).toEqual({
        ...data,
        __migrations: ['1.0.0-first', '1.0.0-second'],
      });
    });

    it('should not duplicate existing migration', () => {
      const data = { __migrations: ['1.0.0-first'] };

      const result = markMigrationApplied(data, '1.0.0-first');

      expect(result).toEqual(data);
    });

    it('should create migrations array if not exists', () => {
      const data = { field: 'value' };

      const result = markMigrationApplied(data, '1.0.0-first');

      expect(result).toEqual({
        field: 'value',
        __migrations: ['1.0.0-first'],
      });
    });
  });

  describe('getMigrationsForFile', () => {
    it('should return appearance migrations for appearance.json', () => {
      const migrations = getMigrationsForFile('appearance.json');

      expect(migrations).toContain(splitThemeMigration);
      expect(migrations).toContain(addAccentColorMigration);
    });

    it('should return app migrations for app.json', () => {
      const migrations = getMigrationsForFile('app.json');

      expect(migrations).toContain(addAttachmentFolderMigration);
    });

    it('should return empty array for unknown file', () => {
      const migrations = getMigrationsForFile('unknown.json');

      expect(migrations).toEqual([]);
    });
  });

  describe('migrateSettingsFile integration', () => {
    it('should apply all migrations for a file', async () => {
      const oldAppearance = {
        theme: 'minimal',
        baseFontSize: 18,
      };

      mockReadJsonSafe.mockResolvedValue(oldAppearance);
      mockWriteJsonSafe.mockResolvedValue(undefined);

      await migrateSettingsFile('/vault/.obsidian/appearance.json');

      const writtenData = mockWriteJsonSafe.mock.calls[0][1];
      expect(writtenData).toEqual({
        baseTheme: 'obsidian',
        cssTheme: 'minimal',
        accentColor: '#7c3aed',
        baseFontSize: 18,
        __migrations: ['1.0.0-theme-split', '1.0.0-accent-color'],
      });
    });

    it('should not fail if file does not exist', async () => {
      mockReadJsonSafe.mockResolvedValue(null);

      await expect(migrateSettingsFile('/test/path.json')).resolves.not.toThrow();
      expect(mockWriteJsonSafe).not.toHaveBeenCalled();
    });
  });
});
