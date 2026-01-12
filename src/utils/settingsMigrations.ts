/**
 * Settings migration system
 *
 * Handles format changes and compatibility for Obsidian settings files.
 * Migrations are applied in order, and each migration should be idempotent.
 */

import { readJsonSafe, writeJsonSafe } from './safeJson';

export interface Migration {
  /** Unique version identifier for this migration */
  version: string;
  /** Human-readable description of what this migration does */
  description: string;
  /** Migration function that transforms the data */
  migrate: (data: any) => any;
}

/**
 * Apply migrations to a settings file
 *
 * @param filePath - Path to the settings file
 * @param migrations - Array of migrations to apply (in order)
 * @returns The migrated data, or null if file doesn't exist
 */
export async function applyMigrations<T>(
  filePath: string,
  migrations: Migration[]
): Promise<T | null> {
  const data = await readJsonSafe<T>(filePath);

  if (!data) {
    return null;
  }

  let migratedData = data;

  for (const migration of migrations) {
    try {
      migratedData = migration.migrate(migratedData);
      console.log(`[settingsMigrations] Applied migration ${migration.version}: ${migration.description}`);
    } catch (error) {
      console.error(`[settingsMigrations] Failed to apply migration ${migration.version}:`, error);
      // Continue with next migration rather than failing completely
    }
  }

  // Write the migrated data back if it changed
  if (migratedData !== data) {
    await writeJsonSafe(filePath, migratedData, {
      preserveUnknown: true,
      merge: false, // Don't merge, we want to replace with the migrated version
    });
  }

  return migratedData as T;
}

/**
 * Check if a migration has already been applied
 *
 * This checks for a __migrations key in the data that tracks applied migrations.
 */
export function hasMigrationBeenApplied(data: any, version: string): boolean {
  const appliedMigrations = data.__migrations || [];
  return appliedMigrations.includes(version);
}

/**
 * Mark a migration as applied
 *
 * This adds the migration version to the __migrations tracking array.
 */
export function markMigrationApplied(data: any, version: string): any {
  const appliedMigrations = data.__migrations || [];
  if (!appliedMigrations.includes(version)) {
    return {
      ...data,
      __migrations: [...appliedMigrations, version],
    };
  }
  return data;
}

// =============================================================================
// Appearance Settings Migrations
// =============================================================================

/**
 * Migration: Split theme into baseTheme and cssTheme
 *
 * Old format: { theme: "moonstone" }
 * New format: { baseTheme: "obsidian", cssTheme: "moonstone" }
 */
export const splitThemeMigration: Migration = {
  version: '1.0.0-theme-split',
  description: 'Split theme into baseTheme and cssTheme',
  migrate: (data: any) => {
    if (!data.theme || data.baseTheme) {
      return data; // Already migrated or no theme to migrate
    }

    const theme = data.theme;
    const baseTheme = 'obsidian'; // Default base theme

    // Remove old theme field
    const { theme: _removedTheme, ...rest } = data;

    return {
      ...rest,
      baseTheme,
      cssTheme: theme,
      __migrations: [...(data.__migrations || []), '1.0.0-theme-split'],
    };
  },
};

/**
 * Migration: Add accent color field
 *
 * Adds default accent color if not present.
 */
export const addAccentColorMigration: Migration = {
  version: '1.0.0-accent-color',
  description: 'Add default accent color',
  migrate: (data: any) => {
    if (data.accentColor !== undefined) {
      return data; // Already has accent color
    }

    return {
      ...data,
      accentColor: '#7c3aed',
      __migrations: [...(data.__migrations || []), '1.0.0-accent-color'],
    };
  },
};

/**
 * All appearance.json migrations
 */
export const appearanceMigrations: Migration[] = [
  splitThemeMigration,
  addAccentColorMigration,
];

// =============================================================================
// App Settings Migrations
// =============================================================================

/**
 * Migration: Add attachment folder path
 *
 * Obsidian uses this to determine where to store attachments.
 */
export const addAttachmentFolderMigration: Migration = {
  version: '1.0.0-attachment-folder',
  description: 'Add default attachment folder',
  migrate: (data: any) => {
    if (data.attachmentFolderPath !== undefined) {
      return data; // Already has the field
    }

    return {
      ...data,
      attachmentFolderPath: 'attachments',
      __migrations: [...(data.__migrations || []), '1.0.0-attachment-folder'],
    };
  },
};

/**
 * All app.json migrations
 */
export const appMigrations: Migration[] = [addAttachmentFolderMigration];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all migrations for a specific settings file
 */
export function getMigrationsForFile(fileName: string): Migration[] {
  switch (fileName) {
    case 'appearance.json':
      return appearanceMigrations;
    case 'app.json':
      return appMigrations;
    default:
      return [];
  }
}

/**
 * Apply migrations for a specific settings file
 */
export async function migrateSettingsFile(filePath: string): Promise<void> {
  const fileName = filePath.split('/').pop() || '';
  const migrations = getMigrationsForFile(fileName);

  if (migrations.length === 0) {
    return; // No migrations for this file
  }

  await applyMigrations(filePath, migrations);
}
