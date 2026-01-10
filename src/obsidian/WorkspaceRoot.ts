// =============================================================================
// WorkspaceRoot - Root Split Container for Main Workspace Area
// =============================================================================

import { WorkspaceItem } from './WorkspaceItem';
import { WorkspaceLeaf } from './WorkspaceLeaf';
import type { Workspace, SplitDirection } from './types';

export class WorkspaceRoot extends WorkspaceItem {
  workspace: Workspace;

  constructor(workspace: Workspace) {
    super('split', 'horizontal');
    this.workspace = workspace;
  }

  /**
   * Create a new leaf in the root split
   */
  createNewLeaf(direction: SplitDirection = 'horizontal'): WorkspaceLeaf {
    const leaf = new WorkspaceLeaf(this.workspace);
    const leafItem = new WorkspaceItem('leaf');
    leafItem.leaf = leaf;
    leaf.parent = leafItem;

    if (this.children.length === 0) {
      this.addChild(leafItem);
    } else {
      // Create a new split to hold existing and new leaf
      const newSplit = new WorkspaceItem('split', direction);
      newSplit.addChild(this.children[0]);
      newSplit.addChild(leafItem);
      this.children[0] = newSplit;
      newSplit.parent = this;
    }

    return leaf;
  }

  /**
   * Get state for serialization
   */
  getState(): any {
    return {
      type: 'root',
      direction: this.direction,
      children: this.children.map(c => this.serializeItem(c)),
    };
  }

  private serializeItem(item: WorkspaceItem): any {
    if (item.type === 'leaf' && item.leaf) {
      return {
        type: 'leaf',
        viewState: item.leaf.getViewState(),
      };
    }
    return {
      type: 'split',
      direction: item.direction,
      children: item.children.map(c => this.serializeItem(c)),
    };
  }

  getLeaves(): WorkspaceLeaf[] {
    const leaves: WorkspaceLeaf[] = [];
    for (const child of this.children) {
      leaves.push(...child.getLeaves());
    }
    return leaves;
  }

  /**
   * Split a child leaf
   */
  splitChild(childLeaf: WorkspaceLeaf, direction: SplitDirection): WorkspaceLeaf {
    // Find the leaf item containing this leaf
    const leafItem = this.findLeafItem(childLeaf);
    if (!leafItem) {
      return this.createNewLeaf(direction);
    }

    const parent = leafItem.parent;
    if (!parent) {
      return this.createNewLeaf(direction);
    }

    // Create new leaf
    const newLeaf = new WorkspaceLeaf(this.workspace);
    const newLeafItem = new WorkspaceItem('leaf');
    newLeafItem.leaf = newLeaf;
    newLeaf.parent = newLeafItem;

    // If parent is a split, add the new leaf next to the existing one
    if (parent.type === 'split') {
      const index = parent.children.indexOf(leafItem);
      parent.addChild(newLeafItem, index + 1);

      // If directions don't match, create a nested split
      if (parent.direction !== direction) {
        const newSplit = new WorkspaceItem('split', direction);
        parent.removeChild(leafItem);
        parent.removeChild(newLeafItem);
        newSplit.addChild(leafItem);
        newSplit.addChild(newLeafItem);
        parent.addChild(newSplit, index);
      }
    }

    return newLeaf;
  }

  private findLeafItem(leaf: WorkspaceLeaf): WorkspaceItem | null {
    for (const child of this.children) {
      if (child.type === 'leaf' && child.leaf === leaf) {
        return child;
      }
      if (child.type === 'split') {
        const found = this.findLeafItemInSplit(child, leaf);
        if (found) return found;
      }
    }
    return null;
  }

  private findLeafItemInSplit(item: WorkspaceItem, leaf: WorkspaceLeaf): WorkspaceItem | null {
    for (const child of item.children) {
      if (child.type === 'leaf' && child.leaf === leaf) {
        return child;
      }
      if (child.type === 'split') {
        const found = this.findLeafItemInSplit(child, leaf);
        if (found) return found;
      }
    }
    return null;
  }
}
