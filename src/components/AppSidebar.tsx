import { FolderOpen, FilePlus } from 'lucide-react';
import { FileTree } from './FileTree';
import { FileEntry } from '../types';

interface AppSidebarProps {
  vaultPath: string | null;
  vaultName: string;
  files: FileEntry[];
  loading: boolean;
  fileTreeError: string | null;
  activeTabPath: string | null;
  onFileSelect: (path: string, newTab?: boolean) => void;
  onContextMenu: (path: string, isFolder: boolean, x: number, y: number) => void;
  onDrop: (sourcePath: string, targetPath: string) => void;
  onNewFile: () => void;
  onOpenVault: () => void;
  onCollapse: () => void;
  onClearError: () => void;
}

const styles = {
  sidebar: {
    backgroundColor: 'var(--background-secondary)',
    borderRight: '1px solid var(--background-modifier-border)',
    overflowY: 'auto' as const,
    height: '100%',
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
};

export function AppSidebar({
  vaultPath,
  vaultName,
  files,
  loading,
  fileTreeError,
  activeTabPath,
  onFileSelect,
  onContextMenu,
  onDrop,
  onNewFile,
  onOpenVault,
  onCollapse,
  onClearError,
}: AppSidebarProps) {
  return (
    <aside style={{ ...styles.sidebar, position: 'relative' }}>
      {vaultPath ? (
        <div style={styles.sidebarContent}>
          <div style={styles.sidebarHeader}>
            <div style={styles.vaultName}>{vaultName}</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={onCollapse}
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
                onClick={onNewFile}
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
              onClick={onClearError}
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
              onSelect={onFileSelect}
              onContextMenu={onContextMenu}
              onDrop={onDrop}
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
              const selection = window.getSelection();
              if (selection) {
                selection.removeAllRanges();
              }
            }}
            onMouseDown={(e) => {
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
              onClick={onOpenVault}
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
          <p>No folder open</p>
          <button
            onClick={onOpenVault}
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
            Open Folder
          </button>
        </div>
      )}
    </aside>
  );
}
