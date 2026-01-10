// =============================================================================
// CommandPalette - Modal for searching and executing commands
// =============================================================================

import { FuzzySuggestModal } from './Modal';
import type { App, Command } from './types';

interface RecentCommand {
  command: Command;
  timestamp: number;
}

export class CommandPalette extends FuzzySuggestModal<Command> {
  private commands: Command[] = [];
  private recentCommands: RecentCommand[] = [];
  private prefixMode: 'commands' | 'tags' | 'files' | 'symbols' | null = null;

  constructor(app: App) {
    super(app);
    this.modalEl.classList.add('command-palette');
    this.loadRecentCommands();
  }

  onOpen(): void {
    super.onOpen();
    this.updatePlaceholder();
    this.inputEl.value = '';
    this.inputEl.focus();
  }

  /**
   * Update placeholder based on prefix mode
   */
  private updatePlaceholder() {
    switch (this.prefixMode) {
      case 'tags':
        this.inputEl.placeholder = 'Search for tags...';
        break;
      case 'files':
        this.inputEl.placeholder = 'Search for files...';
        break;
      case 'symbols':
        this.inputEl.placeholder = 'Search symbols (headings)...';
        break;
      default:
        this.inputEl.placeholder = 'Type a command or use prefix (#, @, :)';
    }
  }

