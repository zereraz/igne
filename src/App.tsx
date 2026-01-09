import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, FileText } from 'lucide-react';
import { FileTree } from './components/FileTree';
import { MarkdownViewer } from './components/MarkdownViewer';
import { FileEntry } from './types';

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
  title: {
    fontWeight: 600,
    color: 'white',
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
  vaultName: {
    paddingLeft: '0.75rem',
    paddingRight: '0.75rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    fontSize: '0.75rem',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
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
  },
  emptyContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#71717a',
  },
};

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);

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

  // Load file content when selection changes
  useEffect(() => {
    if (selectedPath) {
      invoke<string>('read_file', { path: selectedPath })
        .then((content) => {
          setContent(content);
          // Extract filename from path
          const parts = selectedPath.split(/[/\\]/);
          setFileName(parts[parts.length - 1] || '');
        })
        .catch(console.error);
    }
  }, [selectedPath]);

  const handleOpenVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Vault Folder',
      });

      if (selected && typeof selected === 'string') {
        setVaultPath(selected);
        setSelectedPath(null);
        setContent('');
        setFileName('');
      }
    } catch (e) {
      console.error('Failed to open folder:', e);
    }
  };

  // Get vault name from path
  const vaultName = vaultPath ? vaultPath.split(/[/\\]/).pop() : null;

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#a78bfa' }} />
          <span style={styles.title}>Igne</span>
        </div>
        <button
          onClick={handleOpenVault}
          style={styles.button}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#52525b'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f46'}
        >
          <FolderOpen style={{ width: '1rem', height: '1rem' }} />
          Open Vault
        </button>
      </header>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          {vaultPath ? (
            <div style={styles.sidebarContent}>
              <div style={styles.vaultName}>
                {vaultName}
              </div>
              {loading ? (
                <div style={styles.loading}>Loading...</div>
              ) : (
                <FileTree entries={files} selectedPath={selectedPath} onSelect={setSelectedPath} />
              )}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <FolderOpen style={{ width: '2rem', height: '2rem', marginBottom: '0.5rem', opacity: 0.5 }} />
              <p>No vault open</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#52525b' }}>
                Click &quot;Open Vault&quot; to get started
              </p>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main style={styles.contentArea}>
          {content ? (
            <MarkdownViewer content={content} fileName={fileName} />
          ) : (
            <div style={styles.emptyContent}>
              <FileText style={{ width: '3rem', height: '3rem', marginBottom: '0.75rem', opacity: 0.5 }} />
              <p>Select a file to view</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
