import { useState, useEffect, useCallback, memo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { X, Settings } from 'lucide-react';
import { OpenFile } from '../types';
import { CommandRegistry } from '../commands/registry';
import type { CommandSource } from '../tools/types';

interface TabContextMenu {
  path: string;
  name: string;
  x: number;
  y: number;
}

interface TitleBarProps {
  openTabs: OpenFile[];
  activeTabPath: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
  onTabCloseOthers?: (path: string) => void;
  onFileNameChange: (name: string) => void;
  onOpenSettings?: () => void;
}

const source: CommandSource = 'ui';

const ctxMenuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '6px 12px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-normal)',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '12px',
  fontFamily: 'var(--font-interface)',
};

export const TitleBar = memo(function TitleBar({
  openTabs,
  activeTabPath,
  onTabClick,
  onTabClose,
  onTabCloseOthers,
  onFileNameChange,
  onOpenSettings,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [tabContextMenu, setTabContextMenu] = useState<TabContextMenu | null>(null);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlisten.then(fn => fn());
    };
  }, [appWindow]);

  const handleMaximize = () => {
    if (isMaximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };

  // Double-click to maximize (macOS style)
  const handleDoubleClick = () => {
    handleMaximize();
  };

  // Handle tab click via command registry (Phase D)
  const handleTabClick = (path: string) => {
    CommandRegistry.execute('tab.switch', source, path).catch(console.error);
    onTabClick(path); // Also call direct handler for immediate UI update
  };

  // Handle tab close via command registry (Phase D)
  const handleTabClose = (path: string) => {
    CommandRegistry.execute('tab.close', source, path).catch(console.error);
    onTabClose(path); // Also call direct handler for immediate UI update
  };

  // F2 to rename active tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && activeTabPath) {
        e.preventDefault();
        const tab = openTabs.find(t => t.path === activeTabPath);
        if (tab) {
          setEditingTab(tab.path);
          setEditValue(tab.name.replace(/\.md$/, ''));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabPath, openTabs]);

  // Close context menu on click outside
  useEffect(() => {
    if (!tabContextMenu) return;
    const dismiss = () => setTabContextMenu(null);
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [tabContextMenu]);

  const startRename = useCallback((path: string, name: string) => {
    setEditingTab(path);
    setEditValue(name.replace(/\.md$/, ''));
    setTabContextMenu(null);
  }, []);

  // Handle settings click via command registry (Phase D)
  const handleSettingsClick = () => {
    CommandRegistry.execute('view.toggleSettings', source).catch(console.error);
    if (onOpenSettings) onOpenSettings(); // Also call direct handler for immediate UI update
  };

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        backgroundColor: 'var(--background-secondary)',
        borderBottom: '1px solid var(--background-modifier-border)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Space for macOS traffic lights (left side) */}
      <div data-tauri-drag-region style={{ width: '78px', height: '100%', flexShrink: 0 }} />

      {/* Tabs */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflowX: 'auto',
        gap: '1px',
        height: '100%',
        alignItems: 'stretch',
        paddingLeft: '4px',
      }}>
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => handleTabClick(tab.path)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                handleTabClose(tab.path);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTabContextMenu({ path: tab.path, name: tab.name, x: e.clientX, y: e.clientY });
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (tab.path === activeTabPath) {
                setEditingTab(tab.path);
                setEditValue(tab.name.replace(/\.md$/, ''));
              }
            }}
            data-testid="tab"
            data-tab={tab.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 10px',
              backgroundColor: tab.path === activeTabPath ? 'var(--background-primary)' : 'transparent',
              border: tab.path === activeTabPath ? '1px solid var(--background-modifier-border)' : '1px solid transparent',
              borderBottom: tab.path === activeTabPath ? '1px solid var(--background-primary)' : '1px solid transparent',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              cursor: 'default',
              minWidth: 'fit-content',
              maxWidth: '200px',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              if (tab.path !== activeTabPath) {
                e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (tab.path !== activeTabPath) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* Dirty indicator dot — always rendered to prevent layout jitter */}
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: tab.isDirty ? 'var(--color-orange)' : 'transparent',
                flexShrink: 0,
              }}
            />
            {editingTab === tab.path ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                  if (editValue.trim()) {
                    onFileNameChange(editValue.trim() + '.md');
                  }
                  setEditingTab(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editValue.trim()) {
                      onFileNameChange(editValue.trim() + '.md');
                    }
                    setEditingTab(null);
                  } else if (e.key === 'Escape') {
                    setEditingTab(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                style={{
                  border: '1px solid var(--color-accent)',
                  background: 'var(--background-secondary)',
                  padding: '2px 4px',
                  margin: '0',
                  fontSize: '12px',
                  color: 'var(--text-normal)',
                  fontFamily: 'var(--font-interface)',
                  minWidth: '40px',
                  maxWidth: '150px',
                  borderRadius: '2px',
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-interface)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '150px',
                  cursor: 'default',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {tab.name.replace(/\.md$/, '')}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTabClose(tab.path);
              }}
              data-testid={`close-tab-${tab.name}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-faint)',
                cursor: 'default',
                borderRadius: '3px',
                padding: '0',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Right side controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        height: '100%',
        paddingLeft: '8px',
        paddingRight: '12px',
      }}>
        {/* Settings Button */}
        {onOpenSettings && (
          <button
            onClick={handleSettingsClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              borderRadius: '2px',
              padding: '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
              e.currentTarget.style.color = 'var(--text-normal)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-faint)';
            }}
            title="Settings (Cmd+,)"
          >
            <Settings size={14} />
          </button>
        )}
      </div>

      {/* Tab context menu */}
      {tabContextMenu && (
        <div
          style={{
            position: 'fixed',
            top: tabContextMenu.y,
            left: tabContextMenu.x,
            zIndex: 9999,
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            padding: '4px 0',
            minWidth: '160px',
            fontFamily: 'var(--font-interface)',
            fontSize: '12px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={ctxMenuItemStyle}
            onClick={() => startRename(tabContextMenu.path, tabContextMenu.name)}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Rename
            <span style={{ color: 'var(--text-faint)' }}>F2</span>
          </button>
          <div style={{ height: '1px', backgroundColor: 'var(--background-modifier-border)', margin: '4px 8px' }} />
          <button
            style={ctxMenuItemStyle}
            onClick={() => { handleTabClose(tabContextMenu.path); setTabContextMenu(null); }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Close
            <span style={{ color: 'var(--text-faint)' }}>⌘W</span>
          </button>
          {onTabCloseOthers && openTabs.length > 1 && (
            <button
              style={ctxMenuItemStyle}
              onClick={() => { onTabCloseOthers(tabContextMenu.path); setTabContextMenu(null); }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              Close Others
            </button>
          )}
        </div>
      )}
    </div>
  );
});
