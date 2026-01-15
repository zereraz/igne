import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { registerStandaloneHandler } from './main';
import {
  FolderOpen,
  FileText,
  FilePlus,
} from 'lucide-react';
import { useWorkspaceSync } from './hooks/useWorkspaceSync';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileWatcher, useDirectoryLoader } from './hooks/useFileWatcher';

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
import { QuickSwitcher } from './components/QuickSwitcher';
import { BacklinksPanel } from './components/BacklinksPanel';
import { OutlinePanel } from './components/OutlinePanel';
import { TagsPanel } from './components/TagsPanel';
import { GraphView } from './components/GraphView';
import { ContextMenu } from './components/ContextMenu';
import { RenameDialog } from './components/RenameDialog';
import { TemplateInsertModal } from './components/TemplateInsertModal';
import { DailyNotesNav } from './components/DailyNotesNav';
import { StarredFilesPanel } from './components/StarredFilesPanel';
import { VaultPicker } from './components/VaultPicker';
import { SettingsModal } from './components/SettingsModal';
import { StandaloneViewer } from './components/StandaloneViewer';
import { FileEntry, OpenFile } from './types';
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
import { loadTemplates, insertTemplateIntoFile, createFileFromTemplate } from './utils/templateLoader';
import { ensureDefaultVault } from './utils/defaultVault';
import { CommandRegistry } from './commands/registry';
import { setWorkspaceManager } from './tools/workspace';

// Dynamic app styles based on theme - backgroundColor controlled by CSS theme classes
const styles = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  dirtyIndicator: {
    color: '#f59e0b',
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
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: '#3f3f46',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    color: 'white',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '256px',
    backgroundColor: '#1f1f23',
    borderRight: '1px solid #3f3f46',
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
    color: '#71717a',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 500,
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  newFileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    backgroundColor: 'transparent',
    border: '1px solid #3f3f46',
    borderRadius: '2px',
    cursor: 'pointer',
    color: '#a1a1aa',
    transition: 'border-color 100ms ease, color 100ms ease',
  },
  loading: {
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '16px',
    paddingBottom: '16px',
    color: '#71717a',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#71717a',
    fontSize: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  emptyContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#71717a',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
  },
};

const UNTITLED_BASE = 'Untitled';

// Counter for untitled files (persists across the session)
let untitledCounter = 0;

/**
 * Create a virtual untitled file (exists only in memory until content is typed)
 * Returns the new tab object to be added to openTabs
 * Note: This creates a virtual file - actual disk check happens when materializing
 */
