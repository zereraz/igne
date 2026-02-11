import { test, expect } from '../fixtures';

test.describe('File Navigation via Wikilinks', () => {
  test.beforeEach(async ({ app, vault }) => {
    await app.goto();
    await vault.createFile('Source.md', '# Source\n[[Target Note]]');
    await vault.createFile('Target Note.md', '# Target\nContent here');
    await app.page.reload();
  });

  test('clicking wikilink opens target file', async ({ app }) => {
    await app.openFile('Source.md');
    await app.editor.moveCursorToEnd();
    await app.editor.waitForWikilinkWidget();

    // Click the wikilink
    await app.editor.clickWikilink('Target Note');

    // Verify target file opened - check content
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Content here');
  });

  test('cmd+click opens in new tab', async ({ app }) => {
    await app.openFile('Source.md');
    await app.editor.setCodeMirrorContent('[[Target Note]]');
    await app.editor.moveCursorToEnd();
    await app.editor.waitForWikilinkWidget();

    // Cmd+Click should open in new tab
    await app.page.keyboard.down('Meta');
    await app.editor.clickWikilink('Target Note');
    await app.page.keyboard.up('Meta');

    // Should have 2 tabs now
    await expect(app.page.locator('[data-testid="tab"]')).toHaveCount(2);
  });

  test('keyboard navigation with Enter key', async ({ app }) => {
    await app.openFile('Source.md');
    await app.editor.setCodeMirrorContent('[[Target Note]]');
    await app.editor.moveCursorToEnd();
    await app.editor.waitForWikilinkWidget();

    // Move cursor to wikilink and press Enter
    await app.page.keyboard.press('ArrowLeft');
    await app.page.keyboard.press('Enter');

    // Verify navigation occurred
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Target');
  });

  // SKIPPED: The mock filesystem doesn't properly support recursive directory reading.
  // Creating files in subfolders (e.g., folder/Note.md) works but the files aren't
  // indexed because read_directory doesn't return children of nested directories.
  // TODO: Enhance tauriMock.ts read_directory to recursively read subdirectories.
  test.skip('wikilink to file in subfolder (by name)', async ({ app, vault }) => {
    await vault.createFile('folder/Note.md', '# Nested Note');
    await app.page.reload();

    await app.openFile('Source.md');
    await app.editor.setCodeMirrorContent('[[Note]]');
    await app.editor.moveCursorToEnd();
    await app.editor.waitForWikilinkWidget();

    await app.editor.clickWikilink('Note');

    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Nested Note');
  });

  test('missing wikilink shows visual feedback', async ({ app }) => {
    await app.openFile('Source.md');
    await app.editor.setCodeMirrorContent('[[NonExistent File]]');
    await app.editor.moveCursorToEnd();
    await app.editor.waitForWikilinkWidget();

    // Verify missing wikilink styling
    const missingLink = app.page.locator('.cm-wikilink-missing');
    await expect(missingLink).toBeVisible();
  });

  test('tab switching preserves navigation history', async ({ app, vault }) => {
    await vault.createFile('File A.md', '# A');
    await vault.createFile('File B.md', '# B');
    await vault.createFile('File C.md', '# C');
    await app.page.reload();

    // Open files via wikilinks
    await app.openFile('File A.md');
    await app.editor.setCodeMirrorContent('[[File B]]');
    await app.editor.clickWikilink('File B');

    // Navigate to File C via wikilink
    await app.editor.setCodeMirrorContent('[[File C]]');
    await app.editor.clickWikilink('File C');

    // Should be able to switch back to File B
    await app.page.click('[data-file="File B.md"]');
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('B');
  });

  // Wikilink clicks navigate in the same tab (like Obsidian).
  // This test verifies that clicking a wikilink replaces the current content.
  test('wikilink click navigates in same tab', async ({ app, vault }) => {
    await vault.createFile('Target 1.md', '# Target 1\nFirst target content');
    await app.page.reload();

    await app.openFile('Source.md');
    await app.editor.setCodeMirrorContent('[[Target 1]]');
    await app.editor.moveCursorToEnd();
    await app.editor.waitForWikilinkWidget();

    // Click the wikilink - should navigate in same tab
    await app.editor.clickWikilink('Target 1');

    // Content should be replaced with target file
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('First target content');

    // Should still be 1 tab (same tab navigation)
    await expect(app.page.locator('[data-testid="tab"]')).toHaveCount(1);
  });
});

