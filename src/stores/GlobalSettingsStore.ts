import { invoke } from '@tauri-apps/api/core';
import type { GlobalSettings } from '../types';
import { readJsonSafe, writeJsonSafe, fileExists } from '../utils/safeJson';
import { logger } from '../utils/logger';

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
  lineWrapping: true,
};

class GlobalSettingsStore {
  private settings: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS };
  private settingsPath: string = '';

  async init(): Promise<void> {
    logger.debug('GlobalSettingsStore', 'init() called');
    try {
      const appData = await getAppDataDir();
      this.settingsPath = `${appData}/settings.json`;
      logger.debug('GlobalSettingsStore', 'settingsPath:', this.settingsPath);

      // Load existing settings
      if (this.settingsPath && await fileExists(this.settingsPath)) {
        const loaded = await readJsonSafe<Partial<GlobalSettings>>(this.settingsPath);

        if (loaded) {
          // Merge with defaults to handle version upgrades and missing fields
          this.settings = {
            ...DEFAULT_GLOBAL_SETTINGS,
            ...loaded,
            version: loaded.version || 1,
          };

          logger.info('GlobalSettingsStore', 'Loaded settings', {
            openLastVault: this.settings.openLastVault,
            language: this.settings.language,
          });
        } else {
          logger.debug('GlobalSettingsStore', 'No existing settings found, using defaults');
        }
      } else {
        logger.debug('GlobalSettingsStore', 'No existing settings found, using defaults');
      }
    } catch (e) {
      logger.error('GlobalSettingsStore', 'Failed to initialize', e);
    }
  }

  async save(): Promise<void> {
    try {
      if (!this.settingsPath) {
        const appData = await getAppDataDir();
        this.settingsPath = `${appData}/settings.json`;
      }

      await writeJsonSafe(this.settingsPath, this.settings, {
        preserveUnknown: true,
        merge: true,
      });
      logger.debug('GlobalSettingsStore', 'Saved settings');
    } catch (e) {
      logger.error('GlobalSettingsStore', 'Failed to save settings', e);
    }
  }

  getSettings(): GlobalSettings {
    logger.debug('GlobalSettingsStore', 'getSettings() called from:', new Error().stack?.split('\n')[2]?.trim());
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<GlobalSettings>): Promise<void> {
    logger.debug('GlobalSettingsStore', 'updateSettings() called with:', updates);
    logger.debug('GlobalSettingsStore', 'updateSettings() called from:', new Error().stack?.split('\n')[2]?.trim());
    this.settings = {
      ...this.settings,
      ...updates,
    };
    await this.save();
    logger.info('GlobalSettingsStore', 'Updated settings', updates);
  }

  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_GLOBAL_SETTINGS };
    await this.save();
    logger.info('GlobalSettingsStore', 'Reset settings to defaults');
  }
}

export const globalSettingsStore = new GlobalSettingsStore();
