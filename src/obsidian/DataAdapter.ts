// =============================================================================
// DataAdapter - Backend Communication
// =============================================================================

import { invoke } from '@tauri-apps/api/core';

export class DataAdapter {
  constructor(private vaultPath: string) {}

  async getPath(): Promise<string> {
    return this.vaultPath;
  }

  async read(path: string): Promise<string> {
    return await invoke('read_file', { path });
  }

  async write(path: string, data: string): Promise<void> {
    await invoke('write_file', { path, content: data });
  }

  async exists(path: string): Promise<boolean> {
    try {
      await invoke('get_file_meta', { path });
      return true;
    } catch {
      return false;
    }
  }

  async list(path: string): Promise<string[]> {
    const entries = await invoke<string[]>('read_directory', { path });
    return entries;
  }

  async mkdir(path: string): Promise<void> {
    await invoke('create_directory', { path });
  }

  async rmdir(path: string, recursive?: boolean): Promise<void> {
    await invoke('delete_directory', { path, recursive });
  }
}
