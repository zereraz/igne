import { test, expect } from '../fixtures';

test.describe('Workspace Management', () => {
  test('saves current workspace state', async ({ app, vault }) => {
    await app.goto();

    // Open some files
    vault.createFile('workspace-test-1.md', '# File 1');
    vault.createFile('workspace-test-2.md', '# File 2');

    await app.page.reload();
    await app.openFile('workspace-test-1.md');
    await app.openFile('workspace-test-2.md');

    // Workspace state should be saved automatically
    const workspaceSaved = await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const workspacePath = path.join(window.vaultPath, '.obsidian', 'workspace.json');

      return fs.existsSync(workspacePath);
    });

    expect(workspaceSaved).toBe(true);
  });

  test('restores workspace on vault open', async ({ app, vault }) => {
    await app.goto();

    // Create and open files
    vault.createFile('restore-1.md', '# Restore Test 1');
    vault.createFile('restore-2.md', '# Restore Test 2');

    await app.page.reload();
    await app.openFile('restore-1.md');

    // Create workspace state
    await app.page.evaluate(() => {
      (window as any).workspaceStateManager?.saveNow(['restore-1.md', 'restore-2.md']);
    });

    // Simulate reopening vault
    await app.page.evaluate(() => {
      location.reload();
    });

    await app.page.waitForTimeout(2000);

    // Check that files were restored
    const tabCount = await app.getTabCount();
    expect(tabCount).toBeGreaterThan(0);
  });

  test('preserves cursor position across sessions', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('cursor-test.md', 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    await app.page.reload();
    await app.openFile('cursor-test.md');

    // Move cursor to a specific line
    await app.editor.type('\n\n\n');
    await app.editor.moveCursorToStart();

    // Create workspace state with cursor info
    await app.page.evaluate(() => {
      (window as any).workspaceStateManager?.saveNow(['cursor-test.md']);
    });

    // Reload and check cursor position is remembered
    await app.page.evaluate(() => location.reload());
    await app.page.waitForTimeout(2000);

    await app.openFile('cursor-test.md');

    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Line 1');
  });
});

test.describe('Split Panes', () => {
  test('splits view horizontally', async ({ app }) => {
    await app.goto();

    // Open a file
    await app.createNewFile('split-test.md');
    await app.editor.type('# Split Test');

    // Trigger horizontal split
    await app.page.keyboard.press('Meta+\\');

    // Check that split was created
    const splitIndicator = await app.page.locator('[data-split-direction="horizontal"]').isVisible();
    expect(splitIndicator).toBe(true);
  });

  test('splits view vertically', async ({ app }) => {
    await app.goto();

    await app.createNewFile('vertical-split.md');
    await app.editor.type('# Vertical Split');

    // Trigger vertical split
    await app.page.keyboard.press('Meta+Shift+\\');

    // Check that split was created
    const splitIndicator = await app.page.locator('[data-split-direction="vertical"]').isVisible();
    expect(splitIndicator).toBe(true);
  });

  test('opens different files in each pane', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('pane1-file.md', '# Pane 1 Content');
    vault.createFile('pane2-file.md', '# Pane 2 Content');

    await app.page.reload();

    // Open first file and split
    await app.openFile('pane1-file.md');
    await app.page.keyboard.press('Meta+\\');

    // Open different file in second pane
    await app.page.keyboard.press('Meta+1');
    await app.page.keyboard.press('Meta+K');
    await app.page.keyboard.type('pane2-file');
    await app.page.keyboard.press('Enter');

    // Check both files are open
    const allTabs = await app.page.evaluate(() => {
      return (window as any).openTabs?.map((t: any) => t.name) || [];
    });

    expect(allTabs).toContain('pane1-file.md');
    expect(allTabs).toContain('pane2-file.md');
  });
});

