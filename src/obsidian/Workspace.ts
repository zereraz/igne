// =============================================================================
// Workspace - Window and Tab Management
// =============================================================================

import { Events } from './events';
import { WorkspaceLeaf } from './WorkspaceLeaf';
import { WorkspaceItem } from './WorkspaceItem';
import { WorkspaceSidedock } from './WorkspaceSidedock';
import { WorkspaceRibbon } from './WorkspaceRibbon';
import { WorkspaceRoot } from './WorkspaceRoot';
import type { App, EventRef, TFile, SplitDirection, PaneType, ViewCreator, IconName } from './types';
import type { View } from './View';

export class Workspace extends Events {
  leftSplit: WorkspaceSidedock;
  rightSplit: WorkspaceSidedock;
  leftRibbon: WorkspaceRibbon;
  rightRibbon: WorkspaceRibbon;
  rootSplit: WorkspaceRoot;

  activeLeaf: WorkspaceLeaf | null = null;
  activeEditor: any = null; // Will be MarkdownFileInfo type

  layoutReady: boolean = false;
  viewTypes: Map<string, ViewCreator> = new Map();
  editorExtensions: any[] = [];

  constructor(public app: App) {
    super();
    this.rootSplit = new WorkspaceRoot(this as any);
    this.leftSplit = new WorkspaceSidedock(this as any, 'left');
    this.rightSplit = new WorkspaceSidedock(this as any, 'right');
    this.leftRibbon = new WorkspaceRibbon(this as any, 'left');
    this.rightRibbon = new WorkspaceRibbon(this as any, 'right');
  }

  /**
   * Get a leaf (pane) for opening files
   */
  getLeaf(newLeaf?: boolean | PaneType): WorkspaceLeaf {
    // If no specific request, return active leaf or first available
    if (!newLeaf) {
      if (this.activeLeaf) return this.activeLeaf;
      const leaves = this.rootSplit.getLeaves();
      if (leaves.length > 0) return leaves[0];
    }

    // Create new leaf
    const direction: SplitDirection = (newLeaf === true) ? 'vertical' : 'horizontal';
    return this.splitActiveLeaf(direction);
  }

  /**
   * Split the active leaf in a direction
   */
  splitActiveLeaf(direction?: SplitDirection): WorkspaceLeaf {
    if (!this.activeLeaf) {
      return this.rootSplit.createNewLeaf();
    }

    return this.rootSplit.splitChild(
      this.activeLeaf,
      direction || 'horizontal'
    );
  }

  /**
   * Get the active view of a specific type
   */
  getActiveViewOfType<T extends View>(viewType: new (...args: any[]) => T): T | null {
    const activeView = this.activeLeaf?.view;
    if (activeView && activeView instanceof viewType) {
      return activeView as T;
    }
    return null;
  }

  /**
   * Register a custom view type
   */
  registerView(type: string, viewCreator: ViewCreator): void {
    this.viewTypes.set(type, viewCreator);
  }

  /**
   * Unregister a view type
   */
  unregisterView(type: string): void {
    this.viewTypes.delete(type);
  }

  /**
   * Register a CodeMirror 6 editor extension
   */
  registerEditorExtension(extension: any): void {
    // Store extensions to be applied when creating editors
    // Implementation will be added when we integrate with the actual Editor component
    this.editorExtensions.push(extension);
  }

  /**
   * Open a file in a leaf
   */
  async openLinkText(
    linktext: string,
    sourcePath?: string,
    newLeaf?: boolean | PaneType,
    openState?: any
  ): Promise<void> {
    const file = this.app.metadataCache.getFirstLinkpathDest(linktext, sourcePath || '');
    if (file) {
      const leaf = this.getLeaf(newLeaf);
      await leaf.openFile(file, openState);
    }
  }

  /**
   * Get the current workspace layout
   */
  getLayout(): any {
    return {
      leftSplit: this.leftSplit.getChildren().map(c => c.getState?.() || {}),
      rightSplit: this.rightSplit.getChildren().map(c => c.getState?.() || {}),
      main: this.rootSplit.getState(),
    };
  }

  /**
   * Restore workspace layout
   */
  async setLayout(layout: any): Promise<void> {
    // Implementation for layout restoration
    this.layoutReady = true;
    this.trigger('layout-change');
  }

  // Event type definitions
  on(name: 'active-leaf-change', callback: (leaf: WorkspaceLeaf | null) => any): EventRef;
  on(name: 'file-open', callback: (file: TFile | null) => any): EventRef;
  on(name: 'layout-change', callback: () => any): EventRef;
  on(name: 'resize', callback: () => any): EventRef;
  on(name: string, callback: (...args: any[]) => any): EventRef {
    return super.on(name, callback);
  }
}
