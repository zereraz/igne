import { test, expect } from '../fixtures';

test.describe('Plugin System', () => {
  test.describe('Plugin Loading', () => {
    test('initializes with baseline compatibility', async ({ app }) => {
      await app.goto();

      // Check that plugins are initialized
      const pluginStatus = await app.page.evaluate(() => {
        return (window as any).Plugins?.isInitialized();
      });

      expect(pluginStatus).toBe(true);
    });

    test('detects plugin compatibility tier', async ({ app }) => {
      await app.goto();

      // Create a simple plugin file
      await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');
        const testPluginDir = path.join(window.vaultPath, '.obsidian/plugins/test-plugin');

        if (!fs.existsSync(testPluginDir)) {
          fs.mkdirSync(testPluginDir, { recursive: true });
        }

        // Create a browser-only plugin (Tier 0)
        fs.writeFileSync(
          path.join(testPluginDir, 'main.js'),
          `
            module.exports = class Plugin {
              onload() { return true; }
              onunload() { return true; }
            }
          `
        );

        // Create manifest.json
        fs.writeFileSync(
          path.join(testPluginDir, 'manifest.json'),
          JSON.stringify({
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            minAppVersion: '0.15.0'
          })
        );
      });

      await app.page.reload();

      // Check plugin was loaded
      const pluginLoaded = await app.page.evaluate(() => {
        return (window as any).Plugins?.plugins?.testPlugin !== undefined;
      });

      expect(pluginLoaded).toBe(true);
    });

    test('shows plugin compatibility tier in settings', async ({ app }) => {
      await app.goto();

      // Open plugins settings
      await app.page.click('[data-testid="settings-button"]');
      await app.page.click('[data-testid="plugins-tab"]');

      // Check that plugin tier info is shown
      const tierInfo = await app.page.locator('[data-testid="plugin-tier-info"]').first();
      await expect(tierInfo).toBeVisible();
    });
  });

  test.describe('Daily Notes Plugin', () => {
    test('opens daily note for current day', async ({ app }) => {
      await app.goto();

      // Trigger daily note creation via keyboard shortcut
      await app.page.keyboard.press('Meta+D');

      // Wait for daily note to open
      await expect(app.page.locator('.cm-content')).toBeVisible();

      // Check filename contains today's date
      const today = new Date().toISOString().split('T')[0];
      const activeTab = await app.page.evaluate(() => {
        return (window as any).activeTabPath;
      });

      expect(activeTab).toContain(today);
    });

    test('creates daily note in configured folder', async ({ app }) => {
      await app.goto();

      // Configure daily notes to use a subfolder
      await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');
        const configDir = path.join(window.vaultPath, '.obsidian');

        const config = {
          template: 'Daily/{{date}}',
          folder: 'Daily Notes',
          format: 'YYYY-MM-DD'
        };

        fs.mkdirSync(path.join(window.vaultPath, 'Daily Notes'), { recursive: true });
        fs.writeFileSync(
          path.join(configDir, 'daily-notes.json'),
          JSON.stringify(config)
        );
      });

      await app.page.reload();
      await app.page.keyboard.press('Meta+D');

      // Check file was created in the configured folder
      const fileExists = await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');
        const dailyPath = path.join(window.vaultPath, 'Daily Notes', `${new Date().toISOString().split('T')[0]}.md`);
        return fs.existsSync(dailyPath);
      });

      expect(fileExists).toBe(true);
    });

    test('opens existing daily note instead of creating new one', async ({ app }) => {
      await app.goto();

      // Create an existing daily note
      await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');
        const today = new Date().toISOString().split('T')[0];
        const dailyPath = path.join(window.vaultPath, `${today}.md`);

        fs.writeFileSync(dailyPath, `# Daily Note for ${today}\n\nExisting content here.\n`);
      });

      await app.page.reload();
      await app.page.keyboard.press('Meta+D');

      // Check content is from existing file
      const content = await app.page.evaluate(() => {
        return (window as any).CodeMirror?.state?.doc?.toString() || '';
      });

      expect(content).toContain('Existing content here');
    });
  });

  test.describe('Plugin Commands', () => {
    test('registers plugin command', async ({ app }) => {
      await app.goto();

      // Register a test command
      await app.page.evaluate(() => {
        if ((window as any).app) {
          (window as any).app.registerCommand({
            id: 'test-command',
            name: 'Test Command',
            callback: () => console.log('Test command executed'),
            hotkeys: ['Meta+Shift+T']
          });
        }
      });

      // Trigger command via hotkey
      await app.page.keyboard.press('Meta+Shift+T');

      // Check command was executed (console log)
      const commandLogs = await app.page.evaluate(() => {
        return (window as any).commandLogs || [];
      });

      expect(commandLogs).toContain('Test command executed');
    });

    test('opens command palette with keyboard shortcut', async ({ app }) => {
      await app.goto();

      // Open command palette
      await app.page.keyboard.press('Meta+P');

      // Check command palette is visible
      const commandPalette = await app.page.locator('[data-testid="command-palette"]');
      await expect(commandPalette).toBeVisible();
    });
  });
});

test.describe('Plugin Settings', () => {
  test('persists plugin settings across sessions', async ({ app }) => {
    await app.goto();

    // Update plugin settings
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');

      const settings = {
        enabledPlugins: ['daily-notes', 'wikilinks'],
        pluginSettings: {
          'daily-notes': {
            template: 'Daily/{{date}}',
            format: 'YYYY-MM-DD'
          }
        }
      };

      fs.writeFileSync(
        path.join(window.vaultPath, '.obsidian', 'plugins.json'),
        JSON.stringify(settings, null, 2)
      );
    });

    await app.page.reload();

    // Verify settings were loaded
    const settingsLoaded = await app.page.evaluate(() => {
      return (window as any).globalSettings?.enabledPlugins?.includes('daily-notes');
    });

    expect(settingsLoaded).toBe(true);
  });

  test('handles missing plugin settings gracefully', async ({ app }) => {
    await app.goto();

    // Delete plugin settings file
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(window.vaultPath, '.obsidian', 'plugins.json');

      if (fs.existsSync(settingsPath)) {
        fs.unlinkSync(settingsPath);
      }
    });

    await app.page.reload();

    // App should still load with default settings
    const isLoaded = await app.page.evaluate(() => {
      return (window as any).app?.isInitialized();
    });

    expect(isLoaded).toBe(true);
  });
});