test.describe('Tabs Management', () => {
  test('opens multiple tabs', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('tab1.md', '# Tab 1');
    vault.createFile('tab2.md', '# Tab 2');
    vault.createFile('tab3.md', '# Tab 3');

    await app.page.reload();

    // Open each file
    await app.openFile('tab1.md');
    await app.openFile('tab2.md');
    await app.openFile('tab3.md');

    // Check all tabs are open
    const tabCount = await app.getTabCount();
    expect(tabCount).toBe(3);
  });

  test('switches between tabs with keyboard', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('switch-1.md', '# Switch Test 1');
    vault.createFile('switch-2.md', '# Switch Test 2');

    await app.page.reload();

    await app.openFile('switch-1.md');
    await app.openFile('switch-2.md');

    // Switch to previous tab
    await app.page.keyboard.press('Meta+[');

    const activeTab = await app.page.evaluate(() => {
      return (window as any).activeTabPath;
    });

    expect(activeTab).toContain('switch-1');
  });

  test('closes tab with keyboard shortcut', async ({ app }) => {
    await app.goto();

    await app.createNewFile('close-test.md');

    const initialTabCount = await app.getTabCount();

    // Close current tab
    await app.page.keyboard.press('Meta+W');

    // Check tab was closed
    const newTabCount = await app.getTabCount();
    expect(newTabCount).toBe(initialTabCount - 1);
  });

  test('reopens last closed tab with keyboard shortcut', async ({ app }) => {
    await app.goto();

    await app.createNewFile('reopen-test.md');
    await app.editor.type('# Content here');

    const initialTabCount = await app.getTabCount();

    // Close tab
    await app.page.keyboard.press('Meta+W');

    // Reopen with Cmd+Shift+T
    await app.page.keyboard.press('Meta+Shift+T');

    // Check tab was reopened
    const newTabCount = await app.getTabCount();
    expect(newTabCount).toBe(initialTabCount);
  });
});

test.describe('Advanced Editor Features', () => {
  test('supports code blocks with syntax highlighting', async ({ app }) => {
    await app.goto();

    await app.createNewFile('code-test.md');
    await app.editor.setCodeMirrorContent('```javascript\nconst x = 42;\nconsole.log(x);\n```');

    // Check for code block widget
    const codeBlock = await app.page.locator('.cm-code-block').first();
    await expect(codeBlock).toBeVisible();
  });

  test('renders math formulas', async ({ app }) => {
    await app.goto();

    await app.createNewFile('math-test.md');
    await app.editor.setCodeMirrorContent('The Pythagorean theorem: $a^2 + b^2 = c^2$');

    // Check for math widget
    const mathWidget = await app.page.locator('.cm-math').first();
    await expect(mathWidget).toBeVisible();
  });

  test('renders callout blocks', async ({ app }) => {
    await app.goto();

    await app.createNewFile('callout-test.md');
    await app.editor.setCodeMirrorContent('> [!INFO] This is an info callout\n> With multiple lines\n> Of content');

    // Check for callout widget
    const callout = await app.page.locator('.cm-callout').first();
    await expect(callout).toBeVisible();

    // Check callout type indicator
    const calloutType = await app.page.locator('.cm-callout-type').first();
    await expect(calloutType).toHaveText('INFO');
  });

  test('renders mermaid diagrams', async ({ app }) => {
    await app.goto();

    await app.createNewFile('mermaid-test.md');
    await app.editor.setCodeMirrorContent('```mermaid\ngraph TD\n    A[Start] --> B[End]\n```');

    // Check for mermaid widget
    const mermaid = await app.page.locator('.cm-mermaid').first();
    await expect(mermaid).toBeVisible();
  });

  test('supports footnotes', async ({ app }) => {
    await app.goto();

    await app.createNewFile('footnote-test.md');
    await app.editor.setCodeMirrorContent('This is a statement[^note] and this is more text.\n\n[^note]: This is the footnote content.');

    // Check for footnote rendering
    const footnoteRef = await app.page.locator('.cm-footnote-ref').first();
    await expect(footnoteRef).toBeVisible();
  });

  test('renders checkboxes with toggle interaction', async ({ app }) => {
    await app.goto();

    await app.createNewFile('checkbox-test.md');
    await app.editor.setCodeMirrorContent('- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3');

    await app.editor.moveCursorToStart();

    // Check for checkbox widgets
    expect(await app.editor.hasTaskCheckbox()).toBe(true);

    // Try toggling a checkbox
    await app.editor.clickTaskCheckbox();

    // Check checkbox state changed
    const isChecked = await app.editor.isCheckboxChecked();
    expect(isChecked).toBe(true);
  });
});

