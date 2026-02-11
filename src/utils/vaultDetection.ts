import { invoke } from '@tauri-apps/api/core';

/**
 * Walk up from a directory looking for a .obsidian/ folder.
 * Returns the vault root path if found, or null.
 */
export async function detectVaultRoot(startDir: string): Promise<string | null> {
  const parts = startDir.replace(/\\/g, '/').split('/');

  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('/');
    if (!candidate) continue;

    try {
      const exists = await invoke<boolean>('file_exists', { path: `${candidate}/.obsidian` });
      if (exists) {
        return candidate;
      }
    } catch {
      // ignore — path may not be accessible
    }
  }

  return null;
}

/**
 * Check if a specific directory is a vault (has .obsidian/).
 */
export async function isVault(dirPath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('file_exists', { path: `${dirPath}/.obsidian` });
  } catch {
    return false;
  }
}

/**
 * Get the parent directory of a file path.
 */
export function getParentDir(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return normalized.slice(0, lastSlash);
}