  /**
   * Load recent commands from localStorage
   */
  private loadRecentCommands() {
    try {
      const stored = localStorage.getItem('obsidian-recent-commands');
      if (stored) {
        this.recentCommands = JSON.parse(stored);
      }
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Save a command to recent commands
   */
  private saveRecentCommand(command: Command) {
    // Remove if already exists
    this.recentCommands = this.recentCommands.filter(
      (rc) => rc.command.id !== command.id
    );

    // Add to front
    this.recentCommands.unshift({
      command,
      timestamp: Date.now(),
    });

    // Keep only last 20
    this.recentCommands = this.recentCommands.slice(0, 20);

    // Save to localStorage
    try {
      localStorage.setItem(
        'obsidian-recent-commands',
        JSON.stringify(this.recentCommands)
      );
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Get all commands for suggestions
   */
  getItems(): Command[] {
    this.commands = this.app.commands.listCommands();

    // If we have a query and are in prefix mode, return different items
    const query = this.inputEl.value.trim();

    if (query.startsWith('#')) {
      this.prefixMode = 'tags';
      return this.getTagCommands(query);
    } else if (query.startsWith('@')) {
      this.prefixMode = 'files';
      return this.getFileCommands(query);
    } else if (query.startsWith(':')) {
      this.prefixMode = 'symbols';
      return this.getSymbolCommands(query);
    } else {
      this.prefixMode = null;
    }

    return this.commands;
  }

  /**
   * Get tag search commands
   */
  private getTagCommands(query: string): Command[] {
    const tagSearch = query.substring(1).trim().toLowerCase();
    const allFiles = this.app.vault.getMarkdownFiles();
    const tagMap = new Map<string, number>();

    // Extract tags from all files
    for (const file of allFiles) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.tags) {
        for (const tag of cache.tags) {
          const tagName = tag.tag;
          tagMap.set(tagName, (tagMap.get(tagName) || 0) + 1);
        }
      }
    }

    // Filter and convert to commands
    const commands: Command[] = [];
    for (const [tag, count] of tagMap) {
      if (tag.toLowerCase().includes(tagSearch)) {
        commands.push({
          id: `tag:${tag}`,
          name: `${tag} (${count} notes)`,
          callback: () => {
            // Open search with this tag
            this.app.workspace.trigger('search:tag', tag);
          }
        });
      }
    }

    return commands;
  }

  /**
   * Get file search commands
   */
  private getFileCommands(query: string): Command[] {
    const fileSearch = query.substring(1).trim().toLowerCase();
    const allFiles = this.app.vault.getMarkdownFiles();

    const commands: Command[] = [];
    for (const file of allFiles) {
      if (file.basename.toLowerCase().includes(fileSearch)) {
        commands.push({
          id: `file:${file.path}`,
          name: file.basename,
          callback: () => {
            this.app.workspace.openLinkText(file.basename, '', true);
          }
        });
      }
    }

    return commands;
  }

  /**
   * Get symbol/heading search commands
   */
  private getSymbolCommands(query: string): Command[] {
    const symbolSearch = query.substring(1).trim().toLowerCase();
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return [];

    const cache = this.app.metadataCache.getFileCache(activeFile);
    const headings = cache?.headings || [];

    const commands: Command[] = [];
    for (const heading of headings) {
      if (heading.heading.toLowerCase().includes(symbolSearch)) {
        const indent = '  '.repeat(heading.level - 1);
        commands.push({
          id: `symbol:${activeFile.path}:${heading.position.start.line}`,
          name: `${indent}${heading.heading}`,
          callback: () => {
            // Scroll to heading
            const editor = this.app.workspace.getActiveEditor();
            if (editor) {
              editor.setCursor({
                line: heading.position.start.line,
                ch: 0
              });
              editor.scrollIntoView(null, 100);
            }
          }
        });
      }
    }

    return commands;
  }

  /**
   * Get display text for a command
   */
  getItemText(item: Command): string {
    return item.name;
  }

  /**
   * Filter commands based on query
   */
  filterItems(items: Command[], query: string): Command[] {
    if (!query) {
      // Show recent commands first when no query
      const recentCmds = this.recentCommands
        .slice(0, 5)
        .map((rc) => rc.command);
      const otherCmds = items.filter(
        (item) => !recentCmds.some((rc) => rc.id === item.id)
      );
      return [...recentCmds, ...otherCmds];
    }

    const lowerQuery = query.toLowerCase();

    // Check for prefix modes
    if (query.startsWith('#') || query.startsWith('@') || query.startsWith(':')) {
      return []; // Let prefix mode handle it
    }

    return items.filter((item) => {
      const name = item.name.toLowerCase();
      const id = item.id.toLowerCase();

      return name.includes(lowerQuery) || id.includes(lowerQuery);
    });
  }

  /**
   * Render a single command item with optional icon
   */
  renderSuggestions(): void {
    const query = this.inputEl.value.toLowerCase();
    this.suggestions = this.getItems();
    this.filteredSuggestions = this.filterItems(this.suggestions, query);

    while (this.resultContainerEl.firstChild) {
      this.resultContainerEl.removeChild(this.resultContainerEl.firstChild);
    }
    this.selectedIndex = 0;

    if (this.filteredSuggestions.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.classList.add('suggestion-item');
      emptyEl.classList.add('is-disabled');
      emptyEl.textContent = 'No commands found';
      this.resultContainerEl.appendChild(emptyEl);
      return;
    }

    for (const item of this.filteredSuggestions) {
      const el = document.createElement('div');
      el.classList.add('suggestion-item');
      el.classList.add('command-item');

      const itemText = this.getItemText(item);

      // Add icon if available
      if (item.icon) {
        const iconEl = document.createElement('span');
        iconEl.classList.add('command-icon');
        iconEl.textContent = item.icon;
        el.appendChild(iconEl);
      }

      const textEl = document.createElement('span');
      textEl.classList.add('command-name');
      textEl.textContent = itemText;
      el.appendChild(textEl);

      // Add hotkey if available
      if (item.hotkeys && item.hotkeys.length > 0) {
        const hotkeyEl = document.createElement('span');
        hotkeyEl.classList.add('command-hotkey');
        const hotkey = item.hotkeys[0];
        const hotkeyText = this.formatHotkey(hotkey);
        hotkeyEl.textContent = hotkeyText;
        el.appendChild(hotkeyEl);
      }

      el.addEventListener('click', (evt) => {
        evt.preventDefault();
        this.onChooseItem(item, evt);
      });

      this.resultContainerEl.appendChild(el);
    }

    this.updateSelected();
  }

  /**
   * Execute the chosen command
   */
  onChooseItem(item: Command, _evt: MouseEvent | KeyboardEvent): void {
    this.app.commands.executeCommandById(item.id);
    this.saveRecentCommand(item);
  }

  /**
   * Format a hotkey for display
   */
  private formatHotkey(hotkey: any): string {
    const modifiers: string[] = [];
    if (hotkey.modifiers?.includes('Mod')) {
      modifiers.push('⌘');
    }
    if (hotkey.modifiers?.includes('Ctrl') && !hotkey.modifiers?.includes('Mod')) {
      modifiers.push('Ctrl');
    }
    if (hotkey.modifiers?.includes('Shift')) {
      modifiers.push('⇧');
    }
    if (hotkey.modifiers?.includes('Alt')) {
      modifiers.push('⌥');
    }
    if (hotkey.key) {
      modifiers.push(hotkey.key);
    }
    return modifiers.join(' ');
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeydown(evt: KeyboardEvent): void {
    // Navigate with arrows
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredSuggestions.length - 1);
      this.updateSelected();
      return;
    }

    if (evt.key === 'ArrowUp') {
      evt.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.updateSelected();
      return;
    }

    // Execute with Enter
    if (evt.key === 'Enter') {
      evt.preventDefault();
      const selectedItem = this.filteredSuggestions[this.selectedIndex];
      if (selectedItem) {
        this.onChooseItem(selectedItem, evt);
        this.close();
      }
      return;
    }

    // Close with Escape
    if (evt.key === 'Escape') {
      evt.preventDefault();
      this.close();
      return;
    }

    super.handleKeydown(evt);
  }
}
