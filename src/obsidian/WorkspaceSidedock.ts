// =============================================================================
// WorkspaceSidedock - Side Panels (Left/Right Docks)
// =============================================================================

import { WorkspaceItem } from './WorkspaceItem';
import { WorkspaceLeaf } from './WorkspaceLeaf';
import type { Workspace } from './types';

export class WorkspaceSidedock extends WorkspaceItem {
  workspace: Workspace;
  side: 'left' | 'right';
  containerEl: HTMLElement;

  constructor(workspace: Workspace, side: 'left' | 'right') {
    super('split', 'vertical');
    this.workspace = workspace;
    this.side = side;
    this.containerEl = document.createElement('div');
    this.containerEl.className = `workspace-sidedock workspace-sidedock-${side}`;
  }

  /**
   * Add a leaf to the sidedock
   */
  addLeaf(type: string): WorkspaceLeaf {
    const leaf = new WorkspaceLeaf(this.workspace);
    const leafItem = new WorkspaceItem('leaf');
    leafItem.leaf = leaf;
    leaf.parent = leafItem;
    this.addChild(leafItem);
    return leaf;
  }

  /**
   * Get all children as states
   */
  getChildren(): any[] {
    return this.children;
  }

  /**
   * Toggle collapse state
   */
  toggleCollapse(): void {
    this.containerEl.classList.toggle('is-collapsed');
  }

  /**
   * Check if collapsed
   */
  isCollapsed(): boolean {
    return this.containerEl.classList.contains('is-collapsed');
  }
}
