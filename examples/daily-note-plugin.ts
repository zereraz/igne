/**
 * Daily Note Plugin
 * Creates and opens a daily note with configurable format
 */

import { Plugin, Notice } from '../src/obsidian/Plugin';
import type { App } from '../src/obsidian/App';

interface DailyNoteSettings {
  format: string;
  template: string;
  folder: string;
}

const DEFAULT_SETTINGS: DailyNoteSettings = {
  format: 'YYYY-MM-DD',
  template: '# {{date}}\n\n',
  folder: ''
};

export default class DailyNotePlugin extends Plugin {
  settings: DailyNoteSettings;

  async onload() {
    console.log('Loading Daily Note plugin');

    // Load settings
    await this.loadSettings();

    // Add command to create/open daily note
    this.addCommand({
      id: 'daily-note',
      name: 'Create/Open Daily Note',
      callback: () => {
        this.createDailyNote();
      }
    });

    // Add ribbon icon
    this.addRibbonIcon(
      'calendar',
      'Open Daily Note',
      () => {
        this.createDailyNote();
      }
    );

    console.log('Daily Note plugin loaded');
  }

  private async createDailyNote() {
    const date = new Date();
    const filename = this.formatDate(date, this.settings.format);
    const content = this.generateContent(date);

    const folder = this.settings.folder;
    const path = folder ? `${folder}/${filename}.md` : `${filename}.md`;

    try {
      // Check if file exists
      const existingFile = this.app.vault.getAbstractFileByPath(path);

      if (existingFile) {
        // Open existing file
        await this.app.workspace.openLinkText(filename, '', true);
        new Notice('Opened existing daily note');
      } else {
        // Create new file
        await this.app.vault.create(path, content);
        await this.app.workspace.openLinkText(filename, '', true);
        new Notice('Created new daily note');
      }
    } catch (error) {
      console.error('Failed to create daily note:', error);
      new Notice('Failed to create daily note');
    }
  }

  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day);
  }

  private generateContent(date: Date): string {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return this.settings.template.replace('{{date}}', dateStr);
  }

  async loadSettings() {
    try {
      const saved = await this.loadData();
      this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    console.log('Unloading Daily Note plugin');
  }
}
