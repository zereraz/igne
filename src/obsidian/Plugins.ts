// =============================================================================
// Plugins - Plugin Management
// =============================================================================

import type { App, Plugin, PluginManifest } from './types';
import type { PluginConstructor } from './Plugin';

export class Plugins {
  private plugins: Map<string, Plugin> = new Map();
  private manifests: Map<string, PluginManifest> = new Map();
  private enabledPlugins: Set<string> = new Set();

  constructor(private app: App) {}

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

    // Verify app version
    if (!this.checkVersion(manifest.minAppVersion)) {
      throw new Error(`Plugin ${pluginId} requires minimum app version ${manifest.minAppVersion}`);
    }

    // Import and instantiate plugin
    const PluginClass = await this.importPlugin(pluginId);
    const plugin = new PluginClass(this.app, manifest);

    // Call onload
    await plugin.onload();

    // Register plugin
    this.plugins.set(pluginId, plugin);
    this.manifests.set(pluginId, manifest);

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

  /**
   * Check if the current app version meets the minimum required version
   */
  private checkVersion(_minVersion: string): boolean {
    // Simple version comparison
    // For now, just return true
    // TODO: Implement proper semver comparison
    return true;
  }
}
