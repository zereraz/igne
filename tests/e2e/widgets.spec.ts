import { test, expect } from '../fixtures';

test.describe('Tag Widgets', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('tags-test.md');
  });

  test('renders tag as pill when cursor is away', async ({ app }) => {
    await app.editor.setCodeMirrorContent('Some text #tag1 more text');

    // Move cursor to end of content (away from tag)
    await app.page.keyboard.press('End');

    await app.editor.waitForTagWidget();
    expect(await app.editor.hasTag('tag1')).toBe(true);
  });

  test('shows raw #tag when cursor touches tag', async ({ app }) => {
    await app.editor.setCodeMirrorContent('#tag1 content');

    // Click on the tag area
    const tag = app.page.locator('.cm-tag-pill');
    if (await tag.count() > 0) {
      await tag.click({ position: { x: 0, y: 0 } });
    }

    // The tag should no longer be visible as a pill
    const tagPill = app.page.locator('.cm-tag-pill');
    await expect(tagPill).not.toBeVisible();
  });

  test('handles multiple tags on same line', async ({ app }) => {
    await app.editor.setCodeMirrorContent('#tag1 #tag2 #tag3');

    // Move cursor away from all tags
    await app.page.keyboard.press('End');

    await app.editor.waitForTagWidget();
    expect(await app.editor.hasTag('tag1')).toBe(true);
    expect(await app.editor.hasTag('tag2')).toBe(true);
    expect(await app.editor.hasTag('tag3')).toBe(true);
  });

  test('handles tags at start of document', async ({ app }) => {
    await app.editor.setCodeMirrorContent('#first-tag is here');

    await app.page.keyboard.press('End');

    await app.editor.waitForTagWidget();
    expect(await app.editor.hasTag('first-tag')).toBe(true);
  });

  test('handles tags with underscores and numbers', async ({ app }) => {
    await app.editor.setCodeMirrorContent('#tag_123 #my_tag_2');

    await app.page.keyboard.press('End');

    await app.editor.waitForTagWidget();
    expect(await app.editor.hasTag('tag_123')).toBe(true);
    expect(await app.editor.hasTag('my_tag_2')).toBe(true);
  });

  test('tag click opens quick switcher', async ({ app }) => {
    await app.editor.setCodeMirrorContent('#important task here');

    const tag = app.page.locator('.cm-tag-pill');
    await tag.click();

    // Quick switcher should open (showing tag search)
    const quickSwitcher = app.page.locator('[data-testid="quick-switcher"]');
    await expect(quickSwitcher).toBeVisible();
  });
});

test.describe('Wikilink Cursor Behavior', () => {
  test.beforeEach(async ({ app, vault }) => {
    await app.goto();
    // Create a target note for wikilinks
    vault.createFile('Target Note.md', '# Target Content\nThis is the target note.');
    await app.page.reload();
  });

  test('renders wikilink as pill when cursor is away', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See [[Target Note]] for details');

    // Move cursor away from wikilink
    await app.page.keyboard.press('End');

    await app.editor.waitForWikilinkWidget();
    expect(await app.editor.hasWikilink('Target Note')).toBe(true);
  });

  test('shows raw [[link]] when cursor is at end of wikilink', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See [[Target Note]]');

    // Move cursor to the end of the wikilink
    await app.page.keyboard.press('ArrowLeft');
    await app.page.keyboard.press('ArrowLeft');
    await app.page.keyboard.press('ArrowLeft');
    await app.page.keyboard.press('ArrowLeft');

    // The wikilink widget should no longer be visible
    const wikilink = app.page.locator('.cm-wikilink');
    await expect(wikilink).not.toBeVisible();
  });

  test('shows raw [[link]] when cursor is inside the wikilink', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See [[Target Note]] for more');

    // Click in the middle of the wikilink
    const editor = app.page.locator('.cm-content');
    await editor.click({ position: { x: 50, y: 20 } });

    // Wikilink should show as raw text
    const wikilink = app.page.locator('.cm-wikilink');
    await expect(wikilink).not.toBeVisible();
  });

  test('wikilink click navigates to target note', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See [[Target Note]]');

    await app.editor.clickWikilink('Target Note');

    // Verify the target note opened
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Target Content');
  });

  test('missing wikilink shows different style', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See [[NonExistent Note]]');

    await app.page.keyboard.press('End');

    const missingWikilink = app.page.locator('.cm-wikilink-missing');
    await expect(missingWikilink).toBeVisible();
  });

  test('wikilink with alias displays alias text', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See [[Target Note|this alias]]');

    await app.page.keyboard.press('End');

    const aliasWikilink = app.page.locator('.cm-wikilink', { hasText: 'this alias' });
    await expect(aliasWikilink).toBeVisible();
  });

  test('multiple wikilinks render as widgets when cursor is away', async ({ app, vault }) => {
    vault.createFile('Note 2.md', '# Note 2');
    await app.page.reload();

    await app.editor.setCodeMirrorContent('[[Note 1]] and [[Note 2]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForWikilinkWidget();
    expect(await app.editor.hasWikilink('Note 1')).toBe(true);
    expect(await app.editor.hasWikilink('Note 2')).toBe(true);
  });
});