test.describe('File Tree Navigation', () => {
  test.beforeEach(async ({ app, vault }) => {
    await app.goto();
    await vault.createFile('Alpha.md', '# Alpha');
    await vault.createFile('Beta.md', '# Beta');
    await vault.createFile('Gamma.md', '# Gamma');
    await app.page.reload();
  });

  test('clicking file in tree opens it', async ({ app }) => {
    await app.page.click('[data-file="Alpha.md"]');
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Alpha');
  });

  test('switching between tabs updates content', async ({ app }) => {
    await app.openFile('Alpha.md');
    await app.openFileInNewTab('Beta.md');

    // Verify content updates by clicking tabs
    await app.switchToTab('Alpha.md');
    let content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Alpha');

    await app.switchToTab('Beta.md');
    content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Beta');
  });

  test('closing tabs updates state correctly', async ({ app }) => {
    await app.openFile('Alpha.md');
    await app.openFileInNewTab('Beta.md');

    // Close Beta tab
    await app.page.click('[data-testid="close-tab-Beta.md"]');

    // Should only have Alpha
    await expect(app.page.locator('[data-testid="tab"]')).toHaveCount(1);
  });
});

test.describe('Tab Management', () => {
  test.beforeEach(async ({ app, vault }) => {
    await app.goto();
    await vault.createFile('File 1.md', '# File 1');
    await vault.createFile('File 2.md', '# File 2');
    await vault.createFile('File 3.md', '# File 3');
    await app.page.reload();
  });

  // Cmd+click on wikilinks opens files in new tabs (like Obsidian)
  test('cmd+click wikilinks open multiple tabs', async ({ app }) => {
    await app.openFile('File 1.md');
    await app.editor.setCodeMirrorContent('[[File 2]]');
    await app.editor.moveCursorToEnd();
    await app.editor.waitForWikilinkWidget();

    // Cmd+click to open in new tab
    await app.page.keyboard.down('Meta');
    await app.editor.clickWikilink('File 2');
    await app.page.keyboard.up('Meta');
    await expect(app.page.locator('[data-testid="tab"]')).toHaveCount(2);

    // Navigate back to File 1 and add another wikilink
    await app.switchToTab('File 1.md');
    await app.editor.setCodeMirrorContent('[[File 3]]');
    await app.editor.moveCursorToEnd();
    await app.editor.waitForWikilinkWidget();

    // Cmd+click to open in new tab
    await app.page.keyboard.down('Meta');
    await app.editor.clickWikilink('File 3');
    await app.page.keyboard.up('Meta');
    await expect(app.page.locator('[data-testid="tab"]')).toHaveCount(3);
  });

  test('active tab updates when switching files', async ({ app }) => {
    await app.openFile('File 1.md');
    await app.openFileInNewTab('File 2.md');

    // Click back to File 1 tab
    await app.switchToTab('File 1.md');

    // Verify content switched
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('File 1');
  });

  test('closing all tabs clears editor', async ({ app }) => {
    await app.openFile('File 1.md');
    await app.openFileInNewTab('File 2.md');

    // Close both tabs
    await app.page.click('[data-testid="close-tab-File 2.md"]');
    await app.page.click('[data-testid="close-tab-File 1.md"]');

    // No tabs should remain
    await expect(app.page.locator('[data-testid="tab"]')).toHaveCount(0);
  });
});
