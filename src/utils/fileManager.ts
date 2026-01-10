/**
 * File management utilities with link updating
 */

import { invoke } from '@tauri-apps/api/core';
import { searchStore } from '../stores/searchStore';

interface RenameOptions {
  oldPath: string;
  newPath: string;
  updateLinks?: boolean;
}

interface MoveOptions {
  sourcePath: string;
  destinationPath: string;
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
  const oldName = oldPath.split('/').pop()?.replace('.md', '') || '';
  const newName = newPath.split('/').pop()?.replace('.md', '') || '';

  // Find all files that link to the old name
  const backlinks = searchStore.findBacklinks(oldPath);

  // Rename the file
  await invoke('rename_file', {
    oldPath,
    newPath,
  });

  // Update search index
  await searchStore.removeFile(oldPath);
  const content = await invoke<string>('read_file', { path: newPath });
  await searchStore.updateFile(newPath, content);

  // Update all incoming links
  for (const backlink of backlinks) {
    const oldContent = backlink.content;
    const newContent = oldContent.replace(
      new RegExp(`\\[\\[${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\|[^\\]]+)?\\]\\]`, 'g'),
      `[[${newName}$1]]`
    );

    if (newContent !== oldContent) {
      await invoke('write_file', {
        path: backlink.path,
        content: newContent,
      });
      await searchStore.updateFile(backlink.path, newContent);
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
  const parts = sourcePath.split('/');
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
    await invoke('read_file', { path });
    return true;
  } catch {
    return false;
  }
}

/**
 * Find all files that link to a given file
 */
export function findIncomingLinks(filePath: string): string[] {
  const backlinks = searchStore.findBacklinks(filePath);
  return backlinks.map(link => link.path);
}

/**
 * Get link update count before renaming
 */
export function getLinkUpdateCount(oldPath: string): number {
  const backlinks = searchStore.findBacklinks(oldPath);
  return backlinks.length;
}
