import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { GlobalSettings } from '../types';

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
      const appData = await appDataDir();
      this.settingsPath = await join(appData, 'settings.json');

      // Load existing settings
      if (this.settingsPath && await exists(this.settingsPath)) {
        try {
          const content = await readTextFile(this.settingsPath);
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
        const appData = await appDataDir();
        this.settingsPath = await join(appData, 'settings.json');
      }

      await writeTextFile(this.settingsPath, JSON.stringify(this.settings, null, 2));
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
