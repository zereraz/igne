import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
  FolderOpen,
  FileText,
  FilePlus,
} from 'lucide-react';
import { FileTree } from './components/FileTree';
import { Editor } from './components/Editor';
import { TitleBar } from './components/TitleBar';
import { QuickSwitcher } from './components/QuickSwitcher';
import { BacklinksPanel } from './components/BacklinksPanel';
import { ContextMenu } from './components/ContextMenu';
import { RenameDialog } from './components/RenameDialog';
import { FileEntry, OpenFile } from './types';
import { searchStore } from './stores/searchStore';

const styles = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#18181b',
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
const POLL_INTERVAL = 2000;

interface ContextMenuState {
  path: string;
  isFolder: boolean;
  x: number;
  y: number;
}

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenFile[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ path: string; isFolder: boolean } | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

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
  const closeTab = useCallback((path: string) => {
    setOpenTabs(prev => {
      const index = prev.findIndex(tab => tab.path === path);
      if (index === -1) return prev;

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

  // Start/stop file watching - only re-index if file count changes
  useEffect(() => {
    if (vaultPath) {
      let lastFileCount = 0;

      pollIntervalRef.current = window.setInterval(async () => {
        const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        const currentFileCount = entries.length;

        // Only re-index if the number of files changed (external add/delete)
        if (currentFileCount !== lastFileCount) {
          setFiles(entries);
          await searchStore.indexFiles(vaultPath, entries);
          lastFileCount = currentFileCount;
        } else {
          setFiles(entries); // Still update the file tree
        }
      }, POLL_INTERVAL);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [vaultPath]);

  // Load directory when vault changes
  useEffect(() => {
    if (vaultPath) {
      setLoading(true);
      invoke<FileEntry[]>('read_directory', { path: vaultPath })
        .then(async (entries) => {
          setFiles(entries);
          await searchStore.indexFiles(vaultPath, entries);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [vaultPath]);

  const handleOpenVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Vault Folder',
      });

      if (selected && typeof selected === 'string') {
        setVaultPath(selected);
        setOpenTabs([]);
        setActiveTabPath(null);
      }
    } catch (e) {
      console.error('Failed to open folder:', e);
    }
  };

  const handleNewFile = useCallback(async () => {
    if (!vaultPath) return;

    // Find the next available untitled filename
    const existingFiles = files.map(f => f.name);
    let counter = 0;
    let fileName: string;
    do {
      fileName = counter === 0 ? `${UNTITLED_BASE}.md` : `${UNTITLED_BASE} ${counter}.md`;
      counter++;
    } while (existingFiles.includes(fileName));

    const untitledPath = `${vaultPath}/${fileName}`;

    // Create the file immediately with empty content
    try {
      await invoke('write_file', { path: untitledPath, content: '' });
      openTab(untitledPath, fileName, '', false);
      // Refresh file list and re-index
      const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
      setFiles(entries);
      await searchStore.indexFiles(vaultPath, entries);
    } catch (e) {
      console.error(e);
    }
  }, [vaultPath, files, openTab]);

  const handleFileSelect = useCallback(
    (path: string, newTab = false) => {
      invoke<string>('read_file', { path })
        .then((content) => {
          const parts = path.split(/[/\\]/);
          const name = parts[parts.length - 1] || '';

          setOpenTabs(prev => {
            const existing = prev.find(tab => tab.path === path);

            if (existing) {
              // File already open - just switch to it and update content
              setActiveTabPath(path);
              return prev.map(tab =>
                tab.path === path ? { ...tab, content } : tab
              );
            }

            if (newTab) {
              // Open in new tab
              const newTabItem: OpenFile = { path, name, content, isDirty: false };
              return [...prev, newTabItem];
            }

            // Replace active tab content
            if (prev.length === 0) {
              // No tabs yet, create first one
              const newTabItem: OpenFile = { path, name, content, isDirty: false };
              return [newTabItem];
            }

            // Replace the active tab's content
            return prev.map(tab =>
              tab.path === activeTabPath ? { path, name, content, isDirty: false } : tab
            );
          });

          // If we created a new tab, activate it
          if (newTab || openTabs.length === 0 || !openTabs.find(t => t.path === path)) {
            setActiveTabPath(path);
          }
        })
        .catch(console.error);
    },
    [activeTabPath, openTabs]
  );

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

  // Auto-save: saves to file after 1 second of inactivity
  const autoSave = useCallback(async () => {
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
      // Update search index with new content
      await searchStore.updateFile(activeTab.path, activeTab.content);
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }, [getActiveTab]);

  const handleContentChange = useCallback((content: string) => {
    setOpenTabs(prev => prev.map(tab =>
      tab.path === activeTabPath ? { ...tab, content, isDirty: true } : tab
    ));
  }, [activeTabPath]);

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
      await invoke('rename_file', {
        oldPath: activeTab.path,
        newPath: newPath,
      });

      setOpenTabs(prev => prev.map(tab =>
        tab.path === activeTab.path ? { ...tab, path: newPath, name: newName } : tab
      ));

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }
    } catch (error) {
      console.error('Failed to rename:', error);
    }
  }, [getActiveTab, vaultPath]);

  // Trigger auto-save when content changes (debounced by 1 second)
  useEffect(() => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Schedule auto-save after 1 second
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSave();
      autoSaveTimerRef.current = null;
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [getActiveTab()?.content, autoSave, getActiveTab]);

  // Keyboard shortcut for save and quick switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsQuickSwitcherOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

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

    const parts = renameTarget.path.split(/[/\\]/);
    parts.pop();
    const newPath = [...parts, newName].join('/');

    try {
      await invoke('rename_file', {
        oldPath: renameTarget.path,
        newPath: newPath,
      });

      // Remove old path from search index and re-index
      await searchStore.removeFile(renameTarget.path);

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

    // Find the next available untitled filename
    const folderFiles = files.filter(f => f.path.startsWith(contextMenu.path));
    const existingFiles = folderFiles.map(f => f.name);
    let counter = 0;
    let fileName: string;
    do {
      fileName = counter === 0 ? `${UNTITLED_BASE}.md` : `${UNTITLED_BASE} ${counter}.md`;
      counter++;
    } while (existingFiles.includes(fileName));

    const newFilePath = `${contextMenu.path}/${fileName}`;

    // Create the file immediately with empty content
    try {
      await invoke('write_file', { path: newFilePath, content: '' });
      openTab(newFilePath, fileName, '', false);
      // Refresh file list and re-index
      const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
      setFiles(entries);
      await searchStore.indexFiles(vaultPath, entries);
    } catch (e) {
      console.error(e);
    }

    setContextMenu(null);
  }, [contextMenu, vaultPath, files]);

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

  return (
    <div style={styles.app}>
      {/* Custom Title Bar with Tabs */}
      <TitleBar
        openTabs={openTabs}
        activeTabPath={activeTabPath}
        onTabClick={setActiveTabPath}
        onTabClose={closeTab}
        onFileNameChange={handleFileNameChange}
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
                <div style={styles.editorContainer}>
                  <Editor
                    content={activeTab.content}
                    onChange={handleContentChange}
                    onWikilinkClick={(target) => {
                      const path = searchStore.getFilePathByName(target);
                      if (path) {
                        handleFileSelect(path); // Regular click: switch to existing tab or open in current tab
                      }
                    }}
                    onWikilinkCmdClick={(target) => {
                      const path = searchStore.getFilePathByName(target);
                      if (path) {
                        handleFileSelect(path, true); // Cmd+Click: open in new tab
                      }
                    }}
                  />
                </div>
                <BacklinksPanel
                  key={activeTab.path}
                  currentFilePath={activeTab.path}
                  onBacklinkClick={handleFileSelect}
                />
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
        />
      )}
    </div>
  );
}

export default App;
