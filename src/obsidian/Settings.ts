// =============================================================================
// Settings - App Settings Management Modal
// =============================================================================

import { Modal } from './Modal';
import type { App, PluginSettingTab, Plugin } from './types';

// Helper function to create a div with class
function createDiv(cls: string): HTMLDivElement {
  const div = document.createElement('div');
  div.classList.add(cls);
  return div;
}

export class Settings extends Modal {
  private pluginSettingTabs: Map<Plugin, PluginSettingTab> = new Map();
  private settingsContainerEl: HTMLElement;
  private settingsContentEl: HTMLElement;

  constructor(app: App) {
    super(app);
    this.settingsContainerEl = createDiv('settings-container');
    this.modalEl.appendChild(this.settingsContainerEl);
    this.settingsContentEl = createDiv('settings-content');
    this.settingsContainerEl.appendChild(this.settingsContentEl);
  }

  /**
   * Display the settings modal
   */
  async display(): Promise<void> {
    // Clear content
    while (this.settingsContentEl.firstChild) {
      this.settingsContentEl.removeChild(this.settingsContentEl.firstChild);
    }

    // Render core settings tabs
    await this.renderCoreSettings();

    // Render plugin settings tabs
    await this.renderPluginSettings();
  }

  /**
   * Render core app settings
   */
  private async renderCoreSettings(): Promise<void> {
    // Core settings will be rendered here
    // This can be extended with specific app settings
  }

  /**
   * Render plugin settings tabs
   */
  private async renderPluginSettings(): Promise<void> {
    for (const [, settingTab] of this.pluginSettingTabs) {
      const pluginContainer = createDiv('plugin-settings');
      this.settingsContentEl.appendChild(pluginContainer);
      settingTab.containerEl = pluginContainer;
      settingTab.app = this.app;
      settingTab.display();
    }
  }

  /**
   * Add a plugin setting tab
   */
  addPluginSettingTab(plugin: Plugin, settingTab: PluginSettingTab): void {
    this.pluginSettingTabs.set(plugin, settingTab);
  }

  /**
   * Remove a plugin setting tab
   */
  removePluginSettingTab(plugin: Plugin): void {
    const settingTab = this.pluginSettingTabs.get(plugin);
    if (settingTab) {
      settingTab.hide?.();
      this.pluginSettingTabs.delete(plugin);
    }
  }

  /**
   * Get all plugin setting tabs
   */
  getPluginSettingTabs(): Map<Plugin, PluginSettingTab> {
    return this.pluginSettingTabs;
  }

  /**
   * Hide the settings modal
   */
  hide(): void {
    // Unload all plugin setting tabs
    for (const settingTab of this.pluginSettingTabs.values()) {
      settingTab.hide?.();
    }
    this.close();
  }

  /**
   * Close the settings modal
   */
  onClose(): void {
    this.hide();
    super.onClose();
  }
}
