/**
 * Image handling utilities for paste and drag-drop
 *
 * Path handling:
 * - vaultPath: OS-absolute path to vault root
 * - currentFilePath: OS-absolute path to current note
 * - Returns: vault-absolute relative path for wikilinks (e.g., "attachments/image.png")
 */

import { invoke } from '@tauri-apps/api/core';
import { toVaultPath } from './vaultPaths';

interface ImagePasteOptions {
  vaultPath: string; // OS-absolute path to vault root
  currentFilePath: string; // OS-absolute path to current note
  attachmentsFolder?: string;
  onInsert: (markdown: string) => void;
}

/**
 * Handle clipboard paste event for images
 */
export async function handleImagePaste(
  clipboardData: ClipboardEvent['clipboardData'],
  options: ImagePasteOptions
): Promise<boolean> {
  if (!clipboardData) return false;

  const items = Array.from(clipboardData.items);
  const imageItem = items.find((item) => item.type.startsWith('image/'));

  if (!imageItem) return false;

  const file = imageItem.getAsFile();
  if (!file) return false;

  try {
    const imagePath = await saveImage(file, options);
    const markdown = `![[${imagePath}]]`;
    options.onInsert(markdown);
    return true;
  } catch (error) {
    console.error('Failed to paste image:', error);
    return false;
  }
}

/**
 * Handle file drop event for images
 */
export async function handleImageDrop(
  dataTransfer: DataTransfer,
  options: ImagePasteOptions
): Promise<boolean> {
  const files = Array.from(dataTransfer.files);
  const imageFiles = files.filter((file) => file.type.startsWith('image/'));

  if (imageFiles.length === 0) return false;

  try {
    for (const file of imageFiles) {
      const imagePath = await saveImage(file, options);
      const markdown = `![[${imagePath}]]`;
      options.onInsert(markdown);
    }
    return true;
  } catch (error) {
    console.error('Failed to drop image:', error);
    return false;
  }
}

/**
 * Save an image file to the attachments folder
 *
 * @param file - The image file to save
 * @param options - Image paste options
 * @returns Vault-relative path for wikilink (e.g., "attachments/image.png")
 */
async function saveImage(
  file: File,
  options: ImagePasteOptions
): Promise<string> {
  const { vaultPath, currentFilePath, attachmentsFolder = 'attachments' } = options;

  // Determine attachments folder path (OS-absolute for file I/O)
  let folderPath: string; // OS-absolute path
  let relativePath: string; // Vault-relative path for wikilinks

  if (attachmentsFolder.includes('{{note}}')) {
    // Use note-specific folder: attachments/{note}/
    // Convert currentFilePath (OS-absolute) to vault path to extract note name
    const vaultNotePath = toVaultPath(currentFilePath, vaultPath);
    const noteName = vaultNotePath.split('/').pop()?.replace('.md', '') || 'untitled';
    folderPath = `${vaultPath}/attachments/${noteName}`;
    relativePath = `attachments/${noteName}`;
  } else {
    // Use global attachments folder
    folderPath = `${vaultPath}/${attachmentsFolder}`;
    relativePath = attachmentsFolder.startsWith('/')
      ? attachmentsFolder.slice(1)
      : attachmentsFolder;
  }

  // Create folder if it doesn't exist
  try {
    await invoke('create_directory', { path: folderPath });
  } catch (e) {
    // Folder might already exist
  }

  // Generate unique filename
  const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
  const extension = file.name.split('.').pop() || 'png';
  const timestamp = Date.now();
  const fileName = `${baseName}-${timestamp}.${extension}`;
  const imagePath = `${folderPath}/${fileName}`;

  // Convert file to ArrayBuffer and save as binary
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Use binary write to avoid encoding issues
  await invoke('write_file_binary', {
    path: imagePath,
    data: Array.from(uint8Array),
  });

  // Return vault-relative path for wikilink (without leading /)
  return `${relativePath}/${fileName}`;
}

/**
 * Check if a clipboard event contains an image
 */
export function hasImageInClipboard(clipboardData: ClipboardEvent['clipboardData']): boolean {
  if (!clipboardData) return false;

  const items = Array.from(clipboardData.items);
  return items.some((item) => item.type.startsWith('image/'));
}

/**
 * Check if a data transfer contains images
 */
export function hasImagesInDataTransfer(dataTransfer: DataTransfer): boolean {
  const files = Array.from(dataTransfer.files);
  return files.some((file) => file.type.startsWith('image/'));
}
