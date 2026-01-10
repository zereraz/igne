/**
 * Starred files management
 * Persists to .obsidian/starred.json for Obsidian compatibility
 */

import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';

interface StarredFilesData {
  stars: StarredFile[];
}

interface StarredFile {
  path: string;
  starredAt: number;
}

const STARRED_FILE = '.obsidian/starred.json';

/**
 * Load starred files from vault
 */
export async function loadStarredFiles(vaultPath: string): Promise<Set<string>> {
  try {
    const starredPath = await join(vaultPath, STARRED_FILE);
    const content = await invoke<string>('read_file', { path: starredPath });
    const data: StarredFilesData = JSON.parse(content);

    return new Set(data.stars.map(s => s.path));
  } catch (error) {
    // File doesn't exist or is invalid - return empty set
    return new Set();
  }
}

/**
 * Save starred files to vault
 */
async function saveStarredFiles(vaultPath: string, starredPaths: Set<string>): Promise<void> {
  const starredPath = await join(vaultPath, STARRED_FILE);

  const data: StarredFilesData = {
    stars: Array.from(starredPaths).map(filePath => ({
      path: filePath,
      starredAt: Date.now(),
    })),
  };

  // Ensure .obsidian directory exists
  const obsidianDir = await join(vaultPath, '.obsidian');
  try {
    await invoke('create_directory', { path: obsidianDir });
  } catch {
    // Directory already exists
  }

  await invoke('write_file', {
    path: starredPath,
    content: JSON.stringify(data, null, 2),
  });
}

/**
 * Toggle star status for a file
 */
export async function toggleStarredFile(vaultPath: string, filePath: string): Promise<boolean> {
  const starred = await loadStarredFiles(vaultPath);
  const isStarred = starred.has(filePath);

  if (isStarred) {
    starred.delete(filePath);
  } else {
    starred.add(filePath);
  }

  await saveStarredFiles(vaultPath, starred);

  return !isStarred; // Return new star status
}

/**
 * Check if a file is starred
 */
export async function isFileStarred(vaultPath: string, filePath: string): Promise<boolean> {
  const starred = await loadStarredFiles(vaultPath);
  return starred.has(filePath);
}
