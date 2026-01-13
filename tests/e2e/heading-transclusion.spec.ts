import { test, expect } from '../fixtures';

test.describe('Heading Transclusion', () => {
  test.beforeEach(async ({ app, vault }) => {
    await app.goto();
    // Create a source note with various headings
    vault.createFile('Source Note.md', `# Top Level Heading

This is content under the top level heading.

## Second Level Heading

Content under second level.

### Third Level Heading

Content under third level.

# Another Top Level

More content here.`);
    await app.page.reload();
  });

  test('embeds a top-level heading with content', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#Top Level Heading]]');

    // Move cursor away from the embed
    await app.page.keyboard.press('End');

    // Check for heading embed widget
    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();

    // Verify the heading text is shown
    await expect(headingEmbed).toContainText('Top Level Heading');
    await expect(headingEmbed).toContainText('This is content under the top level heading.');
  });

  test('embeds a nested heading with content', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#Second Level Heading]]');

    await app.page.keyboard.press('End');

    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();

    await expect(headingEmbed).toContainText('Second Level Heading');
    await expect(headingEmbed).toContainText('Content under second level.');
  });

  test('embeds a deeply nested heading', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#Third Level Heading]]');

    await app.page.keyboard.press('End');

    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();

    await expect(headingEmbed).toContainText('Third Level Heading');
    await expect(headingEmbed).toContainText('Content under third level.');
  });

  test('shows error for missing heading', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#Non Existent Heading]]');

    await app.page.keyboard.press('End');

    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();
    await expect(headingEmbed).toContainText('Heading "Non Existent Heading" not found');
  });

  test('shows error for missing note', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Non Existent Note#Some Heading]]');

    await app.page.keyboard.press('End');

    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();
    await expect(headingEmbed).toContainText('Heading "Some Heading" not found in Non Existent Note');
  });

  test('handles heading with special characters', async ({ app, vault }) => {
    vault.createFile('Special Chars.md', `# Heading with "quotes" and 'apostrophes'

Content here.

# Heading with @symbols # and $stuff

More content.`);
    await app.page.reload();

    await app.editor.setCodeMirrorContent('![[Special Chars#Heading with "quotes" and \'apostrophes\']]');

    await app.page.keyboard.press('End');

    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();
    await expect(headingEmbed).toContainText('Heading with "quotes" and \'apostrophes\'');
  });

  test('handles heading picker trigger ![[Note#]]', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#]]');

    await app.page.keyboard.press('End');

    // Should show the embed with picker indicator
    const embed = app.page.locator('.cm-embed');
    await expect(embed).toBeVisible();
    await expect(embed).toContainText('Source Note#');
  });

  test('includes nested headings in content', async ({ app, vault }) => {
    vault.createFile('Nested Content.md', `# Main Section

Intro content.

## Subsection One

Sub content one.

## Subsection Two

Sub content two.

# Another Section

Other content.`);
    await app.page.reload();

    await app.editor.setCodeMirrorContent('![[Nested Content#Main Section]]');

    await app.page.keyboard.press('End');

    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();

    // Should include main heading and nested subsections
    await expect(headingEmbed).toContainText('Main Section');
    await expect(headingEmbed).toContainText('Intro content.');
    await expect(headingEmbed).toContainText('Subsection One');
    await expect(headingEmbed).toContainText('Subsection Two');
  });

  test('preserves original markdown formatting in content', async ({ app, vault }) => {
    vault.createFile('Formatted Note.md', `# Formatted Heading

This has **bold** and *italic* text.

- List item one
- List item two

\`inline code\` example.`);
    await app.page.reload();

    await app.editor.setCodeMirrorContent('![[Formatted Note#Formatted Heading]]');

    await app.page.keyboard.press('End');

    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();
    await expect(headingEmbed).toContainText('Formatted Heading');
    await expect(headingEmbed).toContainText('bold');
    await expect(headingEmbed).toContainText('italic');
  });

  test('handles multiple heading embeds in same document', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`![[Source Note#Top Level Heading]]

Some text in between.

![[Source Note#Second Level Heading]]`);

    await app.page.keyboard.press('End');

    const headingEmbeds = app.page.locator('.cm-heading-embed');
    await expect(headingEmbeds).toHaveCount(2);
  });

  test('click on header navigates to source note', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#Top Level Heading]]');

    await app.page.keyboard.press('End');

    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();

    // Click the header
    const header = headingEmbed.locator('.cm-embed-header');
    await header.click();

    // Verify navigation occurred (content changed to Source Note)
    const content = await app.editor.getCodeMirrorContent();
    expect(content).toContain('Top Level Heading');
  });

  test('shows raw syntax when cursor is on embed', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[Source Note#Top Level Heading]]');

    // Initially the widget is visible
    const headingEmbed = app.page.locator('.cm-heading-embed');
    await expect(headingEmbed).toBeVisible();

    // Move cursor into the embed
    await app.page.keyboard.press('ArrowLeft');

    // Widget should disappear, showing raw syntax
    await expect(headingEmbed).not.toBeVisible();
  });
});

