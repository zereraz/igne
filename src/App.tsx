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
} from 'lucide-react';
import { FileTree } from './components/FileTree';
import { MarkdownViewer } from './components/MarkdownViewer';
import { Editor } from './components/Editor';
import { FileEntry, OpenFile } from './types';

const styles = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#18181b',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    backgroundColor: '#27272a',
    borderBottom: '1px solid #3f3f46',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  title: {
    fontWeight: 600,
    color: 'white',
    fontSize: '1rem',
  },
  fileNameDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    color: '#a1a1aa',
    fontSize: '0.875rem',
  },
  dirtyIndicator: {
    color: '#f59e0b',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    paddingLeft: '0.75rem',
    paddingRight: '0.75rem',
    paddingTop: '0.375rem',
    paddingBottom: '0.375rem',
    fontSize: '0.875rem',
    backgroundColor: '#3f3f46',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    color: 'white',
  },
  buttonPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    paddingLeft: '0.75rem',
    paddingRight: '0.75rem',
    paddingTop: '0.375rem',
    paddingBottom: '0.375rem',
    fontSize: '0.875rem',
    backgroundColor: '#7c3aed',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    color: 'white',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    paddingLeft: '0.625rem',
    paddingRight: '0.625rem',
    paddingTop: '0.375rem',
    paddingBottom: '0.375rem',
    fontSize: '0.875rem',
    backgroundColor: 'transparent',
    border: '1px solid #3f3f46',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    color: '#a1a1aa',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '16rem',
    backgroundColor: '#1f1f23',
    borderRight: '1px solid #3f3f46',
    overflowY: 'auto' as const,
    flexShrink: 0,
  },
  sidebarContent: {
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '0.75rem',
    paddingRight: '0.75rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
  },
  vaultName: {
    fontSize: '0.75rem',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
  newFileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    backgroundColor: '#3f3f46',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    color: '#a1a1aa',
    transition: 'background-color 0.15s',
  },
  loading: {
    paddingLeft: '0.75rem',
    paddingRight: '0.75rem',
    paddingTop: '1rem',
    paddingBottom: '1rem',
    color: '#71717a',
    fontSize: '0.875rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#71717a',
    fontSize: '0.875rem',
    padding: '1rem',
    textAlign: 'center' as const,
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
const POLL_INTERVAL = 2000; // 2 seconds

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  // Start/stop file watching
  useEffect(() => {
    if (vaultPath) {
      // Poll for file changes
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
        .then(setFiles)
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

    // Check if Untitled.md already exists in the vault
    const untitledPath = `${vaultPath}/${UNTITLED_NAME}`;
    invoke<boolean>('file_exists', { path: untitledPath }).then((exists) => {
      if (!exists) {
        // Create new untitled file
        setOpenFile({
          path: untitledPath,
          name: UNTITLED_NAME,
          content: '',
          isDirty: true,
        });
        setIsEditMode(true);
      } else {
        // Open existing Untitled.md
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

    // If file is untitled, prompt for filename
    if (openFile.name === UNTITLED_NAME) {
      try {
        const newPath = await save({
          defaultPath: openFile.path,
          filters: [{ name: 'Markdown', extensions: ['md'] }],
        });

        if (newPath) {
          // Save with new path
          await invoke('write_file', {
            path: newPath,
            content: openFile.content,
          });

          // Update open file
          const parts = newPath.split(/[/\\]/);
          const name = parts[parts.length - 1] || '';

          setOpenFile({
            path: newPath,
            name,
            content: openFile.content,
            isDirty: false,
          });

          // Refresh file list
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
      // Save existing file
      try {
        await invoke('write_file', {
          path: openFile.path,
          content: openFile.content,
        });

        setOpenFile((prev) => (prev ? { ...prev, isDirty: false } : null));

        // Refresh file list
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

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Get vault name from path
  const vaultName = vaultPath ? vaultPath.split(/[/\\]/).pop() : null;

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#a78bfa' }} />
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
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#27272a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isEditMode ? 'Preview' : 'Edit'}
              >
                {isEditMode ? (
                  <>
                    <Eye size={16} />
                    Preview
                  </>
                ) : (
                  <>
                    <Edit3 size={16} />
                    Edit
                  </>
                )}
              </button>
              {openFile.isDirty && (
                <button
                  onClick={handleSave}
                  style={styles.buttonPrimary}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                  title="Save (Cmd+S / Ctrl+S)"
                >
                  <Save size={16} />
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
            <FolderOpen size={16} />
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
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#52525b'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f46'}
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
                />
              )}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <FolderOpen size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p>No vault open</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#52525b' }}>
                Click &quot;Open Vault&quot; to get started
              </p>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main style={styles.contentArea}>
          {openFile ? (
            isEditMode ? (
              <div style={styles.editorContainer}>
                <Editor content={openFile.content} onChange={handleContentChange} />
              </div>
            ) : (
              <div style={styles.viewerContainer}>
                <MarkdownViewer content={openFile.content} fileName={openFile.name} />
              </div>
            )
          ) : (
            <div style={styles.emptyContent}>
              <FileText size={48} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <p>Select a file or create a new one</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
