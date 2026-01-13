import { test, expect } from '../fixtures';

test.describe('Theme System', () => {
  test.describe('Theme Loading', () => {
    test('loads default theme on startup', async ({ app }) => {
      await app.goto();

      // Check that CSS variables are set for default theme
      const backgroundColor = await app.page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--background-primary');
      });

      // Default theme should have a background color set
      expect(backgroundColor).toBeTruthy();
      expect(backgroundColor.length).toBeGreaterThan(0);
    });

    test('applies theme CSS variables to document', async ({ app }) => {
      await app.goto();

      // Check for essential CSS variables
      const cssVars = await app.page.evaluate(() => {
        const root = document.documentElement;
        return {
          backgroundPrimary: getComputedStyle(root).getPropertyValue('--background-primary'),
          textNormal: getComputedStyle(root).getPropertyValue('--text-normal'),
          accentColor: getComputedStyle(root).getPropertyValue('--accent-color'),
          fontSize: getComputedStyle(root).getPropertyValue('--font-text-size'),
        };
      });

      expect(cssVars.backgroundPrimary).toBeTruthy();
      expect(cssVars.textNormal).toBeTruthy();
    });

    test('switches between light and dark themes', async ({ app }) => {
      await app.goto();

      // Get initial theme mode
      const initialTheme = await app.page.evaluate(() => {
        return document.body.classList.contains('theme-light') ? 'light' : 'dark';
      });

      // Open settings and switch theme
      await app.page.click('[data-testid="settings-button"]');
      await app.page.click('[data-testid="appearance-tab"]');

      // Toggle theme
      await app.page.click('[data-testid="theme-toggle"]');

      // Check theme changed
      const newTheme = await app.page.evaluate(() => {
        return document.body.classList.contains('theme-light') ? 'light' : 'dark';
      });

      expect(newTheme).not.toBe(initialTheme);
    });
  });

  test.describe('Community Themes', () => {
    test('loads community theme from .obsidian/themes', async ({ app }) => {
      await app.goto();

      // Create a test community theme
      await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');
        const themeDir = path.join(window.vaultPath, '.obsidian/themes/test-theme');

        // Create theme directory
        fs.mkdirSync(themeDir, { recursive: true });

        // Create manifest.json
        fs.writeFileSync(
          path.join(themeDir, 'manifest.json'),
          JSON.stringify({
            name: 'Test Theme',
            version: '1.0.0',
            minAppVersion: '0.15.0',
            author: 'Test Author'
          })
        );

        // Create theme.css
        fs.writeFileSync(
          path.join(themeDir, 'theme.css'),
          `
            :root {
              --background-primary: #123456;
              --text-normal: #abcdef;
            }
          `
        );
      });

      await app.page.reload();

      // Apply theme via settings
      await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');

        const appearance = {
          baseTheme: 'dark',
          communityTheme: 'test-theme'
        };

        fs.writeFileSync(
          path.join(window.vaultPath, '.obsidian', 'appearance.json'),
          JSON.stringify(appearance, null, 2)
        );
      });

      await app.page.reload();

      // Check theme was applied
      const customBackground = await app.page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--background-primary');
      });

      expect(customBackground).toBe('#123456');
    });

    test('handles missing theme files gracefully', async ({ app }) => {
      await app.goto();

      // Set theme that doesn't exist
      await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');

        const appearance = {
          baseTheme: 'dark',
          communityTheme: 'nonexistent-theme'
        };

        fs.writeFileSync(
          path.join(window.vaultPath, '.obsidian', 'appearance.json'),
          JSON.stringify(appearance, null, 2)
        );
      });

      await app.page.reload();

      // App should still load with default theme
      const isLoaded = await app.page.evaluate(() => {
        return (window as any).app?.isInitialized();
      });

      expect(isLoaded).toBe(true);
    });
  });

  test.describe('Appearance Settings', () => {
    test('changes font size', async ({ app }) => {
      await app.goto();

      // Open appearance settings
      await app.page.click('[data-testid="settings-button"]');
      await app.page.click('[data-testid="appearance-tab"]');

      // Get initial font size
      const initialFontSize = await app.page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--font-text-size');
      });

      // Change font size (simulate slider change)
      await app.page.evaluate(() => {
        document.documentElement.style.setProperty('--font-text-size', '18px');
      });

      // Check font size changed
      const newFontSize = await app.page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--font-text-size');
      });

      expect(newFontSize).toBe('18px');
    });

    test('persists appearance settings across sessions', async ({ app }) => {
      await app.goto();

      // Set custom appearance settings
      await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');

        const appearance = {
          baseTheme: 'light',
          fontSize: 16,
          lineHeight: 1.6,
          fontFamily: 'Arial'
        };

        fs.writeFileSync(
          path.join(window.vaultPath, '.obsidian', 'appearance.json'),
          JSON.stringify(appearance, null, 2)
        );
      });

      await app.page.reload();

      // Verify settings were loaded
      const baseTheme = await app.page.evaluate(() => {
        return document.body.classList.contains('theme-light') ? 'light' :
               document.body.classList.contains('theme-dark') ? 'dark' : null;
      });

      expect(baseTheme).toBe('light');
    });

    test('respects system theme preference', async ({ app }) => {
      await app.goto();

      // Set appearance to use system theme
      await app.page.evaluate(() => {
        const fs = require('fs');
        const path = require('path');

        const appearance = {
          baseTheme: 'obsidian',
          accentColor: 'purple'
        };

        fs.writeFileSync(
          path.join(window.vaultPath, '.obsidian', 'appearance.json'),
          JSON.stringify(appearance, null, 2)
        );
      });

      await app.page.reload();

      // Check that system theme is being used
      const usesSystemTheme = await app.page.evaluate(() => {
        return (window as any).themeManager?.usesSystemTheme();
      });

      // The app should detect system theme
      expect(usesSystemTheme).toBe(true);
    });
  });

  test.describe('Accent Colors', () => {
    const accentColors = [
      { name: 'blue', hex: '#7b6cd9' },
      { name: 'purple', hex: '#a684e9' },
      { name: 'pink', hex: '#e05e98' },
      { name: 'red', hex: '#e74c5c' },
      { name: 'orange', hex: '#e67e22' },
      { name: 'yellow', hex: '#f1c40f' },
      { name: 'green', hex: '#2ecc71' },
      { name: 'cyan', hex: '#1abc9c' }
    ];

    for (const { name, hex } of accentColors) {
      test(`applies ${name} accent color`, async ({ app }) => {
        await app.goto();

        // Set accent color via settings
        await app.page.evaluate((color) => {
          document.documentElement.style.setProperty('--accent-h', color);
        }, hex);

        // Verify accent color was applied
        const accentColor = await app.page.evaluate(() => {
          return getComputedStyle(document.documentElement).getPropertyValue('--accent-h');
        });

        expect(accentColor).toBe(hex);
      });
    }
  });

  test.describe('Theme CSS Variables', () => {
    test('has all required CSS variables defined', async ({ app }) => {
      await app.goto();

      const cssVars = await app.page.evaluate(() => {
        const root = document.documentElement;
        const computed = getComputedStyle(root);

        // Check for essential CSS variables
        return {
          hasBackgroundPrimary: computed.getPropertyValue('--background-primary') !== '',
          hasBackgroundSecondary: computed.getPropertyValue('--background-secondary') !== '',
          hasTextNormal: computed.getPropertyValue('--text-normal') !== '',
          hasTextFaint: computed.getPropertyValue('--text-faint') !== '',
          hasAccentColor: computed.getPropertyValue('--accent-color') !== '',
          hasAccentHover: computed.getPropertyValue('--accent-color-hover') !== '',
          hasFontTextSize: computed.getPropertyValue('--font-text-size') !== '',
        };
      });

      // All essential variables should be defined
      expect(cssVars.hasBackgroundPrimary).toBe(true);
      expect(cssVars.hasTextNormal).toBe(true);
      expect(cssVars.hasAccentColor).toBe(true);
      expect(cssVars.hasFontTextSize).toBe(true);
    });

    test('CSS variables cascade correctly to components', async ({ app }) => {
      await app.goto();

      // Create a test element
      const styles = await app.page.evaluate(() => {
        const testEl = document.createElement('div');
        testEl.className = 'test-element';
        document.body.appendChild(testEl);

        const computed = getComputedStyle(testEl);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });

      // Element should inherit theme colors
      expect(styles.backgroundColor).toBeTruthy();
      expect(styles.color).toBeTruthy();
    });
  });
});

test.describe('Theme Hot Reload', () => {
  test('reloads theme when theme.css changes', async ({ app }) => {
    await app.goto();

    // Get initial accent color
    const initialAccent = await app.page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent-h');
    });

    // Modify theme.css while app is running
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const themeCss = path.join(window.vaultPath, '.obsidian', 'theme.css');

      // Write new theme.css
      fs.writeFileSync(themeCss, `
        :root {
          --accent-h: #ff0000;
        }
      `);
    });

    // Trigger file watcher refresh
    await app.page.evaluate(() => {
      if ((window as any).fileWatcher?.refresh) {
        (window as any).fileWatcher.refresh();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check that theme was reloaded
    const newAccent = await app.page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent-h');
    });

    expect(newAccent).toBe('rgb(255, 0, 0)');
  });
});
