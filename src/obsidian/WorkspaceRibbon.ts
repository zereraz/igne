// =============================================================================
// WorkspaceRibbon - Action Ribbon (Left/Right Ribbon Icons)
// =============================================================================

import type { Workspace, IconName } from './types';

export class WorkspaceRibbon {
  workspace: Workspace;
  side: 'left' | 'right';
  actions: Map<string, RibbonAction> = new Map();
  containerEl: HTMLElement;

  constructor(workspace: Workspace, side: 'left' | 'right') {
    this.workspace = workspace;
    this.side = side;
    this.containerEl = document.createElement('div');
    this.containerEl.className = `workspace-ribbon workspace-ribbon-${side}`;
  }

  /**
   * Add an action icon to the ribbon
   */
  addAction(
    id: string,
    icon: IconName,
    title: string,
    callback: (evt: MouseEvent) => void
  ): void {
    const actionEl = this.containerEl.createDiv({
      cls: 'workspace-ribbon-action',
    });
    actionEl.setAttribute('aria-label', title);
    // Add icon element

    const action: RibbonAction = { id, icon, title, callback, el: actionEl };
    this.actions.set(id, action);

    actionEl.addEventListener('click', callback);
  }

  /**
   * Remove an action from the ribbon
   */
  removeAction(id: string): void {
    const action = this.actions.get(id);
    if (action) {
      action.el.remove();
      this.actions.delete(id);
    }
  }

  /**
   * Get all actions
   */
  getActions(): RibbonAction[] {
    return Array.from(this.actions.values());
  }
}

export interface RibbonAction {
  id: string;
  icon: IconName;
  title: string;
  callback: (evt: MouseEvent) => void;
  el: HTMLElement;
}
