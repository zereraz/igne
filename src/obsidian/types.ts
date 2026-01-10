// =============================================================================
// Obsidian Compatibility Type Definitions
// =============================================================================

// =============================================================================
// Core File Types
// =============================================================================

export abstract class TAbstractFile {
  vault: any; // Will be Vault instance, using any to avoid circular dependency
  path!: string;
  name!: string;
  parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
  stat!: FileStats;
  basename!: string;
  extension!: string;
}

export class TFolder extends TAbstractFile {
  children!: TAbstractFile[];
  isRoot(): boolean {
    return this.path === '' || this.path === '/';
  }
}

export interface FileStats {
  ctime: number;
  mtime: number;
  size: number;
}

// =============================================================================
// Position Types
// =============================================================================

export interface Pos {
  start: { line: number; col: number; offset: number };
  end: { line: number; col: number; offset: number };
}

// =============================================================================
// Metadata Types
// =============================================================================

export interface CachedMetadata {
  headings?: HeadingCache[];
  links?: LinkCache[];
  embeds?: EmbedCache[];
  tags?: TagCache[];
  frontmatter?: FrontMatterCache;
  blocks?: Record<string, BlockCache>;
  listItems?: ListItemCache[];
  frontmatterPosition?: Pos;
}

export interface HeadingCache {
  position: Pos;
  heading: string;
  level: number;
}

export interface LinkCache {
  position: Pos;
  link: string;
  original: string;
  displayText?: string;
}

export interface EmbedCache {
  position: Pos;
  link: string;
  original: string;
}

export interface TagCache {
  position: Pos;
  tag: string;
}

export interface BlockCache {
  position: Pos;
  id: string;
}

export interface ListItemCache {
  position: Pos;
  task: string | null;
}

export interface FrontMatterCache {
  [key: string]: any;
}

// =============================================================================
// Plugin Types
// =============================================================================

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  authorUrl: string;
  isDesktopOnly: boolean;
}

// =============================================================================
// Command Types
// =============================================================================

export interface Command {
  id: string;
  name: string;
  icon?: string;
  callback?: () => any;
  checkCallback?: (checking: boolean) => boolean | void;
  editorCallback?: (editor: Editor, ctx: MarkdownView) => any;
  editorCheckCallback?: (editor: Editor, ctx: MarkdownView, checking: boolean) => boolean | void;
  hotkeys?: Hotkey[];
}

export interface Hotkey {
  key: string;
  modifiers: Modifier[];
}

export type Modifier = 'Mod' | 'Ctrl' | 'Meta' | 'Shift' | 'Alt';

// =============================================================================
// Workspace Types
// =============================================================================

export type SplitDirection = 'horizontal' | 'vertical';
export type PaneType =
  | 'markdown'
  | 'graph'
  | 'backlink'
  | 'outgoing-link'
  | 'tag'
  | 'starred'
  | 'search'
  | 'custom';

export interface WorkspaceLeaf {
  view: View | null;
  parent: WorkspaceItem | null;
}

export interface WorkspaceItem {
  type?: 'split' | 'leaf';
  direction?: SplitDirection;
  children?: WorkspaceItem[];
}

export interface ViewState {
  type: string;
  state: any;
  active: boolean;
}

// =============================================================================
// View Types
// =============================================================================

export type IconName = string;

export interface Constructor<T> {
  new (...args: any[]): T;
}

export type ViewCreator = (leaf: WorkspaceLeaf) => View;

export abstract class View {
  leaf: WorkspaceLeaf;
  icon: IconName;
  navigation: boolean;

  constructor(leaf: WorkspaceLeaf) {
    this.leaf = leaf;
    this.icon = 'file-text';
    this.navigation = true;
  }

  abstract getViewType(): string;
  abstract getDisplayText(): string;
  abstract onOpen(): void;
  async onClose(): Promise<void> {}
}

export class MarkdownView extends View {
  editor!: Editor;

  getViewType(): string {
    return 'markdown';
  }

  getDisplayText(): string {
    return 'Markdown';
  }

  onOpen(): void {
    // Implementation in later phase
  }
}

// =============================================================================
// Editor Types
// =============================================================================

export interface EditorPosition {
  line: number;
  ch: number;
}

export interface EditorSelection {
  anchor: EditorPosition;
  head: EditorPosition;
}

export interface EditorChange {
  from: EditorPosition;
  to: EditorPosition;
  text: string[];
  origin: string;
}

export interface EditorState {
  doc: EditorDocument;
  selection: EditorSelection;
}

export interface EditorDocument {
  toString(): string;
  sliceString(from: number, to?: number): string;
  getLine(line: number): string;
}

export class Editor {
  getDoc(): EditorDocument {
    // Implementation in later phase
    return {} as EditorDocument;
  }

  getValue(): string {
    // Implementation in later phase
    return '';
  }

  setValue(_value: string): void {
    // Implementation in later phase
  }

  getSelection(): EditorSelection {
    // Implementation in later phase
    return { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } };
  }

  setSelection(_anchor: EditorPosition, _head?: EditorPosition): void {
    // Implementation in later phase
  }

  replaceSelection(_text: string): void {
    // Implementation in later phase
  }

  getCursor(): EditorPosition {
    // Implementation in later phase
    return { line: 0, ch: 0 };
  }

  setCursor(_line: number, _ch?: number): void {
    // Implementation in later phase
  }
}

// =============================================================================
// Event Types
// =============================================================================

export interface EventRef {
  registered: boolean;
  ctx: any;
  fn: any;
}

export type EventName =
  | 'create'
  | 'modify'
  | 'delete'
  | 'rename'
  | 'active-leaf-change'
  | 'file-open'
  | 'layout-change'
  | 'css-change'
  | 'quit'
  | 'codemirror';

