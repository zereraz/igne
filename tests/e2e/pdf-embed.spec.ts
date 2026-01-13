import { test, expect } from '../fixtures';

test.describe('PDF Embed Widgets', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('pdf-test.md');
  });

  test('renders PDF embed without page number', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[document.pdf]]');

    // Move cursor away to trigger widget rendering
    await app.page.keyboard.press('End');

    // Check for PDF embed container
    const pdfEmbed = app.page.locator('.cm-pdf-embed-container');
    await expect(pdfEmbed).toBeVisible();

    // Check for PDF header
    const header = app.page.locator('.cm-pdf-embed-header');
    await expect(header).toBeVisible();

    // Check for PDF title
    const title = app.page.locator('.cm-pdf-embed-title');
    await expect(title).toHaveText('document.pdf');

    // Should show "Page 1" as default
    const pageInfo = app.page.locator('.cm-pdf-embed-page');
    await expect(pageInfo).toHaveText('Page 1');
  });

  test('renders PDF embed with page number', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[document.pdf#page=5]]');

    // Move cursor away to trigger widget rendering
    await app.page.keyboard.press('End');

    // Check for PDF embed container
    const pdfEmbed = app.page.locator('.cm-pdf-embed-container');
    await expect(pdfEmbed).toBeVisible();

    // Check for PDF header
    const header = app.page.locator('.cm-pdf-embed-header');
    await expect(header).toBeVisible();

    // Check for PDF title
    const title = app.page.locator('.cm-pdf-embed-title');
    await expect(title).toHaveText('document.pdf');

    // Should show "Page 5"
    const pageInfo = app.page.locator('.cm-pdf-embed-page');
    await expect(pageInfo).toHaveText('Page 5');
  });

  test('renders PDF embed with different page numbers', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`![[doc1.pdf#page=1]]
![[doc2.pdf#page=10]]
![[doc3.pdf#page=100]]`);

    // Move cursor away to trigger widget rendering
    await app.page.keyboard.press('End');

    // Check for multiple PDF embeds
    const pdfEmbeds = app.page.locator('.cm-pdf-embed-container');
    await expect(pdfEmbeds).toHaveCount(3);

    // Check each PDF has correct page info
    const pageInfos = app.page.locator('.cm-pdf-embed-page');
    await expect(pageInfos.nth(0)).toHaveText('Page 1');
    await expect(pageInfos.nth(1)).toHaveText('Page 10');
    await expect(pageInfos.nth(2)).toHaveText('Page 100');
  });

  test('handles PDF with path separators', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[folder/subfolder/document.pdf#page=2]]');

    // Move cursor away to trigger widget rendering
    await app.page.keyboard.press('End');

    // Check for PDF embed container
    const pdfEmbed = app.page.locator('.cm-pdf-embed-container');
    await expect(pdfEmbed).toBeVisible();

    // Check for PDF title with full path
    const title = app.page.locator('.cm-pdf-embed-title');
    await expect(title).toHaveText('folder/subfolder/document.pdf');

    // Should show "Page 2"
    const pageInfo = app.page.locator('.cm-pdf-embed-page');
    await expect(pageInfo).toHaveText('Page 2');
  });

  test('handles PDF with spaces in filename', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[My Document.pdf#page=1]]');

    // Move cursor away to trigger widget rendering
    await app.page.keyboard.press('End');

    // Check for PDF embed container
    const pdfEmbed = app.page.locator('.cm-pdf-embed-container');
    await expect(pdfEmbed).toBeVisible();

    // Check for PDF title
    const title = app.page.locator('.cm-pdf-embed-title');
    await expect(title).toHaveText('My Document.pdf');
  });

  test('PDF embed shows iframe element', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[document.pdf#page=1]]');

    // Move cursor away to trigger widget rendering
    await app.page.keyboard.press('End');

    // Check for iframe element
    const iframe = app.page.locator('.cm-pdf-embed-iframe');
    await expect(iframe).toHaveCount(1);
  });

  test('shows loading state while PDF loads', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[large-document.pdf#page=1]]');

    // Loading state element should exist
    const loading = app.page.locator('.cm-pdf-embed-loading');
    await expect(loading).toHaveCount(1);
  });

  test('handles multiple PDF embeds in same document', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`# Research Notes

Here is the first paper:
![[paper1.pdf#page=5]]

And here is the second paper:
![[paper2.pdf#page=10]]

Both are important references.`);

    // Move cursor to end
    await app.page.keyboard.press('End');

    // Check for multiple PDF embeds
    const pdfEmbeds = app.page.locator('.cm-pdf-embed-container');
    await expect(pdfEmbeds).toHaveCount(2);

    // Check first PDF
    await expect(app.page.locator('.cm-pdf-embed-title').nth(0)).toHaveText('paper1.pdf');
    await expect(app.page.locator('.cm-pdf-embed-page').nth(0)).toHaveText('Page 5');

    // Check second PDF
    await expect(app.page.locator('.cm-pdf-embed-title').nth(1)).toHaveText('paper2.pdf');
    await expect(app.page.locator('.cm-pdf-embed-page').nth(1)).toHaveText('Page 10');
  });

  test('PDF embed header is clickable', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[document.pdf#page=1]]');

    // Move cursor away to trigger widget rendering
    await app.page.keyboard.press('End');

    // Header should be visible
    const header = app.page.locator('.cm-pdf-embed-header');
    await expect(header).toBeVisible();

    // Check that header has cursor pointer (clickable)
    const headerStyle = await header.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(headerStyle).toBe('pointer');
  });
});

test.describe('PDF Embed Syntax Variants', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('pdf-variants.md');
  });

  test('parses PDF with uppercase PDF extension', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[document.PDF#page=2]]');

    await app.page.keyboard.press('End');

    const pdfEmbed = app.page.locator('.cm-pdf-embed-container');
    await expect(pdfEmbed).toBeVisible();
  });

  test('parses PDF with mixed case extension', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[document.Pdf#page=3]]');

    await app.page.keyboard.press('End');

    const pdfEmbed = app.page.locator('.cm-pdf-embed-container');
    await expect(pdfEmbed).toBeVisible();
  });

  test('handles PDF without page parameter (defaults to page 1)', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[document.pdf]]');

    await app.page.keyboard.press('End');

    const pageInfo = app.page.locator('.cm-pdf-embed-page');
    await expect(pageInfo).toHaveText('Page 1');
  });

  test('handles PDF with page parameter as 0 (edge case)', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[document.pdf#page=0]]');

    await app.page.keyboard.press('End');

    const pageInfo = app.page.locator('.cm-pdf-embed-page');
    await expect(pageInfo).toHaveText('Page 0');
  });
});
