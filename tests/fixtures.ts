import { test as base, Page } from '@playwright/test';

export interface AppFixtures {
  app: AppPage;
  vault: TestVault;
}

/**
 * TestVault - Helper for creating test files in mock vault
 *
 * Works with the Tauri mock system (window.__TAURI_MOCK__) in dev mode.
 */
export class TestVault {
  // Must match MOCK_VAULT_PATH in tauriMock.ts
  private vaultPath: string = '/mock-vault';
  private testFiles: Map<string, string> = new Map();
  private page: Page | null = null;

  setPage(page: Page): void {
    this.page = page;
  }

  /**
   * Initialize the test vault in the mock system
   */
  async init(page: Page): Promise<void> {
    this.page = page;

    // Set up mock files via the Tauri mock system
    await page.evaluate((vaultPath: string) => {
      const mock = (window as any).__TAURI_MOCK__;
      if (mock) {
        // Create the vault directory
        mock.setMockDir(vaultPath);
        // Create .obsidian directory
        mock.setMockDir(`${vaultPath}/.obsidian`);
        // Create a basic community-plugins.json
        mock.setMockFile(`${vaultPath}/.obsidian/community-plugins.json`, '[]');
      }
    }, this.vaultPath);
  }

  /**
   * Create a file in the test vault
   */
  async createFile(path: string, content: string): Promise<void> {
    this.testFiles.set(path, content);

    if (this.page) {
      const fullPath = `${this.vaultPath}/${path}`;
      await this.page.evaluate(
        ({ path, content }) => {
          const mock = (window as any).__TAURI_MOCK__;
          if (mock) {
            mock.setMockFile(path, content);
          }
        },
        { path: fullPath, content }
      );
    }
  }

  /**
   * Update an existing file
   */
  async updateFile(path: string, content: string): Promise<void> {
    await this.createFile(path, content);
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    this.testFiles.delete(path);
    // Files in mock system persist until page reload
  }

  /**
   * Get the vault path
   */
  getPath(): string {
    return this.vaultPath;
  }

  /**
   * Get all created files
   */
  getFiles(): Map<string, string> {
    return new Map(this.testFiles);
  }

  /**
   * Clean up test files (clears both memory and localStorage)
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.evaluate(() => {
        const mock = (window as any).__TAURI_MOCK__;
        if (mock && mock.clearMocks) {
          mock.clearMocks();
        }
        // Also clear localStorage directly in case page reloaded
        try {
          localStorage.removeItem('__TAURI_MOCK_FILES__');
        } catch {
          // Ignore
        }
      });
    }
    this.testFiles.clear();
  }
}

/**
 * AppPage - Page object for the Igne editor application
 */
export class AppPage {
  constructor(public page: Page) {}

  /**
   * Navigate to the app and wait for it to load
   * In mock mode, the vault auto-opens so we wait for the editor
   */
  async goto(): Promise<void> {
    await this.page.goto('http://localhost:1420');
    // In mock mode, vault auto-opens. Wait for editor to appear
    await this.page.waitForSelector('.cm-editor', { timeout: 30000 });
  }

  /**
   * Check if we're on the vault picker screen
   */
  async isOnVaultPicker(): Promise<boolean> {
    const title = await this.page.locator('h1').textContent().catch(() => '');
    return title === 'Igne';
  }

  /**
   * Open a vault by clicking the Open button and navigating
   * In dev/mock mode, this sets up a mock vault
   */
  async openMockVault(vault: TestVault): Promise<void> {
    // Initialize the mock vault first
    await vault.init(this.page);

    // Set the vault path in app state by simulating vault selection
    await this.page.evaluate((vaultPath: string) => {
      // Trigger a vault open via mock event
      const mock = (window as any).__TAURI_MOCK__;
      if (mock && mock.emitEvent) {
        // This would need the app to handle a vault-open event
        // For now, we'll use localStorage as a workaround
        localStorage.setItem('igne-test-vault', vaultPath);
      }

      // Directly set mock files to simulate having a vault
      if (mock) {
        mock.setMockDir(vaultPath);
        mock.setMockFile(`${vaultPath}/welcome.md`, '# Welcome\n\nThis is a test vault.');
      }
    }, vault.getPath());

    // Reload to pick up the mock vault
    await this.page.reload();

    // Wait for either vault picker or editor
    await this.page.waitForSelector('h1, .cm-editor', { timeout: 10000 });
  }

