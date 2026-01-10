import { test as base, Page } from '@playwright/test';

type AppFixtures = {
  app: AppPage;
  vault: TestVault;
};

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

export class AppPage {
  constructor(public page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async createNewFile(filename: string): Promise<void> {
    await this.page.click('[data-testid="create-file-button"]');
    await this.page.fill('[data-testid="new-file-name-input"]', filename);
    await this.page.click('[data-testid="confirm-create-file"]');
  }

  async openFile(filename: string): Promise<void> {
    await this.page.click(`[data-file="${filename}"]`);
  }

  get editor() {
    return {
      type: async (text: string) => {
        const editor = this.page.locator('.cm-content');
        await editor.click();
        await editor.type(text);
      },
      getText: async () => {
        const editor = this.page.locator('.cm-content');
        return await editor.innerText();
      },
      waitForContent: async (text: string) => {
        const editor = this.page.locator('.cm-content');
        await editor.waitFor({ state: 'visible' });
        return await editor.getByText(text).waitFor();
      },
      // Wikilink helpers
      hasWikilink: async (targetName: string) => {
        const wikilink = this.page.locator(`.cm-wikilink[data-target="${targetName}"]`);
        return await wikilink.isVisible();
      },
      clickWikilink: async (targetName: string) => {
        const wikilink = this.page.locator(`.cm-wikilink[data-target="${targetName}"]`);
        await wikilink.click();
      },
      waitForWikilinkWidget: async () => {
        await this.page.locator('.cm-wikilink').first().waitFor({ state: 'visible' });
      },
      // Tag helpers
      hasTag: async (tagName: string) => {
        const tag = this.page.locator(`.cm-tag-pill:has-text("#${tagName}")`);
        return await tag.isVisible();
      },
      clickTag: async (tagName: string) => {
        const tag = this.page.locator(`.cm-tag-pill:has-text("#${tagName}")`);
        await tag.click();
      },
      waitForTagWidget: async () => {
        await this.page.locator('.cm-tag-pill').first().waitFor({ state: 'visible' });
      },
      // Task checkbox helpers
      hasTaskCheckbox: async () => {
        const checkbox = this.page.locator('.cm-task-checkbox');
        return await checkbox.isVisible();
      },
      clickTaskCheckbox: async () => {
        const checkbox = this.page.locator('.cm-task-checkbox');
        await checkbox.click();
      },
      isCheckboxChecked: async () => {
        const checkbox = this.page.locator('.cm-task-checkbox');
        return await checkbox.isChecked();
      },
      // Get CodeMirror content via API
      getCodeMirrorContent: async (): Promise<string> => {
        return await this.page.evaluate(() => {
          const editor = document.querySelector('.cm-editor') as any;
          if (editor && editor.cmView) {
            return editor.cmView.state.doc.toString();
          }
          return '';
        });
      },
      // Set CodeMirror content via API
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
      }
    };
  }

  get fileTree() {
    return {
      waitForFiles: async (filenames: string[]) => {
        for (const filename of filenames) {
          await this.page.locator(`[data-file="${filename}"]`).waitFor();
        }
      },
      getFileCount: async () => {
        return await this.page.locator('[data-file]').count();
      }
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
    const items = await this.page.locator('[data-backlink]').allTextContents();
    return items;
  }
}

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
