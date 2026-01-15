// =============================================================================
// Default Vault Creation
// =============================================================================

import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';

const DEFAULT_VAULT_NAME = 'Igne';

// Welcome note content
const WELCOME_NOTE = `# Welcome to Igne

Igne is a fast, native markdown editor with Obsidian vault compatibility.

## Quick Start

- **Cmd+N** - Create a new note
- **Cmd+P** - Quick switcher to find notes
- **Cmd+S** - Save current note
- **Cmd+,** - Open settings

## Features

- [[Wikilinks]] to connect your notes
- Live preview as you type
- Backlinks panel to see connections
- Graph view of your knowledge
- Obsidian theme and plugin compatibility

## Get Started

Start writing! Create your first note with **Cmd+N** or edit this one.

---

*This is your default vault. You can open other vaults anytime from the vault switcher.*
`;

// Helper to check if path exists
async function pathExists(path: string): Promise<boolean> {
  try {
    const meta = await invoke<{ exists: boolean }>('stat_path', { path });
    return meta.exists;
  } catch {
    return false;
  }
}

/**
 * Get the default vault path
 * Returns ~/Documents/Igne on macOS/Linux, or Documents/Igne on Windows
 */
export async function getDefaultVaultPath(): Promise<string> {
  const home = await homeDir();
  // Use Documents folder as the standard location
  return `${home}Documents/${DEFAULT_VAULT_NAME}`;
}

/**
 * Check if the default vault exists
 */
export async function defaultVaultExists(): Promise<boolean> {
  const vaultPath = await getDefaultVaultPath();
  return pathExists(vaultPath);
}

/**
 * Create the default vault with initial structure
 * Returns the vault path
 */
export async function createDefaultVault(): Promise<string> {
  const vaultPath = await getDefaultVaultPath();

  console.log('[defaultVault] Creating default vault at:', vaultPath);

  // Create vault directory
  await invoke('create_directory', { path: vaultPath });

  // Create .obsidian directory
  const obsidianPath = `${vaultPath}/.obsidian`;
  await invoke('create_directory', { path: obsidianPath });

  // Create minimal app.json config
  const appConfig = {
    alwaysUpdateLinks: true,
    newFileLocation: 'root',
    attachmentFolderPath: 'attachments',
    showLineNumber: true,
    strictLineBreaks: false,
    vimMode: false,
  };
  await invoke('write_file', {
    path: `${obsidianPath}/app.json`,
    content: JSON.stringify(appConfig, null, 2),
  });

  // Create appearance.json config
  const appearanceConfig = {
    baseFontSize: 16,
    baseTheme: 'dark',
    accentColor: '#a78bfa', // Igne purple
    translucency: false,
  };
  await invoke('write_file', {
    path: `${obsidianPath}/appearance.json`,
    content: JSON.stringify(appearanceConfig, null, 2),
  });

  // Create core-plugins.json
  const corePlugins = {
    'file-explorer': true,
    'global-search': true,
    'graph': true,
    'backlink': true,
    'outgoing-link': true,
    'tag-pane': true,
    'page-preview': true,
    'daily-notes': true,
    'templates': false,
    'note-composer': true,
    'command-palette': true,
    'editor-status': true,
    'starred': true,
    'outline': true,
    'word-count': true,
  };
  await invoke('write_file', {
    path: `${obsidianPath}/core-plugins.json`,
    content: JSON.stringify(corePlugins, null, 2),
  });

  // Create welcome note
  await invoke('write_file', {
    path: `${vaultPath}/Welcome.md`,
    content: WELCOME_NOTE,
  });

  console.log('[defaultVault] Default vault created successfully');

  return vaultPath;
}

/**
 * Ensure default vault exists, creating it if necessary
 * Returns the vault path
 */
export async function ensureDefaultVault(): Promise<string> {
  const vaultPath = await getDefaultVaultPath();

  if (await pathExists(vaultPath)) {
    console.log('[defaultVault] Default vault already exists at:', vaultPath);
    return vaultPath;
  }

  return createDefaultVault();
}
