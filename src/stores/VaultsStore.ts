import { invoke } from '@tauri-apps/api/core';
import type { VaultsRegistry, VaultEntry, RecentItemType } from '../types';

/**
 * VaultsStore — unified registry of recent workspaces (vaults, folders, files).
 *
 * Storage: <appDataDir>/vaults.json
 *
 * Version history:
 *   v1 (pre-0.4) — vault-only registry. Entries had no `type` field.
 *                   `lastOpenedVault` was the key for last opened path.
 *                   Recent standalone files were stored separately in
 *                   localStorage under `igne_recent_files`.
 *   v2 (0.4)    — unified registry. Entries gain `type` field (vault|folder|file).
 *                   `lastOpened` replaces `lastOpenedVault`.
 *                   Migrates localStorage `igne_recent_files` into vaults array.
 *                   Old v1 entries get `type: 'vault'` as default.
 *
 * Migration notes:
 *   - v1→v2: runs once on first load of a v1 registry. Can be removed once
 *            all users have been on 0.4+ for a release cycle (target: 0.6).
 */

const CURRENT_VERSION = 2;

async function fileExists(path: string): Promise<boolean> {
  try {
    const meta = await invoke<{ exists: boolean }>('stat_path', { path });
    return meta.exists;
  } catch {
    return false;
  }
}

async function getAppDataDir(): Promise<string> {
  try {
    return await invoke<string>('get_app_data_dir');
  } catch {
    return '';
  }
}

class VaultsStore {
  private registry: VaultsRegistry = {
    version: CURRENT_VERSION,
    vaults: [],
    lastOpened: null,
  };

  private vaultsPath: string = '';

  async init(): Promise<void> {
    try {
      const appData = await getAppDataDir();
      this.vaultsPath = `${appData}/vaults.json`;

      if (await fileExists(this.vaultsPath)) {
        try {
          const content = await invoke<string>('read_file', { path: this.vaultsPath });
          const loaded = JSON.parse(content) as Record<string, unknown>;
          const version = (loaded.version as number) || 1;
          const vaults = (loaded.vaults as VaultEntry[]) || [];
          // Handle both v1 `lastOpenedVault` and v2 `lastOpened`
          const lastOpened = (loaded.lastOpened as string) || (loaded.lastOpenedVault as string) || null;

          this.registry = {
            version,
            vaults: vaults.map(v => ({
              ...v,
              type: v.type || 'vault', // v1 entries have no type
            })),
            lastOpened,
          };

          // Run version migrations
          if (version < CURRENT_VERSION) {
            this.migrate(version);
          }

          console.log('[VaultsStore] Loaded registry:', {
            version: this.registry.version,
            itemCount: this.registry.vaults.length,
            lastOpened: this.registry.lastOpened,
          });
        } catch (e) {
          console.error('[VaultsStore] Failed to load registry:', e);
        }
      } else {
        // First load — run migrations for any legacy data sources
        this.migrate(0);
        console.log('[VaultsStore] No existing registry, starting fresh');
      }
    } catch (e) {
      console.error('[VaultsStore] Failed to initialize:', e);
    }
  }

  /**
   * Run migrations from `fromVersion` up to CURRENT_VERSION.
   * Each migration is idempotent and version-gated.
   */
  private migrate(fromVersion: number): void {
    if (fromVersion < 2) {
      this.migrateV1toV2();
    }
    // Future: if (fromVersion < 3) { this.migrateV2toV3(); }

    this.registry.version = CURRENT_VERSION;
  }

  /**
   * v1 → v2: Absorb localStorage `igne_recent_files` into the unified registry.
   * These were standalone files opened via File > Open or CLI before the
   * workspace unification in 0.4. Safe to remove after 0.6.
   */
  private migrateV1toV2(): void {
    try {
      const raw = localStorage.getItem('igne_recent_files');
      if (!raw) return;

      const recentFiles: string[] = JSON.parse(raw);
      if (!Array.isArray(recentFiles) || recentFiles.length === 0) return;

      let migrated = 0;
      for (const filePath of recentFiles) {
        if (this.registry.vaults.some(v => v.path === filePath)) continue;

        this.registry.vaults.push({
          path: filePath,
          name: filePath.split(/[/\\]/).pop() || 'File',
          lastOpened: Date.now() - migrated * 1000, // preserve relative order
          created: Date.now(),
          type: 'file',
        });
        migrated++;
      }

      if (migrated > 0) {
        console.log(`[VaultsStore] v1→v2: Migrated ${migrated} recent files from localStorage`);
        localStorage.removeItem('igne_recent_files');
      }
    } catch {
      // Ignore migration errors — non-critical data
    }
  }

  async save(): Promise<void> {
    try {
      if (!this.vaultsPath) {
        const appData = await getAppDataDir();
        this.vaultsPath = `${appData}/vaults.json`;
      }

      // Serialize with current field names (no lastOpenedVault)
      const serialized = {
        version: this.registry.version,
        vaults: this.registry.vaults,
        lastOpened: this.registry.lastOpened,
      };

      await invoke('write_file', {
        path: this.vaultsPath,
        content: JSON.stringify(serialized, null, 2),
      });
    } catch (e) {
      console.error('[VaultsStore] Failed to save registry:', e);
    }
  }

  // Get all known items, sorted by last opened (most recent first)
  getVaults(): VaultEntry[] {
    return [...this.registry.vaults].sort((a, b) => b.lastOpened - a.lastOpened);
  }

  // Get items filtered by type
  getItemsByType(type: RecentItemType): VaultEntry[] {
    return this.getVaults().filter(v => (v.type || 'vault') === type);
  }

  // Get the last opened item path
  getLastOpenedVault(): string | null {
    return this.registry.lastOpened;
  }

  // Add or update an item in the registry
  async addVault(path: string, name?: string, type?: RecentItemType): Promise<VaultEntry> {
    const existing = this.registry.vaults.find((v) => v.path === path);

    if (existing) {
      existing.lastOpened = Date.now();
      existing.name = name || existing.name;
      if (type) existing.type = type;
    } else {
      const entry: VaultEntry = {
        path,
        name: name || path.split(/[/\\]/).pop() || 'Untitled',
        lastOpened: Date.now(),
        created: Date.now(),
        type: type || 'vault',
      };
      this.registry.vaults.push(entry);
    }

    this.registry.lastOpened = path;
    await this.save();

    return this.registry.vaults.find((v) => v.path === path)!;
  }

  // Remove an item from registry (doesn't delete files)
  async removeVault(path: string): Promise<void> {
    this.registry.vaults = this.registry.vaults.filter((v) => v.path !== path);

    if (this.registry.lastOpened === path) {
      this.registry.lastOpened = this.registry.vaults[0]?.path || null;
    }

    await this.save();
  }

  // Update item metadata
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
      this.registry.lastOpened = path;
      await this.save();
    }
  }
}

export const vaultsStore = new VaultsStore();
