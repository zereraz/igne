// =============================================================================
// File Filtering Utilities
// =============================================================================

import { FileEntry } from '../types';

/**
 * Filter out hidden files and folders (starting with .)
 * Recursively filters children as well
 */
export function filterHiddenFiles(entries: FileEntry[]): FileEntry[] {
  return entries
    .filter(entry => !entry.name.startsWith('.'))
    .map(entry => {
      if (entry.children) {
        return {
          ...entry,
          children: filterHiddenFiles(entry.children),
        };
      }
      return entry;
    });
}