  /**
   * Wait for the editor to be visible
   */
  async waitForEditor(): Promise<void> {
    await this.page.locator('.cm-editor').waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Create a new file via the UI
   * Uses the "New File" button in the sidebar
   */
  async createNewFile(filename: string): Promise<void> {
    // Click the "New File" button in sidebar using role selector
    await this.page.getByRole('button', { name: 'New File' }).click();

    // A new untitled file should be created and focused
    // Wait for tab bar to update
    await this.page.waitForTimeout(500);

    // Wait for editor to be ready
    await this.page.waitForSelector('.cm-editor');
  }

  /**
   * Open a file by clicking on it in the file tree
   * Single click replaces active tab content
   */
  async openFile(filename: string): Promise<void> {
    // Ensure filename has .md extension for data-file attribute
    const fileWithExt = filename.endsWith('.md') ? filename : `${filename}.md`;
    await this.page.locator(`[data-file="${fileWithExt}"]`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Open a file in a new tab using Cmd+click
   */
  async openFileInNewTab(filename: string): Promise<void> {
    const fileWithExt = filename.endsWith('.md') ? filename : `${filename}.md`;
    await this.page.locator(`[data-file="${fileWithExt}"]`).click({ modifiers: ['Meta'] });
    await this.page.waitForTimeout(500);
  }

  /**
   * Editor helpers - Access CodeMirror editor
   */
  get editor() {
    return {
      type: async (text: string) => {
        const editor = this.page.locator('.cm-content');
        await editor.click();
        await editor.pressSequentially(text);
      },

      getText: async () => {
        return await this.page.locator('.cm-content').innerText();
      },

      waitForContent: async (text: string) => {
        await this.page.locator('.cm-content').getByText(text).waitFor();
      },

      hasWikilink: async (targetName: string) => {
        return await this.page.locator(`.cm-wikilink[data-target="${targetName}"]`).isVisible();
      },

      clickWikilink: async (targetName: string) => {
        await this.page.locator(`.cm-wikilink[data-target="${targetName}"]`).click();
      },

      waitForWikilinkWidget: async () => {
        await this.page.locator('.cm-wikilink').first().waitFor({ state: 'visible' });
      },

      hasTag: async (tagName: string) => {
        return await this.page.locator(`.cm-tag-pill:has-text("#${tagName}")`).isVisible();
      },

      clickTag: async (tagName: string) => {
        await this.page.locator(`.cm-tag-pill:has-text("#${tagName}")`).click();
      },

      waitForTagWidget: async () => {
        await this.page.locator('.cm-tag-pill').first().waitFor({ state: 'visible' });
      },

      hasTaskCheckbox: async () => {
        return await this.page.locator('.cm-task-checkbox').isVisible();
      },

      clickTaskCheckbox: async () => {
        await this.page.locator('.cm-task-checkbox').click();
      },

      isCheckboxChecked: async () => {
        return await this.page.locator('.cm-task-checkbox').isChecked();
      },

      waitForEmbedWidget: async () => {
        await this.page.locator('.cm-embed').first().waitFor({ state: 'visible' });
      },

      hasImageWidget: async () => {
        return await this.page.locator('.cm-image').isVisible();
      },

      hasVideoWidget: async () => {
        return await this.page.locator('.cm-video').isVisible();
      },

      hasPdfWidget: async () => {
        return await this.page.locator('.cm-pdf').isVisible();
      },

      getCodeMirrorContent: async (): Promise<string> => {
        return await this.page.evaluate(() => {
          const editor = document.querySelector('.cm-editor') as any;
          return editor?.__editorView?.state?.doc?.toString() || '';
        });
      },

      setCodeMirrorContent: async (content: string) => {
        // Add a header line so cursor at position 0 is NOT on the same line as wikilinks
        // This is needed because live preview hides widgets when cursor is on the same line
        const contentWithHeader = `.\n${content}`;
        const result = await this.page.evaluate((text) => {
          const editor = document.querySelector('.cm-editor') as any;
          // Access the view exposed by Editor component
          const view = editor?.__editorView;
          if (!view) {
            return { success: false, error: 'Could not find __editorView on .cm-editor element' };
          }
          try {
            const { state, dispatch } = view;
            // Set content and move cursor to start (position 0)
            dispatch({
              changes: { from: 0, to: state.doc.length, insert: text },
              selection: { anchor: 0 },
            });
            return { success: true, docLength: state.doc.length };
          } catch (e: any) {
            return { success: false, error: e.message };
          }
        }, contentWithHeader);
        if (!result.success) {
          console.log('setCodeMirrorContent failed:', result);
        }
        // Wait for parser and decorations to update
        await this.page.waitForTimeout(300);
      },

      moveCursorToEnd: async () => {
        await this.page.keyboard.press('End');
      },

      moveCursorToStart: async () => {
        await this.page.keyboard.press('Home');
      },
    };
  }

  /**
   * File tree helpers
   */
  get fileTree() {
    const sidebar = this.page.locator('aside, [role="complementary"]');

    return {
      waitForFiles: async (filenames: string[]) => {
        for (const filename of filenames) {
          // Remove .md extension for display name
          const displayName = filename.replace(/\.md$/, '');
          await sidebar.locator(`text="${displayName}"`).first().waitFor({ timeout: 10000 });
        }
      },

      getFileCount: async () => {
        // Count items in sidebar that look like files (have cursor pointer)
        return await sidebar.locator('[cursor="pointer"], [style*="cursor: pointer"]').count();
      },

      hasFile: async (filename: string) => {
        const displayName = filename.replace(/\.md$/, '');
        return await sidebar.locator(`text="${displayName}"`).first().isVisible().catch(() => false);
      },
    };
  }

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
    return await this.page.locator('[data-backlink]').allTextContents();
  }

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
    await this.page.click(`[data-tab="${tabName}"]`);
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
  vault: async ({ page }, use) => {
    const vault = new TestVault();
    vault.setPage(page);
    await use(vault);
    await vault.cleanup();
  },
});

export { expect } from '@playwright/test';
