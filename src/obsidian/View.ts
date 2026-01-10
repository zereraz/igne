// =============================================================================
// View - Base Classes for Workspace Views
// =============================================================================

import { Component } from './Component';
import type { WorkspaceLeaf, TFile, App, IconName, ViewStateResult } from './types';

// Re-export type for convenience
export type { ViewStateResult };

// Import WorkspaceLeaf class type (not interface) for proper typing
import { WorkspaceLeaf as WorkspaceLeafClass } from './WorkspaceLeaf';

export abstract class View extends Component {
  app: App;
  leaf: WorkspaceLeafClass;
  containerEl: HTMLElement;
  icon: IconName;
  navigation: boolean;

  constructor(leaf: WorkspaceLeafClass) {
    super();
    this.leaf = leaf;
    this.app = leaf.workspace.app;
    this.containerEl = leaf.containerEl;
    this.icon = 'file-text';
    this.navigation = true;
  }

  abstract getViewType(): string;
  abstract getDisplayText(): string;
  abstract getIcon(): IconName;

  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}

  getState(): any { return {}; }
  async setState(state: any, result: ViewStateResult): Promise<void> {}

  onResize(): void {}
}

export abstract class ItemView extends View {
  contentEl: HTMLElement;

  constructor(leaf: WorkspaceLeafClass) {
    super(leaf);
    this.contentEl = this.containerEl.createDiv({ cls: 'item-view-content' });
  }

  addAction(icon: IconName, title: string, callback: (evt: MouseEvent) => any): HTMLElement {
    const actionEl = this.containerEl.createDiv({ cls: 'view-action' });
    actionEl.setAttribute('aria-label', title);
    // Use lucide-react icon or similar
    return actionEl;
  }
}

export abstract class FileView extends ItemView {
  file: TFile | null = null;
  allowNoFile: boolean = false;

  getFile(): TFile | null { return this.file; }
  canAcceptExtension(extension: string): boolean { return true; }

  async onLoadFile(file: TFile): Promise<void> {
    this.file = file;
    await this.onOpen();
  }

  onUnloadFile(file: TFile): void {
    this.file = null;
  }
}

export abstract class TextFileView extends FileView {
  data: string = '';

  async onLoadFile(file: TFile): Promise<void> {
    this.data = await this.app.vault.read(file);
    this.setViewData(this.data, false);
    await super.onLoadFile(file);
  }

  onUnloadFile(file: TFile): void {
    this.data = '';
    super.onUnloadFile(file);
  }

  getViewData(): string { return this.data; }
  abstract setViewData(data: string, clear: boolean): void;
}
