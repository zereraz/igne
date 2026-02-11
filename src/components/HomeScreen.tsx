import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Plus, FileText, Folder } from 'lucide-react';
import { vaultsStore } from '../stores/VaultsStore';
import type { VaultEntry } from '../types';
import { CreateVaultDialog } from './CreateVaultDialog';
import { ConfirmDialog } from './ConfirmDialog';

interface HomeScreenProps {
  onOpen: (path: string) => void;
}

export function HomeScreen({ onOpen }: HomeScreenProps) {
  const [recentItems, setRecentItems] = useState<VaultEntry[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  useEffect(() => {
    setRecentItems(vaultsStore.getVaults());
  }, []);

  const handleCreateVault = (path: string) => {
    setIsCreateDialogOpen(false);
    onOpen(path);
  };

  const handleOpenFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Open Folder',
    });

    if (selected && typeof selected === 'string') {
      onOpen(selected);
    }
  };

  const handleRemoveItem = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoveConfirm(path);
  };

  const confirmRemoveItem = async () => {
    if (removeConfirm) {
      await vaultsStore.removeVault(removeConfirm);
      setRecentItems(vaultsStore.getVaults());
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
            Markdown Editor
          </p>
        </div>

        {/* Recent Items (unified list) */}
        {recentItems.length > 0 && (
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
              Recent
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {recentItems.map((item) => (
                <RecentItem
                  key={item.path}
                  item={item}
                  onClick={() => onOpen(item.path)}
                  onRemove={(e) => handleRemoveItem(item.path, e)}
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
            title="Open a folder or drag a file (Cmd+O)"
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
            }}>Cmd O</kbd>
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
            Create New Vault
          </button>

          <p style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
            textAlign: 'center',
            marginTop: '8px',
          }}>
            Drag & drop files or folders to open
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
          title="Remove from Recent"
          message="Remove this from the list? The files will not be deleted."
          confirmLabel="Remove"
          destructive
          onConfirm={confirmRemoveItem}
          onCancel={() => setRemoveConfirm(null)}
        />
      )}
    </div>
  );
}

// --- RecentItem component ---

interface RecentItemProps {
  item: VaultEntry;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

function RecentItem({ item, onClick, onRemove }: RecentItemProps) {
  const itemType = item.type || 'vault';
  const isFile = itemType === 'file';

  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const Icon = isFile ? FileText : (itemType === 'vault' ? FolderOpen : Folder);

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
        <Icon size={16} style={{ color: 'var(--text-muted)' }} />
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '2px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-normal)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </span>
          {itemType === 'vault' && (
            <span
              style={{
                fontSize: '9px',
                color: 'var(--text-faint)',
                backgroundColor: 'var(--background-tertiary)',
                padding: '1px 5px',
                borderRadius: '2px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}
            >
              vault
            </span>
          )}
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
          {item.path}
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
        {item.noteCount !== undefined && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-faint)',
            }}
          >
            {item.noteCount} notes
          </span>
        )}
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
          }}
        >
          {formatRelativeTime(item.lastOpened)}
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
