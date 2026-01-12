/**
 * Vault Tools for Phase D: Command Registry + Tool Layer
 *
 * These tools wrap Tauri backend commands for file operations.
 * All tools return Result types for consistent error handling.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  ToolContext,
  Tool,
  CreateFileInput,
  ReadFileInput,
  WriteFileInput,
  DeleteFileInput,
  RenameFileInput,
  StatPathInput,
  ListDirInput,
} from './types';
import { tryResultAsync, ok, err } from './types';
import type { FileMetadata, FileEntry } from '../types';

// =============================================================================
// File Content Tools
// =============================================================================

/**
 * Read the content of a file
 */
export const readFile: Tool<ReadFileInput, string> = {
  id: 'vault.readFile',
  name: 'Read File',
  description: 'Read the content of a file from the vault',

  async execute(_context: ToolContext, input: ReadFileInput) {
    return tryResultAsync(async () => {
      return await invoke<string>('read_file', { path: input.path });
    });
  },
};

/**
 * Write content to a file
 */
export const writeFile: Tool<WriteFileInput, void> = {
  id: 'vault.writeFile',
  name: 'Write File',
  description: 'Write content to a file in the vault',

  async execute(_context: ToolContext, input: WriteFileInput) {
    return tryResultAsync(async () => {
      await invoke('write_file', {
        path: input.path,
        content: input.content,
      });
    });
  },
};

/**
 * Create a new file with content
 */
export const createFile: Tool<CreateFileInput, void> = {
  id: 'vault.createFile',
  name: 'Create File',
  description: 'Create a new file with content in the vault',

  async execute(_context: ToolContext, input: CreateFileInput) {
    return tryResultAsync(async () => {
      await invoke('write_file', {
        path: input.path,
        content: input.content,
      });
    });
  },
};

// =============================================================================
// File Management Tools
// =============================================================================

/**
 * Delete a file or directory
 */
export const deleteFile: Tool<DeleteFileInput, void> = {
  id: 'vault.deleteFile',
  name: 'Delete File',
  description: 'Delete a file or directory from the vault',

  async execute(_context: ToolContext, input: DeleteFileInput) {
    return tryResultAsync(async () => {
      await invoke('delete_file', { path: input.path });
    });
  },
};

/**
 * Rename or move a file
 */
export const renameFile: Tool<RenameFileInput, void> = {
  id: 'vault.renameFile',
  name: 'Rename File',
  description: 'Rename or move a file in the vault',

  async execute(_context: ToolContext, input: RenameFileInput) {
    return tryResultAsync(async () => {
      await invoke('rename_file', {
        oldPath: input.oldPath,
        newPath: input.newPath,
      });
    });
  },
};

// =============================================================================
// File Metadata Tools
// =============================================================================

/**
 * Get metadata for a file or directory path
 */
export const statPath: Tool<StatPathInput, FileMetadata> = {
  id: 'vault.statPath',
  name: 'Stat Path',
  description: 'Get metadata for a file or directory path',

  async execute(_context: ToolContext, input: StatPathInput) {
    return tryResultAsync(async () => {
      return await invoke<FileMetadata>('stat_path', { path: input.path });
    });
  },
};

/**
 * List contents of a directory
 */
export const listDir: Tool<ListDirInput, FileEntry[]> = {
  id: 'vault.listDir',
  name: 'List Directory',
  description: 'List contents of a directory, optionally recursively',

  async execute(_context: ToolContext, input: ListDirInput) {
    return tryResultAsync(async () => {
      if (input.recursive) {
        return await invoke<FileEntry[]>('read_directory', {
          path: input.path,
          recursive: true,
        });
      }
      return await invoke<FileEntry[]>('read_directory', {
        path: input.path,
        recursive: false,
      });
    });
  },
};

// =============================================================================
// Tool Registry
// =============================================================================

/**
 * All vault tools exported as a map for easy lookup
 */
export const vaultTools = {
  readFile,
  writeFile,
  createFile,
  deleteFile,
  renameFile,
  statPath,
  listDir,
} as const;

export type VaultToolId = keyof typeof vaultTools;
