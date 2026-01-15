import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Plus } from 'lucide-react';
import { vaultsStore } from '../stores/VaultsStore';
import type { VaultEntry } from '../types';
import { CreateVaultDialog } from './CreateVaultDialog';

interface VaultPickerProps {
  onOpen: (path: string) => void;
}

export function VaultPicker({ onOpen }: VaultPickerProps) {
  const [recentVaults, setRecentVaults] = useState<VaultEntry[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    // Load recent vaults from store
    const vaults = vaultsStore.getVaults();
    setRecentVaults(vaults);
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

  const handleRemoveVault = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm('Remove this vault from the list?');
    if (confirmed) {
      await vaultsStore.removeVault(path);
      // Refresh the list
      setRecentVaults(vaultsStore.getVaults());
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181b',
        fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
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
              color: '#fafafa',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
            }}
          >
            Igne
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#71717a',
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
                color: '#a1a1aa',
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
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              fontWeight: 500,
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#6d28d9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7c3aed';
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
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              fontWeight: 500,
              backgroundColor: '#3f3f46',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#52525b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3f3f46';
            }}
          >
            <Plus size={16} />
            Create new
          </button>

          {/* Hint for file opening */}
          <p style={{
            fontSize: '11px',
            color: '#52525b',
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
        backgroundColor: '#27272a',
        border: '1px solid #3f3f46',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'all 100ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#3f3f46';
        e.currentTarget.style.borderColor = '#52525b';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#27272a';
        e.currentTarget.style.borderColor = '#3f3f46';
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
          backgroundColor: '#3f3f46',
          borderRadius: '2px',
          flexShrink: 0,
        }}
      >
        <FolderOpen size={16} style={{ color: '#a1a1aa' }} />
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
            color: '#fafafa',
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
            color: '#71717a',
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
              color: '#71717a',
            }}
          >
            {vault.noteCount} notes
          </span>
        )}
        <span
          style={{
            fontSize: '11px',
            color: '#71717a',
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
          color: '#71717a',
          transition: 'all 100ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#52525b';
          e.currentTarget.style.color = '#fafafa';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#71717a';
        }}
      >
        ×
      </button>
    </div>
  );
}
