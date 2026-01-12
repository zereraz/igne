/**
 * Hello World Plugin
 * A simple example plugin that demonstrates the basics of plugin development
 */

import { Plugin, Notice } from '../src/obsidian/Plugin';
import type { App } from '../src/obsidian/App';

interface HelloWorldSettings {
  greeting: string;
}

const DEFAULT_SETTINGS: HelloWorldSettings = {
  greeting: 'Hello'
};

export default class HelloWorldPlugin extends Plugin {
  settings: HelloWorldSettings;

  constructor(app: App, manifest: any) {
    super(app, manifest);
    this.settings = DEFAULT_SETTINGS;
  }

  async onload() {
    console.log('Loading Hello World plugin');

    // Load settings
    await this.loadSettings();

    // Add a command to say hello
    this.addCommand({
      id: 'say-hello',
      name: 'Say Hello',
      callback: () => {
        new Notice(`${this.settings.greeting} from Igne!`);
      }
    });

    // Add a command to show the current time
    this.addCommand({
      id: 'show-time',
      name: 'Show Current Time',
      callback: () => {
        const time = new Date().toLocaleTimeString();
        new Notice(`Current time: ${time}`);
      }
    });

    // Add a ribbon icon
    this.addRibbonIcon(
      'heart',
      'Say Hello',
      (event: MouseEvent) => {
        new Notice(`${this.settings.greeting} from the ribbon!`);
      }
    );

    // Add status bar item
    const statusItem = this.addStatusBarItem();
    statusItem.setText('Hello World');
    statusItem.onClick(() => {
      new Notice('Status bar clicked!');
    });

    console.log('Hello World plugin loaded');
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
    console.log('Unloading Hello World plugin');
  }
}
