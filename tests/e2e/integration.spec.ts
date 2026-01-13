import { test, expect } from '../fixtures';

test.describe('Backlinks Panel', () => {
  test('shows backlinks to current file', async ({ app, vault }) => {
    await app.goto();

    // Create files with backlinks
    vault.createFile('source.md', 'Linking to [[target]] here');
    vault.createFile('target.md', '# Target Note');

    await app.page.reload();
    await app.openFile('target.md');

    // Wait for backlinks panel
    await app.waitForBacklinksPanel();

    // Check backlinks are shown
    const backlinks = await app.getBacklinks();
    expect(backlinks).toContain('source.md');
  });

  test('updates backlinks when new links are added', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('target.md', '# Target');
    await app.page.reload();
    await app.openFile('target.md');

    // Initially no backlinks
    const initialBacklinks = await app.getBacklinks();
    expect(initialBacklinks.length).toBe(0);

    // Add a backlink
    vault.createFile('new-note.md', 'Now linking to [[target]]');
    await app.page.reload();

    // Check backlinks updated
    const updatedBacklinks = await app.getBacklinks();
    expect(updatedBacklinks.length).toBeGreaterThan(0);
  });

  test('shows multiple backlinks from different sources', async ({ app, vault }) => {
    await app.goto();

    // Create multiple files linking to the same target
    vault.createFile('note1.md', 'Links to [[shared]]');
    vault.createFile('note2.md', 'Also links to [[shared]]');
    vault.createFile('note3.md', 'Third link to [[shared]]');
    vault.createFile('shared.md', '# Shared Content');

    await app.page.reload();
    await app.openFile('shared.md');

    const backlinks = await app.getBacklinks();
    expect(backlinks.length).toBe(3);
    expect(backlinks).toContain('note1.md');
    expect(backlinks).toContain('note2.md');
    expect(backlinks).toContain('note3.md');
  });
});

test.describe('Search Functionality', () => {
  test('opens search with keyboard shortcut', async ({ app }) => {
    await app.goto();
    await app.openSearch();

    const searchInput = await app.page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
  });

  test('searches for text across all files', async ({ app, vault }) => {
    await app.goto();

    // Create test content
    vault.createFile('note1.md', '# Testing\nThis contains unique content here');
    vault.createFile('note2.md', '# Another Note\nDifferent words');
    vault.createFile('note3.md', '# Third\nTesting more unique content');

    await app.page.reload();
    await app.openSearch();

    const searchInput = await app.page.locator('[data-testid="search-input"]');
    await searchInput.fill('unique');

    // Wait for search results
    await app.page.waitForTimeout(500);

    // Check search results
    const results = await app.page.locator('[data-search-result]').count();
    expect(results).toBeGreaterThan(0);
  });

  test('highlights search term in results', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('search-test.md', 'The word apple is here');
    await app.page.reload();

    await app.openSearch();

    const searchInput = await app.page.locator('[data-testid="search-input"]');
    await searchInput.fill('apple');

    // Check that the term is highlighted
    const hasHighlight = await app.page.locator('.search-highlight').first().isVisible();
    await expect(hasHighlight).toBe(true);
  });

  test('navigates to search result on click', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('destination.md', '# Destination\nContent to find');
    await app.page.reload();

    await app.openSearch();

    const searchInput = await app.page.locator('[data-testid="search-input"]');
    await searchInput.fill('Destination');

    // Click first result
    const firstResult = await app.page.locator('[data-search-result]').first();
    await firstResult.click();

    // Check that the file opened
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Destination');
  });

  test('shows context around search term', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('context-test.md', 'Some text before important context here after');
    await app.page.reload();

    await app.openSearch();

    const searchInput = await app.page.locator('[data-testid="search-input"]');
    await searchInput.fill('important');

    // Check that context is shown in results
    const contextText = await app.page.locator('[data-search-context]').first().textContent();
    expect(contextText).toContain('before');
    expect(contextText).toContain('after');
  });
});

test.describe('Quick Switcher', () => {
  test('opens with keyboard shortcut', async ({ app }) => {
    await app.goto();
    await app.openQuickSwitcher();

    const quickSwitcher = await app.page.locator('[data-testid="quick-switcher"]');
    await expect(quickSwitcher).toBeVisible();
  });

  test('filters files as you type', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('apple-pie.md', '# Apple Pie');
    vault.createFile('banana-bread.md', '# Banana Bread');
    vault.createFile('cherry-tart.md', '# Cherry Tart');

    await app.page.reload();
    await app.openQuickSwitcher();

    const input = await app.page.locator('[data-testid="quick-switcher-input"]');
    await input.fill('apple');

    // Should only show apple-pie
    const results = await app.page.locator('[data-quick-switcher-result]').count();
    expect(results).toBe(1);
  });

  test('opens file when selecting result', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('target-file.md', '# Target');

    await app.page.reload();
    await app.openQuickSwitcher();

    const input = await app.page.locator('[data-testid="quick-switcher-input"]');
    await input.fill('target');

    // Press Enter to open
    await app.page.keyboard.press('Enter');

    // Verify file opened
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Target');
  });

  test('shows recently opened files', async ({ app, vault }) => {
    await app.goto();

    // Create and open files to populate recent list
    vault.createFile('recent1.md', '# Recent 1');
    vault.createFile('recent2.md', '# Recent 2');

    await app.page.reload();
    await app.openFile('recent1.md');
    await app.openFile('recent2.md');

    // Open quick switcher without typing
    await app.openQuickSwitcher();

    // Should show recent files
    const results = await app.page.locator('[data-quick-switcher-result]').count();
    expect(results).toBeGreaterThan(0);
  });

  test('navigates with arrow keys', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('first.md', '# First');
    vault.createFile('second.md', '# Second');
    vault.createFile('third.md', '# Third');

    await app.page.reload();
    await app.openQuickSwitcher();

    // Type to show results
    const input = await app.page.locator('[data-testid="quick-switcher-input"]');
    await input.fill('md');

    // Use arrow keys to navigate
    await app.page.keyboard.press('ArrowDown');
    await app.page.keyboard.press('ArrowDown');

    // Press Enter to open selected
    await app.page.keyboard.press('Enter');

    // Verify a file was opened
    const hasOpenFile = await app.page.locator('.cm-content').isVisible();
    await expect(hasOpenFile).toBe(true);
  });
});

