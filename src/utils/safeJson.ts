/**
 * Safe JSON utilities for .obsidian/* settings files
 *
 * These utilities ensure:
 * - Unknown keys are preserved when reading/writing settings
 * - Writes merge with existing data instead of overwriting
 * - Safe error handling for malformed JSON
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Safely read a JSON file, preserving all fields including unknown ones
 *
 * @param path - Path to the JSON file
 * @returns Parsed object or null if file doesn't exist/is invalid
 */
export async function readJsonSafe<T>(path: string): Promise<T | null> {
  try {
    const content = await invoke<string>('read_file', { path });
    const parsed = JSON.parse(content) as T;
    return parsed;
  } catch (error) {
    // File doesn't exist or contains invalid JSON
    if (error && typeof error === 'object' && 'code' in error) {
      const err = error as { code?: string };
      // File not found is expected for new vaults
      if (err.code === 'ENOENT' || err.code === 'NOT_FOUND') {
        return null;
      }
    }
    // Log other errors but don't crash
    console.warn(`[safeJson] Failed to read ${path}:`, error);
    return null;
  }
}

/**
 * Safely write a JSON file, merging with existing data to preserve unknown keys
 *
 * @param path - Path to the JSON file
 * @param data - Data to write
 * @param options - Options for merging behavior
 */
export async function writeJsonSafe<T>(
  path: string,
  data: T,
  options: {
    /** Preserve unknown keys from existing file (default: true) */
    preserveUnknown?: boolean;
    /** Merge with existing data instead of overwriting (default: true) */
    merge?: boolean;
  } = {}
): Promise<void> {
  const { preserveUnknown = true, merge = true } = options;

  try {
    let existingData: Record<string, unknown> | null = null;

    // Read existing file if we want to preserve unknown keys or merge
    if (preserveUnknown || merge) {
      existingData = await readJsonSafe<Record<string, unknown>>(path);
    }

    let finalData: Record<string, unknown>;

    if (merge && existingData) {
      // Merge: new data takes precedence, but we keep unknown keys from existing
      finalData = {
        ...existingData, // Keep existing keys (including unknown ones)
        ...(data as Record<string, unknown>), // Override with new data
      };
    } else if (preserveUnknown && existingData) {
      // Only preserve unknown keys (keys not in new data)
      const newKeys = new Set(Object.keys(data as Record<string, unknown>));
      finalData = {
        ...(data as Record<string, unknown>), // Start with new data
      };

      // Add back any unknown keys from existing data
      Object.entries(existingData).forEach(([key, value]) => {
        if (!newKeys.has(key)) {
          finalData[key] = value;
        }
      });
    } else {
      // No merging or preservation, just write the new data
      finalData = data as Record<string, unknown>;
    }

    // Write the merged/preserved data
    await invoke('write_file', {
      path,
      content: JSON.stringify(finalData, null, 2),
    });
  } catch (error) {
    console.error(`[safeJson] Failed to write ${path}:`, error);
    throw error;
  }
}

/**
 * Check if a file exists
 *
 * @param path - Path to check
 * @returns True if file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const meta = await invoke<{ exists: boolean }>('stat_path', { path });
    return meta.exists;
  } catch {
    return false;
  }
}
