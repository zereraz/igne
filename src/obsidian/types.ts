// =============================================================================
// Obsidian Compatibility Type Definitions
// =============================================================================

// =============================================================================
// Workspace Type (forward declaration)
// =============================================================================

export interface Workspace {
  leftSplit: any;
  rightSplit: any;
  leftRibbon: any;
  rightRibbon: any;
  rootSplit: any;
  activeLeaf: WorkspaceLeaf | null;
  activeEditor: any;
  layoutReady: boolean;
  viewTypes: Map<string, any>;
  editorExtensions: any[];
  getLeaf(newLeaf?: boolean | PaneType): WorkspaceLeaf;
  splitActiveLeaf(direction?: SplitDirection): WorkspaceLeaf;
  getActiveViewOfType<T extends any>(viewType: new (...args: any[]) => T): T | null;
  registerView(type: string, viewCreator: any): void;
  unregisterView(type: string): void;
  registerEditorExtension(extension: any): void;
  openLinkText(linktext: string, sourcePath?: string, newLeaf?: boolean | PaneType, openState?: any): Promise<void>;
  getLayout(): any;
  setLayout(layout: any): Promise<void>;
  on(name: string, callback: (...args: any[]) => any): EventRef;
  trigger(name: string, ...args: any[]): void;
}

// View interface to avoid circular dependency
export interface View {
  getViewType(): string;
  getDisplayText(): string;
  getIcon(): IconName;
  onOpen(): Promise<void>;
  onClose(): Promise<void>;
  getState(): any;
  setState(state: any, result: ViewStateResult): Promise<void>;
}

// =============================================================================
// Events Base Class (needed before Workspace)
// =============================================================================

export interface Events {
  on(name: string, callback: (...args: any[]) => any): EventRef;
  off(name: string, ref: EventRef): void;
  trigger(name: string, ...args: any[]): void;
  tryTrigger(evt: string, ...args: any[]): void;
}

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
  file?: {
    path: string;
    basename: string;
    extension: string;
    stat?: FileStats;
  };
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

export interface PluginSettingTab {
  app: App;
  containerEl: HTMLElement;
  display(): void;
  hide(): void;
}

export interface Plugin {
  app: App;
  manifest: PluginManifest;
  onload(): void | Promise<void>;
  onunload(): void;
  loadData(): Promise<any>;
  saveData(data: any): Promise<void>;
  addCommand(command: Command): Command;
  addSettingTab(settingTab: PluginSettingTab): void;
  registerView(type: string, viewCreator: ViewCreator): void;
  registerEditorExtension(extension: any): void;
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

// Forward declarations to avoid circular dependencies
export interface WorkspaceLeaf {
  view: any; // View instance - using any to avoid circular dependency
  parent: any; // WorkspaceItem instance - using any to avoid circular dependency
}

export interface WorkspaceItem {
  type?: 'split' | 'leaf';
  direction?: SplitDirection;
  children?: WorkspaceItem[];
  parent?: WorkspaceItem | null;
  leaf?: any; // WorkspaceLeaf instance
}

export interface ViewState {
  type: string;
  state?: any;
  active?: boolean;
}

// =============================================================================
// View Types
// =============================================================================

export type IconName = string;

export interface Constructor<T> {
  new (...args: any[]): T;
}

export type ViewCreator = (leaf: any) => any; // Using any to avoid circular dependency

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

// Editor is implemented in Editor.ts - this is just the type export
export interface Editor {
  getDoc(): EditorDocument;
  getValue(): string;
  setValue(value: string): void;
  getSelection(): string;
  setSelection(anchor: EditorPosition, head?: EditorPosition): void;
  replaceSelection(text: string): void;
  getCursor(pos?: 'from' | 'to' | 'head' | 'anchor'): EditorPosition;
  setCursor(pos: EditorPosition | number, ch?: number): void;
  somethingSelected(): boolean;
  hasFocus(): boolean;
  offsetToPos(offset: number): EditorPosition;
  posToOffset(pos: EditorPosition): number;
  getLine(line: number): string;
  lineCount(): number;
  lastLine(): number;
  getRange(from: EditorPosition, to: EditorPosition): string;
  replaceRange(text: string, from?: EditorPosition, to?: EditorPosition): void;
  focus(): void;
  blur(): void;
}

// Forward declaration for MarkdownView
export interface MarkdownView {
  file: TFile | null;
  editor: Editor;
  view: any;
  data: string;
  getMode(): string;
  setMode(mode: string): void;
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

// =============================================================================
// App Types
// =============================================================================

export interface App {
  vault: any;
  workspace: any;
  metadataCache: any;
  fileManager: any;
  keymap: any;
  scope: any;
  plugins: any;
  commands: any;
  setting: any;
  themeManager: any;
  isMobile: boolean;
  appId: string;
  lastActiveFile: TFile | null;
  loadLocalStorage(key: string): string | null;
  saveLocalStorage(key: string, value: string): void;
}

export interface ViewStateResult {
  state?: any;
  error?: string;
}

export interface OpenViewState {
  state?: any;
  active?: boolean;
}

