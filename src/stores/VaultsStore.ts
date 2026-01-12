import { invoke } from '@tauri-apps/api/core';
import type { VaultsRegistry, VaultEntry } from '../types';

// Helper function to check if a file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await invoke('read_file', { path });
    return true;
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

class VaultsStore {
  private registry: VaultsRegistry = {
    version: 1,
    vaults: [],
    lastOpenedVault: null,
  };

  private vaultsPath: string = '';

  async init(): Promise<void> {
    try {
      const appData = await getAppDataDir();
      this.vaultsPath = `${appData}/vaults.json`;

      // Load existing registry
      if (await fileExists(this.vaultsPath)) {
        try {
          const content = await invoke<string>('read_file', { path: this.vaultsPath });
          const loaded = JSON.parse(content) as Partial<VaultsRegistry>;

          // Merge with defaults to handle version upgrades
          this.registry = {
            version: loaded.version || 1,
            vaults: loaded.vaults || [],
            lastOpenedVault: loaded.lastOpenedVault || null,
          };

          console.log('[VaultsStore] Loaded vaults registry:', {
            vaultCount: this.registry.vaults.length,
            lastOpened: this.registry.lastOpenedVault,
          });
        } catch (e) {
          console.error('[VaultsStore] Failed to load vaults registry:', e);
          // Will use default empty registry
        }
      } else {
        console.log('[VaultsStore] No existing vaults registry found, starting fresh');
      }
    } catch (e) {
      console.error('[VaultsStore] Failed to initialize:', e);
    }
  }

  async save(): Promise<void> {
    try {
      if (!this.vaultsPath) {
        const appData = await getAppDataDir();
        this.vaultsPath = `${appData}/vaults.json`;
      }

      await invoke('write_file', {
        path: this.vaultsPath,
        content: JSON.stringify(this.registry, null, 2),
      });
      console.log('[VaultsStore] Saved vaults registry');
    } catch (e) {
      console.error('[VaultsStore] Failed to save vaults registry:', e);
    }
  }

  // Get all known vaults, sorted by last opened
  getVaults(): VaultEntry[] {
    return [...this.registry.vaults].sort((a, b) => b.lastOpened - a.lastOpened);
  }

  // Get the last opened vault
  getLastOpenedVault(): string | null {
    return this.registry.lastOpenedVault;
  }

  // Add or update a vault
  async addVault(path: string, name?: string): Promise<VaultEntry> {
    const existing = this.registry.vaults.find((v) => v.path === path);

    if (existing) {
      existing.lastOpened = Date.now();
      existing.name = name || existing.name;
      console.log('[VaultsStore] Updated existing vault:', existing.name);
    } else {
      const entry: VaultEntry = {
        path,
        name: name || path.split(/[/\\]/).pop() || 'Vault',
        lastOpened: Date.now(),
        created: Date.now(),
      };
      this.registry.vaults.push(entry);
      console.log('[VaultsStore] Added new vault:', entry.name);
    }

    this.registry.lastOpenedVault = path;
    await this.save();

    return this.registry.vaults.find((v) => v.path === path)!;
  }

  // Remove a vault from registry (doesn't delete files)
  async removeVault(path: string): Promise<void> {
    this.registry.vaults = this.registry.vaults.filter((v) => v.path !== path);

    if (this.registry.lastOpenedVault === path) {
      this.registry.lastOpenedVault = this.registry.vaults[0]?.path || null;
    }

    await this.save();
    console.log('[VaultsStore] Removed vault from registry:', path);
  }

  // Update vault metadata
  async updateVaultMetadata(path: string, metadata: Partial<VaultEntry>): Promise<void> {
    const vault = this.registry.vaults.find((v) => v.path === path);
    if (vault) {
      Object.assign(vault, metadata);
      await this.save();
    }
  }

  // Set as last opened
  async setLastOpened(path: string): Promise<void> {
    const vault = this.registry.vaults.find((v) => v.path === path);
    if (vault) {
      vault.lastOpened = Date.now();
      this.registry.lastOpenedVault = path;
      await this.save();
    }
  }
}

export const vaultsStore = new VaultsStore();