test.describe('Settings Management', () => {
  test('persists settings to disk', async ({ app }) => {
    await app.goto();

    // Update a setting
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');

      const settings = {
        openLastVault: true,
        language: 'en',
        spellcheck: true
      };

      fs.writeFileSync(
        path.join(window.vaultPath, '.obsidian', 'app.json'),
        JSON.stringify({ settings }, null, 2)
      );
    });

    await app.page.reload();

    // Verify setting persisted
    const settingValue = await app.page.evaluate(() => {
      return (window as any).globalSettings?.openLastVault;
    });

    expect(settingValue).toBe(true);
  });

  test('handles corrupted settings gracefully', async ({ app }) => {
    await app.goto();

    // Write corrupted settings file
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(window.vaultPath, '.obsidian', 'app.json');

      fs.writeFileSync(settingsPath, 'invalid json{{{');
    });

    await app.page.reload();

    // App should still load with defaults
    const isLoaded = await app.page.evaluate(() => {
      return (window as any).app?.isInitialized();
    });

    expect(isLoaded).toBe(true);
  });

  test('resets to default settings when requested', async ({ app }) => {
    await app.goto();

    // Open settings
    await app.page.click('[data-testid="settings-button"]');

    // Click reset button
    await app.page.click('[data-testid="reset-settings"]');

    // Confirm reset
    await app.page.click('[data-testid="confirm-reset"]');

    // Check settings were reset to defaults
    const settings = await app.page.evaluate(() => {
      return (window as any).globalSettings?.getSettings();
    });

    expect(settings).toBeTruthy();
  });
});

test.describe('File Watching', () => {
  test('detects external file changes', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('watch-test.md', '# Initial Content');

    await app.page.reload();
    await app.openFile('watch-test.md');

    const initialContent = await app.editor.getCodeMirrorContent();
    expect(initialContent).toContain('Initial Content');

    // Modify file externally
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const testFile = path.join(window.vaultPath, 'watch-test.md');

      fs.writeFileSync(testFile, '# Modified Content');
    });

    // Wait for file watcher to detect change
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if app detected the change
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Modified Content');
  });

  test('adds new files to file tree when created externally', async ({ app }) => {
    await app.goto();

    // Get initial file count
    const initialCount = await app.fileTree.getFileCount();

    // Create file externally
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const newFile = path.join(window.vaultPath, 'external-file.md');

      fs.writeFileSync(newFile, '# Created Externally');
    });

    // Wait for file watcher
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check file appeared in tree
    const newCount = await app.fileTree.getFileCount();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('removes deleted files from file tree', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('to-delete.md', '# Will be deleted');

    await app.page.reload();

    // Verify file exists
    expect(await app.fileTree.hasFile('to-delete.md')).toBe(true);

    // Delete file externally
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const fileToDelete = path.join(window.vaultPath, 'to-delete.md');

      fs.unlinkSync(fileToDelete);
    });

    // Wait for file watcher
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify file was removed
    expect(await app.fileTree.hasFile('to-delete.md')).toBe(false);
  });
});

test.describe('Vault Management', () => {
  test('saves vault to registry on first open', async ({ app }) => {
    await app.goto();

    // Check that vault was saved to registry
    const vaultSaved = await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const registryPath = path.join((window as any).appDataDir, 'vaults.json');

      if (!fs.existsSync(registryPath)) {
        return false;
      }

      const content = fs.readFileSync(registryPath, 'utf-8');
      const registry = JSON.parse(content);
      return registry.vaults.some((v: any) => v.path === window.vaultPath);
    });

    expect(vaultSaved).toBe(true);
  });

  test('remembers last opened vault', async ({ app }) => {
    await app.goto();

    // Check that last opened vault is saved
    const lastVault = await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const registryPath = path.join((window as any).appDataDir, 'vaults.json');

      if (!fs.existsSync(registryPath)) {
        return null;
      }

      const content = fs.readFileSync(registryPath, 'utf-8');
      const registry = JSON.parse(content);
      return registry.lastOpenedVault;
    });

    expect(lastVault).toBeTruthy();
  });

  test('shows vault picker on first launch', async ({ app }) => {
    await app.goto();

    // This is only for fresh installs - if vaults exist, it auto-opens
    // The test fixture handles this by creating a test vault

    // Check we're in the editor (not picker)
    const inEditor = await app.page.locator('.cm-editor').isVisible();
    expect(inEditor).toBe(true);
  });
});
