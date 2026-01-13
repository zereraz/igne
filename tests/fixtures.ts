import { test as base, Page, BrowserContext } from '@playwright/test';

export interface AppFixtures {
  app: AppPage;
  vault: TestVault;
}

/**
 * TestVault - Helper for creating test files in the vault
 *
 * Note: In dev mode, files are created in the browser's localStorage.
 * In WebDriver mode, files are created via the Tauri file system API.
 */
export class TestVault {
  private testFiles: Map<string, string> = new Map();

  createFile(path: string, content: string): void {
    this.testFiles.set(path, content);
  }

  updateFile(path: string, content: string): void {
    if (this.testFiles.has(path)) {
      this.testFiles.set(path, content);
    }
  }

  deleteFile(path: string): void {
    this.testFiles.delete(path);
  }

  getFiles(): Map<string, string> {
    return new Map(this.testFiles);
  }

  async cleanup(): Promise<void> {
    this.testFiles.clear();
  }
}

/**
 * AppPage - Page object for the Igne editor application
 *
 * Provides helpers for:
 * - Navigation and file operations
 * - Editor interaction (via CodeMirror API)
 * - Widget testing (wikilinks, tags, tasks)
 */
export class AppPage {
  constructor(public page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async createNewFile(filename: string): Promise<void> {
    // Click the create file button
    await this.page.click('[data-testid="create-file-button"]');
    // Fill in the file name
    await this.page.fill('[data-testid="new-file-name-input"]', filename);
    // Confirm creation
    await this.page.click('[data-testid="confirm-create-file"]');
  }

  async openFile(filename: string): Promise<void> {
    await this.page.click(`[data-file="${filename}"]`);
  }

  /**
   * Editor helpers - Access CodeMirror editor via JavaScript API
   */
  get editor() {
    return {
      /**
       * Type text into the editor
       */
      type: async (text: string) => {
        const editor = this.page.locator('.cm-content');
        await editor.click();
        await editor.type(text);
      },

      /**
       * Get text content from editor
       */
      getText: async () => {
        const editor = this.page.locator('.cm-content');
        return await editor.innerText();
      },

      /**
       * Wait for specific text to appear in editor
       */
      waitForContent: async (text: string) => {
        const editor = this.page.locator('.cm-content');
        await editor.waitFor({ state: 'visible' });
        return await editor.getByText(text).waitFor();
      },

      // ===== Wikilink helpers =====

      /**
       * Check if a wikilink widget is visible
       */
      hasWikilink: async (targetName: string) => {
        const wikilink = this.page.locator(`.cm-wikilink[data-target="${targetName}"]`);
        return await wikilink.isVisible();
      },

      /**
       * Click on a wikilink widget
       */
      clickWikilink: async (targetName: string) => {
        const wikilink = this.page.locator(`.cm-wikilink[data-target="${targetName}"]`);
        await wikilink.click();
      },

      /**
       * Wait for wikilink widgets to render
       */
      waitForWikilinkWidget: async () => {
        await this.page.locator('.cm-wikilink').first().waitFor({ state: 'visible' });
      },

      // ===== Tag helpers =====

      /**
       * Check if a tag pill is visible
       */
      hasTag: async (tagName: string) => {
        const tag = this.page.locator(`.cm-tag-pill:has-text("#${tagName}")`);
        return await tag.isVisible();
      },

      /**
       * Click on a tag pill
       */
      clickTag: async (tagName: string) => {
        const tag = this.page.locator(`.cm-tag-pill:has-text("#${tagName}")`);
        await tag.click();
      },

      /**
       * Wait for tag widgets to render
       */
      waitForTagWidget: async () => {
        await this.page.locator('.cm-tag-pill').first().waitFor({ state: 'visible' });
      },

      // ===== Task checkbox helpers =====

      /**
       * Check if a task checkbox exists
       */
      hasTaskCheckbox: async () => {
        const checkbox = this.page.locator('.cm-task-checkbox');
        return await checkbox.isVisible();
      },

      /**
       * Click on a task checkbox to toggle it
       */
      clickTaskCheckbox: async () => {
        const checkbox = this.page.locator('.cm-task-checkbox');
        await checkbox.click();
      },

      /**
       * Check if the task checkbox is checked
       */
      isCheckboxChecked: async () => {
        const checkbox = this.page.locator('.cm-task-checkbox');
        return await checkbox.isChecked();
      },

      // ===== Block embed helpers =====

      /**
       * Check if a block embed widget is visible
       */
      hasBlockEmbed: async (noteName: string, blockId: string) => {
        const blockEmbed = this.page.locator(`.cm-block-embed[data-note="${noteName}"][data-block="${blockId}"]`);
        return await blockEmbed.isVisible();
      },

      /**
       * Wait for block embed widgets to render
       */
      waitForBlockEmbedWidget: async () => {
        await this.page.locator('.cm-block-embed').first().waitFor({ state: 'visible' });
      },

      /**
       * Click on a block embed's open button
       */
      clickBlockEmbedOpen: async (noteName: string, blockId: string) => {
        const blockEmbed = this.page.locator(`.cm-block-embed[data-note="${noteName}"][data-block="${blockId}"]`);
        await blockEmbed.locator('.cm-block-embed-header').click();
      },

      /**
       * Get the content text from a block embed
       */
      getBlockEmbedContent: async (noteName: string, blockId: string) => {
        const blockEmbed = this.page.locator(`.cm-block-embed[data-note="${noteName}"][data-block="${blockId}"] .cm-block-embed-body`);
        return await blockEmbed.innerText();
      },

      // ===== CodeMirror API access =====

      /**
       * Get the full content of the CodeMirror editor
       * Uses CodeMirror's internal API for accurate content
       */
      getCodeMirrorContent: async (): Promise<string> => {
        return await this.page.evaluate(() => {
          const editor = document.querySelector('.cm-editor') as any;
          if (editor && editor.cmView) {
            return editor.cmView.state.doc.toString();
          }
          return '';
        });
      },

      /**
       * Set the content of the CodeMirror editor
       * Uses CodeMirror's internal API for accurate replacement
       */
      setCodeMirrorContent: async (content: string) => {
        await this.page.evaluate((text) => {
          const editor = document.querySelector('.cm-editor') as any;
          if (editor && editor.cmView) {
            const { state, dispatch } = editor.cmView;
            dispatch({
              changes: { from: 0, to: state.doc.length, insert: text }
            });
          }
        }, content);
      },

      // ===== Selection helpers =====

      /**
       * Move cursor to the end of the document
       */
      moveCursorToEnd: async () => {
        await this.page.keyboard.press('End');
      },

      /**
       * Move cursor to the start of the document
       */
      moveCursorToStart: async () => {
        await this.page.keyboard.press('Home');
      },
    };
  }

  /**
   * File tree helpers
   */
  get fileTree() {
    return {
      /**
       * Wait for specific files to appear in the sidebar
       */
      waitForFiles: async (filenames: string[]) => {
        for (const filename of filenames) {
          await this.page.locator(`[data-file="${filename}"]`).waitFor();
        }
      },

      /**
       * Get the count of files in the sidebar
       */
      getFileCount: async () => {
        return await this.page.locator('[data-file]').count();
      },

      /**
       * Check if a file exists in the sidebar
       */
      hasFile: async (filename: string) => {
        const file = this.page.locator(`[data-file="${filename}"]`);
        return await file.isVisible();
      },
    };
  }

  // ===== Quick Actions =====

  async openQuickSwitcher(): Promise<void> {
    await this.page.keyboard.press('Meta+K');
  }

  async openSearch(): Promise<void> {
    await this.page.keyboard.press('Meta+F');
  }

  async waitForBacklinksPanel(): Promise<void> {
    await this.page.locator('[data-testid="backlinks-panel"]').waitFor();
  }

  async getBacklinks(): Promise<string[]> {
    const items = await this.page.locator('[data-backlink]').allTextContents();
    return items;
  }

  // ===== Tab helpers =====

  async closeTab(tabName: string): Promise<void> {
    await this.page.click(`[data-testid="close-tab-${tabName}"]`);
  }

  async getTabCount(): Promise<number> {
    return await this.page.locator('[data-testid="tab"]').count();
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async switchToTab(tabName: string): Promise<void> {
    await this.page.click(`[data-file="${tabName}"]`);
  }
}

/**
 * Playwright test fixtures
 */
export const test = base.extend<AppFixtures>({
  app: async ({ page }, use) => {
    const app = new AppPage(page);
    await use(app);
  },
  vault: async ({}, use) => {
    const vault = new TestVault();
    await use(vault);
    await vault.cleanup();
  },
});

export { expect } from '@playwright/test';