test.describe('Task Lists', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('tasks-test.md');
  });

  test('renders unchecked task checkbox', async ({ app }) => {
    await app.editor.setCodeMirrorContent('- [ ] Task item');

    expect(await app.editor.hasTaskCheckbox()).toBe(true);
    expect(await app.editor.isCheckboxChecked()).toBe(false);
  });

  test('renders checked task checkbox', async ({ app }) => {
    await app.editor.setCodeMirrorContent('- [x] Completed task');

    expect(await app.editor.hasTaskCheckbox()).toBe(true);
    expect(await app.editor.isCheckboxChecked()).toBe(true);
  });

  test('can toggle task by clicking checkbox', async ({ app }) => {
    await app.editor.setCodeMirrorContent('- [ ] Task to complete');

    // Initially unchecked
    expect(await app.editor.isCheckboxChecked()).toBe(false);

    // Click to toggle
    await app.editor.clickTaskCheckbox();

    // Should now be checked
    expect(await app.editor.isCheckboxChecked()).toBe(true);
  });

  test('can toggle task back to unchecked', async ({ app }) => {
    await app.editor.setCodeMirrorContent('- [x] Completed task');

    // Initially checked
    expect(await app.editor.isCheckboxChecked()).toBe(true);

    // Click to toggle
    await app.editor.clickTaskCheckbox();

    // Should now be unchecked
    expect(await app.editor.isCheckboxChecked()).toBe(false);
  });

  test('handles multiple tasks in list', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`- [ ] Task 1
- [ ] Task 2
- [x] Completed Task 3`);

    const checkboxes = app.page.locator('.cm-task-checkbox');
    await expect(checkboxes).toHaveCount(3);

    // First two should be unchecked
    const allCheckboxes = await checkboxes.all();
    expect(await allCheckboxes[0].isChecked()).toBe(false);
    expect(await allCheckboxes[1].isChecked()).toBe(false);
    expect(await allCheckboxes[2].isChecked()).toBe(true);
  });

  test('task list preserves formatting', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`- [ ] **Bold task**
- [ ] *Italic task*
- [ ] Task with [[wikilink]]`);

    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('**Bold task**');
    expect(content).toContain('*Italic task*');
    expect(content).toContain('[[wikilink]]');
  });
});

test.describe('Markdown Formatting in Editor', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('formatting-test.md');
  });

  test('renders heading levels', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`# H1
## H2
### H3
#### H4
##### H5
###### H6`);

    const h1 = app.page.locator('.cm-heading-1');
    const h2 = app.page.locator('.cm-heading-2');
    const h3 = app.page.locator('.cm-heading-3');

    await expect(h1).toBeVisible();
    await expect(h2).toBeVisible();
    await expect(h3).toBeVisible();
  });

  test('renders bold text', async ({ app }) => {
    await app.editor.setCodeMirrorContent('**bold text**');

    const bold = app.page.locator('.cm-strong');
    await expect(bold).toBeVisible();
  });

  test('renders italic text', async ({ app }) => {
    await app.editor.setCodeMirrorContent('*italic text*');

    const italic = app.page.locator('.cm-em');
    await expect(italic).toBeVisible();
  });

  test('renders inline code', async ({ app }) => {
    await app.editor.setCodeMirrorContent('`const x = 1;`');

    const code = app.page.locator('.cm-inline-code');
    await expect(code).toBeVisible();
  });

  test('renders code blocks', async ({ app }) => {
    await app.editor.setCodeMirrorContent('```typescript\nconst x = 1;\nconsole.log(x);\n```');

    const codeBlock = app.page.locator('.cm-codeblock');
    await expect(codeBlock).toBeVisible();
  });

  test('renders blockquotes', async ({ app }) => {
    await app.editor.setCodeMirrorContent('> This is a quote\n> Across multiple lines');

    const blockquote = app.page.locator('.cm-blockquote');
    await expect(blockquote).toBeVisible();
  });

  test('renders strikethrough', async ({ app }) => {
    await app.editor.setCodeMirrorContent('~~strikethrough text~~');

    const strike = app.page.locator('.cm-strikethrough');
    await expect(strike).toBeVisible();
  });

  test('renders highlight', async ({ app }) => {
    await app.editor.setCodeMirrorContent('==highlighted text==');

    const highlight = app.page.locator('.cm-highlight');
    await expect(highlight).toBeVisible();
  });

  test('renders callouts', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`> [!note]
> This is a callout`);

    const callout = app.page.locator('.cm-callout');
    await expect(callout).toBeVisible();
  });
});
