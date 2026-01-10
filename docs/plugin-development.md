# Igne Plugin Development Guide

Welcome to the Igne plugin development guide! This guide will help you create plugins that extend Igne's functionality, compatible with the Obsidian plugin API.

> **⚠️ Important Note**: Igne's plugin API is implemented, but the **plugin loader is still under development**. You can develop plugins using the API, but dynamic loading from `.obsidian/plugins/` is not yet functional. Plugins currently need to be manually integrated into the app codebase.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Your First Plugin](#your-first-plugin)
3. [Plugin Structure](#plugin-structure)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Best Practices](#best-practices)
7. [Testing Plugins](#testing-plugins)
8. [Publishing Plugins](#publishing-plugins)

---

## Getting Started

### Prerequisites

- Node.js 18+ and Bun
- TypeScript knowledge
- Familiarity with React

### Installation

1. Create a new plugin project:

```bash
mkdir my-igne-plugin
cd my-igne-plugin
bun init -y
bun add -d typescript @types/node
```

2. Create your plugin structure:

```
my-igne-plugin/
├── main.ts
├── manifest.json
├── package.json
└── README.md
```

### Development Workflow

**Current State (Manual Integration)**:
1. Edit your plugin code in `main.ts`
2. Build with `bun run build`
3. Manually import and register in `src/App.tsx` or `src/obsidian/Plugins.ts`
4. Rebuild the app with `bun run tauri:dev`

**Future State (When Plugin Loader is Complete)**:
1. Edit your plugin code in `main.ts`
2. Build with `bun run build`
3. Copy the compiled JS to your Igne vault's plugins folder
4. Enable the plugin in Igne settings
5. Reload the plugin to see changes

---

## Your First Plugin

### Hello World Plugin

Create a file `main.ts`:

```typescript
import { Plugin, Notice } from 'igne';

export default class HelloWorldPlugin extends Plugin {
  async onload() {
    console.log('Loading Hello World plugin');

    // Add a command
    this.addCommand({
      id: 'say-hello',
      name: 'Say Hello',
      callback: () => {
        new Notice('Hello from Igne!');
      }
    });

    // Add a ribbon icon
    this.addRibbonIcon('heart', 'Say Hello', () => {
      new Notice('Hello from the ribbon!');
    });
  }

  onunload() {
    console.log('Unloading Hello World plugin');
  }
}
```

### Plugin Manifest

Create `manifest.json`:

```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "A simple hello world plugin",
  "author": "Your Name",
  "authorUrl": "https://github.com/yourname",
  "isDesktopOnly": false
}
```

---

## Plugin Structure

### Main Plugin Class

Every plugin must export a default class that extends `Plugin`:

```typescript
import { Plugin } from 'igne';

export default class MyPlugin extends Plugin {
  async onload() {
    // Called when plugin is loaded
  }

  onunload() {
    // Called when plugin is unloaded
  }
}
```

### Lifecycle Methods

#### `onload()`

Called when the plugin is loaded. Use this to:
- Register commands
- Add UI elements
- Set up event listeners
- Load settings

#### `onunload()`

Called when the plugin is unloaded. Use this to:
- Clean up event listeners
- Save settings
- Remove UI elements

#### `loadSettings()`

Load plugin settings from storage.

#### `saveSettings()`

Save plugin settings to storage.

---

## API Reference

### Plugin Class Methods

#### Adding Commands

```typescript
this.addCommand({
  id: 'my-command',
  name: 'My Command',
  callback: () => {
    // Command logic
  },
  checkCallback: (checking: boolean) => {
    // Return true if command should be available
    // If checking is true, don't execute, just check
    return true;
  },
  hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'd' }]
});
```

#### Adding Ribbons

```typescript
this.addRibbonIcon(
  'star', // Icon ID (lucide-react)
  'My Ribbon',
  (event: MouseEvent) => {
    // Click handler
  }
);
```

#### Adding Status Bar Items

```typescript
const statusItem = this.addStatusBarItem();
statusItem.setText('My Plugin');
statusItem.onClick(() => {
  // Click handler
});
```

#### Registering Events

```typescript
this.registerEvent(
  this.app.vault.on('modify', (file) => {
    console.log('File modified:', file.path);
  })
);

this.registerEvent(
  this.app.workspace.on('active-leaf-change', (leaf) => {
    console.log('Active leaf changed');
  })
);
```

#### Registering DOM Events

```typescript
this.registerDomEvent(
  document,
  'keydown',
  (event: KeyboardEvent) => {
    console.log('Key pressed:', event.key);
  }
);
```

#### Adding Settings

```typescript
this.addSettingTab(new MySettingTab(this.app, this));
```

### App API

#### Vault

```typescript
// Read file
const content = await this.app.vault.read(file);

// Write file
await this.app.vault.write(file, 'content');

// Create file
const newFile = await this.app.vault.create('path.md', 'content');

// Delete file
await this.app.vault.delete(file);

// Get file by path
const file = this.app.vault.getAbstractFileByPath('path.md');

// Get all markdown files
const files = this.app.vault.getMarkdownFiles();
```

#### Workspace

```typescript
// Get active file
const activeFile = this.app.workspace.getActiveFile();

// Open file
await this.app.workspace.openLinkText('filename', '', true);

// Get active view
const view = this.app.workspace.getActiveViewOfType(MarkdownView);

// Split window
await this.app.workspace.splitActiveLeaf('split');
```

#### Metadata Cache

```typescript
// Get cached metadata
const cache = this.app.metadataCache.getCache(file.path);

// Get links
const links = this.app.metadataCache.getCache(file.path)?.links;

// Get tags
const tags = this.app.metadataCache.getCache(file.path)?.tags;

// Get frontmatter
const frontmatter = this.app.metadataCache.getCache(file.path)?.frontmatter;

// Listen for metadata changes
this.registerEvent(
  this.app.metadataCache.on('changed', (file) => {
    console.log('Metadata changed:', file.path);
  })
);
```

---

## Examples

### Simple Command Plugin

```typescript
import { Plugin, Notice } from 'igne';

export default class CommandPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'insert-date',
      name: 'Insert Date',
      callback: () => {
        const date = new Date().toLocaleDateString();
        this.app.workspace.activeEditor?.replaceSelection(date);
      }
    });
  }
}
```

### Editor Extension Plugin

```typescript
import { Plugin, Editor } from 'igne';

export default class EditorPlugin extends Plugin {
  async onload() {
    this.registerEvent(
      this.app.workspace.on('editor-change', (editor: Editor) => {
        const content = editor.getValue();
        // Process content
      })
    );
  }
}
```

### Custom View Plugin

```typescript
import { Plugin, ItemView, WorkspaceLeaf } from 'igne';

export const VIEW_TYPE = 'my-custom-view';

class MyCustomView extends ItemView {
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'My View'; }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.innerHTML = '<h1>My Custom View</h1>';
  }

  async onClose() {
    // Cleanup
  }
}

export default class ViewPlugin extends Plugin {
  async onload() {
    this.registerView(
      VIEW_TYPE,
      (leaf) => new MyCustomView(leaf)
    );

    this.addCommand({
      id: 'show-my-view',
      name: 'Show My View',
      callback: () => {
        this.app.workspace.getLeaf('split').setView({
          type: VIEW_TYPE
        });
      }
    });
  }
}
```

### Settings Tab Plugin

```typescript
import { Plugin, App, PluginSettingTab, Setting } from 'igne';

interface MySettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MySettings = {
  mySetting: 'default'
};

export default class SettingsPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new MySettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class MySettingTab extends PluginSettingTab {
  plugin: SettingsPlugin;

  constructor(app: App, plugin: SettingsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('My Setting')
      .setDesc('Description of my setting')
      .addText(text => text
        .setPlaceholder('Enter value')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));
  }
}
```

---

## Best Practices

### Error Handling

```typescript
async onload() {
  try {
    await this.loadData();
  } catch (error) {
    console.error('Failed to load data:', error);
    new Notice('Failed to load plugin data');
  }
}
```

### Performance

```typescript
// Debounce expensive operations
import { debounce } from 'igne/utils';

const debouncedSearch = debounce((query: string) => {
  // Perform search
}, 300);

// Memoize expensive computations
import { memoize } from 'igne/utils';

const expensiveFn = memoize((data: any) => {
  // Expensive computation
  return result;
});
```

### Cleanup

```typescript
onunload() {
  // Always clean up
  this.app.workspace.off('editor-change', this.handler);
  this.domElements.forEach(el => el.remove());
}
```

### TypeScript

```typescript
// Use proper typing
import { Plugin, App, MarkdownView } from 'igne';

export default class TypedPlugin extends Plugin {
  async getActiveView(): MarkdownView | null {
    return this.app.workspace.getActiveViewOfType(MarkdownView);
  }
}
```

---

## Testing Plugins

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest';
import { App } from 'igne';

describe('My Plugin', () => {
  it('should register commands', () => {
    const app = new App();
    const plugin = new MyPlugin(app, {} as any);

    plugin.onload();

    expect(app.commands.commands['my-command']).toBeDefined();
  });
});
```

### Integration Testing

```typescript
import { test, expect } from '@playwright/test';

test('plugin command works', async ({ app }) => {
  await app.goto();
  await app.executeCommand('my-command');

  // Verify result
});
```

---

## Publishing Plugins

### Preparing for Release

1. Update `manifest.json` with correct version
2. Update `README.md` with documentation
3. Test thoroughly in different environments
4. Include a license file

### Distribution

Plugins can be distributed as:
- GitHub releases
- NPM packages
- Direct file downloads

### Versioning

Use semantic versioning:
- `1.0.0` - Initial release
- `1.1.0` - New features (backward compatible)
- `1.1.1` - Bug fixes
- `2.0.0` - Breaking changes

---

## Resources

- [Igne GitHub](https://github.com/zereraz/igne)
- [API Documentation](./api-reference.md)
- [Community Plugins](https://github.com/zereraz/igne-plugins)
- [Plugin Examples](../examples/)

---

## Need Help?

- Check the [API Documentation](./api-reference.md)
- Look at [example plugins](../examples/)
- Ask questions in [GitHub Discussions](https://github.com/zereraz/igne/discussions)

Happy plugin development! 🚀
