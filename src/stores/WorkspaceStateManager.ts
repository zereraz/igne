import { vaultConfigStore } from './VaultConfigStore';
import type { WorkspaceState, OpenFile } from '../types';

class WorkspaceStateManager {
  private state: WorkspaceState | null = null;
  private saveDebounceTimer: number | null = null;
  private currentOpenFiles: OpenFile[] = [];
  private currentActiveTab: string | null = null;

  // Restore workspace from saved state
  async restore(): Promise<{
    openFiles: OpenFile[];
    activeTab: string | null;
    lastOpenFiles: string[];
  }> {
    this.state = vaultConfigStore.getWorkspace();

    if (!this.state) {
      console.log('[WorkspaceStateManager] No saved workspace found, starting fresh');
      return {
        openFiles: [],
        activeTab: null,
        lastOpenFiles: [],
      };
    }

    try {
      console.log('[WorkspaceStateManager] Restoring workspace state');

      // Extract open files from workspace state
      const openFiles = this.extractOpenFiles(this.state);
      const activeTab = this.state.active || null;
      const lastOpenFiles = this.state.lastOpenFiles || [];

      this.currentOpenFiles = openFiles;
      this.currentActiveTab = activeTab;

      return {
        openFiles,
        activeTab,
        lastOpenFiles,
      };
    } catch (e) {
      console.error('[WorkspaceStateManager] Failed to restore workspace:', e);
      return {
        openFiles: [],
        activeTab: null,
        lastOpenFiles: [],
      };
    }
  }

  private extractOpenFiles(state: WorkspaceState): OpenFile[] {
    const files: OpenFile[] = [];

    // Helper function to traverse the workspace tree
    function traverse(node: any): void {
      if (node.type === 'tabs') {
        // Extract files from tabs
        if (node.children) {
          for (const child of node.children) {
            if (child.type === 'leaf' && child.state?.file) {
              files.push({
                path: child.state.file,
                name: child.state.file.split(/[/\\]/).pop() || '',
                content: '', // Will be loaded separately
                isDirty: false,
              });
            }
          }
        }
      } else if (node.type === 'split' && node.children) {
        // Recursively traverse splits
        for (const child of node.children) {
          traverse(child);
        }
      }
    }

    // Traverse main workspace
    traverse(state.main);

    console.log(`[WorkspaceStateManager] Extracted ${files.length} files from workspace`);
    return files;
  }

  // Capture current workspace state
  capture(openFiles: OpenFile[], activeTab: string | null, lastOpenFiles: string[]): WorkspaceState {
    // Create a simplified workspace state from current app state
    const tabsChildren = openFiles.map((file, index) => ({
      id: `leaf-${index}`,
      type: 'leaf' as const,
      state: {
        type: 'markdown',
        file: file.path,
        mode: 'source' as const,
      },
      pinned: false,
    }));

    const mainArea: any = {
      id: 'main-tabs',
      type: 'tabs' as const,
      children: tabsChildren,
      currentTab: activeTab
        ? openFiles.findIndex((f) => f.path === activeTab)
        : 0,
    };

    return {
      main: mainArea,
      left: {
        collapsed: false,
        width: 256,
        activeTabs: {},
        tabs: [
          {
            id: 'left-tabs',
            type: 'tabs',
            children: [
              {
                id: 'file-explorer',
                type: 'leaf',
                state: { type: 'file-explorer' },
              },
            ],
            currentTab: 0,
          },
        ],
      },
      right: {
        collapsed: true,
        width: 300,
        activeTabs: {},
        tabs: [],
      },
      active: activeTab,
      lastOpenFiles: lastOpenFiles.slice(0, 10),
      leftRibbon: {
        hiddenItems: [],
      },
      rightRibbon: {
        hiddenItems: [],
      },
    };
  }

  // Queue save (debounced)
  queueSave(openFiles: OpenFile[], activeTab: string | null, lastOpenFiles: string[]): void {
    this.currentOpenFiles = openFiles;
    this.currentActiveTab = activeTab;

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = window.setTimeout(() => {
      this.save(openFiles, activeTab, lastOpenFiles);
      this.saveDebounceTimer = null;
    }, 1000);
  }

  // Save immediately
  async save(openFiles: OpenFile[], activeTab: string | null, lastOpenFiles: string[]): Promise<void> {
    try {
      const state = this.capture(openFiles, activeTab, lastOpenFiles);
      await vaultConfigStore.saveWorkspace(state);
      console.log('[WorkspaceStateManager] Saved workspace state');
    } catch (e) {
      console.error('[WorkspaceStateManager] Failed to save workspace:', e);
    }
  }

  // Save immediately using current state
  async saveNow(lastOpenFiles: string[]): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    await this.save(this.currentOpenFiles, this.currentActiveTab, lastOpenFiles);
  }

  // Setup auto-save on events (call this from App component)
  setupAutoSave(
    onSave: (openFiles: OpenFile[], activeTab: string | null, lastOpenFiles: string[]) => void
  ): void {
    // Save before window close
    window.addEventListener('beforeunload', () => {
      this.saveNow([]);
    });

    console.log('[WorkspaceStateManager] Auto-save setup complete');
  }
}

export const workspaceStateManager = new WorkspaceStateManager();
