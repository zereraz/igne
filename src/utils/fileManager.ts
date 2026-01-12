/**
 * File management utilities with link updating
 *
 * Path handling:
 * - All public functions accept OS-absolute paths (for file I/O)
 * - Internally converts to vault paths for search store operations
 * - searchStore handles OS path to vault path conversion automatically
 */

import { invoke } from '@tauri-apps/api/core';
import { searchStore } from '../stores/searchStore';

interface RenameOptions {
  oldPath: string; // OS-absolute path
  newPath: string; // OS-absolute path
  updateLinks?: boolean;
}

interface MoveOptions {
  sourcePath: string; // OS-absolute path
  destinationPath: string; // OS-absolute path
  updateLinks?: boolean;
}

/**
 * Rename a file and optionally update all incoming wikilinks
 */
export async function renameFileWithLinkUpdates(options: RenameOptions) {
  const { oldPath, newPath, updateLinks = true } = options;

  if (!updateLinks) {
    await invoke('rename_file', {
      oldPath,
      newPath,
    });
    return;
  }

  // Get old and new file names
  const oldName = oldPath.split(/[/\\]/).pop()?.replace('.md', '') || '';
  const newName = newPath.split(/[/\\]/).pop()?.replace('.md', '') || '';

  // 1. Gather all data FIRST (before any mutations)
  // searchStore.findBacklinks accepts both OS and vault paths internally
  const backlinks = searchStore.findBacklinks(oldPath);

  // 2. Perform rename (if this fails, we abort with no changes)
  try {
    await invoke('rename_file', {
      oldPath,
      newPath,
    });
  } catch (e) {
    throw new Error(`Failed to rename file: ${e}`);
  }

  // 3. Update index (file already renamed, must continue even if this fails)
  try {
    await searchStore.removeFile(oldPath);
    const content = await invoke<string>('read_file', { path: newPath });
    await searchStore.updateFile(newPath, content);
  } catch (e) {
    console.error('Search index update failed after rename:', e);
    // Don't throw - file is already renamed
  }

  // 4. Update all incoming links
  for (const backlink of backlinks) {
    const oldContent = backlink.content;
    const newContent = oldContent.replace(
      new RegExp(`\\[\\[${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\|[^\\]]+)?\\]\\]`, 'g'),
      `[[${newName}$1]]`
    );

    if (newContent !== oldContent) {
      try {
        // backlink.path is a vault path, convert to OS path for file I/O
        const backlinkOsPath = searchStore.getOsPath(backlink.path);
        await invoke('write_file', {
          path: backlinkOsPath,
          content: newContent,
        });
        await searchStore.updateFile(backlink.path, newContent);
      } catch (e) {
        console.error(`Failed to update backlink in ${backlink.path}:`, e);
        // Continue with other backlinks even if one fails
      }
    }
  }
}

/**
 * Move a file to a different folder
 */
export async function moveFile(options: MoveOptions) {
  const { sourcePath, destinationPath } = options;

  await invoke('move_file', {
    source: sourcePath,
    destination: destinationPath,
  });

  // Update search index
  const content = await invoke<string>('read_file', { path: destinationPath });
  await searchStore.removeFile(sourcePath);
  await searchStore.updateFile(destinationPath, content);
}

/**
 * Duplicate a file
 */
export async function duplicateFile(sourcePath: string) {
  const parts = sourcePath.split(/[/\\]/);
  const fileName = parts.pop() || '';
  const folder = parts.join('/');

  const nameWithoutExt = fileName.replace('.md', '');
  let counter = 1;
  let newFileName: string;
  let newPath: string;

  do {
    newFileName = `${nameWithoutExt} ${counter}.md`;
    newPath = `${folder}/${newFileName}`;
    counter++;
  } while (await fileExists(newPath));

  // Copy file content
  const content = await invoke<string>('read_file', { path: sourcePath });
  await invoke('write_file', {
    path: newPath,
    content,
  });

  // Update search index
  await searchStore.updateFile(newPath, content);

  return newPath;
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    const meta = await invoke<{ exists: boolean }>('stat_path', { path });
    return meta.exists;
  } catch {
    return false;
  }
}

/**
 * Find all files that link to a given file
 * Returns array of vault-absolute paths
 */
export function findIncomingLinks(filePath: string): string[] {
  const backlinks = searchStore.findBacklinks(filePath);
  // backlinks are already vault paths
  return backlinks.map(link => link.path);
}

/**
 * Get link update count before renaming
 */
export function getLinkUpdateCount(oldPath: string): number {
  const backlinks = searchStore.findBacklinks(oldPath);
  return backlinks.length;
}
