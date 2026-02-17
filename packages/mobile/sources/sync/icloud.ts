import { File, Directory } from 'expo-file-system';
import type { VaultEntry } from '../stores/vaultStore';
import type { FileEntry } from '../stores/fileStore';

/**
 * Pick a vault folder using the native iOS directory picker.
 *
 * Uses expo-file-system's Directory.pickDirectoryAsync() which
 * presents a UIDocumentPickerViewController configured for folders.
 * This grants full read/write access to the entire selected directory.
 */
export async function pickVaultFolder(): Promise<VaultEntry | null> {
  try {
    const dir = await Directory.pickDirectoryAsync();
    const name = decodeURIComponent(dir.uri.split('/').filter(Boolean).pop() || 'Vault');

    return { uri: dir.uri, name, lastOpened: Date.now() };
  } catch (err) {
    // User cancelled or picker failed
    console.error('[icloud] Pick vault failed:', err);
    return null;
  }
}

/**
 * Check if a vault URI is still accessible (security-scoped access may expire).
 */
export function isVaultAccessible(vaultUri: string): boolean {
  try {
    const dir = new Directory(vaultUri);
    dir.list(); // throws if access has expired
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * List all .md files in a vault directory (recursive).
 * Uses the new SDK 54 File/Directory API.
 */
export async function listMarkdownFiles(vaultUri: string): Promise<FileEntry[]> {
  const files: FileEntry[] = [];

  function walk(dir: Directory, relativePath: string) {
    try {
      const entries = dir.list();

      for (const entry of entries) {
        const entryName = entry.name;

        // Skip hidden files/dirs and .obsidian
        if (entryName.startsWith('.')) continue;

        if (entry instanceof Directory) {
          const relPath = relativePath ? `${relativePath}/${entryName}` : entryName;
          walk(entry, relPath);
        } else if (entry instanceof File && entryName.endsWith('.md')) {
          files.push({
            path: entry.uri,
            name: entryName,
            folder: relativePath,
            modifiedTime: 0, // SDK 54 File doesn't expose modificationTime directly
          });
        }
      }
    } catch (err) {
      console.error(`Failed to read directory:`, err);
    }
  }

  try {
    const rootDir = new Directory(vaultUri);
    walk(rootDir, '');
  } catch (err) {
    console.error('[icloud] Failed to list vault files:', err);
  }

  return files;
}

/**
 * Read file content from a URI.
 */
export async function readFileContent(fileUri: string): Promise<string> {
  try {
    const file = new File(fileUri);
    return await file.text();
  } catch (err) {
    console.error('[icloud] Failed to read file:', fileUri, err);
    return '';
  }
}

/**
 * Write content to a file URI.
 */
export async function writeFileContent(fileUri: string, content: string): Promise<void> {
  try {
    const file = new File(fileUri);
    file.write(content);
  } catch (err) {
    console.error('Failed to write file:', err);
  }
}

/**
 * Create a new markdown file in the vault root.
 * Returns the file URI, or null if it already exists or creation failed.
 */
export function createNote(vaultUri: string, name: string): string | null {
  const safeName = name.endsWith('.md') ? name : `${name}.md`;
  // Build URI: vault root + filename
  const separator = vaultUri.endsWith('/') ? '' : '/';
  const fileUri = `${vaultUri}${separator}${encodeURIComponent(safeName)}`;

  try {
    const file = new File(fileUri);
    if (file.exists) return null; // already exists
    file.write(`# ${name.replace(/\.md$/, '')}\n\n`);
    return fileUri;
  } catch (err) {
    console.error('[icloud] Failed to create note:', err);
    return null;
  }
}