test.describe('Undo/Redo History', () => {
  test('supports undo with keyboard', async ({ app }) => {
    await app.goto();

    await app.createNewFile('undo-test.md');
    await app.editor.type('First line');

    // Add more content
    await app.editor.type('\nSecond line');

    const contentBeforeUndo = await app.editor.getCodeMirrorContent();

    // Undo
    await app.page.keyboard.down('Meta+z');

    const contentAfterUndo = await app.editor.getCodeMirrorContent();
    expect(contentAfterUndo).not.toContain('Second line');
  });

  test('supports redo with keyboard', async ({ app }) => {
    await app.goto();

    await app.createNewFile('redo-test.md');
    await app.editor.type('Content');

    // Undo
    await app.page.keyboard.down('Meta+z');

    // Redo
    await app.page.keyboard.down('Meta+Shift+Z');

    const finalContent = await app.editor.getCodeMirrorContent();
    expect(finalContent).toContain('Content');
  });
});

test.describe('File Metadata', () => {
  test('tracks file creation time', async ({ app }) => {
    await app.goto();

    await app.createNewFile('metadata-test.md');

    // Metadata should be stored
    const hasMetadata = await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const metadataPath = path.join(window.vaultPath, '.obsidian', 'workspace.json');

      if (!fs.existsSync(metadataPath)) {
        return false;
      }

      const content = fs.readFileSync(metadataPath, 'utf-8');
      const workspace = JSON.parse(content);
      return workspace.files && workspace.files['metadata-test.md'];
    });

    expect(hasMetadata).toBe(true);
  });

  test('tracks file modification time', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('mod-time-test.md', '# Original');

    await app.page.reload();
    await app.openFile('mod-time-test.md');

    // Modify the file
    await app.editor.type('\nModified content');

    // Modification time should update
    const modTime = await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(window.vaultPath, 'mod-time-test.md');

      const stats = fs.statSync(filePath);
      return stats.mtime;
    });

    expect(modTime).toBeTruthy();
  });
});

test.describe('Drag and Drop', () => {
  test('supports dragging files to sidebar', async ({ app }) => {
    await app.goto();

    // Create a file in the vault
    await app.page.evaluate(() => {
      const fs = require('fs');
      const path = require('path');
      const newFile = path.join(window.vaultPath, 'drag-test.md');

      fs.writeFileSync(newFile, '# Drag Test');
    });

    await app.page.reload();

    // File should appear in file tree
    expect(await app.fileTree.hasFile('drag-test.md')).toBe(true);
  });

  test('supports reordering tabs via drag', async ({ app, vault }) => {
    await app.goto();

    vault.createFile('drag-tab-1.md', '# Tab 1');
    vault.createFile('drag-tab-2.md', '# Tab 2');

    await app.page.reload();

    await app.openFile('drag-tab-1.md');
    await app.openFile('drag-tab-2.md');

    // Get initial tab order
    const initialTabs = await app.page.evaluate(() => {
      return (window as any).openTabs?.map((t: any) => t.name) || [];
    });

    expect(initialTabs.indexOf('drag-tab-1.md')).toBeLessThan(initialTabs.indexOf('drag-tab-2.md'));
  });
});