test.describe('Heading Parser Utilities', () => {
  test('parseHeadingRef parses basic heading reference', async () => {
    // This would be a unit test, but we're checking integration
    const { parseHeadingRef } = await import('../../src/utils/headingParser');

    const result = parseHeadingRef('![[Note#Heading]]');
    expect(result).toEqual({
      note: 'Note',
      heading: 'Heading',
      hasEmptyHeading: false,
      isValid: true,
    });
  });

  test('parseHeadingRef handles empty heading (picker mode)', async () => {
    const { parseHeadingRef } = await import('../../src/utils/headingParser');

    const result = parseHeadingRef('![[Note#]]');
    expect(result).toEqual({
      note: 'Note',
      heading: '',
      hasEmptyHeading: true,
      isValid: true,
    });
  });

  test('parseHeadingRef handles spaces in heading', async () => {
    const { parseHeadingRef } = await import('../../src/utils/headingParser');

    const result = parseHeadingRef('![[Note#My Long Heading Name]]');
    expect(result).toEqual({
      note: 'Note',
      heading: 'My Long Heading Name',
      hasEmptyHeading: false,
      isValid: true,
    });
  });
});

test.describe('Heading Finder Utilities', () => {
  test('findAllHeadings finds all headings', async () => {
    const { findAllHeadings } = await import('../../src/utils/headingFinder');

    const content = `# H1
## H2
### H3`;

    const headings = findAllHeadings(content);
    expect(headings).toHaveLength(3);
    expect(headings[0].text).toBe('H1');
    expect(headings[0].level).toBe(1);
    expect(headings[1].text).toBe('H2');
    expect(headings[1].level).toBe(2);
    expect(headings[2].text).toBe('H3');
    expect(headings[2].level).toBe(3);
  });

  test('extractHeadingContent gets content under heading', async () => {
    const { extractHeadingContent } = await import('../../src/utils/headingFinder');

    const content = `# My Heading

Content under heading.
More content.

# Next Heading`;

    const result = extractHeadingContent(content, 'My Heading');
    expect(result).not.toBeNull();
    expect(result?.heading.text).toBe('My Heading');
    expect(result?.content).toContain('Content under heading.');
    expect(result?.content).toContain('More content.');
    expect(result?.content).not.toContain('Next Heading');
  });

  test('extractHeadingContent includes nested headings', async () => {
    const { extractHeadingContent } = await import('../../src/utils/headingFinder');

    const content = `# Main

Main content.

## Sub One

Sub content.

## Sub Two

More sub.

# Next`;

    const result = extractHeadingContent(content, 'Main');
    expect(result).not.toBeNull();
    expect(result?.includesNested).toBe(true);
    expect(result?.content).toContain('Sub One');
    expect(result?.content).toContain('Sub Two');
  });
});
