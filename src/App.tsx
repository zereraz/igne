import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { registerStandaloneHandler } from './main';
import {
  FolderOpen,
  FileText,
  FilePlus,
  Link2,
  List,
  Hash,
  Network,
  Star,
} from 'lucide-react';
import { useWorkspaceSync } from './hooks/useWorkspaceSync';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileWatcher, useDirectoryLoader } from './hooks/useFileWatcher';
import { useTabState, TabFile, isTabOpen, getTabByPath } from './hooks/useTabState';

// Helper function to check if a file/directory exists
async function fileExists(path: string): Promise<boolean> {
  try {
    const meta = await invoke<{ exists: boolean }>('stat_path', { path });
    return meta.exists;
  } catch {
    return false;
  }
}
import { FileTree } from './components/FileTree';
import { Editor } from './components/Editor';
import { TitleBar } from './components/TitleBar';
import { StatusBar } from './components/StatusBar';
import { Ribbon } from './components/Ribbon';
import { QuickSwitcher } from './components/QuickSwitcher';
import { BacklinksPanel } from './components/BacklinksPanel';
import { OutlinePanel } from './components/OutlinePanel';
import { TagsPanel } from './components/TagsPanel';
import { GraphView } from './components/GraphView';
import { LocalGraphView } from './components/LocalGraphView';
import { ContextMenu } from './components/ContextMenu';
import { RenameDialog } from './components/RenameDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PromptDialog } from './components/PromptDialog';
import { TemplateInsertModal } from './components/TemplateInsertModal';
import { DailyNotesNav } from './components/DailyNotesNav';
import { StarredFilesPanel } from './components/StarredFilesPanel';
import { VaultPicker } from './components/VaultPicker';
import { SettingsModal } from './components/SettingsModal';
import { StandaloneViewer } from './components/StandaloneViewer';
import { FileEntry } from './types';
import { searchStore } from './stores/searchStore';
import { vaultsStore } from './stores/VaultsStore';
import { windowStateStore } from './stores/WindowStateStore';
import { globalSettingsStore } from './stores/GlobalSettingsStore';
import { vaultConfigStore } from './stores/VaultConfigStore';
import { workspaceStateManager } from './stores/WorkspaceStateManager';
import { ThemeManager } from './obsidian/ThemeManager';
import {
  openDailyNote,
  loadDailyNotesConfig,
} from './utils/dailyNotes';
import { renameFileWithLinkUpdates, getLinkUpdateCount } from './utils/fileManager';
import { isImageFile, isVideoFile, isPdfFile } from './utils/embedParams';
import { loadTemplates, insertTemplateIntoFile, createFileFromTemplate } from './utils/templateLoader';
import { ensureDefaultVault } from './utils/defaultVault';
import { CommandRegistry } from './commands/registry';
import { setWorkspaceManager } from './tools/workspace';
import { logger } from './utils/logger';

// Dynamic app styles based on theme - using CSS variables from obsidian.css
const styles = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'var(--font-interface)',
    backgroundColor: 'var(--background-primary)',
    color: 'var(--text-normal)',
  },
  dirtyIndicator: {
    color: 'var(--color-orange)',
  },
  // Premium button: sharp corners, 100ms transitions
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '8px',
    paddingBottom: '8px',
    fontSize: '12px',
    fontFamily: 'var(--font-interface)',
    fontWeight: 500,
    backgroundColor: 'var(--interactive-normal)',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    color: 'var(--text-normal)',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '256px',
    backgroundColor: 'var(--background-secondary)',
    borderRight: '1px solid var(--background-modifier-border)',
    overflowY: 'auto' as const,
    flexShrink: 0,
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    paddingTop: '8px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '8px',
    paddingBottom: '8px',
  },
  vaultName: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 500,
    fontFamily: 'var(--font-interface)',
  },
  newFileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    fontFamily: 'var(--font-interface)',
    backgroundColor: 'transparent',
    border: '1px solid var(--background-modifier-border)',
    borderRadius: '2px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'border-color 100ms ease, color 100ms ease',
  },
  loading: {
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '16px',
    paddingBottom: '16px',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontFamily: 'var(--font-interface)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
    fontSize: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-interface)',
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'var(--background-primary)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  emptyContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-interface)',
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
  },
};

const UNTITLED_BASE = 'Untitled';

/**
 * Create a virtual untitled file (exists only in memory until content is typed)
 * Returns the new tab object to be added to openTabs
 * Checks existing tabs to avoid path collisions
 */
function createVirtualUntitledFile(vaultPath: string, existingTabs: TabFile[], subFolder?: string): TabFile {
  const basePath = subFolder || vaultPath;

  // Find the highest existing Untitled-N number in open tabs
  let maxCounter = 0;
  const untitledPattern = /^Untitled-(\d+)\.md$/;

  for (const tab of existingTabs) {
    const fileName = tab.path.split('/').pop() || '';
    const match = fileName.match(untitledPattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxCounter) {
        maxCounter = num;
      }
    }
  }

  // Use next available number
  const counter = maxCounter + 1;
  const fileName = `${UNTITLED_BASE}-${counter}.md`;
  const filePath = `${basePath}/${fileName}`;

  return {
    path: filePath,
    name: fileName,
    content: '',
    isDirty: false,
    isVirtual: true,
  };
}

/**
 * Find a unique file path that doesn't exist on disk
 * Used when materializing virtual files to avoid overwrites
 */
async function findUniqueFilePath(basePath: string, baseName: string): Promise<string> {
  let counter = 1;
  let filePath = `${basePath}/${baseName}-${counter}.md`;

  while (true) {
    try {
      const meta = await invoke<{ exists: boolean }>('stat_path', { path: filePath });
      if (!meta.exists) {
        return filePath;
      }
      counter++;
      filePath = `${basePath}/${baseName}-${counter}.md`;
    } catch {
      // If stat fails, assume path is available
      return filePath;
    }
  }
}

// === Recent standalone files ===
const RECENT_FILES_KEY = 'igne_recent_files';
const MAX_RECENT_FILES = 10;

export function getRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentFile(filePath: string) {
  const recent = getRecentFiles().filter(p => p !== filePath);
  recent.unshift(filePath);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_FILES)));
}

export function removeRecentFile(filePath: string) {
  const recent = getRecentFiles().filter(p => p !== filePath);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent));
}

interface ContextMenuState {
  path: string;
  isFolder: boolean;
  x: number;
  y: number;
}

