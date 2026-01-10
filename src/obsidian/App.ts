// =============================================================================
// App - Main Application Singleton
// =============================================================================

import { Vault } from './Vault';
import { Workspace } from './Workspace';
import { MetadataCache } from './MetadataCache';
import { FileManager } from './FileManager';
import { Keymap, Scope } from './Keymap';
import { Plugins } from './Plugins';
import { Commands } from './Commands';
import { Settings } from './Settings';
import type { TFile } from './types';

export class App {
  vault: Vault;
  workspace: Workspace;
  metadataCache: MetadataCache;
  fileManager: FileManager;
  keymap: Keymap;
  scope: Scope;
  plugins: Plugins;
  commands: Commands;
  setting: Settings;

  isMobile: boolean = false;
  appId: string;
  lastActiveFile: TFile | null = null;

  private localStorage: Map<string, string> = new Map();

  constructor(vaultPath: string) {
    this.appId = this.generateAppId();
    this.vault = new Vault(vaultPath, '.obsidian');
    this.vault.app = this; // Set app reference for MetadataCache integration
    this.workspace = new Workspace(this);
    this.metadataCache = new MetadataCache(this);
    this.fileManager = new FileManager(this);
    this.keymap = new Keymap(this);
    this.scope = new Scope();
    this.plugins = new Plugins(this);
    this.commands = new Commands(this);
    this.setting = new Settings(this);
  }

  async initialize(): Promise<void> {
    // Initialize vault and load file tree
    await this.vault.initialize();
    // Rebuild metadata cache
    await this.metadataCache.rebuildCache();
  }

  loadLocalStorage(key: string): string | null {
    return this.localStorage.get(key) || null;
  }

  saveLocalStorage(key: string, value: string): void {
    this.localStorage.set(key, value);
  }

  private generateAppId(): string {
    return 'igne-' + Math.random().toString(36).substr(2, 9);
  }
}
