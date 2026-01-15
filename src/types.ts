// =============================================================================
// Core Domain Types
// =============================================================================

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  modified?: number;
  children?: FileEntry[];
}

/**
 * File metadata returned by stat_path backend command
 * Used for checking file existence without reading content
 */
export interface FileMetadata {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
  size: number;
  modified: number;
  exists: boolean;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  /** If true, file only exists in memory until content is typed */
  isVirtual?: boolean;
}

// =============================================================================
// Vault & File System Types
// =============================================================================

export interface Vault {
  path: string;
  name: string;
  files: FileEntry[];
}

export type FilePath = string;
export type FileName = string;
export type FileContent = string;

// =============================================================================
// Tab Management Types
// =============================================================================

export type TabPath = string;

export interface Tab extends OpenFile {
  path: TabPath;
}

export interface TabsState {
  openTabs: Tab[];
  activeTabPath: TabPath | null;
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchDocument {
  id: string; // File path as unique ID
  path: string;
  name: string;
  content: string;
}

export interface SearchResult {
  path: string;
  name: string;
  score?: number;
}

export type SearchQuery = string;

export interface SearchOptions {
  fuzzy?: boolean;
  prefix?: boolean;
  threshold?: number;
}

// =============================================================================
// Wikilink Types
// =============================================================================

export interface WikilinkMatch {
  name: string;
  alias?: string;
  fullMatch: string;
  position: {
    start: number;
    end: number;
  };
}

export interface WikilinkSearchResult {
  name: string;
  path: string;
}

export interface WikilinkReference {
  sourcePath: string;
  targetName: string;
  alias?: string;
  context?: string; // Surrounding text for context
}

// =============================================================================
// UI State Types
// =============================================================================

export interface QuickSwitcherState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  target: FileEntry | null;
}

export interface RenameDialogState {
  isOpen: boolean;
  filePath: string | null;
  currentName: string;
}

export interface BacklinkState {
  filePath: string | null;
  backlinks: WikilinkSearchResult[];
  isCollapsed: boolean;
}

// =============================================================================
// Editor Types
// =============================================================================

export interface EditorState {
  content: string;
  cursorPosition: { line: number; column: number } | null;
  selection: {
    from: number;
    to: number;
  } | null;
}

export type EditorChangeHandler = (path: string, content: string) => void;
export type WikilinkClickHandler = (target: string) => void;

// =============================================================================
// Markdown Types
// =============================================================================

export type MarkdownExtension = 'wikilink' | 'embed' | 'tag' | 'strikethrough' | 'highlight' | 'task' | 'callout' | 'math';

export interface CalloutType {
  name: string;
  color: string;
  icon: string;
}

export type CalloutTypeName = 'note' | 'info' | 'tip' | 'warning' | 'danger' | 'example' | 'quote' | 'bug' | 'success' | 'failure' | 'question' | 'important' | 'caution';

// =============================================================================
// Style/CSS Types
// =============================================================================

import type { CSSProperties } from 'react';

export type StyleProps = CSSProperties;

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderDefault: string;
  borderSubtle: string;
  borderFocus: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentDashed: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface Typography {
  fontMono: string;
  fontSans: string;
  sizeXs: string;
  sizeSm: string;
  sizeMd: string;
  sizeBase: string;
  sizeLg: string;
  weightNormal: number;
  weightMedium: number;
  weightSemibold: number;
  lineHeightTight: number;
  lineHeightNormal: number;
}

export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

// =============================================================================
// Event Handler Types
// =============================================================================

export type FileSelectHandler = (path: string, newTab?: boolean) => void;
export type FileSaveHandler = (path: string, content: string) => Promise<void>;
export type FileDeleteHandler = (path: string) => Promise<void>;
export type FileRenameHandler = (oldPath: string, newName: string) => Promise<void>;

// =============================================================================
// Keyboard Shortcut Types
// =============================================================================

export type KeyboardShortcut = string;
export type KeyboardModifiers = {
  meta?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
};

export interface KeyBinding {
  key: string;
  modifiers?: KeyboardModifiers;
  handler: () => void;
  description?: string;
}

// =============================================================================
// Component Props Types (commonly reused)
// =============================================================================

export interface BaseComponentProps {
  className?: string;
  style?: StyleProps;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export interface ButtonProps extends BaseComponentProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

// =============================================================================
// Utility Types
// =============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ById<T> = Record<string, T>;

// =============================================================================
// File Operation Types
// =============================================================================

export type FileOperation = 'create' | 'update' | 'delete' | 'rename' | 'move';

export interface FileOperationResult {
  success: boolean;
  path?: string;
  error?: string;
}

// =============================================================================
// Polling & Sync Types
// =============================================================================

export type PollInterval = number;
export const DEFAULT_POLL_INTERVAL = 2000;

export interface FileWatcherState {
  isWatching: boolean;
  lastPollTime: number | null;
  fileCount: number;
}

// =============================================================================
// Debug/Logging Types
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: string;
}

