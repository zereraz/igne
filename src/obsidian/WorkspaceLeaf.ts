// =============================================================================
// WorkspaceLeaf - Container for Views (Tabs/Panes)
// =============================================================================

import { Component } from './Component';
import { View } from './View';
import type { App, WorkspaceItem, ViewState, TFile, OpenViewState } from './types';
import { WorkspaceItem as WorkspaceItemClass } from './WorkspaceItem';

export class WorkspaceLeaf extends Component {
  view: View | null = null;
  parent: WorkspaceItemClass | null = null;
  containerEl: HTMLElement;
  workspace: any; // Will be Workspace instance

  constructor(workspace: any) {
    super();
    this.workspace = workspace;
    this.containerEl = document.createElement('div');
    this.containerEl.className = 'workspace-leaf';
  }

  getViewState(): ViewState {
    return {
      type: this.view?.getViewType() || 'empty',
      state: this.view?.getState(),
      active: this === this.workspace.activeLeaf,
    };
  }

  async setViewState(viewState: ViewState): Promise<void> {
    const viewType = viewState.type;
    const viewCreator = this.workspace.viewTypes.get(viewType);

    if (!viewCreator) {
      console.error(`Unknown view type: ${viewType}`);
      return;
    }

    // Close existing view
    if (this.view) {
      await this.view.onClose();
    }

    // Create new view
    const newView = viewCreator(this);
    this.view = newView;
    if (this.view) {
      await this.view.onOpen();

      // Restore state
      if (viewState.state) {
        await this.view.setState(viewState.state, {});
      }
    }
  }

  async openFile(file: TFile, openState?: OpenViewState): Promise<void> {
    // Find appropriate view for file extension
    const viewTypesEntries: [string, any][] = this.workspace.viewTypes ? Array.from(this.workspace.viewTypes.entries()) : [];
    let matchingViewType: string | null = null;

    for (const [viewType, viewCreator] of viewTypesEntries) {
      const tempView = viewCreator(this);
      if (tempView instanceof View && 'canAcceptExtension' in tempView) {
        const view = tempView as any;
        if (view.canAcceptExtension(file.extension)) {
          matchingViewType = viewType;
          // Clean up temp view
          if (tempView !== this.view) {
            await tempView.onClose();
          }
          break;
        }
      }
      // Always clean up temp view
      if (tempView !== this.view) {
        await tempView.onClose();
      }
    }

    if (!matchingViewType) {
      console.error(`No view found for extension: ${file.extension}`);
      return;
    }

    await this.setViewState({ type: matchingViewType, state: { file } });
  }

  detach(): void {
    if (this.view) {
      this.view.onClose();
    }
    this.containerEl.remove();
    if (this.parent) {
      this.parent.children = this.parent.children.filter(item => item.leaf !== this);
    }
  }

  getRoot(): WorkspaceItemClass {
    let current = this.parent;
    while (current?.parent) {
      current = current.parent;
    }
    return current || this.workspace.rootSplit;
  }

  getParent(): WorkspaceItemClass {
    return this.parent || this.workspace.rootSplit;
  }
}
