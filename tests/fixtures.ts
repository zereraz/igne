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
