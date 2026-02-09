import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { X, FolderOpen } from 'lucide-react';
import { CommandRegistry } from '../commands/registry';
import type { CommandSource } from '../tools/types';

// Helper function to check if a file/directory exists
async function fileExists(path: string): Promise<boolean> {
  try {
    const meta = await invoke<{ exists: boolean }>('stat_path', { path });
    return meta.exists;
  } catch {
    return false;
  }
}

interface CreateVaultDialogProps {
  onClose: () => void;
  onVaultCreated: (path: string) => void;
}

export function CreateVaultDialog({ onClose, onVaultCreated }: CreateVaultDialogProps) {
  const [vaultName, setVaultName] = useState('');
  const [vaultLocation, setVaultLocation] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectLocation = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Parent Folder',
      });

      if (selected && typeof selected === 'string') {
        setVaultLocation(selected);
        setError(null);
      }
    } catch (e) {
      console.error('Failed to select folder:', e);
      setError('Failed to select folder');
    }
  };

  const handleCreate = async () => {
    // Validate input
    if (!vaultName.trim()) {
      setError('Please enter a vault name');
      return;
    }

    if (!vaultLocation) {
      setError('Please select a location for the vault');
      return;
    }

    // Sanitize vault name (remove invalid characters)
    const sanitizedName = vaultName.trim().replace(/[<>:"/\\|?*]/g, '');
    if (sanitizedName === '') {
      setError('Invalid vault name');
      return;
    }

    setIsCreating(true);
    setError(null);

    const source: CommandSource = 'ui';

    try {
      // Create vault path
      const vaultPath = `${vaultLocation}/${sanitizedName}`;

      // Check if vault already exists
      if (await fileExists(vaultPath)) {
        setError('A folder with this name already exists');
        setIsCreating(false);
        return;
      }

      // Create vault directory
      await invoke('create_directory', { path: vaultPath });

      // Create .obsidian subdirectory
      const obsidianDir = `${vaultPath}/.obsidian`;
      await invoke('create_directory', { path: obsidianDir });

      // Create default app.json
      const appJson = {
        defaultViewMode: 'live',
        livePreview: true,
        strictLineBreaks: false,
        showLineNumber: false,
        showFrontmatter: true,
        foldHeading: true,
        foldIndent: true,
        readableLineLength: true,
        vimMode: false,
        tabSize: 4,
        useTab: true,
        spellcheck: true,
        spellcheckLanguages: ['en-US'],
        newFileLocation: 'current',
        newFileFolderPath: '',
        attachmentFolderPath: '',
        newLinkFormat: 'shortest',
        useMarkdownLinks: false,
        alwaysUpdateLinks: true,
        trashOption: 'system',
        showDebugMenu: false,
      };

      await invoke('write_file', {
        path: `${obsidianDir}/app.json`,
        content: JSON.stringify(appJson, null, 2),
      });

      // Create default appearance.json
      const appearanceJson = {
        baseFontSize: 16,
        theme: 'obsidian',
        cssTheme: '',
        accentColor: '#7c3aed',
        interfaceFontFamily: '',
        textFontFamily: '',
        monospaceFontFamily: '',
        enabledCssSnippets: [],
        showViewHeader: true,
        nativeMenus: null,
        translucency: false,
      };

      await invoke('write_file', {
        path: `${obsidianDir}/appearance.json`,
        content: JSON.stringify(appearanceJson, null, 2),
      });

      // Create default workspace.json
      const workspaceJson = {
        main: {
          id: 'main-tabs',
          type: 'tabs',
          children: [],
          currentTab: 0,
        },
        left: {
          collapsed: false,
          width: 256,
          activeTabs: {},
          tabs: [
            {
              id: 'left-tabs',
              type: 'tabs',
              children: [
                {
                  id: 'file-explorer',
                  type: 'leaf',
                  state: { type: 'file-explorer' },
                },
              ],
              currentTab: 0,
            },
          ],
        },
        right: {
          collapsed: true,
          width: 300,
          activeTabs: {},
          tabs: [],
        },
        active: null,
        lastOpenFiles: [],
        leftRibbon: {
          hiddenItems: [],
        },
        rightRibbon: {
          hiddenItems: [],
        },
      };

      await invoke('write_file', {
        path: `${obsidianDir}/workspace.json`,
        content: JSON.stringify(workspaceJson, null, 2),
      });

      console.log('[CreateVaultDialog] Created vault:', vaultPath);

      // Log vault creation to command registry (Phase D)
      try {
        await CommandRegistry.execute('vault.create', source, vaultPath);
      } catch (cmdError) {
        console.warn('[CreateVaultDialog] Failed to log vault.create command:', cmdError);
      }

      // Notify parent component
      onVaultCreated(vaultPath);
    } catch (e) {
      console.error('Failed to create vault:', e);
      setError('Failed to create vault: ' + (e as Error).message);
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (!isCreating) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create Vault"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: "var(--font-monospace-theme, var(--font-monospace))",
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-normal)',
              margin: 0,
            }}
          >
            Create New Vault
          </h2>
          <button
            onClick={handleCancel}
            disabled={isCreating}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              padding: '0',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '2px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              color: 'var(--text-faint)',
              transition: 'all 100ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isCreating) {
                e.currentTarget.style.backgroundColor = 'var(--background-modifier-border)';
                e.currentTarget.style.color = 'var(--text-normal)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-faint)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Vault Name */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-muted)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Vault Name
            </label>
            <input
              type="text"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              placeholder="My Notes"
              disabled={isCreating}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  handleCreate();
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                fontFamily: "var(--font-monospace-theme, var(--font-monospace))",
                backgroundColor: 'var(--background-primary)',
                border: '1px solid var(--background-modifier-border)',
                borderRadius: '2px',
                color: 'var(--text-normal)',
                outline: 'none',
                transition: 'border-color 100ms ease',
                cursor: isCreating ? 'not-allowed' : 'text',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
              }}
            />
          </div>

          {/* Vault Location */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-muted)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Location
            </label>
            <div
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              <input
                type="text"
                value={vaultLocation}
                onChange={(e) => setVaultLocation(e.target.value)}
                placeholder="~/Documents"
                disabled={isCreating}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontFamily: "var(--font-monospace-theme, var(--font-monospace))",
                  backgroundColor: 'var(--background-primary)',
                  border: '1px solid var(--background-modifier-border)',
                  borderRadius: '2px',
                  color: 'var(--text-normal)',
                  outline: 'none',
                  transition: 'border-color 100ms ease',
                  cursor: isCreating ? 'not-allowed' : 'text',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                }}
              />
              <button
                onClick={handleSelectLocation}
                disabled={isCreating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontFamily: "var(--font-monospace-theme, var(--font-monospace))",
                  fontWeight: 500,
                  backgroundColor: 'var(--background-modifier-border)',
                  border: '1px solid var(--interactive-normal)',
                  borderRadius: '2px',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  color: 'var(--text-normal)',
                  transition: 'all 100ms ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isCreating) {
                    e.currentTarget.style.backgroundColor = 'var(--interactive-normal)';
                    e.currentTarget.style.borderColor = 'var(--text-faint)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background-modifier-border)';
                  e.currentTarget.style.borderColor = 'var(--interactive-normal)';
                }}
              >
                <FolderOpen size={14} />
                Browse
              </button>
            </div>
            {vaultLocation && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-faint)',
                  marginTop: '4px',
                }}
              >
                Vault will be created at: <code style={{ color: 'var(--text-muted)' }}>{vaultLocation}/{vaultName.trim() || 'vault-name'}</code>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-red)',
                backgroundColor: 'rgba(var(--color-red-rgb, 248, 113, 113), 0.1)',
                border: '1px solid var(--color-red)',
                borderRadius: '2px',
                padding: '8px 12px',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <button
              onClick={handleCancel}
              disabled={isCreating}
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '13px',
                fontFamily: "var(--font-monospace-theme, var(--font-monospace))",
                fontWeight: 500,
                backgroundColor: 'var(--background-modifier-border)',
                border: 'none',
                borderRadius: '2px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                color: 'var(--text-normal)',
                transition: 'background-color 100ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.backgroundColor = 'var(--interactive-normal)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-modifier-border)';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '13px',
                fontFamily: "var(--font-monospace-theme, var(--font-monospace))",
                fontWeight: 500,
                backgroundColor: 'var(--color-accent)',
                border: 'none',
                borderRadius: '2px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                color: 'white',
                transition: 'background-color 100ms ease',
                opacity: isCreating ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-hover, var(--color-accent))';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              }}
            >
              {isCreating ? 'Creating...' : 'Create Vault'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
