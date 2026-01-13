import { test, expect } from '../fixtures';

test.describe('Block Transclusion', () => {
  test.beforeEach(async ({ app, vault }) => {
    await app.goto();
    // Create a source note with blocks
    vault.createFile('Source Note.md', `# Source Note

This is a paragraph block ^para1

- List item one ^list1
- List item two ^list2

> [!info] Callout block ^callout1
> With some content

> Quote block here ^quote1

\`\`\`javascript
const code = "block"; ^code1
\`\`\`
`);
    await app.page.reload();
  });

  test('renders block embed widget when cursor is away', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See ![[Source Note#^para1]]');

    // Move cursor away from the embed
    await app.page.keyboard.press('End');

    await app.editor.waitForBlockEmbedWidget();
    expect(await app.editor.hasBlockEmbed('Source Note', 'para1')).toBe(true);
  });

  test('shows raw syntax when cursor touches block embed', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See ![[Source Note#^para1]]');

    // Move cursor into the block embed
    await app.page.keyboard.press('ArrowLeft');
    await app.page.keyboard.press('ArrowLeft');

    // The block embed widget should no longer be visible
    const blockEmbed = app.page.locator('.cm-block-embed');
    await expect(blockEmbed).not.toBeVisible();
  });

  test('displays block content in embed', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#^para1]]');

    await app.page.keyboard.press('End');

    const content = await app.editor.getBlockEmbedContent('Source Note', 'para1');
    expect(content).toContain('This is a paragraph block');
  });

  test('handles list block transclusion', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#^list1]]');

    await app.page.keyboard.press('End');

    expect(await app.editor.hasBlockEmbed('Source Note', 'list1')).toBe(true);
    const content = await app.editor.getBlockEmbedContent('Source Note', 'list1');
    expect(content).toContain('List item one');
  });

  test('handles callout block transclusion', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#^callout1]]');

    await app.page.keyboard.press('End');

    expect(await app.editor.hasBlockEmbed('Source Note', 'callout1')).toBe(true);
  });

  test('handles quote block transclusion', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#^quote1]]');

    await app.page.keyboard.press('End');

    expect(await app.editor.hasBlockEmbed('Source Note', 'quote1')).toBe(true);
  });

  test('shows error for missing block', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#^nonexistent]]');

    await app.page.keyboard.press('End');

    expect(await app.editor.hasBlockEmbed('Source Note', 'nonexistent')).toBe(true);
    const content = await app.editor.getBlockEmbedContent('Source Note', 'nonexistent');
    expect(content).toContain('Block not found');
  });

  test('shows error for missing note', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[NonExistent Note#^someblock]]');

    await app.page.keyboard.press('End');

    expect(await app.editor.hasBlockEmbed('NonExistent Note', 'someblock')).toBe(true);
    const content = await app.editor.getBlockEmbedContent('NonExistent Note', 'someblock');
    expect(content).toContain('Block not found');
  });

  test('handles multiple block embeds in same document', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`First: ![[Source Note#^para1]]

Second: ![[Source Note#^list1]]`);

    await app.page.keyboard.press('End');

    expect(await app.editor.hasBlockEmbed('Source Note', 'para1')).toBe(true);
    expect(await app.editor.hasBlockEmbed('Source Note', 'list1')).toBe(true);
  });

  test('block embed click navigates to source note', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#^para1]]');

    await app.page.keyboard.press('End');

    // Click on the block embed header
    await app.editor.clickBlockEmbedOpen('Source Note', 'para1');

    // Verify the source note opened
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Source Note');
  });
});

test.describe('Block ID Parsing', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('block-id-test.md');
  });

  test('recognizes block IDs at end of lines', async ({ app }) => {
    await app.editor.setCodeMirrorContent('Paragraph with block id ^myblock');
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('^myblock');
  });

  test('recognizes block IDs with hyphens', async ({ app }) => {
    await app.editor.setCodeMirrorContent('Block with hyphenated-id ^hyphenated-id');
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('^hyphenated-id');
  });

  test('recognizes block IDs with numbers', async ({ app }) => {
    await app.editor.setCodeMirrorContent('Block with number ^block123');
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('^block123');
  });

  test('recognizes block IDs on list items', async ({ app }) => {
    await app.editor.setCodeMirrorContent('- Task with id ^task1');
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('^task1');
  });
});
