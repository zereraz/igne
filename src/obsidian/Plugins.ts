// =============================================================================
// Plugins - Plugin Management
// =============================================================================

import type { App, Plugin, PluginManifest } from './types';
import type { PluginConstructor } from './Plugin';
import { invoke } from '@tauri-apps/api/core';
import type { FileEntry } from '../types';
import { isPluginCompatible, OBSIDIAN_COMPAT_VERSION } from '../utils/semver';

export interface DiscoveredPlugin {
  id: string;
  manifest: PluginManifest;
  isEnabled: boolean;
  isLoaded: boolean;
}

export class Plugins {
  private plugins: Map<string, Plugin> = new Map();
  private manifests: Map<string, PluginManifest> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private discoveredPlugins: Map<string, PluginManifest> = new Map();

  constructor(private app: App) {
    console.log(`[Plugins] Initialized with compatibility baseline: Obsidian API ${OBSIDIAN_COMPAT_VERSION}`);
  }

  /**
   * Discover all available plugins (both enabled and disabled)
   * This scans the plugins directory for manifest.json files
   */
  async discoverPlugins(): Promise<DiscoveredPlugin[]> {
    const pluginsDir = `${this.app.vault.configDir}/plugins`;
    const discovered: DiscoveredPlugin[] = [];

    try {
      // Use Tauri to read the plugins directory
      const entries = await invoke<FileEntry[]>('read_directory', { path: pluginsDir });

      for (const entry of entries) {
        if (!entry.is_dir) continue; // Skip files, only look at directories

        const pluginId = entry.name;

        try {
          const manifest = await this.loadManifest(pluginId);
          this.discoveredPlugins.set(pluginId, manifest);

          discovered.push({
            id: pluginId,
            manifest,
            isEnabled: this.enabledPlugins.has(pluginId),
            isLoaded: this.plugins.has(pluginId),
          });
        } catch (error) {
          console.warn(`[Plugins] Failed to load manifest for ${pluginId}:`, error);
        }
      }
    } catch (error) {
      console.error('[Plugins] Failed to discover plugins:', error);
    }

    return discovered;
  }

  /**
   * Get all discovered plugins
   */
  getDiscoveredPlugins(): DiscoveredPlugin[] {
    const result: DiscoveredPlugin[] = [];

    for (const [id, manifest] of this.discoveredPlugins) {
      result.push({
        id,
        manifest,
        isEnabled: this.enabledPlugins.has(id),
        isLoaded: this.plugins.has(id),
      });
    }

    return result;
  }

  /**
   * Load all enabled plugins from the vault
   */
  async loadPlugins(): Promise<void> {
    // Load list of enabled plugins
    const enabledList = await this.loadEnabledPlugins();
    this.enabledPlugins = new Set(enabledList);

    // Load each enabled plugin
    for (const pluginId of this.enabledPlugins) {
      try {
        await this.loadPlugin(pluginId);
      } catch (error) {
        console.error(`Failed to load plugin ${pluginId}:`, error);
      }
    }
  }

  /**
   * Load a single plugin by ID
   */
  async loadPlugin(pluginId: string): Promise<Plugin> {
    // Check if already loaded
    if (this.plugins.has(pluginId)) {
      return this.plugins.get(pluginId)!;
    }

    // Load manifest
    const manifest = await this.loadManifest(pluginId);

    // Verify app version compatibility
    if (!isPluginCompatible(manifest.minAppVersion)) {
      const error = `Plugin "${pluginId}" requires Obsidian ${manifest.minAppVersion} or later. ` +
        `Igne currently supports Obsidian API ${OBSIDIAN_COMPAT_VERSION} (pinned baseline). ` +
        `Please check if a compatible version is available.`;
      console.error(`[Plugins] ${error}`);
      throw new Error(error);
    }

    // Import and instantiate plugin
    const PluginClass = await this.importPlugin(pluginId);
    const plugin = new PluginClass(this.app, manifest);

    // Call onload
    await plugin.onload();

    // Register plugin
    this.plugins.set(pluginId, plugin);
    this.manifests.set(pluginId, manifest);

    console.log(`[Plugins] Successfully loaded plugin: ${pluginId} v${manifest.version}`);
    return plugin;
  }

  /**
   * Unload a plugin by ID
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.onunload();
      this.plugins.delete(pluginId);
      this.manifests.delete(pluginId);
    }
  }

  /**
   * Enable a plugin (adds to enabled list and loads it)
   */
  async enablePlugin(pluginId: string): Promise<void> {
    if (!this.enabledPlugins.has(pluginId)) {
      this.enabledPlugins.add(pluginId);
      await this.saveEnabledPlugins();
      await this.loadPlugin(pluginId);
    }
  }

  /**
   * Disable a plugin (removes from enabled list and unloads it)
   */
  async disablePlugin(pluginId: string): Promise<void> {
    if (this.enabledPlugins.has(pluginId)) {
      this.enabledPlugins.delete(pluginId);
      await this.saveEnabledPlugins();
      await this.unloadPlugin(pluginId);
    }
  }

  /**
   * Save the list of enabled plugins to community-plugins.json
   */
  private async saveEnabledPlugins(): Promise<void> {
    const content = JSON.stringify(Array.from(this.enabledPlugins), null, 2);
    await this.app.vault.adapter.write(
      `${this.app.vault.configDir}/community-plugins.json`,
      content
    );
  }

  /**
   * Get a plugin by ID
   */
  getPluginById(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(id: string): boolean {
    return this.enabledPlugins.has(id);
  }

  /**
   * Get all loaded plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all plugin manifests
   */
  getManifests(): Map<string, PluginManifest> {
    return this.manifests;
  }

  /**
   * Load the plugin manifest from manifest.json
   */
  private async loadManifest(pluginId: string): Promise<PluginManifest> {
    const manifestPath = `${this.app.vault.configDir}/plugins/${pluginId}/manifest.json`;
    const content = await this.app.vault.adapter.read(manifestPath);
    return JSON.parse(content);
  }

  /**
   * Dynamically import a plugin's main.js
   */
  private async importPlugin(pluginId: string): Promise<PluginConstructor> {
    const pluginPath = `${this.app.vault.configDir}/plugins/${pluginId}/main.js`;

    // For now, use dynamic import
    // In production, this would need to be in an iframe or web worker for security
    const module = await import(/* @vite-ignore */ pluginPath);
    return module.default;
  }

  /**
   * Load the list of enabled plugins from community-plugins.json
   */
  private async loadEnabledPlugins(): Promise<string[]> {
    try {
      const content = await this.app.vault.adapter.read(
        `${this.app.vault.configDir}/community-plugins.json`
      );
      const data = JSON.parse(content);
      return data || [];
    } catch {
      // File doesn't exist or is invalid
      return [];
    }
  }
}
