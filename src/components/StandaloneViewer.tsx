import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Edit3, Eye, Save, FolderOpen, X } from 'lucide-react';
import { MarkdownViewer } from './MarkdownViewer';
import { Editor } from './Editor';
import { OutlinePanel } from './OutlinePanel';
import { ConfirmDialog } from './ConfirmDialog';

interface StandaloneViewerProps {
  filePath: string;
  onClose: () => void;
  onOpenVault?: (vaultPath: string) => void;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: 'var(--background-primary)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    paddingTop: '40px', // Account for traffic lights on macOS
    backgroundColor: 'var(--background-secondary)',
    borderBottom: '1px solid var(--background-modifier-border)',
    WebkitAppRegion: 'drag' as const,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    WebkitAppRegion: 'no-drag' as const,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    WebkitAppRegion: 'no-drag' as const,
  },
  filePath: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  fileName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-normal)',
    fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    fontSize: '11px',
    fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
    backgroundColor: 'transparent',
    border: '1px solid var(--background-modifier-border)',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'all 100ms ease',
  },
  buttonActive: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--background-primary)',
  },
  buttonIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    backgroundColor: 'transparent',
    border: '1px solid var(--background-modifier-border)',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'all 100ms ease',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  contentArea: {
    flex: 1,
    overflow: 'auto',
    position: 'relative' as const,
  },
  editorContainer: {
    height: '100%',
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    backgroundColor: 'var(--background-secondary)',
    borderLeft: '1px solid var(--background-modifier-border)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  dirtyIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-yellow)',
  },
};

export function StandaloneViewer({ filePath, onClose, onOpenVault }: StandaloneViewerProps) {
  const [content, setContent] = useState<string>('');
  const [isEditable, setIsEditable] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState<number | undefined>(undefined);
  const [scrollToPosition, setScrollToPosition] = useState<number | undefined>(undefined);
  const [scrollToHeading, setScrollToHeading] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Extract file name from path
  const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
  const parentDir = filePath.split(/[/\\]/).slice(0, -1).join('/');

  // Load file content
  useEffect(() => {
    console.log('[StandaloneViewer] Loading file:', filePath);
    setLoading(true);
    setError(null);

    invoke<string>('read_file', { path: filePath })
      .then((fileContent) => {
        console.log('[StandaloneViewer] File loaded, length:', fileContent.length);
        setContent(fileContent);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[StandaloneViewer] Failed to load:', err);
        setError(String(err));
        setLoading(false);
      });
  }, [filePath]);

  // Handle content changes in edit mode
  const handleContentChange = useCallback((_path: string, newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  // Save file
  const handleSave = useCallback(async () => {
    try {
      await invoke('write_file', { path: filePath, content });
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveError('Failed to save file: ' + String(err));
    }
  }, [filePath, content]);

  // Toggle edit mode
  const handleToggleEdit = useCallback(() => {
    setIsEditable((prev) => !prev);
  }, []);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isEditable && isDirty) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditable, isDirty, handleSave]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.fileName}>Loading...</span>
          </div>
        </div>
        <div style={{ ...styles.mainContent, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-monospace-theme, var(--font-monospace))' }}>
            Loading file...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.fileName}>{fileName}</span>
            <span style={{ color: 'var(--color-red)', fontSize: '12px' }}>Error</span>
          </div>
          <div style={styles.headerRight}>
            <button
              onClick={onClose}
              style={styles.buttonIcon}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div style={{ ...styles.mainContent, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <span style={{ color: 'var(--color-red)', fontFamily: 'var(--font-monospace-theme, var(--font-monospace))', fontSize: '16px' }}>
            Failed to load file
          </span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-monospace-theme, var(--font-monospace))', fontSize: '12px', maxWidth: '400px', textAlign: 'center' }}>
            {error}
          </span>
          <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-monospace-theme, var(--font-monospace))', fontSize: '11px' }}>
            {filePath}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {isDirty && <div style={styles.dirtyIndicator} title="Unsaved changes" />}
          <span style={styles.fileName}>{fileName}</span>
          <span style={styles.filePath} title={parentDir}>{parentDir}</span>
        </div>
        <div style={styles.headerRight}>
          {/* Edit/Preview Toggle */}
          <button
            onClick={handleToggleEdit}
            style={{
              ...styles.button,
              ...(isEditable ? styles.buttonActive : {}),
            }}
            title={isEditable ? 'Switch to Preview' : 'Switch to Edit'}
          >
            {isEditable ? <Eye size={14} /> : <Edit3 size={14} />}
            {isEditable ? 'Preview' : 'Edit'}
          </button>

          {/* Save Button (only in edit mode) */}
          {isEditable && (
            <button
              onClick={handleSave}
              style={{
                ...styles.button,
                opacity: isDirty ? 1 : 0.5,
                cursor: isDirty ? 'pointer' : 'default',
              }}
              disabled={!isDirty}
              title="Save (Cmd+S)"
            >
              <Save size={14} />
              Save
            </button>
          )}

          {/* Open Vault (if file is in a vault) */}
          {onOpenVault && (
            <button
              onClick={() => {
                // Try to find .obsidian folder in parent directories
                const parts = filePath.split(/[/\\]/);
                for (let i = parts.length - 1; i >= 0; i--) {
                  const potentialVault = parts.slice(0, i).join('/');
                  // We'd need to check if .obsidian exists - for now just use parent
                  if (i === parts.length - 1) {
                    onOpenVault(potentialVault);
                    return;
                  }
                }
              }}
              style={styles.button}
              title="Open containing folder as vault"
            >
              <FolderOpen size={14} />
              Open Vault
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            style={styles.buttonIcon}
            title="Close file"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Content Area */}
        <div style={styles.contentArea}>
          {isEditable ? (
            <div style={styles.editorContainer}>
              <Editor
                content={content}
                onChange={handleContentChange}
                onCursorPositionChange={(line) => setCurrentLine(line)}
                vaultPath={null}
                currentFilePath={filePath}
                scrollPosition={scrollToPosition}
                // No wikilink handling in standalone mode
              />
            </div>
          ) : (
            <MarkdownViewer
              content={content}
              standaloneMode={true}
              scrollToHeading={scrollToHeading}
              // No link clicking in standalone mode - just show styled text
            />
          )}
        </div>

        {/* Outline Sidebar */}
        <div style={styles.sidebar}>
          <OutlinePanel
            content={content}
            currentLine={currentLine}
            onHeadingClick={(position, headingText) => {
              setScrollToPosition(position);
              setScrollToHeading(headingText);
            }}
          />
        </div>
      </div>

      {saveError && (
        <ConfirmDialog
          title="Save Error"
          message={saveError}
          alertOnly
          onConfirm={() => setSaveError(null)}
          onCancel={() => setSaveError(null)}
        />
      )}
    </div>
  );
}
