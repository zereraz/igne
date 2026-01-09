import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import {
  FolderOpen,
  FileText,
  FilePlus,
  Eye,
  Edit3,
  Save,
  Dot,
  FolderPlus,
} from 'lucide-react';
import { FileTree } from './components/FileTree';
import { MarkdownViewer } from './components/MarkdownViewer';
import { Editor } from './components/Editor';
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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingTop: '8px',
    paddingBottom: '8px',
    backgroundColor: '#27272a',
    borderBottom: '1px solid #3f3f46',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontWeight: 600,
    color: 'white',
    fontSize: '14px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  },
  fileNameDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#a1a1aa',
    fontSize: '12px',
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
  // Primary button: solid accent
  buttonPrimary: {
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
    backgroundColor: '#a78bfa',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    color: 'white',
  },
  // Ghost button: muted accent on hover
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingLeft: '10px',
    paddingRight: '10px',
    paddingTop: '6px',
    paddingBottom: '6px',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: '1px solid #3f3f46',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'border-color 100ms ease, color 100ms ease',
    color: '#a1a1aa',
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
    paddingTop: '8px',
    paddingBottom: '8px',
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
    overflowY: 'auto' as const,
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
  viewerContainer: {
    flex: 1,
    overflowY: 'auto' as const,
  },
};