// =============================================================================
// State Persistence Types
// =============================================================================

// --- Vault Registry ---

export interface VaultEntry {
  path: string;
  name: string;
  lastOpened: number;
  created: number;
  noteCount?: number;
  size?: number;
}

export interface VaultsRegistry {
  version: number;
  vaults: VaultEntry[];
  lastOpenedVault: string | null;
}

// --- Window State ---

export interface WindowState {
  version: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullscreen: boolean;
  displayId?: string;
}

// --- Global Settings ---

export interface GlobalSettings {
  version: number;
  openLastVault: boolean;
  showVaultSwitcher: boolean;
  checkForUpdates: boolean;
  autoUpdate: boolean;
  sendAnonymousStats: boolean;
  developerMode: boolean;
  showDebugInfo: boolean;
  language: string;
  defaultVaultLocation: string;
  nativeMenus: boolean;
  framelessWindow: boolean;
}

// --- Vault Settings ---

export interface VaultSettings {
  defaultViewMode: 'source' | 'preview' | 'live';
  livePreview: boolean;
  strictLineBreaks: boolean;
  showLineNumber: boolean;
  showFrontmatter: boolean;
  foldHeading: boolean;
  foldIndent: boolean;
  readableLineLength: boolean;
  vimMode: boolean;
  tabSize: number;
  useTab: boolean;
  spellcheck: boolean;
  spellcheckLanguages: string[];
  newFileLocation: 'root' | 'current' | 'folder';
  newFileFolderPath: string;
  attachmentFolderPath: string;
  newLinkFormat: 'shortest' | 'relative' | 'absolute';
  useMarkdownLinks: boolean;
  alwaysUpdateLinks: boolean;
  trashOption: 'system' | 'local' | 'none';
  showDebugMenu: boolean;
}

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
  defaultViewMode: 'live',
  livePreview: true,
  strictLineBreaks: false,
  showLineNumber: false,
  showFrontmatter: true,
  foldHeading: true,
  foldIndent: true,
  readableLineLength: true,
  vimMode: false,
  tabSize: 4,
  useTab: true,
  spellcheck: true,
  spellcheckLanguages: ['en-US'],
  newFileLocation: 'current',
  newFileFolderPath: '',
  attachmentFolderPath: '',
  newLinkFormat: 'shortest',
  useMarkdownLinks: false,
  alwaysUpdateLinks: true,
  trashOption: 'system',
  showDebugMenu: false,
};

// --- Appearance Settings ---

export interface AppearanceSettings {
  baseFontSize: number;
  baseTheme: 'dark' | 'light';
  cssTheme: string;
  accentColor: string;
  interfaceFontFamily: string;
  textFontFamily: string;
  monospaceFontFamily: string;
  enabledCssSnippets: string[];
  showViewHeader: boolean;
  nativeMenus: boolean | null;
  translucency: boolean;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  baseFontSize: 16,
  baseTheme: 'dark',
  cssTheme: '',
  accentColor: '#7c3aed',
  interfaceFontFamily: '',
  textFontFamily: '',
  monospaceFontFamily: '',
  enabledCssSnippets: [],
  showViewHeader: true,
  nativeMenus: null,
  translucency: false,
};

// --- Workspace State ---

export interface WorkspaceState {
  main: WorkspaceSplitState | WorkspaceTabsState;
  left: SidebarState;
  right: SidebarState;
  active: string | null;
  lastOpenFiles: string[];
  leftRibbon: {
    hiddenItems: string[];
  };
  rightRibbon: {
    hiddenItems: string[];
  };
}

export interface WorkspaceSplitState {
  id: string;
  type: 'split';
  direction: 'horizontal' | 'vertical';
  children: (WorkspaceSplitState | WorkspaceTabsState)[];
  sizes?: number[];
}

export interface WorkspaceTabsState {
  id: string;
  type: 'tabs';
  children: WorkspaceLeafState[];
  currentTab: number;
}

export interface WorkspaceLeafState {
  id: string;
  type: 'leaf';
  state: {
    type: string;
    state?: any;
    file?: string;
    mode?: 'source' | 'preview';
    scroll?: number;
  };
  pinned?: boolean;
  group?: string;
}

export interface SidebarState {
  collapsed: boolean;
  width: number;
  activeTabs: {
    [containerId: string]: string;
  };
  tabs: WorkspaceTabsState[];
}
