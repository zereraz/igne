import { File, Directory } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import type { VaultEntry } from '../stores/vaultStore';
import type { FileEntry } from '../stores/fileStore';

/**
 * Pick a vault folder from iCloud Drive (or local storage).
 * Returns a VaultEntry or null if cancelled.
 */
export async function pickVaultFolder(): Promise<VaultEntry | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: false,
    });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    const name = decodeURIComponent(uri.split('/').pop() || 'Vault');

    return { uri, name, lastOpened: Date.now() };
  } catch (err) {
    console.error('Failed to pick vault folder:', err);
    return null;
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
    console.error('Failed to list vault files:', err);
  }

  return files;
}

/**
 * Read file content from a URI.
 */
export async function readFileContent(fileUri: string): Promise<string> {
  try {
    const file = new File(fileUri);
    return file.text();
  } catch (err) {
    console.error('Failed to read file:', err);
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
