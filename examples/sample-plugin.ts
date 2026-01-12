/**
 * Sample Obsidian-Compatible Plugin for Igne
 *
 * This demonstrates how to create a plugin that works with Igne's
 * Obsidian compatibility layer.
 */

// Import from Igne instead of Obsidian
import { Plugin, Notice, Setting } from 'igne';

interface SamplePluginSettings {
  greeting: string;
  showNotifications: boolean;
}

const DEFAULT_SETTINGS: SamplePluginSettings = {
  greeting: 'Hello',
  showNotifications: true,
};

export default class SamplePlugin extends Plugin {
  settings: SamplePluginSettings;

  async onload() {
    console.log('Loading Sample Plugin');

    // Load settings
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Add a command
    this.addCommand({
      id: 'say-hello',
      name: 'Say Hello',
      callback: () => {
        this.sayHello();
      }
    });

    // Add another command with hotkey
    this.addCommand({
      id: 'say-goodbye',
      name: 'Say Goodbye',
      hotkeys: [{ key: 'g', modifiers: ['Mod', 'Shift'] }],
      callback: () => {
        if (this.settings.showNotifications) {
          new Notice('Goodbye!');
        }
      }
    });

    // Add a command that checks if it can run
    this.addCommand({
      id: 'toggle-notifications',
      name: 'Toggle Notifications',
      checkCallback: (checking: boolean) => {
        if (checking) {
          // Return true to show the command
          return true;
        }

        // Toggle the setting
        this.settings.showNotifications = !this.settings.showNotifications;
        this.saveData(this.settings);

        new Notice(`Notifications ${this.settings.showNotifications ? 'enabled' : 'disabled'}`);
      }
    });

    // Add settings tab
    this.addSettingTab(new SampleSettingTab(this.app, this));

    // Register for events
    this.registerEvent('file-open', (file: any) => {
      console.log('File opened:', file.path);
    });

    // Register a DOM event with auto-cleanup
    this.registerDomEvent(document, 'keydown', (event: KeyboardEvent) => {
      // Handle global keyboard events
      console.log('Key pressed:', event.key);
    });

    // Register an interval with auto-cleanup
    this.registerInterval(() => {
      console.log('Interval tick');
    }, 60000); // Every minute

    console.log('Sample Plugin loaded successfully');
  }

  onunload() {
    console.log('Unloading Sample Plugin');
    // Cleanup happens automatically via Component system
  }

  async sayHello() {
    const message = `${this.settings.greeting} from Sample Plugin!`;

    if (this.settings.showNotifications) {
      new Notice(message);
    }

    console.log(message);
  }
}

class SampleSettingTab implements PluginSettingTab {
  app: App;
  plugin: SamplePlugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: SamplePlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Greeting')
      .setDesc('The greeting message to display')
      .addText((text) =>
        text
          .setPlaceholder('Enter greeting')
          .setValue(this.plugin.settings.greeting)
          .onChange(async (value) => {
            this.plugin.settings.greeting = value;
            await this.plugin.saveData(this.plugin.settings);
          })
      );

    new Setting(containerEl)
      .setName('Show Notifications')
      .setDesc('Whether to show notification popups')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showNotifications)
          .onChange(async (value) => {
            this.plugin.settings.showNotifications = value;
            await this.plugin.saveData(this.plugin.settings);
          })
      );
  }

  hide(): void {
    // Cleanup when settings are closed
  }
}

// Required for TypeScript
interface PluginSettingTab {
  app: App;
  containerEl: HTMLElement;
  display(): void;
  hide(): void;
}

interface App {
  vault: any;
  workspace: any;
  metadataCache: any;
}
