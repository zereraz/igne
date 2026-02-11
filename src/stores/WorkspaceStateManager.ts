import { vaultConfigStore } from './VaultConfigStore';
import type { WorkspaceState, OpenFile, WorkspaceSplitState, WorkspaceTabsState, WorkspaceLeafState } from '../types';
import { toOsPath, toVaultPath, isVaultAbsolutePath } from '../utils/vaultPaths';

interface PaneState {
  id: string;
  tabs: OpenFile[];
  activeTab: string | null;
}

class WorkspaceStateManager {
  private state: WorkspaceState | null = null;
  private saveDebounceTimer: number | null = null;
  private currentPanes: PaneState[] = [];
  private currentSplitDirection: 'horizontal' | 'vertical' | null = null;
  private currentLastOpenFiles: string[] = [];
  private vaultPath: string | null = null;
  private currentOpenFiles: OpenFile[] = [];
  private currentActiveTab: string | null = null;

  /**
   * Set the current root path for path conversions.
   * Works for both vault paths and plain folder paths.
   */
  setRootPath(rootPath: string): void {
    this.vaultPath = rootPath;
  }

  /**
   * Get current panes state
   */
  getPanes(): PaneState[] {
    return this.currentPanes;
  }

  /**
   * Get current split direction
   */
  getSplitDirection(): 'horizontal' | 'vertical' | null {
    return this.currentSplitDirection;
  }

  /**
   * Restore workspace from saved state
   * Converts stored vault-relative paths to OS paths if needed
   */
  async restore(vaultPath?: string): Promise<{
    panes: PaneState[];
    lastOpenFiles: string[];
    splitDirection: 'horizontal' | 'vertical' | null;
  }> {
    if (vaultPath) {
      this.vaultPath = vaultPath;
    }

    this.state = vaultConfigStore.getWorkspace();

    if (!this.state) {
      console.log('[WorkspaceStateManager] No saved workspace found, starting fresh');
      return {
        panes: [{ id: 'main-pane', tabs: [], activeTab: null }],
        lastOpenFiles: [],
        splitDirection: null,
      };
    }

    try {
      console.log('[WorkspaceStateManager] Restoring workspace state');

      // Extract panes from workspace state
      const panes = this.extractPanes(this.state.main);
      const lastOpenFiles = (this.state.lastOpenFiles || []).map(p =>
        this.vaultPath && isVaultAbsolutePath(p)
          ? toOsPath(p, this.vaultPath)
          : p
      );

      // Determine split direction
      let splitDirection: 'horizontal' | 'vertical' | null = null;
      if (this.state.main && this.state.main.type === 'split') {
        splitDirection = this.state.main.direction;
      }

      this.currentPanes = panes;
      this.currentSplitDirection = splitDirection;

      return {
        panes,
        lastOpenFiles,
        splitDirection,
      };
    } catch (e) {
      console.error('[WorkspaceStateManager] Failed to restore workspace:', e);
      return {
        panes: [{ id: 'main-pane', tabs: [], activeTab: null }],
        lastOpenFiles: [],
        splitDirection: null,
      };
    }
  }

  /**
   * Extract panes from workspace state (supports split and tabs)
   */
  private extractPanes(mainArea: any): PaneState[] {
    const panes: PaneState[] = [];
    const vaultPath = this.vaultPath;

    if (!mainArea) {
      return [{ id: 'main-pane', tabs: [], activeTab: null }];
    }

    function traverse(node: any, paneIndex = 0): void {
      if (node.type === 'tabs') {
        const tabs: OpenFile[] = [];
        let activeTab: string | null = null;

        if (node.children) {
          for (const child of node.children) {
            if (child.type === 'leaf' && child.state?.file) {
              let filePath = child.state.file;
              // Convert vault path to OS path if needed
              if (vaultPath && isVaultAbsolutePath(filePath)) {
                filePath = toOsPath(filePath, vaultPath);
              }

              const tab: OpenFile = {
                path: filePath,
                name: filePath.split(/[/\\]/).pop() || '',
                content: '', // Will be loaded separately
                isDirty: false,
                isVirtual: false,
              };
              tabs.push(tab);

              // Check if this is the active tab
              if (node.currentTab !== undefined && node.children[node.currentTab] === child) {
                activeTab = filePath;
              }
            }
          }
        }

        panes.push({
          id: node.id || `pane-${paneIndex}`,
          tabs,
          activeTab,
        });
      } else if (node.type === 'split' && node.children) {
        // Recursively traverse splits
        for (let i = 0; i < node.children.length; i++) {
          traverse(node.children[i], i);
        }
      }
    }

    traverse(mainArea);

    // If no panes found, return default single pane
    if (panes.length === 0) {
      return [{ id: 'main-pane', tabs: [], activeTab: null }];
    }

    console.log(`[WorkspaceStateManager] Extracted ${panes.length} pane(s) from workspace`);
    return panes;
  }

  /**
   * Capture current workspace state
   * Converts OS paths to vault paths for storage
   * @param panes Current panes state
   * @param splitDirection Current split direction
   * @param lastOpenFiles Last opened files for quick access
   */
  capture(panes: PaneState[], splitDirection: 'horizontal' | 'vertical' | null, lastOpenFiles: string[]): WorkspaceState {
    // Convert OS paths to vault paths for storage
    const getVaultPath = (osPath: string): string => {
      if (this.vaultPath) {
        return toVaultPath(osPath, this.vaultPath);
      }
      return osPath;
    };

    let mainArea: WorkspaceSplitState | WorkspaceTabsState;

    if (panes.length === 1) {
      // Single pane - use tabs structure
      const pane = panes[0];
      const tabsChildren = pane.tabs.map((file, index) => ({
        id: `leaf-${index}`,
        type: 'leaf' as const,
        state: {
          type: 'markdown',
          file: getVaultPath(file.path),
          mode: 'source' as const,
        },
        pinned: false,
      }));

      mainArea = {
        id: pane.id,
        type: 'tabs',
        children: tabsChildren,
        currentTab: pane.activeTab
          ? pane.tabs.findIndex((f) => f.path === pane.activeTab)
          : pane.tabs.length > 0 ? 0 : 0,
      };
    } else {
      // Multiple panes - use split structure (Obsidian-compatible format)
      const children: (WorkspaceSplitState | WorkspaceTabsState)[] = panes.map((pane) => {
        const tabsChildren = pane.tabs.map((file, index) => ({
          id: `${pane.id}-leaf-${index}`,
          type: 'leaf' as const,
          state: {
            type: 'markdown',
            file: getVaultPath(file.path),
            mode: 'source' as const,
          },
          pinned: false,
        }));

        return {
          id: pane.id,
          type: 'tabs',
          children: tabsChildren,
          currentTab: pane.activeTab
            ? pane.tabs.findIndex((f) => f.path === pane.activeTab)
            : pane.tabs.length > 0 ? 0 : 0,
        };
      });

      mainArea = {
        id: 'main-split',
        type: 'split',
        direction: splitDirection || 'horizontal',
        children,
      };
    }

    // Get global active tab (first pane's active tab for now)
    const globalActiveTab = panes.length > 0 && panes[0].activeTab
      ? getVaultPath(panes[0].activeTab)
      : null;

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
      active: globalActiveTab,
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
      // Convert OpenFile[] to PaneState[] for capture
      const panes: PaneState[] = [{
        id: 'main-pane',
        tabs: openFiles,
        activeTab: activeTab,
      }];
      const state = this.capture(panes, null, lastOpenFiles);
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
