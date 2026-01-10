// =============================================================================
// ThemeManager - Theme and CSS Snippet Management
// =============================================================================

import { EventRef } from './eventRef';
import { Events } from './events';
import type { App } from './types';

export class ThemeManager extends Events {
  private themeEl: HTMLStyleElement;
  private snippetEls: Map<string, HTMLStyleElement> = new Map();
  private currentTheme: string = '';
  private currentMode: 'light' | 'dark' = 'dark';

  constructor(private app: App) {
    super();
    this.themeEl = document.createElement('style');
    this.themeEl.id = 'obsidian-theme';
    document.head.appendChild(this.themeEl);

    // Set default theme mode
    this.setThemeMode(this.currentMode);
  }

  /**
   * Load a theme from the vault
   */
  async loadTheme(themeName: string): Promise<void> {
    try {
      const themeCss = await this.app.vault.adapter.read(
        `${this.app.vault.configDir}/themes/${themeName}/theme.css`
      );
      this.themeEl.textContent = themeCss;
      this.currentTheme = themeName;
      this.trigger('css-change');
    } catch (error) {
      console.error(`Failed to load theme ${themeName}:`, error);
      throw new Error(`Failed to load theme: ${error}`);
    }
  }

  /**
   * Unload the current theme
   */
  unloadTheme(): void {
    this.themeEl.textContent = '';
    this.currentTheme = '';
    this.trigger('css-change');
  }

   /**
   * Get the current theme name
   */
  getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * Check if a theme is loaded
   */
  isThemeLoaded(): boolean {
    return this.currentTheme !== '';
  }

  /**
   * Load a CSS snippet
   */
  async loadSnippet(snippetName: string): Promise<void> {
    if (this.snippetEls.has(snippetName)) {
      return; // Already loaded
    }

    try {
      const css = await this.app.vault.adapter.read(
        `${this.app.vault.configDir}/snippets/${snippetName}.css`
      );

      const el = document.createElement('style');
      el.id = `snippet-${snippetName}`;
      el.textContent = css;
      document.head.appendChild(el);

      this.snippetEls.set(snippetName, el);
      this.trigger('css-change');
    } catch (error) {
      console.error(`Failed to load snippet ${snippetName}:`, error);
      throw new Error(`Failed to load snippet: ${error}`);
    }
  }

  /**
   * Unload a CSS snippet
   */
  unloadSnippet(snippetName: string): void {
    const el = this.snippetEls.get(snippetName);
    if (el) {
      el.remove();
      this.snippetEls.delete(snippetName);
      this.trigger('css-change');
    }
  }

  /**
   * Check if a snippet is loaded
   */
  isSnippetLoaded(snippetName: string): boolean {
    return this.snippetEls.has(snippetName);
  }

  /**
   * Get all loaded snippets
   */
  getLoadedSnippets(): string[] {
    return Array.from(this.snippetEls.keys());
  }

  /**
   * Unload all snippets
   */
  unloadAllSnippets(): void {
    for (const [name, el] of this.snippetEls) {
      el.remove();
    }
    this.snippetEls.clear();
    this.trigger('css-change');
  }

  /**
   * Set the theme mode (light or dark)
   */
  setThemeMode(mode: 'light' | 'dark'): void {
    this.currentMode = mode;
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${mode}`);
    this.trigger('css-change');
  }

  /**
   * Get the current theme mode
   */
  getThemeMode(): 'light' | 'dark' {
    return this.currentMode;
  }

  /**
   * Toggle between light and dark mode
   */
  toggleThemeMode(): void {
    this.setThemeMode(this.currentMode === 'light' ? 'dark' : 'light');
  }

  /**
   * Refresh all CSS (trigger css-change event)
   */
  refresh(): void {
    this.trigger('css-change');
  }

  /**
   * Clean up resources
   */
  onunload(): void {
    this.themeEl.remove();
    this.unloadAllSnippets();
  }

  // Event type definitions
  on(name: 'css-change', callback: () => any): EventRef;
  on(name: string, callback: (...args: any[]) => any): EventRef {
    return super.on(name, callback);
  }
}