const UNTITLED_NAME = 'Untitled.md';
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
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ path: string; isFolder: boolean } | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Start/stop file watching
  useEffect(() => {
    if (vaultPath) {
      pollIntervalRef.current = window.setInterval(() => {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
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
        setOpenFile(null);
        setIsEditMode(false);
      }
    } catch (e) {
      console.error('Failed to open folder:', e);
    }
  };

  const handleNewFile = useCallback(() => {
    if (!vaultPath) return;

    const untitledPath = `${vaultPath}/${UNTITLED_NAME}`;
    invoke<boolean>('file_exists', { path: untitledPath }).then((exists) => {
      if (!exists) {
        setOpenFile({
          path: untitledPath,
          name: UNTITLED_NAME,
          content: '',
          isDirty: true,
        });
        setIsEditMode(true);
      } else {
        invoke<string>('read_file', { path: untitledPath })
          .then((content) => {
            setOpenFile({
              path: untitledPath,
              name: UNTITLED_NAME,
              content,
              isDirty: false,
            });
            setIsEditMode(false);
          })
          .catch(console.error);
      }
    });
  }, [vaultPath]);

  const handleFileSelect = useCallback(
    (path: string) => {
      invoke<string>('read_file', { path })
        .then((content) => {
          const parts = path.split(/[/\\]/);
          const name = parts[parts.length - 1] || '';
          setOpenFile({
            path,
            name,
            content,
            isDirty: false,
          });
          setIsEditMode(false);
        })
        .catch(console.error);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!openFile) return;

    if (openFile.name === UNTITLED_NAME) {
      try {
        const newPath = await save({
          defaultPath: openFile.path,
          filters: [{ name: 'Markdown', extensions: ['md'] }],
        });

        if (newPath) {
          await invoke('write_file', {
            path: newPath,
            content: openFile.content,
          });

          const parts = newPath.split(/[/\\]/);
          const name = parts[parts.length - 1] || '';

          setOpenFile({
            path: newPath,
            name,
            content: openFile.content,
            isDirty: false,
          });

          if (vaultPath) {
            invoke<FileEntry[]>('read_directory', { path: vaultPath })
              .then(setFiles)
              .catch(console.error);
          }
        }
      } catch (e) {
        console.error('Failed to save file:', e);
      }
    } else {
      try {
        await invoke('write_file', {
          path: openFile.path,
          content: openFile.content,
        });

        setOpenFile((prev) => (prev ? { ...prev, isDirty: false } : null));

        if (vaultPath) {
          invoke<FileEntry[]>('read_directory', { path: vaultPath })
            .then(setFiles)
            .catch(console.error);
        }
      } catch (e) {
        console.error('Failed to save file:', e);
      }
    }
  }, [openFile, vaultPath]);

  const handleContentChange = useCallback((content: string) => {
    setOpenFile((prev) =>
      prev ? { ...prev, content, isDirty: true } : null
    );
  }, []);

  // Keyboard shortcut for save and quick switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const vaultName = vaultPath ? vaultPath.split(/[/\\]/).pop() : null;

  const handleWikilinkClick = useCallback(
    (targetName: string) => {
      const targetPath = searchStore.getFilePathByName(targetName);

      if (targetPath) {
        handleFileSelect(targetPath);
      } else {
        if (!vaultPath) return;
        const newPath = `${vaultPath}/${targetName}.md`;
        setOpenFile({
          path: newPath,
          name: `${targetName}.md`,
          content: '',
          isDirty: true,
        });
        setIsEditMode(true);
      }
    },
    [vaultPath, handleFileSelect]
  );

  const handleGetEmbedContent = useCallback(async (noteName: string): Promise<string | null> => {
    const notePath = searchStore.getFilePathByName(noteName);
    if (!notePath) return null;

    try {
      return await invoke<string>('read_file', { path: notePath });
    } catch (error) {
      console.error('Failed to read embed content:', error);
      return null;
    }
  }, []);

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

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }

      // Update open file if it was renamed
      if (openFile && openFile.path === renameTarget.path) {
        const newParts = newPath.split(/[/\\]/);
        const name = newParts[newParts.length - 1] || '';
        setOpenFile((prev) =>
          prev ? { ...prev, path: newPath, name } : null
        );
      }
    } catch (error) {
      console.error('Failed to rename:', error);
    }

    setRenameTarget(null);
  }, [renameTarget, vaultPath, openFile]);

  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;

    try {
      await invoke('delete_file', { path: contextMenu.path });

      // Refresh file list
      if (vaultPath) {
        invoke<FileEntry[]>('read_directory', { path: vaultPath })
          .then(setFiles)
          .catch(console.error);
      }

      // Close open file if it was deleted
      if (openFile && openFile.path === contextMenu.path) {
        setOpenFile(null);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }

    setContextMenu(null);
  }, [contextMenu, vaultPath, openFile]);

  const handleNewFileInFolder = useCallback(async () => {
    if (!contextMenu || !vaultPath) return;

    const untitledPath = `${contextMenu.path}/${UNTITLED_NAME}`;
    setOpenFile({
      path: untitledPath,
      name: UNTITLED_NAME,
      content: '',
      isDirty: true,
    });
    setIsEditMode(true);
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

      // Update open file path if it was moved
      if (openFile && openFile.path === sourcePath) {
        setOpenFile((prev) =>
          prev ? { ...prev, path: destination } : null
        );
      }
    } catch (error) {
      console.error('Failed to move file:', error);
    }
  }, [vaultPath, openFile]);

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <FileText style={{ width: '20px', height: '20px', color: '#a78bfa' }} />
          <span style={styles.title}>Igne</span>
          {openFile && (
            <span style={styles.fileNameDisplay}>
              {openFile.isDirty && (
                <Dot style={styles.dirtyIndicator} size={16} />
              )}
              {openFile.name}
            </span>
          )}
        </div>
        <div style={styles.headerRight}>
          {openFile && (
            <>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                style={styles.toggleButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#a78bfa';
                  e.currentTarget.style.color = '#e4e4e7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3f3f46';
                  e.currentTarget.style.color = '#a1a1aa';
                }}
                title={isEditMode ? 'Preview' : 'Edit'}
              >
                {isEditMode ? (
                  <>
                    <Eye size={14} />
                    Preview
                  </>
                ) : (
                  <>
                    <Edit3 size={14} />
                    Edit
                  </>
                )}
              </button>
              {openFile.isDirty && (
                <button
                  onClick={handleSave}
                  style={styles.buttonPrimary}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#a78bfa'}
                  title="Save (Cmd+S / Ctrl+S)"
                >
                  <Save size={14} />
                  Save
                </button>
              )}
            </>
          )}
          <button
            onClick={handleOpenVault}
            style={styles.button}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#52525b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f46'}
          >
            <FolderOpen size={14} />
            Open Vault
          </button>
        </div>
      </header>

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
                  style={styles.newFileButton}
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
                  New
                </button>
              </div>
              {loading ? (
                <div style={styles.loading}>Loading...</div>
              ) : (
                <FileTree
                  entries={files}
                  selectedPath={openFile?.path ?? null}
                  onSelect={handleFileSelect}
                  onContextMenu={handleContextMenu}
                  onDrop={handleDrop}
                />
              )}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <FolderOpen size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No vault open</p>
              <p style={{ fontSize: '11px', marginTop: '4px', color: '#52525b' }}>
                Click &quot;Open Vault&quot; to get started
              </p>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main style={styles.contentArea}>
          {openFile ? (
            <>
              {isEditMode ? (
                <div style={styles.editorContainer}>
                  <Editor content={openFile.content} onChange={handleContentChange} />
                </div>
              ) : (
                <>
                  <div style={styles.viewerContainer}>
                    <MarkdownViewer
                      content={openFile.content}
                      onLinkClick={handleWikilinkClick}
                      getEmbedContent={handleGetEmbedContent}
                    />
                  </div>
                  <BacklinksPanel
                    currentFilePath={openFile.path}
                    onBacklinkClick={handleFileSelect}
                  />
                </>
              )}
            </>
          ) : (
            <div style={styles.emptyContent}>
              <FileText size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>Select a file or create a new one</p>
            </div>
          )}
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
