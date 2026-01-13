import { test, expect } from '../fixtures';

test.describe('Embed Parameters', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('embed-params-test.md');
  });

  test.describe('Image Embed Parameters', () => {
    test('renders image with width parameter', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=300]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.getImageWidth()).toBe('300px');
    });

    test('renders image with percentage width', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=50%]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.getImageWidth()).toBe('50%');
    });

    test('renders image with height parameter', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#height=400]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.getImageHeight()).toBe('400px');
    });

    test('renders image with both width and height', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=300&height=200]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.getImageWidth()).toBe('300px');
      expect(await app.editor.getImageHeight()).toBe('200px');
    });

    test('renders image with alt text parameter', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#alt=My beautiful image]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);

      const image = app.page.locator('.cm-image');
      await expect(image).toHaveAttribute('alt', 'My beautiful image');
    });

    test('renders image with title parameter', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#title=Image Title]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);

      const image = app.page.locator('.cm-image');
      await expect(image).toHaveAttribute('title', 'Image Title');
    });

    test('renders image with left alignment', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#align=left]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.hasImageAlignment('left')).toBe(true);
    });

    test('renders image with center alignment', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#align=center]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.hasImageAlignment('center')).toBe(true);
    });

    test('renders image with right alignment', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#align=right]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.hasImageAlignment('right')).toBe(true);
    });

    test('renders image with multiple parameters using # separator', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=300#height=200#align=center]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.getImageWidth()).toBe('300px');
      expect(await app.editor.getImageHeight()).toBe('200px');
      expect(await app.editor.hasImageAlignment('center')).toBe(true);
    });

    test('handles image without parameters', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      // Default width/height should not be set
      expect(await app.editor.getImageWidth()).toBe('');
    });

    test('handles invalid parameter values gracefully', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=invalid&align=invalid]]');
      await app.page.keyboard.press('End');

      // Image should still render, ignoring invalid params
      expect(await app.editor.hasImageWidget()).toBe(true);
    });
  });

  test.describe('Video Embed Parameters', () => {
    test('renders video widget for video files', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[video.mp4]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasVideoWidget()).toBe(true);
    });

    test('renders video with width and height', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[video.mp4#width=600&height=400]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasVideoWidget()).toBe(true);

      const video = app.page.locator('.cm-video');
      await expect(video).toHaveCSS('width', '600px');
      await expect(video).toHaveCSS('height', '400px');
    });

    test('renders video with autoplay parameter', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[video.mp4#autoplay]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasVideoWidget()).toBe(true);

      const video = app.page.locator('.cm-video');
      await expect(video).toHaveAttribute('autoplay');
    });

    test('renders video with loop parameter', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[video.mp4#loop]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasVideoWidget()).toBe(true);

      const video = app.page.locator('.cm-video');
      await expect(video).toHaveAttribute('loop');
    });

    test('renders video with muted parameter', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[video.mp4#muted]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasVideoWidget()).toBe(true);

      const video = app.page.locator('.cm-video');
      await expect(video).toHaveAttribute('muted');
    });

    test('renders video with controls hidden', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[video.mp4#controls=0]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasVideoWidget()).toBe(true);

      const video = app.page.locator('.cm-video');
      await expect(video).not.toHaveAttribute('controls');
    });

    test('renders video with alignment', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[video.mp4#align=center]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasVideoWidget()).toBe(true);

      const container = app.page.locator('.cm-video-container');
      const hasClass = await container.evaluate((el: HTMLElement) => {
        return el.classList.contains('cm-video-align-center');
      });
      expect(hasClass).toBe(true);
    });
  });

  test.describe('PDF Embed Parameters', () => {
    test('renders PDF widget for PDF files', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[document.pdf]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasPdfWidget()).toBe(true);
    });

    test('renders PDF with width and height', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[document.pdf#width=800&height=600]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasPdfWidget()).toBe(true);

      const pdf = app.page.locator('.cm-pdf');
      await expect(pdf).toHaveCSS('width', '800px');
      await expect(pdf).toHaveCSS('height', '600px');
    });

    test('renders PDF with page parameter', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[document.pdf#page=5]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasPdfWidget()).toBe(true);

      const pdf = app.page.locator('.cm-pdf');
      const src = await pdf.getAttribute('src');
      expect(src).toContain('#page=5');
    });

    test('renders PDF with toolbar hidden', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[document.pdf#toolbar=0]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasPdfWidget()).toBe(true);

      const pdf = app.page.locator('.cm-pdf');
      const src = await pdf.getAttribute('src');
      expect(src).toContain('pagemode=none');
    });

    test('renders PDF with alignment', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[document.pdf#align=center]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasPdfWidget()).toBe(true);

      const container = app.page.locator('.cm-pdf-container');
      const hasClass = await container.evaluate((el: HTMLElement) => {
        return el.classList.contains('cm-pdf-align-center');
      });
      expect(hasClass).toBe(true);
    });
  });

  test.describe('Note Embed Parameters', () => {
    test('renders note embed for markdown files', async ({ app, vault }) => {
      vault.createFile('target-note.md', '# Target Note\nThis is the content.');
      await app.page.reload();

      await app.editor.setCodeMirrorContent('![[target-note]]');
      await app.page.keyboard.press('End');

      await app.editor.waitForEmbedWidget();
      const embed = app.page.locator('.cm-embed');
      await expect(embed).toBeVisible();
    });

    test('handles note embed with parameters gracefully', async ({ app, vault }) => {
      vault.createFile('target-note.md', '# Target Note\nThis is the content.');
      await app.page.reload();

      // Note embeds with parameters should still render
      await app.editor.setCodeMirrorContent('![[target-note#width=300]]');
      await app.page.keyboard.press('End');

      await app.editor.waitForEmbedWidget();
      const embed = app.page.locator('.cm-embed');
      await expect(embed).toBeVisible();
    });
  });

  test.describe('Parameter Format Variations', () => {
    test('parses parameters with & separator', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=300&height=200]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.getImageWidth()).toBe('300px');
    });

    test('parses parameters with # separator', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=300#height=200]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.getImageWidth()).toBe('300px');
    });

    test('parses mixed # and & separators', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=300&height=200#align=center]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
      expect(await app.editor.getImageWidth()).toBe('300px');
    });

    test('handles file paths with spaces', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[my file.png#width=300]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
    });

    test('handles file paths in subdirectories', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[assets/images/photo.png#width=300]]');
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
    });
  });

  test.describe('Cursor Behavior', () => {
    test('shows raw embed syntax when cursor is inside', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=300]]');

      // Move cursor to the middle of the embed
      await app.page.keyboard.press('ArrowLeft');
      await app.page.keyboard.press('ArrowLeft');
      await app.page.keyboard.press('ArrowLeft');

      // The image widget should no longer be visible
      const image = app.page.locator('.cm-image');
      await expect(image).not.toBeVisible();
    });

    test('renders embed when cursor is outside', async ({ app }) => {
      await app.editor.setCodeMirrorContent('![[image.png#width=300]]');

      // Move cursor away from the embed
      await app.page.keyboard.press('End');

      expect(await app.editor.hasImageWidget()).toBe(true);
    });
  });
});
