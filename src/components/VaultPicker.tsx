import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Plus, FileText } from 'lucide-react';
import { vaultsStore } from '../stores/VaultsStore';
import { getRecentFiles, removeRecentFile } from '../App';
import type { VaultEntry } from '../types';
import { CreateVaultDialog } from './CreateVaultDialog';
import { ConfirmDialog } from './ConfirmDialog';

interface VaultPickerProps {
  onOpen: (path: string) => void;
  onOpenFile?: (filePath: string) => void;
}

export function VaultPicker({ onOpen, onOpenFile }: VaultPickerProps) {
  const [recentVaults, setRecentVaults] = useState<VaultEntry[]>([]);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  useEffect(() => {
    // Load recent vaults from store
    const vaults = vaultsStore.getVaults();
    setRecentVaults(vaults);
    // Load recent standalone files
    setRecentFiles(getRecentFiles());
  }, []);

  const handleCreateVault = (path: string) => {
    setIsCreateDialogOpen(false);
    onOpen(path);
  };

  const handleOpenFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Open',
    });

    if (selected && typeof selected === 'string') {
      onOpen(selected);
    }
  };

  const handleRemoveVault = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoveConfirm(path);
  };

  const confirmRemoveVault = async () => {
    if (removeConfirm) {
      await vaultsStore.removeVault(removeConfirm);
      setRecentVaults(vaultsStore.getVaults());
    }
    setRemoveConfirm(null);
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--background-primary)',
        fontFamily: 'var(--font-interface)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          padding: '48px',
        }}
      >
        {/* Logo/Title */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '48px',
          }}
        >
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: 'var(--text-normal)',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
            }}
          >
            Igne
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Markdown Knowledge Base
          </p>
        </div>

        {/* Recent Vaults */}
        {recentVaults.length > 0 && (
          <div
            style={{
              marginBottom: '32px',
            }}
          >
            <h2
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '16px',
                fontWeight: 500,
              }}
            >
              Recent Vaults
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {recentVaults.map((vault) => (
                <VaultItem
                  key={vault.path}
                  vault={vault}
                  onClick={() => onOpen(vault.path)}
                  onRemove={(e) => handleRemoveVault(vault.path, e)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Files */}
        {recentFiles.length > 0 && onOpenFile && (
          <div
            style={{
              marginBottom: '32px',
            }}
          >
            <h2
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '16px',
                fontWeight: 500,
              }}
            >
              Recent Files
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {recentFiles.map((fp) => {
                const name = fp.split(/[/\\]/).pop() || fp;
                const dir = fp.split(/[/\\]/).slice(0, -1).join('/');
                return (
                  <div
                    key={fp}
                    onClick={() => onOpenFile(fp)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--background-secondary)',
                      border: '1px solid var(--background-modifier-border)',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      transition: 'all 100ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--background-tertiary)';
                      e.currentTarget.style.borderColor = 'var(--background-modifier-border-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                      e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                    }}
                  >
                    <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-normal)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-faint)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {dir}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentFile(fp);
                        setRecentFiles(getRecentFiles());
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        padding: '0',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        color: 'var(--text-faint)',
                        fontSize: '14px',
                        transition: 'all 100ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
                        e.currentTarget.style.color = 'var(--text-normal)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-faint)';
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <button
            onClick={handleOpenFolder}
            title="Open a folder or drag a file (⌘O)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px',
              fontSize: '14px',
              fontFamily: 'var(--font-interface)',
              fontWeight: 500,
              backgroundColor: 'var(--color-accent)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            }}
          >
            <FolderOpen size={16} />
            Open
            <kbd style={{
              opacity: 0.5,
              fontSize: '10px',
              marginLeft: '8px',
              padding: '2px 6px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '3px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>⌘ O</kbd>
          </button>

          <button
            onClick={() => setIsCreateDialogOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              fontSize: '13px',
              fontFamily: 'var(--font-interface)',
              fontWeight: 500,
              backgroundColor: 'var(--background-tertiary)',
              color: 'var(--text-normal)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-modifier-border-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-tertiary)';
            }}
          >
            <Plus size={16} />
            Create new
          </button>

          {/* Hint for file opening */}
          <p style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
            textAlign: 'center',
            marginTop: '8px',
          }}>
            Drag & drop .md files to preview
          </p>
        </div>
      </div>

      {isCreateDialogOpen && (
        <CreateVaultDialog
          onClose={() => setIsCreateDialogOpen(false)}
          onVaultCreated={handleCreateVault}
        />
      )}

      {removeConfirm && (
        <ConfirmDialog
          title="Remove Vault"
          message="Remove this vault from the list? The files will not be deleted."
          confirmLabel="Remove"
          destructive
          onConfirm={confirmRemoveVault}
          onCancel={() => setRemoveConfirm(null)}
        />
      )}
    </div>
  );
}

interface VaultItemProps {
  vault: VaultEntry;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

function VaultItem({ vault, onClick, onRemove }: VaultItemProps) {
  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'all 100ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--background-tertiary)';
        e.currentTarget.style.borderColor = 'var(--background-modifier-border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
        e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
      }}
    >
      {/* Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          backgroundColor: 'var(--background-tertiary)',
          borderRadius: '2px',
          flexShrink: 0,
        }}
      >
        <FolderOpen size={16} style={{ color: 'var(--text-muted)' }} />
      </div>

      {/* Info */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-normal)',
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {vault.name}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {vault.path}
        </div>
      </div>

      {/* Meta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {vault.noteCount !== undefined && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-faint)',
            }}
          >
            {vault.noteCount} notes
          </span>
        )}
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
          }}
        >
          {formatRelativeTime(vault.lastOpened)}
        </span>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          padding: '0',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '2px',
          cursor: 'pointer',
          color: 'var(--text-faint)',
          transition: 'all 100ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
          e.currentTarget.style.color = 'var(--text-normal)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-faint)';
        }}
      >
        ×
      </button>
    </div>
  );
}
