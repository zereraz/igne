import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Dot, X, Sun, Moon, Settings } from 'lucide-react';
import { OpenFile } from '../types';

interface TitleBarProps {
  openTabs: OpenFile[];
  activeTabPath: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
  onFileNameChange: (name: string) => void;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  isDarkMode?: boolean;
}

export function TitleBar({
  openTabs,
  activeTabPath,
  onTabClick,
  onTabClose,
  onFileNameChange,
  onToggleTheme,
  onOpenSettings,
  isDarkMode = true
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
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

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        backgroundColor: '#27272a',
        borderBottom: '1px solid #3f3f46',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Space for macOS traffic lights (left side) */}
      <div style={{ width: '80px', height: '100%', flexShrink: 0 }} />

      {/* Tabs */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflowX: 'auto',
        gap: '2px',
        height: '100%',
        alignItems: 'center',
      }}>
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => onTabClick(tab.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: tab.path === activeTabPath ? '#18181b' : 'transparent',
              border: tab.path === activeTabPath ? '1px solid #3f3f46' : '1px solid transparent',
              borderBottom: tab.path === activeTabPath ? '1px solid #18181b' : '1px solid transparent',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              cursor: 'pointer',
              minWidth: 'fit-content',
              maxWidth: '200px',
              height: '100%',
            }}
            onMouseEnter={(e) => {
              if (tab.path !== activeTabPath) {
                e.currentTarget.style.backgroundColor = '#3f3f46';
              }
            }}
            onMouseLeave={(e) => {
              if (tab.path !== activeTabPath) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {tab.isDirty && (
              <Dot style={{ color: '#f59e0b', flexShrink: 0 }} size={12} />
            )}
            <input
              type="text"
              value={tab.name}
              onChange={(e) => {
                if (tab.path === activeTabPath) {
                  onFileNameChange(e.target.value);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              data-tauri-drag-region
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0',
                margin: '0',
                fontSize: '12px',
                color: '#a1a1aa',
                fontFamily: '"IBM Plex Mono", "SF Mono", "Courier New", monospace',
                outline: 'none',
                minWidth: '40px',
                maxWidth: '150px',
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.path);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                border: 'none',
                background: 'transparent',
                color: '#71717a',
                cursor: 'pointer',
                borderRadius: '3px',
                padding: '0',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3f3f46';
                e.currentTarget.style.color = '#a1a1aa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#71717a';
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
        paddingRight: '8px',
      }}>
        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              background: 'transparent',
              color: '#71717a',
              cursor: 'pointer',
              borderRadius: '2px',
              padding: '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3f3f46';
              e.currentTarget.style.color = '#e4e4e7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#71717a';
            }}
            title="Toggle theme"
          >
            {isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        )}

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              background: 'transparent',
              color: '#71717a',
              cursor: 'pointer',
              borderRadius: '2px',
              padding: '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3f3f46';
              e.currentTarget.style.color = '#e4e4e7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#71717a';
            }}
            title="Settings (Cmd+Ctrl+,)"
          >
            <Settings size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