function createVirtualUntitledFile(vaultPath: string, subFolder?: string): OpenFile {
  untitledCounter++;
  const fileName = `${UNTITLED_BASE}-${untitledCounter}.md`;
  const basePath = subFolder || vaultPath;
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
  const [openTabs, setOpenTabs] = useState<OpenFile[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVaultReady, setIsVaultReady] = useState(false);
  const [fileTreeError, setFileTreeError] = useState<string | null>(null);
  const [wikilinkQueue, setWikilinkQueue] = useState<Array<{target: string; newTab: boolean}>>([]);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [rightPanel, setRightPanel] = useState<'backlinks' | 'outline' | 'tags' | 'graph' | 'starred'>('backlinks');
  const [currentLine, setCurrentLine] = useState<number | undefined>(undefined);
  const [scrollToPosition, setScrollToPosition] = useState<number | undefined>(undefined);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ name: string; path: string }>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const switchingVaultRef = useRef(false);

  // Ref for stable access to activeTabPath in closures (fixes stale closure issues)
  const activeTabPathRef = useRef(activeTabPath);
  activeTabPathRef.current = activeTabPath;

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

      // Save current workspace if we have one
      if (vaultPath && openTabs.length > 0) {
        const lastOpenFiles = openTabs.map(t => t.path);
        await workspaceStateManager.saveNow(lastOpenFiles);
        console.log('[App] Saved previous workspace');
      }

      // Add to vaults registry and set as last opened
      await vaultsStore.addVault(path);

      // Load vault config
      await vaultConfigStore.init(path);
      const vaultSettings = vaultConfigStore.getSettings();
      const appearance = vaultConfigStore.getAppearance();

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
      const openTabsWithContent = await Promise.all(
        openFiles.map(async (file: OpenFile) => {
          try {
            const content = await invoke<string>('read_file', { path: file.path });
            return { ...file, content };
          } catch (e) {
            console.error('[App] Failed to load file:', file.path, e);
            return { ...file, content: '' };
          }
        })
      );

      // Update state
      setVaultPath(path);
      setOpenTabs(openTabsWithContent);
      setActiveTabPath(activeTab);
      setVaultSettings(vaultSettings);
      setAppearanceSettings(appearance);
      setShowVaultPicker(false);
    } catch (e) {
      console.error('[App] Failed to open vault:', e);
      alert('Failed to open vault: ' + (e as Error).message);
    } finally {
      switchingVaultRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No deps - read vaultPath/openTabs at call time to avoid circular dependency

  // Handle opening a standalone markdown file
  const handleOpenStandaloneFile = useCallback((filePath: string) => {
    console.log('[App] Opening standalone file:', filePath);
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

  // Keyboard shortcuts for file operations (Cmd+O and Cmd+N)
  // These use direct window listeners because CodeMirror can intercept events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+O - Open File
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
        return;
      }
      // Cmd+N - New File (use ref to get latest vault path)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        const currentVaultPath = vaultPathRef.current;
        if (!currentVaultPath) {
          console.log('[App] Cmd+N: No vault path');
          return;
        }
        const newTab = createVirtualUntitledFile(currentVaultPath);
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabPath(newTab.path);
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

  // Helper to get the active tab
  const getActiveTab = useCallback(() => {
    return openTabs.find(tab => tab.path === activeTabPath) || null;
  }, [openTabs, activeTabPath]);

  // Open a file in a tab (or switch to it if already open)
  const openTab = useCallback((path: string, name: string, content: string, isDirty = false) => {
    setOpenTabs(prev => {
      const existing = prev.find(tab => tab.path === path);
      if (existing) {
        // File already open, just switch to it and update content if changed
        setActiveTabPath(path);
        return prev.map(tab =>
          tab.path === path ? { ...tab, content, isDirty: tab.isDirty || isDirty } : tab
        );
      }
      // Open new tab
      const newTab: OpenFile = { path, name, content, isDirty };
      return [...prev, newTab];
    });
    setActiveTabPath(path);
  }, []);

  // Close a tab
  // Virtual files with no content are silently discarded (not written to disk)
  const closeTab = useCallback((path: string) => {
    setOpenTabs(prev => {
      const index = prev.findIndex(tab => tab.path === path);
      if (index === -1) return prev;

      const tabToClose = prev[index];
      // Virtual files with no content just get discarded - no disk operation needed
      // (they were never written to disk in the first place)
      if (tabToClose.isVirtual) {
        console.log('[App] Discarding virtual file:', tabToClose.name);
      }

      const newTabs = prev.filter(tab => tab.path !== path);

      // If closing the active tab, switch to another
      if (path === activeTabPath) {
        if (newTabs.length > 0) {
          // Try to select the tab to the right, or the one to the left
          const newIndex = Math.min(index, newTabs.length - 1);
          setActiveTabPath(newTabs[newIndex].path);
        } else {
          setActiveTabPath(null);
        }
      }

      return newTabs;
    });
  }, [activeTabPath]);

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
    const newTab = createVirtualUntitledFile(vaultPath);
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabPath(newTab.path);
  }, [vaultPath]);

  const handleFileSelect = useCallback(
    (path: string, newTab = false) => {
      invoke<string>('read_file', { path })
        .then((content) => {
          const parts = path.split(/[/\\]/);
          const name = parts[parts.length - 1] || '';

          setOpenTabs(prev => {
            const existing = prev.find(tab => tab.path === path);

            // Cmd+click: always open a new tab even if file is already open
            if (newTab) {
              const newTabItem: OpenFile = { path, name, content, isDirty: false };
              return [...prev, newTabItem];
            }

            if (existing) {
              // Regular click: file already open - just switch to it and update content
              return prev.map(tab =>
                tab.path === path ? { ...tab, content } : tab
              );
            }

            // Replace active tab content
            if (prev.length === 0) {
              // No tabs yet, create first one
              const newTabItem: OpenFile = { path, name, content, isDirty: false };
              return [newTabItem];
            }

            // Replace the active tab's content (use ref to avoid stale closure)
            return prev.map(tab =>
              tab.path === activeTabPathRef.current ? { path, name, content, isDirty: false } : tab
            );
          });

          // Set active tab path after state update
          setActiveTabPath(path);
        })
        .catch(console.error);
    },
    [] // Empty deps - use refs for stable closure
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
    const activeTab = getActiveTab();
    if (!activeTab) return;

    try {
      await invoke('write_file', {
        path: activeTab.path,
        content: activeTab.content,
      });

      setOpenTabs(prev => prev.map(tab =>
        tab.path === activeTab.path ? { ...tab, isDirty: false } : tab
      ));

      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  }, [getActiveTab, vaultPath]);

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
    // Use a promise to get current state without stale closure
    const tabInfo = await new Promise<{ isVirtual: boolean; name: string } | null>(resolve => {
      setOpenTabs(prev => {
        const tab = prev.find(t => t.path === path);
        if (tab?.isVirtual && content.trim()) {
          resolve({ isVirtual: true, name: tab.name });
        } else {
          resolve(null);
        }
        return prev; // No change yet, just reading
      });
    });

    if (tabInfo) {
      // Materialize virtual file - check for existing file first
      try {
        const meta = await invoke<{ exists: boolean }>('stat_path', { path });
        let finalPath = path;
        let finalName = tabInfo.name;

        if (meta.exists) {
          // File already exists, find a unique path
          const dirPath = path.substring(0, path.lastIndexOf('/'));
          finalPath = await findUniqueFilePath(dirPath, UNTITLED_BASE);
          finalName = finalPath.substring(finalPath.lastIndexOf('/') + 1);
          console.log('[App] File existed, using unique path:', finalPath);
        }

        await invoke('write_file', { path: finalPath, content });

        // Update tab with final path and mark as non-virtual
        setOpenTabs(prev => prev.map(t =>
          t.path === path ? { ...t, path: finalPath, name: finalName, content, isDirty: false, isVirtual: false } : t
        ));
        setActiveTabPath(finalPath);

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
    setOpenTabs(prev => prev.map(t =>
      t.path === path ? { ...t, content, isDirty: true } : t
    ));

    // Auto-save after 1 second of no typing (debounced)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      // Get the latest tab state
      setOpenTabs(currentTabs => {
        const tabToSave = currentTabs.find(t => t.path === path);
        if (tabToSave && tabToSave.isDirty && !tabToSave.isVirtual) {
          // Save async
          invoke('write_file', { path: tabToSave.path, content: tabToSave.content })
            .then(() => {
              console.log('[App] Auto-saved:', tabToSave.name);
              // Mark as not dirty after save
              setOpenTabs(tabs => tabs.map(t =>
                t.path === path ? { ...t, isDirty: false } : t
              ));
            })
            .catch(e => console.error('[App] Auto-save failed:', e));
        }
        return currentTabs; // No state change here
      });
    }, 1000);
  }, []);

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
        const confirmed = window.confirm(
          `This will update ${linkUpdateCount} incoming link${linkUpdateCount > 1 ? 's' : ''} in other files. Continue?`
        );
        if (!confirmed) return;
      }

      // Use enhanced rename with link updates
      await renameFileWithLinkUpdates({
        oldPath: activeTab.path,
        newPath: newPath,
        updateLinks: true,
      });

      // Update tab path/name, explicitly preserving content
      // Also update activeTabPath to match the new path
      setActiveTabPath(newPath);
      setOpenTabs(prev => prev.map(tab =>
        tab.path === activeTab.path
          ? { ...tab, path: newPath, name: newName, content: tab.content }
          : tab
      ));

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (error) {
      console.error('Failed to rename:', error);
      alert('Failed to rename file: ' + (error as Error).message);
    }
  }, [getActiveTab, vaultPath]);

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

    // Inline openTab logic to avoid circular dependency
    setOpenTabs(prev => {
      const existing = prev.find(tab => tab.path === notePath);
      if (existing) {
        setActiveTabPath(notePath);
        return prev.map(tab =>
          tab.path === notePath ? { ...tab, content, isDirty: false } : tab
        );
      }
      const newTab: OpenFile = { path: notePath, name, content, isDirty: false };
      return [...prev, newTab];
    });
    setActiveTabPath(notePath);
  }, [vaultPath]);

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
          const confirmed = window.confirm(
            `This will update ${linkUpdateCount} incoming link${linkUpdateCount > 1 ? 's' : ''} in other files. Continue?`
          );
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

      // Update open tabs if file was renamed
      setOpenTabs(prev => prev.map(tab => {
        if (tab.path === renameTarget.path) {
          const newParts = newPath.split(/[/\\]/);
          const name = newParts[newParts.length - 1] || '';
          return { ...tab, path: newPath, name };
        }
        return tab;
      }));
    } catch (error) {
      console.error('Failed to rename:', error);
    }

    setRenameTarget(null);
  }, [renameTarget, vaultPath]);

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
    const newTab = createVirtualUntitledFile(vaultPath, contextMenu.path);
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabPath(newTab.path);
    setContextMenu(null);
  }, [contextMenu, vaultPath]);

  const handleNewFolder = useCallback(async () => {
    if (!contextMenu) return;

    const folderName = prompt('Enter folder name:');
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
  }, [contextMenu, vaultPath]);

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

        // Open the new file - inline openTab logic
        const parts = newFilePath.split(/[/\\]/);
        const name = parts[parts.length - 1] || '';
        setOpenTabs(prev => {
          const existing = prev.find(tab => tab.path === newFilePath);
          if (existing) {
            setActiveTabPath(newFilePath);
            return prev.map(tab =>
              tab.path === newFilePath ? { ...tab, content, isDirty: false } : tab
            );
          }
          const newTab: OpenFile = { path: newFilePath, name, content, isDirty: false };
          return [...prev, newTab];
        });
        setActiveTabPath(newFilePath);
      } else {
        // Insert template into current file
        const activeTab = getActiveTab();
        if (!activeTab) {
          alert('Please open a file first to insert a template');
          setIsTemplateModalOpen(false);
          return;
        }

        // Get cursor position (we'll insert at end for now)
        const cursorPosition = activeTab.content.length;

        const { content: newContent } = await insertTemplateIntoFile(
          templatePath,
          activeTab.content,
          cursorPosition
        );

        // Update tab content
        setOpenTabs(prev => prev.map(tab =>
          tab.path === activeTab.path
            ? { ...tab, content: newContent, isDirty: true }
            : tab
        ));

        // Update search index
        await searchStore.updateFile(activeTab.path, newContent);
      }

      setIsTemplateModalOpen(false);
    } catch (error) {
      console.error('Failed to insert template:', error);
      alert('Failed to insert template: ' + (error as Error).message);
    }
  }, [vaultPath, getActiveTab]);

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
        setActiveTabPath(path);
      },
      getOpenFiles: () => openTabs.map(t => t.path),
      getActiveFile: () => activeTabPath,
    });
  }, [handleFileSelect, closeTab, openTabs, activeTabPath]);

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
      callback: (...args: unknown[]) => setActiveTabPath(...(args as [string])),
    });

    // Theme commands
    CommandRegistry.register({
      id: 'theme.toggle',
      name: 'Toggle Theme',
      icon: 'Sun',
      category: 'theme',
      callback: (...args: unknown[]) => handleToggleTheme(...(args as [])),
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
          const newTab = createVirtualUntitledFile(currentVaultPath);
          setOpenTabs(prev => [...prev, newTab]);
          setActiveTabPath(newTab.path);
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
          const currentActiveTab = activeTabPathRef.current;
          if (currentActiveTab) {
            closeTab(currentActiveTab);
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

      // Update open tabs if file was moved
      setOpenTabs(prev => prev.map(tab => {
        if (tab.path === sourcePath) {
          return { ...tab, path: destination };
        }
        return tab;
      }));
    } catch (error) {
      console.error('Failed to move file:', error);
    }
  }, [vaultPath]);

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
        backgroundColor: '#18181b',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          color: '#a78bfa',
          fontSize: '24px',
          fontWeight: 600,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          Igne
        </div>
        <div style={{
          color: '#71717a',
          fontSize: '12px',
          fontFamily: "'IBM Plex Mono', monospace",
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
            backgroundColor: 'rgba(124, 58, 237, 0.15)',
            border: '3px dashed #a78bfa',
            borderRadius: '8px',
            margin: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none',
          }}>
            <div style={{
              backgroundColor: '#1f1f23',
              padding: '16px 32px',
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}>
              <span style={{
                color: '#a78bfa',
                fontSize: '14px',
                fontFamily: "'IBM Plex Mono', monospace",
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
        />
      </>
    );
  }

  // Drop overlay for visual feedback
  const dropOverlay = isDraggingFile && (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
      border: '3px dashed #a78bfa',
      borderRadius: '8px',
      margin: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <div style={{
        backgroundColor: '#1f1f23',
        padding: '16px 32px',
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        <span style={{
          color: '#a78bfa',
          fontSize: '14px',
          fontFamily: "'IBM Plex Mono', monospace",
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
        <VaultPicker onOpen={handleOpenVaultPath} />
      </>
    );
  }

  return (
    <div style={styles.app}>
      {dropOverlay}
      {/* Custom Title Bar with Tabs */}
      <TitleBar
        openTabs={openTabs}
        activeTabPath={activeTabPath}
        onTabClick={setActiveTabPath}
        onTabClose={closeTab}
        onFileNameChange={handleFileNameChange}
        onThemeChange={async (theme) => {
          if (!appearanceSettings) return;
          const updated = { ...appearanceSettings, baseTheme: theme };
          setAppearanceSettings(updated);
          await vaultConfigStore.updateAppearance({ baseTheme: theme });
        }}
        onOpenSettings={() => setShowSettings(true)}
        baseTheme={appearanceSettings?.baseTheme || 'dark'}
      />

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          {vaultPath ? (
            <div style={styles.sidebarContent}>
              <div style={styles.sidebarHeader}>
                <div style={styles.vaultName}>{vaultName}</div>
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
                    e.currentTarget.style.borderColor = '#a78bfa';
                    e.currentTarget.style.color = '#e4e4e7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#3f3f46';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                  title="New File"
                >
                  <FilePlus size={12} />
                </button>
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
                    color: '#f87171',
                    fontSize: '12px',
                    fontFamily: "'IBM Plex Mono', monospace",
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
                  borderTop: '1px solid #3f3f46',
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
                <FolderOpen size={12} style={{ color: '#71717a', flexShrink: 0, pointerEvents: 'none' }} />
                {vaultName && (
                  <span
                    style={{
                      color: '#71717a',
                      fontSize: '10px',
                      fontFamily: "'IBM Plex Mono', monospace",
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
                    e.currentTarget.style.borderColor = '#a78bfa';
                    e.currentTarget.style.color = '#e4e4e7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#3f3f46';
                    e.currentTarget.style.color = '#a1a1aa';
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
                  fontFamily: "'IBM Plex Mono', monospace",
                  backgroundColor: '#a78bfa',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <FolderOpen size={14} />
                Open Vault
              </button>
            </div>
          )}
        </aside>

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
                  <Editor
                    content={activeTab.content}
                    onChange={handleContentChange}
                    onCursorPositionChange={(line) => setCurrentLine(line)}
                    vaultPath={vaultPath}
                    currentFilePath={activeTab.path}
                    scrollPosition={scrollToPosition}
                    refreshTrigger={editorRefreshTrigger}
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
                </div>
                <div
                  style={{
                    width: '256px',
                    backgroundColor: '#1f1f23',
                    borderLeft: '1px solid #3f3f46',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Panel Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      borderBottom: '1px solid #27272a',
                    }}
                  >
                    <button
                      onClick={() => setRightPanel('backlinks')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'backlinks' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'backlinks' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Backlinks
                    </button>
                    <button
                      onClick={() => setRightPanel('outline')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'outline' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'outline' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Outline
                    </button>
                    <button
                      onClick={() => setRightPanel('tags')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'tags' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'tags' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Tags
                    </button>
                    <button
                      onClick={() => setRightPanel('graph')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'graph' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'graph' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Graph
                    </button>
                    <button
                      onClick={() => setRightPanel('starred')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: rightPanel === 'starred' ? '#27272a' : 'transparent',
                        border: 'none',
                        color: rightPanel === 'starred' ? '#a78bfa' : '#71717a',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Starred
                    </button>
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
                      <GraphView
                        files={openTabs}
                        onNodeClick={handleFileSelect}
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
                </div>
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
        />
      )}

      {/* Rename Dialog */}
      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.path.split(/[/\\]/).pop() || ''}
          onClose={() => setRenameTarget(null)}
          onRename={handleRenameConfirm}
          isFolder={renameTarget.isFolder}
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
        />
      )}
    </div>
  );
}

export default App;
