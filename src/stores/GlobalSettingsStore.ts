import { invoke } from '@tauri-apps/api/core';
import type { GlobalSettings } from '../types';

// Helper function to check if a file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    const meta = await invoke<{ exists: boolean }>('stat_path', { path });
    return meta.exists;
  } catch {
    return false;
  }
}

// Helper function to get app data directory
async function getAppDataDir(): Promise<string> {
  try {
    const dir = await invoke<string>('get_app_data_dir');
    return dir;
  } catch {
    // Fallback to a default location
    return '';
  }
}

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  version: 1,
  openLastVault: true,
  showVaultSwitcher: true,
  checkForUpdates: true,
  autoUpdate: false,
  sendAnonymousStats: false,
  developerMode: false,
  showDebugInfo: false,
  language: 'en',
  defaultVaultLocation: '~/Documents',
  nativeMenus: true,
  framelessWindow: false,
};

class GlobalSettingsStore {
  private settings: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS };
  private settingsPath: string = '';

  async init(): Promise<void> {
    try {
      const appData = await getAppDataDir();
      this.settingsPath = `${appData}/settings.json`;

      // Load existing settings
      if (this.settingsPath && await fileExists(this.settingsPath)) {
        try {
          const content = await invoke<string>('read_file', { path: this.settingsPath });
          const loaded = JSON.parse(content) as Partial<GlobalSettings>;

          // Merge with defaults to handle version upgrades and missing fields
          this.settings = {
            ...DEFAULT_GLOBAL_SETTINGS,
            ...loaded,
            version: loaded.version || 1,
          };

          console.log('[GlobalSettingsStore] Loaded settings:', {
            openLastVault: this.settings.openLastVault,
            language: this.settings.language,
          });
        } catch (e) {
          console.error('[GlobalSettingsStore] Failed to load settings:', e);
          // Will use defaults
        }
      } else {
        console.log('[GlobalSettingsStore] No existing settings found, using defaults');
      }
    } catch (e) {
      console.error('[GlobalSettingsStore] Failed to initialize:', e);
    }
  }

  async save(): Promise<void> {
    try {
      if (!this.settingsPath) {
        const appData = await getAppDataDir();
        this.settingsPath = `${appData}/settings.json`;
      }

      await invoke('write_file', {
        path: this.settingsPath,
        content: JSON.stringify(this.settings, null, 2),
      });
      console.log('[GlobalSettingsStore] Saved settings');
    } catch (e) {
      console.error('[GlobalSettingsStore] Failed to save settings:', e);
    }
  }

  getSettings(): GlobalSettings {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<GlobalSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...updates,
    };
    await this.save();
    console.log('[GlobalSettingsStore] Updated settings:', updates);
  }

  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_GLOBAL_SETTINGS };
    await this.save();
    console.log('[GlobalSettingsStore] Reset settings to defaults');
  }
}

export const globalSettingsStore = new GlobalSettingsStore();
