import { vaultConfigStore } from './VaultConfigStore';
import type { WorkspaceState, OpenFile } from '../types';
import { toOsPath, toVaultPath, isVaultAbsolutePath } from '../utils/vaultPaths';

class WorkspaceStateManager {
  private state: WorkspaceState | null = null;
  private saveDebounceTimer: number | null = null;
  private currentOpenFiles: OpenFile[] = [];
  private currentActiveTab: string | null = null;
  private currentLastOpenFiles: string[] = [];
  private vaultPath: string | null = null;

  /**
   * Set the current vault path for path conversions
   */
  setVaultPath(vaultPath: string): void {
    this.vaultPath = vaultPath;
  }

  /**
   * Restore workspace from saved state
   * Converts stored vault paths to OS paths if needed
   */
  async restore(vaultPath?: string): Promise<{
    openFiles: OpenFile[];
    activeTab: string | null;
    lastOpenFiles: string[];
  }> {
    if (vaultPath) {
      this.vaultPath = vaultPath;
    }

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

      // Extract open files from workspace state and convert vault paths to OS paths
      const openFiles = this.extractOpenFiles(this.state);
      const activeTab = this.state.active || null;
      const lastOpenFiles = (this.state.lastOpenFiles || []).map(p =>
        this.vaultPath && isVaultAbsolutePath(p)
          ? toOsPath(p, this.vaultPath)
          : p
      );

      this.currentOpenFiles = openFiles;
      this.currentActiveTab = activeTab && this.vaultPath && isVaultAbsolutePath(activeTab)
        ? toOsPath(activeTab, this.vaultPath)
        : activeTab;

      return {
        openFiles,
        activeTab: this.currentActiveTab,
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
    const vaultPath = this.vaultPath;

    // Helper function to traverse the workspace tree
    function traverse(node: any): void {
      if (node.type === 'tabs') {
        // Extract files from tabs
        if (node.children) {
          for (const child of node.children) {
            if (child.type === 'leaf' && child.state?.file) {
              let filePath = child.state.file;
              // Convert vault path to OS path if needed
              if (vaultPath && isVaultAbsolutePath(filePath)) {
                filePath = toOsPath(filePath, vaultPath);
              }
              files.push({
                path: filePath,
                name: filePath.split(/[/\\]/).pop() || '',
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
  // Converts OS paths to vault paths for storage
  capture(openFiles: OpenFile[], activeTab: string | null, lastOpenFiles: string[]): WorkspaceState {
    // Convert OS paths to vault paths for storage
    const getVaultPath = (osPath: string): string => {
      if (this.vaultPath) {
        return toVaultPath(osPath, this.vaultPath);
      }
      return osPath;
    };

    // Create a simplified workspace state from current app state
    const tabsChildren = openFiles.map((file, index) => ({
      id: `leaf-${index}`,
      type: 'leaf' as const,
      state: {
        type: 'markdown',
        file: getVaultPath(file.path),
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
      active: activeTab ? getVaultPath(activeTab) : null,
      lastOpenFiles: lastOpenFiles.slice(0, 10).map(getVaultPath),
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
    this.currentLastOpenFiles = lastOpenFiles;

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = window.setTimeout(() => {
      // Use stored values instead of closure values to avoid stale data
      this.save(this.currentOpenFiles, this.currentActiveTab, this.currentLastOpenFiles);
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

  // Cleanup method to clear any pending timers
  destroy(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
  }
}

export const workspaceStateManager = new WorkspaceStateManager();
