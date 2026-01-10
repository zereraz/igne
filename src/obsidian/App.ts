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
import { CommandPalette } from './CommandPalette';
import { Settings } from './Settings';
import { ThemeManager } from './ThemeManager';
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
  themeManager: ThemeManager;

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
    this.themeManager = new ThemeManager(this);
  }

  async initialize(): Promise<void> {
    // Initialize vault and load file tree
    await this.vault.initialize();
    // Rebuild metadata cache
    await this.metadataCache.rebuildCache();
    // Register default commands
    this.registerDefaultCommands();
    // Load plugins after vault is ready
    await this.plugins.loadPlugins();
  }

  /**
   * Register default Obsidian commands
   */
  private registerDefaultCommands(): void {
    // Command palette
    this.commands.addCommand({
      id: 'command-palette',
      name: 'Open command palette',
      hotkeys: [{ key: 'p', modifiers: ['Mod'] }],
      callback: () => {
        const palette = new CommandPalette(this);
        palette.open();
      }
    });

    // Settings
    this.commands.addCommand({
      id: 'app-settings',
      name: 'Open settings',
      hotkeys: [{ key: ',', modifiers: ['Mod'] }],
      callback: () => {
        this.setting.open();
        this.setting.display();
      }
    });

    // Help
    this.commands.addCommand({
      id: 'help',
      name: 'Help',
      callback: () => {
        this.commands.executeCommandById('command-palette');
      }
    });

    // Theme toggle
    this.commands.addCommand({
      id: 'theme-toggle',
      name: 'Toggle light/dark mode',
      callback: () => {
        const isDark = document.body.classList.contains('theme-dark');
        this.themeManager.setThemeMode(isDark ? 'light' : 'dark');
      }
    });
  }

  /**
   * Open the command palette
   */
  openCommandPalette(): void {
    const palette = new CommandPalette(this);
    palette.open();
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
