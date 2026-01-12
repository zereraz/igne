import { invoke } from '@tauri-apps/api/core';
import type { VaultSettings, AppearanceSettings, WorkspaceState } from '../types';
import { DEFAULT_VAULT_SETTINGS, DEFAULT_APPEARANCE_SETTINGS } from '../types';
import { readJsonSafe, writeJsonSafe, fileExists } from '../utils/safeJson';

class VaultConfigStore {
  private vaultPath: string = '';
  private configDir: string = '';

  private settings: VaultSettings = { ...DEFAULT_VAULT_SETTINGS };
  private appearance: AppearanceSettings = { ...DEFAULT_APPEARANCE_SETTINGS };
  private workspace: WorkspaceState | null = null;

  // Initialize for a specific vault
  async init(vaultPath: string): Promise<void> {
    this.vaultPath = vaultPath;
    this.configDir = `${vaultPath}/.obsidian`;

    // Ensure config directory exists
    await this.ensureConfigDir();

    // Load all configs
    await Promise.all([this.loadSettings(), this.loadAppearance(), this.loadWorkspace()]);

    console.log('[VaultConfigStore] Initialized for vault:', vaultPath);
  }

  private async ensureConfigDir(): Promise<void> {
    if (!(await fileExists(this.configDir))) {
      await invoke('create_directory', { path: this.configDir });
      console.log('[VaultConfigStore] Created config directory:', this.configDir);
    }
  }

  // === SETTINGS ===

  private async loadSettings(): Promise<void> {
    const path = `${this.configDir}/app.json`;

    const loaded = await readJsonSafe<Partial<VaultSettings>>(path);

    if (loaded) {
      // Merge with defaults, preserving any unknown keys
      this.settings = {
        ...DEFAULT_VAULT_SETTINGS,
        ...loaded,
      };
      console.log('[VaultConfigStore] Loaded vault settings from app.json');
    } else {
      console.log('[VaultConfigStore] No app.json found, using defaults');
    }
  }

  async saveSettings(): Promise<void> {
    const path = `${this.configDir}/app.json`;
    await writeJsonSafe(path, this.settings, {
      preserveUnknown: true,
      merge: true,
    });
    console.log('[VaultConfigStore] Saved vault settings to app.json');
  }

  getSettings(): VaultSettings {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<VaultSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...updates,
    };
    await this.saveSettings();
    console.log('[VaultConfigStore] Updated vault settings:', updates);
  }

  // === APPEARANCE ===

  private async loadAppearance(): Promise<void> {
    const path = `${this.configDir}/appearance.json`;

    const loaded = await readJsonSafe<Partial<AppearanceSettings>>(path);

    if (loaded) {
      // Merge with defaults, preserving any unknown keys
      this.appearance = {
        ...DEFAULT_APPEARANCE_SETTINGS,
        ...loaded,
      };
      console.log('[VaultConfigStore] Loaded appearance settings from appearance.json');
    } else {
      console.log('[VaultConfigStore] No appearance.json found, using defaults');
    }
  }

  async saveAppearance(): Promise<void> {
    const path = `${this.configDir}/appearance.json`;
    await writeJsonSafe(path, this.appearance, {
      preserveUnknown: true,
      merge: true,
    });
    console.log('[VaultConfigStore] Saved appearance settings to appearance.json');
  }

  getAppearance(): AppearanceSettings {
    return { ...this.appearance };
  }

  async updateAppearance(updates: Partial<AppearanceSettings>): Promise<void> {
    this.appearance = {
      ...this.appearance,
      ...updates,
    };
    await this.saveAppearance();
    console.log('[VaultConfigStore] Updated appearance settings:', updates);
  }

  // === WORKSPACE ===

  private async loadWorkspace(): Promise<void> {
    const path = `${this.configDir}/workspace.json`;

    this.workspace = await readJsonSafe<WorkspaceState>(path);

    if (this.workspace) {
      console.log('[VaultConfigStore] Loaded workspace state from workspace.json');
    } else {
      console.log('[VaultConfigStore] No workspace.json found');
    }
  }

  async saveWorkspace(workspace: WorkspaceState): Promise<void> {
    this.workspace = workspace;
    const path = `${this.configDir}/workspace.json`;
    await writeJsonSafe(path, workspace, {
      preserveUnknown: true,
      merge: true,
    });
    console.log('[VaultConfigStore] Saved workspace state to workspace.json');
  }

  getWorkspace(): WorkspaceState | null {
    return this.workspace;
  }

  // === HOTKEYS ===

  async loadHotkeys(): Promise<Record<string, any[]>> {
    const path = `${this.configDir}/hotkeys.json`;

    return (await readJsonSafe<Record<string, any[]>>(path)) || {};
  }

  async saveHotkeys(hotkeys: Record<string, any[]>): Promise<void> {
    const path = `${this.configDir}/hotkeys.json`;
    await writeJsonSafe(path, hotkeys, {
      preserveUnknown: true,
      merge: true,
    });
    console.log('[VaultConfigStore] Saved hotkeys to hotkeys.json');
  }
}

export const vaultConfigStore = new VaultConfigStore();