function App() {
  // Persistence state
  const [isInitialized, setIsInitialized] = useState(false);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [vaultSettings, setVaultSettings] = useState<any>(null);
  const [appearanceSettings, setAppearanceSettings] = useState<any>(null);

  // Standalone file mode
  const [standaloneFilePath, setStandaloneFilePath] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // App state
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Tab state management - uses reducer pattern to eliminate stale closures
  const {
    tabs: openTabs,
    activeTab,
    activeTabPath,
    openTab,
    forceOpenTab,
    closeTab,
    closeActiveTab,
    setActive,
    updateContent,
    syncContent,
    replaceActiveTab,
    markSaved,
    materialize,
    renameTab,
    restoreWorkspace,
    stateRef: tabStateRef,
  } = useTabState();
  const [isVaultReady, setIsVaultReady] = useState(false);
  const [fileTreeError, setFileTreeError] = useState<string | null>(null);
  const [wikilinkQueue, setWikilinkQueue] = useState<Array<{target: string; newTab: boolean}>>([]);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [rightPanel, setRightPanel] = useState<'backlinks' | 'outline' | 'tags' | 'graph' | 'starred'>('backlinks');
  const [currentLine, setCurrentLine] = useState<number>(1);
  const [currentColumn, setCurrentColumn] = useState<number>(1);
  const [scrollToPosition, setScrollToPosition] = useState<number | undefined>(undefined);
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ name: string; path: string }>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [lineWrapping, setLineWrapping] = useState(true);
  const [readableLineLength, setReadableLineLength] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const switchingVaultRef = useRef(false);

  // Dialog state for replacing native confirm/alert/prompt
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    alertOnly?: boolean;
    destructive?: boolean;
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    submitLabel?: string;
    resolve: (value: string | null) => void;
  } | null>(null);

  const showConfirm = useCallback((opts: { title: string; message: string; confirmLabel?: string; destructive?: boolean }) => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ ...opts, resolve });
    });
  }, []);

  const showAlert = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ title, message, alertOnly: true, resolve });
    });
  }, []);

  const showPrompt = useCallback((opts: { title: string; message?: string; placeholder?: string; defaultValue?: string; submitLabel?: string }) => {
    return new Promise<string | null>((resolve) => {
      setPromptDialog({ ...opts, resolve });
    });
  }, []);

  // Ref to trigger editor decoration rebuilds when files change
  // Used by livePreview extension to refresh wikilink colors
  const editorRefreshTrigger = useRef(0);

  // Refs for menu event handlers (to avoid stale closures)
  const vaultPathRef = useRef<string | null>(null);
  vaultPathRef.current = vaultPath;

  // Theme Manager
  const themeManagerRef = useRef<ThemeManager | null>(null);

  // Use hooks for workspace sync, keyboard shortcuts, and file watching
  useWorkspaceSync({ vaultPath, openTabs, activeTabPath });

  // Create a minimal mock App interface for ThemeManager
  const mockApp = useRef<{
    vault: {
      configDir: string;
      adapter: {
        read: (path: string) => Promise<string>;
      };
    };
  } | null>(null);

  // Helper to open a vault by path (used during init and vault switching)
  const handleOpenVaultPath = useCallback(async (path: string) => {
    if (switchingVaultRef.current) {
      console.warn('[App] Vault switch already in progress, ignoring');
      return;
    }
    switchingVaultRef.current = true;
    try {
      console.log('[App] Opening vault:', path);

      // Save current workspace if we have one (use refs to avoid stale closure)
      const currentVault = vaultPathRef.current;
      const currentTabs = tabStateRef.current.tabs;
      if (currentVault && currentTabs.length > 0) {
        const lastOpenFiles = currentTabs.map(t => t.path);
        await workspaceStateManager.saveNow(lastOpenFiles);
        console.log('[App] Saved previous workspace');
      }

      // Add to vaults registry and set as last opened
      await vaultsStore.addVault(path);

      // Load vault config
      await vaultConfigStore.init(path);
      const vaultSettings = vaultConfigStore.getSettings();
      const appearance = vaultConfigStore.getAppearance();

      // Apply vault-specific editor settings
      setReadableLineLength(vaultSettings.readableLineLength);

      console.log('[App] Loaded vault config:', { vaultSettings, appearance });

      // Initialize ThemeManager with mock app
      const configDir = `${path}/.obsidian`;
      mockApp.current = {
        vault: {
          configDir,
          adapter: {
            read: async (filePath: string) => {
              const fullPath = filePath.startsWith('/') ? filePath : `${path}/${filePath}`;
              return await invoke<string>('read_file', { path: fullPath });
            },
          },
        },
      };

      if (!themeManagerRef.current) {
        themeManagerRef.current = new ThemeManager(mockApp.current as any);
        console.log('[App] ThemeManager initialized');
      } else {
        // Update the mock app reference
        (themeManagerRef.current as any).app = mockApp.current;
      }

      // Load theme and snippets from appearance settings
      if (appearance.cssTheme) {
        try {
          await themeManagerRef.current.loadTheme(appearance.cssTheme);
          console.log('[App] Loaded theme:', appearance.cssTheme);
        } catch (e) {
          console.warn('[App] Failed to load theme:', appearance.cssTheme, e);
          // Fallback: clear the theme setting so built-in theme is used
          appearance.cssTheme = '';
          await vaultConfigStore.updateAppearance({ cssTheme: '' });
          console.log('[App] Reset to built-in theme due to load failure');
        }
      }

      if (appearance.enabledCssSnippets && appearance.enabledCssSnippets.length > 0) {
        for (const snippet of appearance.enabledCssSnippets) {
          try {
            await themeManagerRef.current.loadSnippet(snippet);
            console.log('[App] Loaded snippet:', snippet);
          } catch (e) {
            console.warn('[App] Failed to load snippet:', snippet, e);
          }
        }
      }

      // Restore workspace from saved state
      const { panes, lastOpenFiles } = await workspaceStateManager.restore();
      const openFiles = panes[0]?.tabs ?? [];
      const activeTab = panes[0]?.activeTab ?? null;
      console.log('[App] Restored workspace:', { fileCount: openFiles.length, activeTab });

      // Load file contents for restored workspace
      // Note: Workspace files may have isVirtual as undefined, normalize to false
      const openTabsWithContent: TabFile[] = await Promise.all(
        openFiles.map(async (file) => {
          try {
            const content = await invoke<string>('read_file', { path: file.path });
            return {
              path: file.path,
              name: file.name,
              content,
              isDirty: file.isDirty ?? false,
              isVirtual: file.isVirtual ?? false,
            };
          } catch (e) {
            console.error('[App] Failed to load file:', file.path, e);
            return {
              path: file.path,
              name: file.name,
              content: '',
              isDirty: file.isDirty ?? false,
              isVirtual: file.isVirtual ?? false,
            };
          }
        })
      );

      // Update state
      setVaultPath(path);
      // Restore tabs using the hook's action
      const activeIndex = openTabsWithContent.findIndex(t => t.path === activeTab);
      restoreWorkspace(openTabsWithContent, activeIndex >= 0 ? activeIndex : openTabsWithContent.length > 0 ? 0 : -1);
      setVaultSettings(vaultSettings);
      setAppearanceSettings(appearance);
      setShowVaultPicker(false);
    } catch (e) {
      console.error('[App] Failed to open vault:', e);
      showAlert('Error', 'Failed to open vault: ' + (e as Error).message);
    } finally {
      switchingVaultRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No deps - read vaultPath/openTabs at call time to avoid circular dependency

  // Handle opening a standalone markdown file
  const handleOpenStandaloneFile = useCallback((filePath: string) => {
    console.log('[App] Opening standalone file:', filePath);
    // Track in recent files
    addRecentFile(filePath);
    // Close any vault and show standalone viewer
    setVaultPath(null);
    setShowVaultPicker(false);
    setStandaloneFilePath(filePath);
  }, []);

  // Handle closing standalone file mode
  const handleCloseStandaloneFile = useCallback(() => {
    setStandaloneFilePath(null);
    setShowVaultPicker(true);
  }, []);

  // Handle "Open File" action (menu or keyboard shortcut)
  const handleOpenFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Open Markdown File',
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
        ],
      });

      if (selected && typeof selected === 'string') {
        handleOpenStandaloneFile(selected);
      }
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  }, [handleOpenStandaloneFile]);

  // Initialize stores and auto-open vault on app mount
  useEffect(() => {
    async function initializeApp() {
      console.log('[App] Initializing...');

      // Always ensure default vault exists first
      let defaultVaultPath: string;
      try {
        defaultVaultPath = await ensureDefaultVault();
        console.log('[App] Default vault ready:', defaultVaultPath);
      } catch (e) {
        console.error('[App] Failed to create default vault:', e);
        setShowVaultPicker(true);
        setIsInitialized(true);
        return;
      }

      // Initialize stores
      try {
        await Promise.all([
          vaultsStore.init(),
          windowStateStore.init(),
          globalSettingsStore.init(),
        ]);
        console.log('[App] Stores initialized');

        // Load global settings
        const globalSettings = globalSettingsStore.getSettings();
        setLineWrapping(globalSettings.lineWrapping);
      } catch (e) {
        console.error('[App] Store init failed, using default vault:', e);
      }

      // Determine which vault to open
      const lastVault = vaultsStore.getLastOpenedVault();
      let vaultToOpen = defaultVaultPath;
      let isFirstTimeDefaultVault = false;

      if (lastVault && await fileExists(lastVault)) {
        console.log('[App] Found last vault:', lastVault);
        vaultToOpen = lastVault;
      } else if (lastVault) {
        console.log('[App] Last vault no longer exists, removing:', lastVault);
        await vaultsStore.removeVault(lastVault);
        isFirstTimeDefaultVault = true;
      } else {
        // No last vault at all - this is first time using the app
        isFirstTimeDefaultVault = true;
      }

      // Open the vault
      try {
        console.log('[App] Opening vault:', vaultToOpen);
        await handleOpenVaultPath(vaultToOpen);

        // Auto-open Welcome.md on first launch with default vault
        if (isFirstTimeDefaultVault && vaultToOpen === defaultVaultPath) {
          const welcomePath = `${defaultVaultPath}/Welcome.md`;
          if (await fileExists(welcomePath)) {
            console.log('[App] Auto-opening Welcome.md');
            // Small delay to ensure vault is fully loaded
            setTimeout(() => {
              handleFileSelect(welcomePath, false);
            }, 100);
          }
        }
      } catch (e) {
        console.error('[App] Failed to open vault, trying default:', e);
        try {
          await handleOpenVaultPath(defaultVaultPath);
        } catch (e2) {
          console.error('[App] Failed to open default vault:', e2);
          setShowVaultPicker(true);
        }
      }

      setIsInitialized(true);
    }

    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - handleOpenVaultPath is stable

  // Cleanup stores on unmount to prevent resource leaks
  useEffect(() => {
    return () => {
      console.log('[App] Cleaning up stores on unmount');
      windowStateStore.destroy();
      workspaceStateManager.destroy();
    };
  }, []);

  // Register handler for standalone file open events (handles queued events from startup)
  useEffect(() => {
    console.log('[App] Registering standalone file handler');
    registerStandaloneHandler(handleOpenStandaloneFile);
  }, [handleOpenStandaloneFile]);

  // Handle drag & drop of files onto the window (Tauri 2 uses window events)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupDragDrop = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const currentWindow = getCurrentWindow();

        unlisten = await currentWindow.onDragDropEvent((event) => {
          const payload = event.payload;

          if (payload.type === 'enter') {
            // Check if any dragged file is a markdown file
            const hasMd = payload.paths?.some((p: string) => {
              const lower = p.toLowerCase();
              return lower.endsWith('.md') || lower.endsWith('.markdown');
            });
            setIsDraggingFile(hasMd || false);
          } else if (payload.type === 'over') {
            // 'over' event doesn't have paths, just position
            // Keep the current drag state
          } else if (payload.type === 'drop') {
            setIsDraggingFile(false);
            if (payload.paths && payload.paths.length > 0) {
              const filePath = payload.paths[0];
              const lower = filePath.toLowerCase();
              if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
                console.log('[App] File dropped:', filePath);
                handleOpenStandaloneFile(filePath);
              }
            }
          } else if (payload.type === 'leave') {
            setIsDraggingFile(false);
          }
        });
      } catch (e) {
        console.warn('[App] Failed to setup drag-drop:', e);
      }
    };

    setupDragDrop();

    return () => {
      unlisten?.();
    };
  }, [handleOpenStandaloneFile]);

  // Keyboard shortcuts for file operations (Cmd+O, Cmd+N, Cmd+W)
  // These use direct window listeners because CodeMirror can intercept events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+O - Open File
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
        return;
      }
      // Cmd+N - New File
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        const currentVaultPath = vaultPathRef.current;
        if (!currentVaultPath) {
          console.log('[App] Cmd+N: No vault path');
          return;
        }
        // Use tabStateRef to get existing tabs (avoids stale closure)
        const currentState = tabStateRef.current;
        const newTab = createVirtualUntitledFile(currentVaultPath, currentState.tabs);
        openTab(newTab.path, newTab.name, newTab.content, true);
        return;
      }
      // Cmd+W - Close current tab
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'w') {
        e.preventDefault();
        // Use tabStateRef to get current active tab (avoids stale closure)
        const currentState = tabStateRef.current;
        const currentActiveTab = currentState.activeIndex >= 0 ? currentState.tabs[currentState.activeIndex] : null;
        if (currentActiveTab) {
          closeTab(currentActiveTab.path);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenFile]);

  // Apply appearance settings when they change
  useEffect(() => {
    if (!appearanceSettings) return;

    console.log('[App] Applying appearance settings:', appearanceSettings);

    const root = document.documentElement;

    // Apply theme mode
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${appearanceSettings.baseTheme}`);

    // Sync theme mode with ThemeManager
    if (themeManagerRef.current) {
      themeManagerRef.current.setThemeMode(appearanceSettings.baseTheme);
    }

    // Apply accent color
    if (appearanceSettings.accentColor) {
      root.style.setProperty('--color-accent', appearanceSettings.accentColor);
    }

    // Apply font size
    if (appearanceSettings.baseFontSize) {
      root.style.setProperty('--font-text-size', `${appearanceSettings.baseFontSize}px`);
    }

    // Apply custom fonts
    if (appearanceSettings.textFontFamily) {
      root.style.setProperty('--font-text-theme', appearanceSettings.textFontFamily);
    }
    if (appearanceSettings.monospaceFontFamily) {
      root.style.setProperty('--font-monospace-theme', appearanceSettings.monospaceFontFamily);
    }
    if (appearanceSettings.interfaceFontFamily) {
      root.style.setProperty('--font-interface-theme', appearanceSettings.interfaceFontFamily);
    }
  }, [appearanceSettings]);

  // Helper to get the active tab - now provided by useTabState hook
  const getActiveTab = useCallback(() => {
    return activeTab;
  }, [activeTab]);

  // Use hooks for file watching and directory loading
  // Reset loading state when vault path changes
  useEffect(() => {
    if (vaultPath) {
      setIsVaultReady(false);
      setFileTreeError(null);
      setLoading(true);
    }
  }, [vaultPath]);

  useDirectoryLoader({
    vaultPath,
    onFilesLoaded: async (entries, signal) => {
      setFiles(entries);
      if (vaultPath) {
        await searchStore.indexFiles(vaultPath, entries, signal);
      }
      setFileTreeError(null);
      setIsVaultReady(true);
      setLoading(false);
    },
    onError: (error) => {
      setFileTreeError(error);
      setIsVaultReady(true);
      setLoading(false);
    },
  });

  useFileWatcher({
    vaultPath,
    onFilesChange: (entries) => {
      setFiles(entries);
      // Trigger editor decoration rebuild to refresh wikilink colors
      editorRefreshTrigger.current++;
    },
    onError: (error) => {
      setFileTreeError(error);
    },
  });

  const handleOpenVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Vault Folder',
      });

      if (selected && typeof selected === 'string') {
        await handleOpenVaultPath(selected);
      }
    } catch (e) {
      console.error('Failed to open folder:', e);
    }
  };

  const handleNewFile = useCallback(async () => {
    if (!vaultPath) return;
    // Use tabStateRef to get existing tabs (avoids stale closure)
    const currentState = tabStateRef.current;
    const newTab = createVirtualUntitledFile(vaultPath, currentState.tabs);
    openTab(newTab.path, newTab.name, newTab.content, true);
  }, [vaultPath, openTab, tabStateRef]);

  const handleFileSelect = useCallback(
    (path: string, newTabFlag = false) => {
      logger.info('handleFileSelect', 'called', { path, newTabFlag });
      logger.debug('handleFileSelect', 'file type check', {
        isImage: isImageFile(path),
        isVideo: isVideoFile(path),
        isPdf: isPdfFile(path),
      });

      // Open binary files (images, videos, PDFs) with system default app
      if (isImageFile(path) || isVideoFile(path) || isPdfFile(path)) {
        logger.info('handleFileSelect', 'Opening binary file with system app', { path });
        openPath(path)
          .then(() => logger.info('handleFileSelect', 'openPath succeeded', { path }))
          .catch((err) => logger.error('handleFileSelect', 'openPath failed', { path, error: String(err) }));
        return;
      }

      invoke<string>('read_file', { path })
        .then((content) => {
          const parts = path.split(/[/\\]/);
          const name = parts[parts.length - 1] || '';

          // Use tabStateRef to check current state (avoids stale closure)
          const currentState = tabStateRef.current;
          const existingTab = currentState.tabs.find(tab => tab.path === path);

          // Cmd+click: always open a new tab even if file is already open
          if (newTabFlag) {
            forceOpenTab(path, name, content);
            return;
          }

          if (existingTab) {
            // Regular click: file already open - switch to it and sync content from disk
            setActive(path);
            syncContent(path, content);
            return;
          }

          // No existing tab - check if we have any tabs
          if (currentState.tabs.length === 0) {
            // No tabs yet, create first one
            openTab(path, name, content);
            return;
          }

          // Replace the active tab with this file (Obsidian-like behavior)
          replaceActiveTab(path, name, content);
        })
        .catch(console.error);
    },
    [forceOpenTab, setActive, syncContent, openTab, replaceActiveTab, tabStateRef]
  );

  // Process queued wikilink clicks when vault becomes ready
  // Uses refs to avoid stale closures
  useEffect(() => {
    if (!isVaultReady) return;

    // Use functional update to get latest queue without adding it to deps
    setWikilinkQueue(queue => {
      if (queue.length === 0) return queue;

      // Process all queued clicks
      queue.forEach(({ target, newTab }) => {
        const path = searchStore.getFilePathByName(target);
        if (path) {
          handleFileSelect(path, newTab);
        } else {
          console.warn(`[wikilink] Queued file not found: ${target}`);
        }
      });

      return []; // Clear queue after processing
    });
  }, [isVaultReady, handleFileSelect]); // handleFileSelect is stable (empty deps)

  const handleSave = useCallback(async () => {
    const currentActiveTab = getActiveTab();
    if (!currentActiveTab) return;

    try {
      await invoke('write_file', {
        path: currentActiveTab.path,
        content: currentActiveTab.content,
      });

      markSaved(currentActiveTab.path);

      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  }, [getActiveTab, markSaved, vaultPath]);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleContentChange = useCallback(async (path: string, content: string) => {
    // Check if this is a virtual file that needs materializing
    const currentState = tabStateRef.current;
    const tab = currentState.tabs.find(t => t.path === path);

    if (tab?.isVirtual && content.trim()) {
      // Materialize virtual file - check for existing file first
      try {
        const meta = await invoke<{ exists: boolean }>('stat_path', { path });
        let finalPath = path;
        let finalName = tab.name;

        if (meta.exists) {
          // File already exists, find a unique path
          const dirPath = path.substring(0, path.lastIndexOf('/'));
          finalPath = await findUniqueFilePath(dirPath, UNTITLED_BASE);
          finalName = finalPath.substring(finalPath.lastIndexOf('/') + 1);
          console.log('[App] File existed, using unique path:', finalPath);
        }

        await invoke('write_file', { path: finalPath, content });

        // Use hook's materialize action to update tab
        materialize(path, finalPath, finalName);

        // Refresh file list
        const currentVaultPath = vaultPathRef.current;
        if (currentVaultPath) {
          const { filterHiddenFiles } = await import('./utils/fileFilters');
          const rawEntries = await invoke<FileEntry[]>('read_directory', { path: currentVaultPath });
          const entries = filterHiddenFiles(rawEntries);
          setFiles(entries);
          await searchStore.indexFiles(currentVaultPath, entries);
        }
      } catch (e) {
        console.error('[App] Failed to materialize virtual file:', e);
      }
      return;
    }

    // Regular content update for non-virtual files
    updateContent(path, content);

    // Auto-save after 1 second of no typing (debounced)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      // Get the latest tab state using ref (avoids stale closure)
      const latestState = tabStateRef.current;
      const tabToSave = latestState.tabs.find(t => t.path === path);
      if (tabToSave && tabToSave.isDirty && !tabToSave.isVirtual) {
        try {
          await invoke('write_file', { path: tabToSave.path, content: tabToSave.content });
          console.log('[App] Auto-saved:', tabToSave.name);
          markSaved(path);
        } catch (e) {
          console.error('[App] Auto-save failed:', e);
        }
      }
    }, 1000);
  }, [materialize, updateContent, markSaved, tabStateRef]);

  const handleFileNameChange = useCallback(async (newName: string) => {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.path) return;

    // Add .md extension if not present
    if (!newName.endsWith('.md')) {
      newName += '.md';
    }

    // Don't do anything if name hasn't changed
    if (newName === activeTab.name) return;

    const parts = activeTab.path.split(/[/\\]/);
    parts.pop();
    const newPath = [...parts, newName].join('/');

    try {
      // Get link update count before renaming
      const linkUpdateCount = getLinkUpdateCount(activeTab.path);

      // Show confirmation if there are incoming links
      if (linkUpdateCount > 0) {
        const confirmed = await showConfirm({
          title: 'Update Links',
          message: `This will update ${linkUpdateCount} incoming link${linkUpdateCount > 1 ? 's' : ''} in other files. Continue?`,
          confirmLabel: 'Update',
        });
        if (!confirmed) return;
      }

      // Use enhanced rename with link updates
      await renameFileWithLinkUpdates({
        oldPath: activeTab.path,
        newPath: newPath,
        updateLinks: true,
      });

      // Update tab path/name using hook's action
      renameTab(activeTab.path, newPath, newName);

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (error) {
      console.error('Failed to rename:', error);
      showAlert('Error', 'Failed to rename file: ' + (error as Error).message);
    }
  }, [getActiveTab, renameTab, vaultPath, showConfirm, showAlert]);

  // Daily Notes handlers
  const handleOpenDailyNote = useCallback(async () => {
    if (!vaultPath) return;

    const config = await loadDailyNotesConfig();
    const { path: notePath, content } = await openDailyNote(new Date(), vaultPath, config);

    const parts = notePath.split(/[/\\]/);
    const name = parts[parts.length - 1] || '';

    // Refresh file list
    const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
    setFiles(entries);
    await searchStore.indexFiles(vaultPath, entries);

    // Check if already open using tabStateRef
    const currentState = tabStateRef.current;
    const existingTab = currentState.tabs.find(tab => tab.path === notePath);

    if (existingTab) {
      setActive(notePath);
      syncContent(notePath, content);
    } else {
      openTab(notePath, name, content);
    }
  }, [vaultPath, setActive, syncContent, openTab, tabStateRef]);

  // TODO: Implement daily notes navigation UI to use this function
  // const handleNavigateDailyNotes = useCallback(async (offset: number) => {
  //   if (!vaultPath) return;

  //   const activeTab = getActiveTab();
  //   if (!activeTab) {
  //     handleOpenDailyNote();
  //     return;
  //   }

  //   const config = await loadDailyNotesConfig();

  //   // Try to parse date from current file name
  //   const fileName = activeTab.name.replace('.md', '');
  //   const currentDate = parseDateFromFileName(fileName, config.format);

  //   const targetDate = currentDate || new Date();
  //   const newDate = new Date(targetDate);
  //   newDate.setDate(newDate.getDate() + offset);

  //   const { path: notePath, content } = await openDailyNote(newDate, vaultPath, config);

  //   const parts = notePath.split(/[/\\]/);
  //   const name = parts[parts.length - 1] || '';

  //   // Refresh file list
  //   const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
  //   setFiles(entries);
  //   await searchStore.indexFiles(vaultPath, entries);

  //   openTab(notePath, name, content, false);
  // }, [vaultPath, getActiveTab, handleOpenDailyNote, openTab]);

  const vaultName = vaultPath ? vaultPath.split(/[/\\]/).pop() : null;

  const handleContextMenu = useCallback((path: string, isFolder: boolean, x: number, y: number) => {
    setContextMenu({ path, isFolder, x, y });
  }, []);

  const handleRename = useCallback(() => {
    if (contextMenu) {
      setRenameTarget({ path: contextMenu.path, isFolder: contextMenu.isFolder });
      setContextMenu(null);
    }
  }, [contextMenu]);

  const handleRenameConfirm = useCallback(async (newName: string) => {
    if (!renameTarget) return;

    // Add .md extension if not a folder and no extension provided
    if (!renameTarget.isFolder && !newName.endsWith('.md')) {
      newName += '.md';
    }

    const parts = renameTarget.path.split(/[/\\]/);
    parts.pop();
    const newPath = [...parts, newName].join('/');

    try {
      // For files, use enhanced rename with link updates
      if (!renameTarget.isFolder) {
        // Get link update count before renaming
        const linkUpdateCount = getLinkUpdateCount(renameTarget.path);

        // Show confirmation if there are incoming links
        if (linkUpdateCount > 0) {
          const confirmed = await showConfirm({
            title: 'Update Links',
            message: `This will update ${linkUpdateCount} incoming link${linkUpdateCount > 1 ? 's' : ''} in other files. Continue?`,
            confirmLabel: 'Update',
          });
          if (!confirmed) return;
        }

        // Use enhanced rename with link updates
        await renameFileWithLinkUpdates({
          oldPath: renameTarget.path,
          newPath: newPath,
          updateLinks: true,
        });
      } else {
        // For folders, use basic rename
        await invoke('rename_file', {
          oldPath: renameTarget.path,
          newPath: newPath,
        });

        // Remove old path from search index and re-index
        await searchStore.removeFile(renameTarget.path);
      }

      // Refresh file list and re-index
      if (vaultPath) {
        const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        setFiles(entries);
        await searchStore.indexFiles(vaultPath, entries);
      }

      // Update open tabs if file was renamed using hook's action
      const newName = newPath.split(/[/\\]/).pop() || '';
      renameTab(renameTarget.path, newPath, newName);
    } catch (error) {
      console.error('Failed to rename:', error);
    }

    setRenameTarget(null);
  }, [renameTarget, renameTab, vaultPath, showConfirm]);

  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;

    try {
      await invoke('delete_file', { path: contextMenu.path });

      // Remove from search index
      await searchStore.removeFile(contextMenu.path);

      // Refresh file list and re-index
      if (vaultPath) {
        const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        setFiles(entries);
        await searchStore.indexFiles(vaultPath, entries);
      }

      // Close tab if file was deleted
      closeTab(contextMenu.path);
    } catch (error) {
      console.error('Failed to delete:', error);
    }

    setContextMenu(null);
  }, [contextMenu, vaultPath, closeTab]);

  const handleNewFileInFolder = useCallback(async () => {
    if (!contextMenu || !vaultPath) return;
    const folderPath = contextMenu.path;
    // Use tabStateRef to get existing tabs (avoids stale closure)
    const currentState = tabStateRef.current;
    const newTab = createVirtualUntitledFile(vaultPath, currentState.tabs, folderPath);
    openTab(newTab.path, newTab.name, newTab.content, true);
    setContextMenu(null);
  }, [contextMenu, vaultPath, openTab, tabStateRef]);

  const handleNewFolder = useCallback(async () => {
    if (!contextMenu) return;

    const folderName = await showPrompt({
      title: 'New Folder',
      placeholder: 'Folder name',
      submitLabel: 'Create',
    });
    if (!folderName) return;

    const newPath = `${contextMenu.path}/${folderName}`;

    try {
      await invoke('create_directory', { path: newPath });

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }

    setContextMenu(null);
  }, [contextMenu, vaultPath, showPrompt]);

  // Template handlers
  const handleInsertTemplate = useCallback(async (templatePath: string, fileName?: string) => {
    if (!vaultPath) return;

    try {
      if (fileName && fileName.trim()) {
        // Create new file from template
        const { path: newFilePath, content } = await createFileFromTemplate(
          templatePath,
          fileName.trim(),
          vaultPath
        );

        // Refresh file list
        const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        setFiles(entries);
        await searchStore.indexFiles(vaultPath, entries);

        // Open the new file using hook's action
        const parts = newFilePath.split(/[/\\]/);
        const name = parts[parts.length - 1] || '';
        const currentState = tabStateRef.current;
        const existingTab = currentState.tabs.find(tab => tab.path === newFilePath);

        if (existingTab) {
          setActive(newFilePath);
          syncContent(newFilePath, content);
        } else {
          openTab(newFilePath, name, content);
        }
      } else {
        // Insert template into current file
        const currentActiveTab = getActiveTab();
        if (!currentActiveTab) {
          showAlert('No File Open', 'Please open a file first to insert a template');
          setIsTemplateModalOpen(false);
          return;
        }

        // Get cursor position (we'll insert at end for now)
        const cursorPosition = currentActiveTab.content.length;

        const { content: newContent } = await insertTemplateIntoFile(
          templatePath,
          currentActiveTab.content,
          cursorPosition
        );

        // Update tab content using hook's action
        updateContent(currentActiveTab.path, newContent);

        // Update search index
        await searchStore.updateFile(currentActiveTab.path, newContent);
      }

      setIsTemplateModalOpen(false);
    } catch (error) {
      console.error('Failed to insert template:', error);
      showAlert('Error', 'Failed to insert template: ' + (error as Error).message);
    }
  }, [vaultPath, getActiveTab, openTab, setActive, syncContent, updateContent, tabStateRef, showAlert]);

  const handleOpenTemplateModal = useCallback(async () => {
    if (!vaultPath) return;

    // Load templates
    const loadedTemplates = await loadTemplates(vaultPath);
    setTemplates(loadedTemplates);

    setIsTemplateModalOpen(true);
  }, [vaultPath]);

  // Handle appearance settings updates
  const handleUpdateAppearance = useCallback(async (updates: any) => {
    const updated = { ...appearanceSettings, ...updates };
    setAppearanceSettings(updated);

    // Persist to disk
    await vaultConfigStore.updateAppearance(updates);

    // Handle theme changes
    if ('cssTheme' in updates && themeManagerRef.current) {
      const newTheme = updates.cssTheme;
      const currentTheme = themeManagerRef.current.getCurrentTheme();

      // Unload current theme if there is one
      if (currentTheme && currentTheme !== newTheme) {
        themeManagerRef.current.unloadTheme();
      }

      // Load new theme if specified
      if (newTheme && newTheme !== currentTheme) {
        try {
          await themeManagerRef.current.loadTheme(newTheme);
          console.log('[App] Loaded theme:', newTheme);
        } catch (e) {
          console.error('[App] Failed to load theme:', newTheme, e);
        }
      }
    }

    // Handle snippet changes
    if ('enabledCssSnippets' in updates && themeManagerRef.current) {
      const currentSnippets = themeManagerRef.current.getLoadedSnippets();
      const newSnippets = updates.enabledCssSnippets || [];

      // Unload snippets that were removed
      for (const snippet of currentSnippets) {
        if (!newSnippets.includes(snippet)) {
          themeManagerRef.current.unloadSnippet(snippet);
          console.log('[App] Unloaded snippet:', snippet);
        }
      }

      // Load newly enabled snippets
      for (const snippet of newSnippets) {
        if (!currentSnippets.includes(snippet)) {
          try {
            await themeManagerRef.current.loadSnippet(snippet);
            console.log('[App] Loaded snippet:', snippet);
          } catch (e) {
            console.error('[App] Failed to load snippet:', snippet, e);
          }
        }
      }
    }
  }, [appearanceSettings]);

  // Handle line wrapping setting changes
  const handleLineWrappingChange = useCallback(async (enabled: boolean) => {
    setLineWrapping(enabled);
    await globalSettingsStore.updateSettings({ lineWrapping: enabled });
  }, []);

  // Handle readable line length setting changes
  const handleReadableLineLengthChange = useCallback(async (enabled: boolean) => {
    setReadableLineLength(enabled);
    await vaultConfigStore.updateSettings({ readableLineLength: enabled });
  }, []);

  // Use keyboard shortcuts hook
  // This must be after all handlers are defined to avoid forward reference issues
  useEffect(() => {
    setWorkspaceManager({
      openFile: async (path: string, newTab?: boolean) => {
        handleFileSelect(path, newTab);
      },
      closeFile: async (path: string) => {
        closeTab(path);
      },
      setActiveFile: async (path: string) => {
        setActive(path);
      },
      getOpenFiles: () => openTabs.map(t => t.path),
      getActiveFile: () => activeTabPath,
    });
  }, [handleFileSelect, closeTab, setActive, openTabs, activeTabPath]);

  // Register commands on mount (Phase D: Command Registry)
  // This must be after all handlers are defined to avoid forward reference issues
  // Note: handleToggleTheme is defined later but captured via closure
  useEffect(() => {
    // Register core commands
    // File commands
    CommandRegistry.register({
      id: 'file.new',
      name: 'New File',
      icon: 'FilePlus',
      category: 'file',
      hotkeys: [{ key: 'n', modifiers: { meta: true } }],
      callback: (...args: unknown[]) => handleNewFile(...(args as [])),
    });

    CommandRegistry.register({
      id: 'file.save',
      name: 'Save File',
      icon: 'Save',
      category: 'file',
      hotkeys: [{ key: 's', modifiers: { meta: true } }],
      callback: (...args: unknown[]) => handleSave(...(args as [])),
    });

    CommandRegistry.register({
      id: 'file.open',
      name: 'Open File',
      icon: 'FolderOpen',
      category: 'file',
      callback: (...args: unknown[]) => handleFileSelect(...(args as [string, boolean?])),
    });

    // View commands
    CommandRegistry.register({
      id: 'view.toggleGraph',
      name: 'Toggle Graph View',
      icon: 'Graph',
      category: 'view',
      callback: () => setRightPanel(prev => prev === 'graph' ? 'backlinks' : 'graph'),
    });

    CommandRegistry.register({
      id: 'view.toggleSettings',
      name: 'Toggle Settings',
      icon: 'Settings',
      category: 'view',
      hotkeys: [{ key: ',', modifiers: { meta: true } }],
      callback: () => setShowSettings(prev => !prev),
    });

    CommandRegistry.register({
      id: 'view.toggleBacklinks',
      name: 'Toggle Backlinks Panel',
      icon: 'Link2',
      category: 'view',
      callback: () => setRightPanel(prev => prev === 'backlinks' ? 'outline' : 'backlinks'),
    });

    CommandRegistry.register({
      id: 'view.toggleOutline',
      name: 'Toggle Outline Panel',
      icon: 'List',
      category: 'view',
      callback: () => setRightPanel(prev => prev === 'outline' ? 'tags' : 'outline'),
    });

    CommandRegistry.register({
      id: 'view.toggleTags',
      name: 'Toggle Tags Panel',
      icon: 'Tags',
      category: 'view',
      callback: () => setRightPanel(prev => prev === 'tags' ? 'starred' : 'tags'),
    });

    // Workspace commands
    CommandRegistry.register({
      id: 'workspace.quickSwitcher',
      name: 'Quick Switcher',
      icon: 'Search',
      category: 'workspace',
      hotkeys: [{ key: 'p', modifiers: { meta: true } }],
      callback: () => setIsQuickSwitcherOpen(prev => !prev),
    });

    CommandRegistry.register({
      id: 'workspace.dailyNote',
      name: 'Open Daily Note',
      icon: 'Calendar',
      category: 'workspace',
      hotkeys: [{ key: 'D', modifiers: { meta: true, shift: true } }],
      callback: (...args: unknown[]) => handleOpenDailyNote(...(args as [])),
    });

    CommandRegistry.register({
      id: 'workspace.template',
      name: 'Insert Template',
      icon: 'FileText',
      category: 'workspace',
      hotkeys: [{ key: 't', modifiers: { meta: true } }],
      callback: (...args: unknown[]) => handleOpenTemplateModal(...(args as [])),
    });

    // Tab commands
    CommandRegistry.register({
      id: 'tab.close',
      name: 'Close Tab',
      icon: 'X',
      category: 'tab',
      callback: (...args: unknown[]) => closeTab(...(args as [string])),
    });

    CommandRegistry.register({
      id: 'tab.switch',
      name: 'Switch Tab',
      icon: 'ArrowRight',
      category: 'tab',
      callback: (...args: unknown[]) => setActive(...(args as [string])),
    });

    // Theme commands
    CommandRegistry.register({
      id: 'theme.toggle',
      name: 'Toggle Theme',
      icon: 'Sun',
      category: 'theme',
      callback: (...args: unknown[]) => handleToggleTheme(...(args as [])),
    });

    CommandRegistry.register({
      id: 'view.focusMode',
      name: 'Toggle Focus Mode',
      icon: 'Maximize',
      category: 'view',
      hotkeys: [{ key: 'f', modifiers: { meta: true, shift: true } }],
      callback: () => setFocusMode((prev) => !prev),
    });

    // Vault commands
    CommandRegistry.register({
      id: 'vault.open',
      name: 'Open Vault',
      icon: 'FolderOpen',
      category: 'vault',
      callback: (...args: unknown[]) => handleOpenVault(...(args as [])),
    });

    CommandRegistry.register({
      id: 'vault.create',
      name: 'Create Vault',
      icon: 'FolderPlus',
      category: 'vault',
      callback: (vaultPath: unknown) => {
        console.log('[App] Vault created:', vaultPath);
        // This is called after vault creation completes
        // The actual creation happens in CreateVaultDialog
      },
    });

    // Editor commands
    CommandRegistry.register({
      id: 'editor.togglePreview',
      name: 'Toggle Preview Mode',
      icon: 'Eye',
      category: 'editor',
      callback: () => {
        // Toggle preview mode (placeholder for future implementation)
        console.log('[App] Toggle preview mode');
      },
    });

    // Format commands
    CommandRegistry.register({
      id: 'format.bold',
      name: 'Bold Selection',
      icon: 'Bold',
      category: 'format',
      callback: () => {
        // Format selection as bold (placeholder for future implementation)
        console.log('[App] Format selection as bold');
      },
    });

    console.log('[App] Registered commands:', CommandRegistry.getStats());
  }, [
    handleNewFile,
    handleSave,
    handleFileSelect,
    handleOpenDailyNote,
    handleOpenTemplateModal,
    // handleToggleTheme, // Defined later, captured via closure
    handleOpenVault,
    closeTab,
  ]);

  // Listen for native menu events from Tauri
  // Uses refs to avoid stale closure issues
  useEffect(() => {
    const setupMenuListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      const unlisteners = await Promise.all([
        listen('menu-new-file', () => {
          console.log('[App] Menu: New File, vaultPath:', vaultPathRef.current);
          const currentVaultPath = vaultPathRef.current;
          if (!currentVaultPath) {
            console.log('[App] No vault path, cannot create file');
            return;
          }
          // Use tabStateRef to get existing tabs (avoids stale closure)
          const currentState = tabStateRef.current;
          const newTab = createVirtualUntitledFile(currentVaultPath, currentState.tabs);
          openTab(newTab.path, newTab.name, newTab.content, true);
        }),
        listen('menu-open-file', () => {
          console.log('[App] Menu: Open File');
          handleOpenFile();
        }),
        listen('menu-save-file', () => {
          console.log('[App] Menu: Save');
          handleSave();
        }),
        listen('menu-close-tab', () => {
          console.log('[App] Menu: Close Tab');
          // Use tabStateRef to get current active tab (avoids stale closure)
          const currentState = tabStateRef.current;
          const currentActiveTab = currentState.activeIndex >= 0 ? currentState.tabs[currentState.activeIndex] : null;
          if (currentActiveTab) {
            closeTab(currentActiveTab.path);
          }
        }),
        listen('menu-quick-switcher', () => {
          console.log('[App] Menu: Quick Switcher');
          setIsQuickSwitcherOpen(prev => !prev);
        }),
        listen('menu-settings', () => {
          console.log('[App] Menu: Settings');
          setShowSettings(true);
        }),
        // Global quick capture shortcut (Ctrl+Alt+N)
        listen('global-quick-capture', () => {
          console.log('[App] Global Quick Capture triggered');
          const currentVaultPath = vaultPathRef.current;
          if (!currentVaultPath) {
            console.log('[App] No vault path, cannot create quick capture note');
            return;
          }
          // Create a new quick capture note with timestamp
          const now = new Date();
          const timestamp = now.toISOString().slice(0, 16).replace('T', ' ').replace(':', '-');
          const currentState = tabStateRef.current;
          const newTab = createVirtualUntitledFile(currentVaultPath, currentState.tabs);
          // Update the name to include "Quick Note" prefix
          const quickNoteName = `Quick Note ${timestamp}.md`;
          const quickNotePath = `${currentVaultPath}/${quickNoteName}`;
          openTab(quickNotePath, quickNoteName, '', true);
        }),
      ]);

      return () => {
        unlisteners.forEach(unlisten => unlisten());
      };
    };

    const cleanup = setupMenuListeners();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, []); // Empty deps - use refs for stable values

  // Use keyboard shortcuts hook
  useKeyboardShortcuts({
    onSave: handleSave,
    onQuickSwitcher: () => setIsQuickSwitcherOpen(prev => !prev),
    onOpenDailyNote: handleOpenDailyNote,
    onOpenTemplateModal: handleOpenTemplateModal,
    onOpenSettings: () => setShowSettings(true),
    onCloseSettings: () => setShowSettings(false),
    isSettingsOpen: showSettings,
  });

  // Drag and drop handler - must be before early returns
  const handleDrop = useCallback(async (sourcePath: string, targetPath: string) => {
    const parts = sourcePath.split(/[/\\]/);
    const fileName = parts.pop() || sourcePath;
    const destination = `${targetPath}/${fileName}`;

    try {
      await invoke('move_file', {
        source: sourcePath,
        destination: destination,
      });

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }

      // Update open tabs if file was moved using hook's action
      renameTab(sourcePath, destination, fileName);
    } catch (error) {
      console.error('Failed to move file:', error);
    }
  }, [vaultPath, renameTab]);

  // Theme toggle handler - must be before early returns
  const handleToggleTheme = useCallback(async () => {
    if (!appearanceSettings) return;

    const newMode = appearanceSettings.baseTheme === 'dark' ? 'light' : 'dark';
    const updated = { ...appearanceSettings, baseTheme: newMode };

    // Apply theme mode immediately
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${newMode}`);

    setAppearanceSettings(updated);
    await vaultConfigStore.updateAppearance({ baseTheme: newMode });
  }, [appearanceSettings]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--background-primary)',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          color: 'var(--color-accent)',
          fontSize: '24px',
          fontWeight: 600,
          fontFamily: 'var(--font-interface)',
        }}>
          Igne
        </div>
        <div style={{
          color: 'var(--text-muted)',
          fontSize: '12px',
          fontFamily: 'var(--font-interface)',
        }}>
          Loading...
        </div>
      </div>
    );
  }

  // Show standalone file viewer if a file is open
  if (standaloneFilePath) {
    return (
      <>
        {isDraggingFile && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(var(--color-accent-rgb), 0.15)',
            border: '3px dashed var(--color-accent)',
            borderRadius: '8px',
            margin: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none',
          }}>
            <div style={{
              backgroundColor: 'var(--background-secondary)',
              padding: '16px 32px',
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}>
              <span style={{
                color: 'var(--color-accent)',
                fontSize: '14px',
                fontFamily: 'var(--font-interface)',
                fontWeight: 500,
              }}>
                Drop to open
              </span>
            </div>
          </div>
        )}
        <StandaloneViewer
          filePath={standaloneFilePath}
          onClose={handleCloseStandaloneFile}
          onOpenVault={(path) => {
            setStandaloneFilePath(null);
            handleOpenVaultPath(path);
          }}
          onOpenFile={handleOpenFile}
        />
      </>
    );
  }

  // Drop overlay for visual feedback
  const dropOverlay = isDraggingFile && (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(var(--color-accent-rgb), 0.15)',
      border: '3px dashed var(--color-accent)',
      borderRadius: '8px',
      margin: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <div style={{
        backgroundColor: 'var(--background-secondary)',
        padding: '16px 32px',
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        <span style={{
          color: 'var(--color-accent)',
          fontSize: '14px',
          fontFamily: 'var(--font-interface)',
          fontWeight: 500,
        }}>
          Drop to open
        </span>
      </div>
    </div>
  );

  // Show vault picker if requested
  if (showVaultPicker) {
    return (
      <>
        {dropOverlay}
        <VaultPicker onOpen={handleOpenVaultPath} onOpenFile={handleOpenStandaloneFile} />
      </>
    );
  }

  return (
    <div style={styles.app}>
      {dropOverlay}
      {/* Custom Title Bar with Tabs */}
      {!focusMode && <TitleBar
        openTabs={openTabs}
        activeTabPath={activeTabPath}
        onTabClick={setActive}
        onTabClose={closeTab}
        onFileNameChange={handleFileNameChange}
        onOpenSettings={() => setShowSettings(true)}
      />}

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Ribbon - Left Icon Bar */}
        {!focusMode && <Ribbon
          onNewNote={handleNewFile}
          onOpenGraph={() => setRightPanel('graph')}
          onOpenCommandPalette={() => setIsQuickSwitcherOpen(true)}
          onOpenSettings={() => setShowSettings(true)}
          onSwitchVault={handleOpenVault}
          collapsed={ribbonCollapsed}
          onToggleCollapse={() => setRibbonCollapsed(!ribbonCollapsed)}
        />}

        {/* Sidebar - Collapsible */}
        {!focusMode && (sidebarCollapsed ? (
          <div
            onClick={() => setSidebarCollapsed(false)}
            style={{
              width: '8px',
              backgroundColor: 'var(--background-secondary)',
              borderRight: '1px solid var(--background-modifier-border)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
            }}
            title="Expand file tree"
          />
        ) : (
        <aside style={{ ...styles.sidebar, position: 'relative' }}>
          {vaultPath ? (
            <div style={styles.sidebarContent}>
              <div style={styles.sidebarHeader}>
                <div style={styles.vaultName}>{vaultName}</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(true)}
                    style={{
                      ...styles.newFileButton,
                      padding: '4px',
                      width: '24px',
                      height: '24px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-accent)';
                      e.currentTarget.style.color = 'var(--text-normal)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                    title="Collapse sidebar"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="11 17 6 12 11 7" />
                      <polyline points="18 17 13 12 18 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    data-testid="create-file-button"
                    onClick={handleNewFile}
                    style={{
                      ...styles.newFileButton,
                      padding: '4px',
                      width: '24px',
                      height: '24px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-accent)';
                      e.currentTarget.style.color = 'var(--text-normal)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                    title="New File"
                  >
                    <FilePlus size={12} />
                  </button>
                </div>
              </div>
              {loading ? (
                <div style={styles.loading}>Loading...</div>
              ) : fileTreeError ? (
                <div
                  onClick={() => {
                    setFileTreeError(null);
                    // Trigger re-read by clearing files
                    setFiles([]);
                  }}
                  style={{
                    padding: '16px',
                    color: 'var(--color-red)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-interface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                  title="Click to retry"
                >
                  {fileTreeError}
                </div>
              ) : (
                <FileTree
                  entries={files}
                  selectedPath={activeTabPath ?? null}
                  onSelect={handleFileSelect}
                  onContextMenu={handleContextMenu}
                  onDrop={handleDrop}
                />
              )}
              {/* Open Vault button at bottom */}
              <div
                style={{
                  marginTop: 'auto',
                  padding: '6px 8px',
                  borderTop: '1px solid var(--background-modifier-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Clear any existing selection
                  const selection = window.getSelection();
                  if (selection) {
                    selection.removeAllRanges();
                  }
                }}
                onMouseDown={(e) => {
                  // Prevent selection on mousedown too
                  if (e.detail > 1) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <FolderOpen size={12} style={{ color: 'var(--text-faint)', flexShrink: 0, pointerEvents: 'none' }} />
                {vaultName && (
                  <span
                    style={{
                      color: 'var(--text-faint)',
                      fontSize: '10px',
                      fontFamily: 'var(--font-interface)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    {vaultName}
                  </span>
                )}
                <button
                  onClick={handleOpenVault}
                  style={{
                    ...styles.newFileButton,
                    padding: '4px',
                    width: '20px',
                    height: '20px',
                    flexShrink: 0,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'var(--text-normal)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                  title="Change Vault"
                  onMouseDown={(e) => {
                    if (e.detail > 1) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <FolderOpen size={10} style={{ pointerEvents: 'none' }} />
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <FolderOpen size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No vault open</p>
              <button
                onClick={handleOpenVault}
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-interface)',
                  backgroundColor: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  color: 'var(--text-on-accent)',
                }}
              >
                <FolderOpen size={14} />
                Open Vault
              </button>
            </div>
          )}
        </aside>
        ))}

        {/* Content Area */}
        <main style={styles.contentArea}>
          {(() => {
            const activeTab = getActiveTab();
            return activeTab ? (
              <>
                {/* Daily Notes Navigation */}
                <DailyNotesNav
                  vaultPath={vaultPath}
                  currentFilePath={activeTab.path}
                  onNoteOpen={async (path, content) => {
                    const parts = path.split(/[/\\]/);
                    const name = parts[parts.length - 1] || '';

                    // Refresh file list and re-index
                    const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath! });
                    setFiles(entries);
                    await searchStore.indexFiles(vaultPath!, entries);

                    openTab(path, name, content, false);
                  }}
                />
                <div style={styles.editorContainer}>
                  {activeTab.path === '__graph__' ? (
                    <GraphView
                      files={openTabs.filter(t => t.path !== '__graph__')}
                      onNodeClick={(path) => {
                        handleFileSelect(path);
                      }}
                    />
                  ) : (
                    <Editor
                      content={activeTab.content}
                      onChange={handleContentChange}
                      onCursorPositionChange={(line, column) => {
                        setCurrentLine(line);
                        setCurrentColumn(column);
                      }}
                      vaultPath={vaultPath}
                      currentFilePath={activeTab.path}
                      scrollPosition={scrollToPosition}
                      refreshTrigger={editorRefreshTrigger}
                      lineWrapping={lineWrapping}
                      readableLineLength={readableLineLength}
                      onWikilinkClick={(target) => {
                        console.log('[App] onWikilinkClick called:', target);
                        if (!isVaultReady) {
                          console.log('[App] Vault not ready, queuing wikilink');
                          // Queue the click for when vault is ready
                          setWikilinkQueue(prev => [...prev, { target, newTab: false }]);
                          return;
                        }
                        const path = searchStore.getFilePathByName(target);
                        console.log('[App] searchStore.getFilePathByName returned:', path);
                        if (path) {
                          handleFileSelect(path); // Regular click: switch to existing tab or open in current tab
                        } else {
                          console.warn('[App] Wikilink target not found:', target);
                        }
                      }}
                      onWikilinkCmdClick={(target) => {
                        if (!isVaultReady) {
                          // Queue the click for when vault is ready
                          setWikilinkQueue(prev => [...prev, { target, newTab: true }]);
                          return;
                        }
                        const path = searchStore.getFilePathByName(target);
                        if (path) {
                          handleFileSelect(path, true); // Cmd+Click: open in new tab
                        }
                      }}
                    />
                  )}
                </div>
                {!focusMode && <div
                  style={{
                    width: '256px',
                    backgroundColor: 'var(--background-secondary)',
                    borderLeft: '1px solid var(--background-modifier-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Panel Toggle - Icon tabs */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '2px',
                      padding: '6px 8px',
                      borderBottom: '1px solid var(--background-modifier-border)',
                    }}
                  >
                    {[
                      { id: 'backlinks' as const, label: 'Backlinks', icon: <Link2 size={14} /> },
                      { id: 'outline' as const, label: 'Outline', icon: <List size={14} /> },
                      { id: 'tags' as const, label: 'Tags', icon: <Hash size={14} /> },
                      { id: 'graph' as const, label: 'Graph', icon: <Network size={14} /> },
                      { id: 'starred' as const, label: 'Starred', icon: <Star size={14} /> },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setRightPanel(tab.id)}
                        title={tab.label}
                        style={{
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: rightPanel === tab.id ? 'var(--background-modifier-hover)' : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: rightPanel === tab.id ? 'var(--color-accent)' : 'var(--text-faint)',
                          cursor: 'pointer',
                          transition: 'background 100ms ease, color 100ms ease',
                        }}
                        onMouseEnter={(e) => {
                          if (rightPanel !== tab.id) {
                            e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (rightPanel !== tab.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-faint)';
                          }
                        }}
                      >
                        {tab.icon}
                      </button>
                    ))}
                  </div>
                  {/* Panel Content */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    {rightPanel === 'outline' ? (
                      <OutlinePanel
                        key={activeTab.path}
                        content={activeTab.content}
                        currentLine={currentLine}
                        onHeadingClick={(position, _headingText) => {
                          setScrollToPosition(position);
                        }}
                      />
                    ) : rightPanel === 'tags' ? (
                      <TagsPanel
                        files={openTabs}
                        onTagClick={(tag) => {
                          // Open quick switcher with tag search
                          setIsQuickSwitcherOpen(true);
                          console.log('Search for tag:', tag);
                        }}
                      />
                    ) : rightPanel === 'graph' ? (
                      <LocalGraphView
                        files={openTabs}
                        currentFilePath={activeTab.path}
                        onNodeClick={handleFileSelect}
                        onOpenFullGraph={() => {
                          // Open full graph as a virtual tab
                          openTab('__graph__', 'Graph', '', true);
                        }}
                        depth={2}
                      />
                    ) : rightPanel === 'starred' ? (
                      <StarredFilesPanel
                        vaultPath={vaultPath}
                        currentFilePath={activeTab.path}
                        onFileSelect={handleFileSelect}
                        onRefresh={async () => {
                          if (vaultPath) {
                            const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
                            setFiles(entries);
                          }
                        }}
                      />
                    ) : (
                      <BacklinksPanel
                        key={activeTab.path}
                        currentFilePath={activeTab.path}
                        onBacklinkClick={handleFileSelect}
                        data-testid="backlinks-panel"
                      />
                    )}
                  </div>
                </div>}
              </>
            ) : (
              <div style={styles.emptyContent}>
                <FileText size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>Select a file or create a new one</p>
              </div>
            );
          })()}
        </main>
      </div>

      {/* Status Bar */}
      {!focusMode && activeTab && (
        <StatusBar
          content={activeTab.content}
          cursorLine={currentLine}
          cursorColumn={currentColumn}
          backlinksCount={activeTab.path ? searchStore.findBacklinks(activeTab.path).length : 0}
        />
      )}

      {/* Quick Switcher */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectFile={handleFileSelect}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isFolder={contextMenu.isFolder}
          onClose={() => setContextMenu(null)}
          onRename={handleRename}
          onDelete={handleDelete}
          onNewNote={handleNewFileInFolder}
          onNewFolder={handleNewFolder}
          onOpenInNewTab={() => {
            handleFileSelect(contextMenu.path, true);
            setContextMenu(null);
          }}
        />
      )}

      {/* Rename Dialog */}
      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.path.split(/[/\\]/).pop() || ''}
          onClose={() => setRenameTarget(null)}
          onRename={handleRenameConfirm}
          isFolder={renameTarget.isFolder}
          existingNames={(() => {
            const parentDir = renameTarget.path.split(/[/\\]/).slice(0, -1).join('/');
            function findSiblings(entries: FileEntry[], targetParent: string): string[] {
              for (const entry of entries) {
                if (entry.is_dir && entry.path === targetParent && entry.children) {
                  return entry.children.map(c => c.name);
                }
                if (entry.is_dir && entry.children) {
                  const found = findSiblings(entry.children, targetParent);
                  if (found.length > 0) return found;
                }
              }
              return [];
            }
            // If parent is vault root, siblings are top-level entries
            if (parentDir === vaultPath) return files.map(f => f.name);
            return findSiblings(files, parentDir);
          })()}
          data-testid="rename-dialog"
        />
      )}

      {/* Template Insert Modal */}
      {isTemplateModalOpen && vaultPath && (
        <TemplateInsertModal
          templates={templates}
          onInsertTemplate={handleInsertTemplate}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}

      {/* Settings Modal */}
      {appearanceSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          vaultSettings={vaultSettings || {}}
          appearanceSettings={appearanceSettings}
          onUpdateAppearance={handleUpdateAppearance}
          vaultPath={vaultPath}
          lineWrapping={lineWrapping}
          onLineWrappingChange={handleLineWrappingChange}
          readableLineLength={readableLineLength}
          onReadableLineLengthChange={handleReadableLineLengthChange}
        />
      )}

      {/* Confirm/Alert Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          alertOnly={confirmDialog.alertOnly}
          destructive={confirmDialog.destructive}
          onConfirm={() => {
            confirmDialog.resolve(true);
            setConfirmDialog(null);
          }}
          onCancel={() => {
            confirmDialog.resolve(false);
            setConfirmDialog(null);
          }}
        />
      )}

      {/* Prompt Dialog */}
      {promptDialog && (
        <PromptDialog
          title={promptDialog.title}
          message={promptDialog.message}
          placeholder={promptDialog.placeholder}
          defaultValue={promptDialog.defaultValue}
          submitLabel={promptDialog.submitLabel}
          onSubmit={(value) => {
            promptDialog.resolve(value);
            setPromptDialog(null);
          }}
          onCancel={() => {
            promptDialog.resolve(null);
            setPromptDialog(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
