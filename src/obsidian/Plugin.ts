// =============================================================================
// Plugin - Base Class for Obsidian Plugins
// =============================================================================

import { Component } from './Component';
import type { App, PluginManifest, Command, EventRef, PluginSettingTab } from './types';

/**
 * Abstract base class for Obsidian plugins
 * All plugins must extend this class and implement the onload method
 */
export abstract class Plugin extends Component {
  app: App;
  manifest: PluginManifest;

  constructor(app: App, manifest: PluginManifest) {
    super();
    this.app = app;
    this.manifest = manifest;
  }

  /**
   * Called when the plugin is loaded
   * Override this to register commands, views, etc.
   */
  abstract onload(): void | Promise<void>;

  /**
   * Called when the plugin is unloaded
   * Override this to clean up resources
   */
  onunload(): void {
    super.onunload();
  }

  /**
   * Load plugin data from data.json
   */
  async loadData(): Promise<any> {
    const content = await this.app.vault.adapter.read(
      `${this.app.vault.configDir}/plugins/${this.manifest.id}/data.json`
    );
    return JSON.parse(content);
  }

  /**
   * Save plugin data to data.json
   */
  async saveData(data: any): Promise<void> {
    await this.app.vault.adapter.write(
      `${this.app.vault.configDir}/plugins/${this.manifest.id}/data.json`,
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Add a command to the app
   */
  addCommand(command: Command): Command {
    return this.app.commands.addCommand(command);
  }

  /**
   * Add a settings tab
   */
  addSettingTab(settingTab: PluginSettingTab): void {
    this.app.setting.addPluginSettingTab(this, settingTab);
  }

  /**
   * Register a custom view type
   */
  registerView(type: string, viewCreator: ViewCreator): void {
    this.app.workspace.registerView(type, viewCreator);
  }

  /**
   * Register an editor extension (for CodeMirror 6)
   */
  registerEditorExtension(extension: Extension): void {
    this.app.workspace.registerEditorExtension(extension);
  }

  /**
   * Register an event callback
   */
  registerEvent(name: string, callback: (...args: any[]) => any): EventRef {
    return this.app.workspace.on(name, callback);
  }

  /**
   * Register a DOM event
   */
  registerDomEvent(element: HTMLElement, event: string, callback: (...args: any[]) => any): () => void {
    element.addEventListener(event, callback as any);
    return () => element.removeEventListener(event, callback as any);
  }

  /**
   * Register a interval that gets cleared on unload
   */
  registerInterval(callback: () => void, ms: number): number {
    const id = window.setInterval(callback, ms);
    this.register(() => window.clearInterval(id));
    return id;
  }

  /**
   * Register a function to call on unload
   */
  register(fn: () => void): void {
    // Create a child component that will call the function on unload
    const child = new (class extends Component {
      onunload() {
        fn();
      }
    })();
    this.addChild(child);
  }
}

export type PluginConstructor = new (app: App, manifest: PluginManifest) => Plugin;
export type ViewCreator = (leaf: any) => any;
export type Extension = any; // CodeMirror extension
