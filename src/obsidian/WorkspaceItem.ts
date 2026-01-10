// =============================================================================
// WorkspaceItem - Tree Structure for Workspace Layout
// =============================================================================

import type { WorkspaceLeaf, SplitDirection } from './types';

// Import the actual class for type checking
import { WorkspaceLeaf as WorkspaceLeafClass } from './WorkspaceLeaf';

export class WorkspaceItem {
  type?: 'split' | 'leaf';
  direction?: SplitDirection;
  children: WorkspaceItem[] = [];
  parent: WorkspaceItem | null = null;
  leaf: WorkspaceLeafClass | null = null;

  constructor(type: 'split' | 'leaf', direction?: SplitDirection) {
    this.type = type;
    if (type === 'split') {
      this.direction = direction || 'horizontal';
    }
  }

  addChild(child: WorkspaceItem, index?: number): void {
    child.parent = this;
    if (index !== undefined) {
      this.children.splice(index, 0, child);
    } else {
      this.children.push(child);
    }
  }

  removeChild(child: WorkspaceItem): void {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  getLeaf(): WorkspaceLeafClass | null {
    if (this.type === 'leaf') {
      return this.leaf;
    }
    return null;
  }

  getLeaves(): WorkspaceLeafClass[] {
    if (this.type === 'leaf' && this.leaf) {
      return [this.leaf];
    }

    const leaves: WorkspaceLeafClass[] = [];
    for (const child of this.children) {
      leaves.push(...child.getLeaves());
    }
    return leaves;
  }

  getDirection(): SplitDirection {
    return this.direction || 'horizontal';
  }

  /**
   * Split a child leaf, creating a new leaf alongside it
   */
  splitChild(childLeaf: WorkspaceLeafClass, direction: SplitDirection): WorkspaceLeafClass {
    // If this is a leaf item, we can't split it
    if (this.type === 'leaf') {
      throw new Error('Cannot split a leaf item directly');
    }

    // Find the leaf item containing the child leaf
    let leafItem: WorkspaceItem | null = null;
    let parentItem: WorkspaceItem | null = this;

    const searchResult = this.findLeafInItem(this, childLeaf);
    if (searchResult) {
      leafItem = searchResult.leafItem;
      parentItem = searchResult.parent;
    }

    if (!leafItem || !parentItem) {
      // If we can't find the leaf, create a new one at this level
      const newLeaf = new WorkspaceLeafClass((this as any).workspace);
      const newLeafItem = new WorkspaceItem('leaf');
      newLeafItem.leaf = newLeaf;
      newLeaf.parent = newLeafItem;
      this.addChild(newLeafItem);
      return newLeaf;
    }

    // Create new leaf
    const newLeaf = new WorkspaceLeafClass((this as any).workspace);
    const newLeafItem = new WorkspaceItem('leaf');
    newLeafItem.leaf = newLeaf;
    newLeaf.parent = newLeafItem;

    // Insert the new leaf next to the existing one
    const index = parentItem.children.indexOf(leafItem);
    parentItem.addChild(newLeafItem, index + 1);

    // If directions don't match, we need to create a nested split
    if (parentItem.direction !== direction) {
      const newSplit = new WorkspaceItem('split', direction);
      parentItem.removeChild(leafItem);
      parentItem.removeChild(newLeafItem);
      newSplit.addChild(leafItem);
      newSplit.addChild(newLeafItem);
      parentItem.addChild(newSplit, index);
    }

    return newLeaf;
  }

  private findLeafInItem(
    item: WorkspaceItem,
    leaf: WorkspaceLeafClass
  ): { leafItem: WorkspaceItem; parent: WorkspaceItem } | null {
    for (const child of item.children) {
      if (child.type === 'leaf' && child.leaf === leaf) {
        return { leafItem: child, parent: item };
      }
      if (child.type === 'split') {
        const found = this.findLeafInItem(child, leaf);
        if (found) return found;
      }
    }
    return null;
  }
}
