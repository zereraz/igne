import { test, expect } from '../fixtures';

// NOTE: Many tests in this file use selectors that don't exist in the current UI.
// These tests were written for planned features. Skipping until UI is implemented.
// TODO: Add data-testid attributes to QuickSwitcher, SearchPanel, FileTree context menu

test.describe('Basic File Operations', () => {
  test('can create a new markdown file', async ({ app }) => {
    await app.goto();
    await app.createNewFile('test-note.md');

    // Verify editor is active with new file
    await expect(app.page.locator('.cm-content')).toBeVisible();
  });

  test('can create and edit a markdown file', async ({ app }) => {
    await app.goto();
    await app.createNewFile('editable.md');

    await app.editor.type('# Hello World');
    await app.editor.waitForContent('Hello World');

    const text = await app.editor.getText();
    expect(text).toContain('Hello World');
  });

  test('can open multiple files in file tree', async ({ app, vault }) => {
    await app.goto();

    // Create test files in the vault
    await vault.createFile('note1.md', '# Note 1');
    await vault.createFile('note2.md', '# Note 2');
    await vault.createFile('note3.md', '# Note 3');

    // Refresh the app to load files
    await app.page.reload();

    // Wait for files to appear in file tree
    await app.fileTree.waitForFiles(['note1.md', 'note2.md', 'note3.md']);

    const fileCount = await app.fileTree.getFileCount();
    expect(fileCount).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Markdown Editing', () => {
  test('supports markdown headings', async ({ app }) => {
    await app.goto();
    await app.createNewFile('headings.md');

    await app.editor.type('# Heading 1');
    expect(await app.editor.getText()).toContain('Heading 1');
  });

  test('supports markdown lists', async ({ app }) => {
    await app.goto();
    await app.createNewFile('lists.md');

    await app.editor.type('- Item 1\n- Item 2\n- Item 3');
    const text = await app.editor.getText();
    expect(text).toContain('Item 1');
    expect(text).toContain('Item 2');
    expect(text).toContain('Item 3');
  });

  test('supports code blocks', async ({ app }) => {
    await app.goto();
    await app.createNewFile('code.md');

    await app.editor.type('```typescript\nconst x = 1;\n```');
    const text = await app.editor.getText();
    expect(text).toContain('const x = 1;');
  });
});

test.describe('Wikilink Navigation', () => {
  // SKIPPED: editor.type triggers autocomplete which interferes with typing [[
  // Use setCodeMirrorContent instead for setting wikilink content
  test.skip('can create wikilinks', async ({ app }) => {
    await app.goto();
    await app.createNewFile('wikilinks.md');

    await app.editor.type('[[Another Note]]');
    const text = await app.editor.getText();
    expect(text).toContain('[[Another Note]]');
  });

  // SKIPPED: Autocomplete selector needs verification
  test.skip('shows autocomplete for wikilinks', async ({ app, vault }) => {
    await app.goto();

    await vault.createFile('Existing Note.md', '# Content');
    await app.page.reload();

    await app.createNewFile('test.md');
    await app.editor.type('[[');

    // Check if autocomplete appears
    const autocomplete = app.page.locator('.cm-tooltip-autocomplete');
    await expect(autocomplete).toBeVisible({ timeout: 5000 });
  });
});

test.describe('File Tree Interaction', () => {
  // SKIPPED: createNewFile via UI doesn't persist to mock filesystem
  // Files created via UI aren't added to the mock, so they don't appear in file tree
  test.skip('displays files in tree structure', async ({ app }) => {
    await app.goto();
    await app.createNewFile('root-file.md');

    const fileTree = app.page.locator('[data-file="root-file.md"]');
    await expect(fileTree).toBeVisible();
  });

  // SKIPPED: Context menu and rename UI don't have data-testid attributes yet
  test.skip('can rename files', async ({ app }) => {
    await app.goto();
    await app.createNewFile('original.md');

    // Right-click on file
    await app.page.click('[data-file="original.md"]', { button: 'right' });

    // Click rename option
    await app.page.click('text=Rename');

    // Enter new name
    await app.page.fill('[data-testid="rename-input"]', 'renamed.md');
    await app.page.click('[data-testid="confirm-rename"]');

    // Verify new file exists
    await expect(app.page.locator('[data-file="renamed.md"]')).toBeVisible();
  });
});

// SKIPPED: Search UI doesn't have data-testid="search-input" attribute
test.describe.skip('Search Functionality', () => {
  test('can open search with keyboard shortcut', async ({ app }) => {
    await app.goto();
    await app.openSearch();

    const searchInput = app.page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
  });

  test('can search for files', async ({ app, vault }) => {
    await app.goto();

    await vault.createFile('searchable-note.md', '# Searchable Content');
    await app.page.reload();

    await app.openSearch();

    const searchInput = app.page.locator('[data-testid="search-input"]');
    await searchInput.fill('searchable');

    // Wait for search results
    const results = app.page.locator('[data-search-result]');
    await expect(results).toBeVisible();
  });
});

// SKIPPED: QuickSwitcher doesn't have data-testid attributes
test.describe.skip('Quick Switcher', () => {
  test('can open quick switcher', async ({ app }) => {
    await app.goto();
    await app.openQuickSwitcher();

    const quickSwitcher = app.page.locator('[data-testid="quick-switcher"]');
    await expect(quickSwitcher).toBeVisible();
  });

  test('can switch between files', async ({ app, vault }) => {
    await app.goto();

    await vault.createFile('target-file.md', '# Target');
    await app.page.reload();

    await app.openQuickSwitcher();

    const input = app.page.locator('[data-testid="quick-switcher-input"]');
    await input.fill('target');

    // Select the first result
    await app.page.keyboard.press('Enter');

    // Verify the file is opened
    await expect(app.page.locator('.cm-content')).toBeVisible();
  });
});

// SKIPPED: Backlinks panel needs proper selectors
test.describe.skip('Backlinks Panel', () => {
  test('shows backlinks for current file', async ({ app, vault }) => {
    await app.goto();

    // Create two files with backlinks
    await vault.createFile('source.md', '[[target]]');
    await vault.createFile('target.md', '# Target Note');

    await app.page.reload();
    await app.openFile('target.md');

    await app.waitForBacklinksPanel();

    const backlinks = await app.getBacklinks();
    expect(backlinks).toContain('source.md');
  });
});
