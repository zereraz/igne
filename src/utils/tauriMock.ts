/**
 * Tauri API Mocking for Browser Dev Mode
 *
 * This file provides mock implementations of Tauri APIs so the app
 * can run in a browser for E2E testing without the Tauri runtime.
 *
 * Only active when window.__TAURI_INTERNALS__ is not present.
 */

// Check if we're in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

if (!isTauri && typeof window !== 'undefined') {
  console.log('[TauriMock] Tauri not detected, installing mocks for dev mode');

  // Constants for mock environment
  const MOCK_APP_DATA_DIR = '/mock-app-data';
  const MOCK_VAULT_PATH = '/mock-vault';

  // Load persisted test files from localStorage (for E2E test persistence across reloads)
  const MOCK_FILES_STORAGE_KEY = '__TAURI_MOCK_FILES__';
  const persistedTestFiles: Record<string, string> = (() => {
    try {
      const stored = localStorage.getItem(MOCK_FILES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();

  // Mock file system - pre-populated with vault structure
  const mockFiles: Record<string, string> = {
    // App data files
    [`${MOCK_APP_DATA_DIR}/vaults.json`]: JSON.stringify({
      version: 2,
      vaults: [{
        path: MOCK_VAULT_PATH,
        name: 'Test Vault',
        lastOpened: Date.now(),
        type: 'vault',
      }],
      lastOpened: MOCK_VAULT_PATH,
    }),
    [`${MOCK_APP_DATA_DIR}/settings.json`]: JSON.stringify({
      openLastVault: true,
      theme: 'dark',
    }),
    // Vault files
    [`${MOCK_VAULT_PATH}/.obsidian/community-plugins.json`]: '[]',
    [`${MOCK_VAULT_PATH}/.obsidian/app.json`]: '{}',
    [`${MOCK_VAULT_PATH}/.obsidian/daily-notes.json`]: JSON.stringify({ folder: '', format: 'YYYY-MM-DD' }),
    [`${MOCK_VAULT_PATH}/.obsidian/appearance.json`]: JSON.stringify({ baseFontSize: 16, theme: 'obsidian' }),
    // Workspace with Welcome.md open so editor appears immediately
    [`${MOCK_VAULT_PATH}/.obsidian/workspace.json`]: JSON.stringify({
      main: {
        id: 'main-pane',
        type: 'tabs',
        children: [
          {
            id: 'leaf-0',
            type: 'leaf',
            state: {
              type: 'markdown',
              file: 'Welcome.md',
              mode: 'source',
            },
            pinned: false,
          },
        ],
        currentTab: 0,
      },
      left: { collapsed: false, width: 256, activeTabs: {}, tabs: [] },
      right: { collapsed: true, width: 300, activeTabs: {}, tabs: [] },
      active: 'Welcome.md',
      lastOpenFiles: ['Welcome.md'],
      leftRibbon: { hiddenItems: [] },
      rightRibbon: { hiddenItems: [] },
    }),
    [`${MOCK_VAULT_PATH}/Welcome.md`]: '# Welcome to Igne\n\nThis is a test vault for E2E testing.\n\n## Features\n\n- [[Wikilinks]]\n- #testing #tags\n- [ ] Unchecked task\n- [x] Completed task\n',
    [`${MOCK_VAULT_PATH}/Wikilinks.md`]: '# Wikilinks\n\nThis note demonstrates [[Welcome|wikilink]] syntax.\n',
    [`${MOCK_VAULT_PATH}/Notes/Nested.md`]: '# Nested Note\n\nThis is a nested note in a subdirectory.\n',
    // Merge persisted test files
    ...persistedTestFiles,
  };

  // Mock directories
  const mockDirs: Set<string> = new Set([
    MOCK_VAULT_PATH,
    `${MOCK_VAULT_PATH}/.obsidian`,
    `${MOCK_VAULT_PATH}/Notes`,
    MOCK_APP_DATA_DIR,
  ]);

  // Mock event listeners
  const eventListeners: Record<string, Array<(payload: unknown) => void>> = {};

  // Install __TAURI_INTERNALS__ mock
  (window as any).__TAURI_INTERNALS__ = {
    invoke: async (cmd: string, args?: Record<string, unknown>): Promise<unknown> => {
      // Don't log every invoke to reduce noise
      if (!cmd.startsWith('plugin:')) {
        console.log('[TauriMock] invoke:', cmd, args);
      }

      switch (cmd) {
        // Plugin commands
        case 'plugin:event|listen':
          // Event listener registration - handled separately
          return null;

        case 'plugin:dialog|open':
          // File dialog - return mock vault path
          return MOCK_VAULT_PATH;

        // App data directory
        case 'get_app_data_dir':
          return MOCK_APP_DATA_DIR;

        // File operations
        case 'read_file': {
          let path = args?.path as string;
          // Handle relative paths by prepending vault path
          if (!path.startsWith('/')) {
            path = `${MOCK_VAULT_PATH}/${path}`;
          }
          if (mockFiles[path] !== undefined) {
            return mockFiles[path];
          }
          throw new Error(`File not found: ${path}`);
        }

        case 'write_file': {
          let path = args?.path as string;
          // Handle relative paths by prepending vault path
          if (!path.startsWith('/')) {
            path = `${MOCK_VAULT_PATH}/${path}`;
          }
          const content = args?.content as string;
          mockFiles[path] = content;
          return null;
        }

        case 'read_directory': {
          const path = args?.path as string;
          const entries: Array<{
            name: string;
            path: string;
            isFile: boolean;
            isDirectory: boolean;
            children: unknown[];
          }> = [];

          const seen = new Set<string>();

          // Find all files/dirs that are direct children of this path
          for (const filePath of Object.keys(mockFiles)) {
            if (filePath.startsWith(path + '/')) {
              const relativePath = filePath.slice(path.length + 1);
              const parts = relativePath.split('/');
              const name = parts[0];
              const fullPath = `${path}/${name}`;

              if (!seen.has(fullPath)) {
                seen.add(fullPath);
                const isDir = parts.length > 1 || mockDirs.has(fullPath);
                entries.push({
                  name,
                  path: fullPath,
                  isFile: !isDir,
                  isDirectory: isDir,
                  children: [],
                });
              }
            }
          }

          // Also include directories that might be empty
          for (const dirPath of mockDirs) {
            if (dirPath.startsWith(path + '/') && !dirPath.slice(path.length + 1).includes('/')) {
              const name = dirPath.slice(path.length + 1);
              if (!seen.has(dirPath)) {
                seen.add(dirPath);
                entries.push({
                  name,
                  path: dirPath,
                  isFile: false,
                  isDirectory: true,
                  children: [],
                });
              }
            }
          }

          return entries;
        }

        case 'stat_path': {
          let path = args?.path as string;
          // Handle relative paths by prepending vault path
          if (!path.startsWith('/')) {
            path = `${MOCK_VAULT_PATH}/${path}`;
          }
          const fileExists = mockFiles[path] !== undefined;
          const dirExists = mockDirs.has(path);
          return {
            exists: fileExists || dirExists,
            isFile: fileExists,
            isDirectory: dirExists,
          };
        }

        case 'create_directory': {
          const path = args?.path as string;
          mockDirs.add(path);
          return null;
        }

        case 'delete_file': {
          const path = args?.path as string;
          delete mockFiles[path];
          mockDirs.delete(path);
          return null;
        }

        case 'rename_file': {
          const oldPath = args?.oldPath as string;
          const newPath = args?.newPath as string;
          if (mockFiles[oldPath] !== undefined) {
            mockFiles[newPath] = mockFiles[oldPath];
            delete mockFiles[oldPath];
          }
          return null;
        }

        case 'move_file': {
          const source = args?.source as string;
          const destination = args?.destination as string;
          if (mockFiles[source] !== undefined) {
            mockFiles[destination] = mockFiles[source];
            delete mockFiles[source];
          }
          return null;
        }

        case 'watch_directory':
        case 'unwatch_directory':
        case 'unwatch_all':
          return null;

        default:
          // Only warn for non-plugin commands we don't handle
          if (!cmd.startsWith('plugin:')) {
            console.warn('[TauriMock] Unhandled command:', cmd);
          }
          return null;
      }
    },

    transformCallback: (callback: Function) => {
      const id = Math.random().toString(36).slice(2);
      (window as any)[`_${id}`] = callback;
      return id;
    },

    metadata: {
      currentWindow: {
        label: 'main',
      },
      currentWebview: {
        label: 'main',
        windowLabel: 'main',
      },
    },
  };

  // Mock window manager
  (window as any).__TAURI__ = {
    window: {
      getCurrent: () => ({
        label: 'main',
        setTitle: async () => {},
        setSize: async () => {},
        setMinSize: async () => {},
        setPosition: async () => {},
        center: async () => {},
        show: async () => {},
        hide: async () => {},
        close: async () => {},
        isVisible: async () => true,
        isMaximized: async () => false,
        isMinimized: async () => false,
        isFocused: async () => true,
        onCloseRequested: async () => () => {},
        onFocusChanged: async () => () => {},
        onMoved: async () => () => {},
        onResized: async () => () => {},
        onDragDropEvent: async () => () => {},
      }),
      currentWindow: {
        label: 'main',
      },
    },
  };

  // Mock @tauri-apps/api/event
  (window as any).__TAURI_EVENT_MOCK__ = {
    listen: (event: string, handler: (payload: unknown) => void) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(handler);
      return Promise.resolve(() => {
        const idx = eventListeners[event].indexOf(handler);
        if (idx >= 0) eventListeners[event].splice(idx, 1);
      });
    },
    emit: (event: string, payload: unknown) => {
      const handlers = eventListeners[event] || [];
      handlers.forEach(h => h({ payload }));
      return Promise.resolve();
    },
  };

  // Helper to persist test files to localStorage
  const persistTestFiles = () => {
    const testFiles: Record<string, string> = {};
    Object.keys(mockFiles).forEach(k => {
      // Persist vault files (not app data or .obsidian)
      if (k.startsWith(MOCK_VAULT_PATH) && !k.includes('.obsidian')) {
        testFiles[k] = mockFiles[k];
      }
    });
    try {
      localStorage.setItem(MOCK_FILES_STORAGE_KEY, JSON.stringify(testFiles));
    } catch {
      // Ignore storage errors
    }
  };

  // Expose mock helpers for tests
  (window as any).__TAURI_MOCK__ = {
    VAULT_PATH: MOCK_VAULT_PATH,
    APP_DATA_DIR: MOCK_APP_DATA_DIR,

    setMockFile: (path: string, content: string) => {
      mockFiles[path] = content;
      // Persist to localStorage for survival across reloads
      persistTestFiles();
    },
    getMockFile: (path: string) => {
      return mockFiles[path];
    },
    setMockDir: (path: string) => {
      mockDirs.add(path);
    },
    clearMocks: () => {
      // Clear test files from memory
      Object.keys(mockFiles).forEach(k => {
        if (!k.startsWith(MOCK_APP_DATA_DIR) && !k.includes('.obsidian')) {
          delete mockFiles[k];
        }
      });
      // Clear from localStorage
      try {
        localStorage.removeItem(MOCK_FILES_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    },
    emitEvent: (event: string, payload: unknown) => {
      const handlers = eventListeners[event] || [];
      handlers.forEach(h => h({ payload }));
    },
    getAllFiles: () => ({ ...mockFiles }),
    getAllDirs: () => [...mockDirs],
  };

  console.log('[TauriMock] Mocks installed with vault at:', MOCK_VAULT_PATH);
}

export {};
