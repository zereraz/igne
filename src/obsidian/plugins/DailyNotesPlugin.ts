// =============================================================================
// DailyNotesPlugin - Built-in plugin for daily notes
// =============================================================================

import { Plugin } from '../Plugin';
import type { App, PluginManifest } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface DailyNotesSettings {
  folder: string;
  format: string;
  template: string;
}

export class DailyNotesPlugin extends Plugin {
  settings: DailyNotesSettings = {
    folder: 'Daily Notes',
    format: 'YYYY-MM-DD',
    template: '',
  };

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
  }

  async onload() {
    // Load settings
    await this.loadSettings();

    // Add commands
    this.addCommand({
      id: 'open-daily-note',
      name: 'Open today\'s note',
      callback: () => this.openDailyNote(),
    });

    this.addCommand({
      id: 'open-prev-daily-note',
      name: 'Open previous day\'s note',
      callback: () => this.navigateDailyNotes(-1),
    });

    this.addCommand({
      id: 'open-next-daily-note',
      name: 'Open next day\'s note',
      callback: () => this.navigateDailyNotes(1),
    });
  }

  async loadSettings() {
    try {
      const settings = await this.loadData();
      this.settings = { ...this.settings, ...settings };
    } catch (e) {
      // Use default settings
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getDailyNotePath(date: Date): string {
    const vaultPath = this.app.vault.adapter.basePath;
    const folder = this.settings.folder;
    const fileName = this.formatDate(date, this.settings.format);
    return `${vaultPath}/${folder}/${fileName}.md`;
  }

  formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  async openDailyNote(date = new Date()) {
    const notePath = this.getDailyNotePath(date);
    const vaultPath = this.app.vault.adapter.basePath;
    const folder = this.settings.folder;

    // Check if folder exists, create if not
    const folderPath = `${vaultPath}/${folder}`;
    try {
      await invoke('create_directory', { path: folderPath });
    } catch (e) {
      // Folder might already exist
    }

    // Check if file exists
    let content = '';
    try {
      content = await invoke('read_file', { path: notePath });
    } catch (e) {
      // File doesn't exist, create from template
      content = await this.applyTemplate(date);
      await invoke('write_file', { path: notePath, content });
    }

    // Open the file
    this.app.workspace.openLinkText(notePath, '', false);
  }

  async applyTemplate(date: Date): Promise<string> {
    let template = this.settings.template;

    if (!template) {
      // Default template
      template = `# {{date}}

## Notes


## Tasks


`;
    }

    // Replace variables
    const variables = {
      date: this.formatDate(date, this.settings.format),
      time: this.formatDate(date, 'HH:mm'),
      title: this.formatDate(date, this.settings.format),
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1).padStart(2, '0'),
      day: String(date.getDate()).padStart(2, '0'),
    };

    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return result;
  }

  async navigateDailyNotes(offset: number) {
    const currentFile = this.app.workspace.getActiveFile();
    if (!currentFile) {
      this.openDailyNote();
      return;
    }

    // Try to parse date from current file name
    const fileName = currentFile.basename;
    const date = this.parseDateFromFileName(fileName);

    if (!date) {
      this.openDailyNote();
      return;
    }

    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + offset);
    this.openDailyNote(newDate);
  }

  parseDateFromFileName(fileName: string): Date | null {
    // Try to parse date based on the format
    const format = this.settings.format;

    // Simple parsing for YYYY-MM-DD format
    if (format === 'YYYY-MM-DD') {
      const match = fileName.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(`${year}-${month}-${day}`);
      }
    }

    // Add more format parsing as needed

    return null;
  }
}
