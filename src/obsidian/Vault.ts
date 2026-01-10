// =============================================================================
// Vault - File System Operations
// =============================================================================

import { invoke } from '@tauri-apps/api/core';
import { Events } from './events';
import { DataAdapter } from './DataAdapter';
import type { TAbstractFile, EventRef } from './types';
import { TFile, TFolder } from './types';

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export class Vault extends Events {
  private rootFolder: TFolder;
  public configDir: string;
  public adapter: DataAdapter;
  public app?: any; // Reference to App for MetadataCache integration

  constructor(rootPath: string, configDir: string) {
    super();
    this.configDir = configDir;
    this.adapter = new DataAdapter(rootPath);
    this.rootFolder = {
      vault: this,
      path: '',
      name: '',
      parent: null,
      children: [],
      isRoot: () => true,
    } as TFolder;
  }

  async initialize(): Promise<void> {
    // Load file tree from Rust backend
    try {
      const entries = await invoke<FileEntry[]>('read_directory', { path: await this.adapter.getPath() });
      this.rootFolder.children = this.buildFileTree(entries, '');
    } catch (error) {
      console.error('Failed to initialize vault:', error);
      this.rootFolder.children = [];
    }
  }

  private buildFileTree(entries: FileEntry[], parentPath: string): TAbstractFile[] {
    return entries.map((entry) => {
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      if (entry.is_dir) {
        return {
          vault: this,
          path,
          name: entry.name,
          parent: parentPath ? (this.getAbstractFileByPath(parentPath) as TFolder) : null,
          children: entry.children ? this.buildFileTree(entry.children, path) : [],
          isRoot: () => false,
        } as TFolder;
      } else {
        return {
          vault: this,
          path,
          name: entry.name,
          parent: parentPath ? (this.getAbstractFileByPath(parentPath) as TFolder) : null,
          stat: {
            ctime: 0,
            mtime: 0,
            size: 0,
          },
          basename: entry.name.replace(/\.[^/.]+$/, ''),
          extension: entry.name.split('.').pop() || '',
        } as TFile;
      }
    });
  }

  async create(path: string, data: string): Promise<TFile> {
    await invoke('write_file', { path, content: data });

    const file: TFile = {
      vault: this,
      path,
      name: path.split('/').pop() || '',
      parent: this.getParentFolder(path),
      stat: { ctime: Date.now(), mtime: Date.now(), size: data.length },
      basename: path.split('/').pop()!.replace(/\.[^/.]+$/, ''),
      extension: path.split('.').pop() || '',
    };

    // Update metadata cache
    if (this.app?.metadataCache) {
      await this.app.metadataCache.updateFileCache(file);
    }

    this.trigger('create', file);
    return file;
  }

  async read(file: TFile): Promise<string> {
    return await invoke('read_file', { path: file.path });
  }

  async modify(file: TFile, data: string): Promise<void> {
    await invoke('write_file', { path: file.path, content: data });

    // Update metadata cache
    if (this.app?.metadataCache) {
      await this.app.metadataCache.updateFileCache(file);
    }

    this.trigger('modify', file);
  }

  async delete(file: TAbstractFile): Promise<void> {
    await invoke('delete_file', { path: file.path });

    // Remove from metadata cache
    if (this.app?.metadataCache && file instanceof TFile) {
      this.app.metadataCache.removeFileCache(file);
    }

    this.trigger('delete', file);
  }

  async rename(file: TAbstractFile, newPath: string): Promise<void> {
    const oldPath = file.path;
    await invoke('rename_file', { oldPath, newPath });

    // Update metadata cache
    if (this.app?.metadataCache && file instanceof TFile) {
      this.app.metadataCache.removeFileCache(file);
      file.path = newPath;
      file.name = newPath.split('/').pop() || '';
      await this.app.metadataCache.updateFileCache(file);
    } else {
      file.path = newPath;
      file.name = newPath.split('/').pop() || '';
    }

    this.trigger('rename', file, oldPath);
  }

  getAbstractFileByPath(path: string): TAbstractFile | null {
    if (path === '' || path === '/') return this.rootFolder;

    const parts = path.split('/').filter(Boolean);
    let current: TAbstractFile = this.rootFolder;

    for (const part of parts) {
      if (current instanceof TFolder) {
        const child = current.children.find((c) => c.name === part);
        if (child) {
          current = child;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    return current;
  }

  getFileByPath(path: string): TFile | null {
    const file = this.getAbstractFileByPath(path);
    return file && !(file as any).is_dir ? (file as TFile) : null;
  }

  getFolderByPath(path: string): TFolder | null {
    const folder = this.getAbstractFileByPath(path);
    return folder && (folder as any).isRoot?.() === false ? (folder as TFolder) : null;
  }

  getMarkdownFiles(): TFile[] {
    const files: TFile[] = [];

    const traverse = (folder: TFolder) => {
      for (const child of folder.children) {
        if (child instanceof TFile && child.extension === 'md') {
          files.push(child);
        } else if (child instanceof TFolder) {
          traverse(child);
        }
      }
    };

    traverse(this.rootFolder);
    return files;
  }

  getRoot(): TFolder {
    return this.rootFolder;
  }

  private getParentFolder(path: string): TFolder | null {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.join('/');
    return parentPath ? this.getFolderByPath(parentPath) : this.rootFolder;
  }

  // Event type definitions
  on(name: 'create', callback: (file: TAbstractFile) => any): EventRef;
  on(name: 'modify', callback: (file: TAbstractFile) => any): EventRef;
  on(name: 'delete', callback: (file: TAbstractFile) => any): EventRef;
  on(name: 'rename', callback: (file: TAbstractFile, oldPath: string) => any): EventRef;
  on(name: string, callback: (...args: any[]) => any): EventRef {
    return super.on(name, callback);
  }
}
