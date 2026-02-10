import { useState, useCallback, useRef, useEffect, memo } from 'react';

export interface RibbonPluginIcon {
  id: string;
  icon: React.ReactNode;
  onClick: () => void;
  tooltip: string;
}

interface RibbonProps {
  onNewNote: () => void;
  onOpenGraph: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onSwitchVault: () => void;
  pluginIcons?: RibbonPluginIcon[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Icon button with tooltip that appears on hover
function RibbonButton({
  icon,
  onClick,
  tooltip,
  shortcut,
  isActive,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  shortcut?: string;
  isActive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // Show tooltip after 200ms hover delay
  useEffect(() => {
    if (hovered) {
      timeoutRef.current = window.setTimeout(() => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setTooltipPos({
            top: rect.top + rect.height / 2,
            left: rect.right + 8,
          });
        }
        setShowTooltip(true);
      }, 200);
    } else {
      setShowTooltip(false);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [hovered]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hovered ? 'var(--background-modifier-hover)' : 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: hovered ? 'var(--text-normal)' : 'var(--text-muted)',
          transition: 'background 100ms ease, color 100ms ease',
          position: 'relative',
        }}
      >
        {/* Active indicator - left accent line */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              left: '0',
              top: '6px',
              bottom: '6px',
              width: '2px',
              backgroundColor: 'var(--color-accent)',
              borderRadius: '1px',
            }}
          />
        )}
        {icon}
      </button>

      {/* Tooltip - fixed position in viewport */}
      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateY(-50%)',
            padding: '5px 10px',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            whiteSpace: 'nowrap',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-normal)',
              fontFamily: 'var(--font-interface)',
            }}
          >
            {tooltip}
          </span>
          {shortcut && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--text-faint)',
                fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace',
                padding: '2px 5px',
                backgroundColor: 'var(--background-secondary)',
                borderRadius: '3px',
              }}
            >
              {shortcut}
            </span>
          )}
        </div>
      )}
    </>
  );
}

// Subtle horizontal separator
function Separator() {
  return (
    <div
      style={{
        width: '20px',
        height: '1px',
        backgroundColor: 'var(--background-modifier-border)',
        margin: '4px auto',
        opacity: 0.6,
      }}
    />
  );
}

// SVG icons - 16px, stroke-width 1.5 for elegance
const icons = {
  vault: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  newFile: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  graph: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <line x1="12" y1="10" x2="6" y2="8" />
      <line x1="12" y1="10" x2="18" y2="8" />
      <line x1="12" y1="14" x2="6" y2="16" />
      <line x1="12" y1="14" x2="18" y2="16" />
    </svg>
  ),
  command: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  chevronLeft: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

export const Ribbon = memo(function Ribbon({
  onNewNote,
  onOpenGraph,
  onOpenCommandPalette,
  onOpenSettings,
  onSwitchVault,
  pluginIcons = [],
  collapsed = false,
  onToggleCollapse,
}: RibbonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDoubleClick = useCallback(() => {
    onToggleCollapse?.();
  }, [onToggleCollapse]);

  // Collapsed state - thin clickable bar
  if (collapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '8px',
          backgroundColor: isHovered ? 'var(--background-modifier-hover)' : 'var(--background-secondary)',
          borderRight: '1px solid var(--background-modifier-border)',
          cursor: 'pointer',
          transition: 'background 100ms ease, width 150ms ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        title="Expand sidebar"
      >
        {isHovered && (
          <div style={{ color: 'var(--text-faint)' }}>
            {icons.chevronRight}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      style={{
        width: '40px',
        backgroundColor: 'var(--background-secondary)',
        borderRight: '1px solid var(--background-modifier-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 4px',
        gap: '2px',
        flexShrink: 0,
        position: 'relative',
        transition: 'width 150ms ease',
      }}
    >
      {/* Top section - Core navigation */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
        }}
      >
        <RibbonButton
          icon={icons.vault}
          onClick={onSwitchVault}
          tooltip="Open vault"
        />
        <RibbonButton
          icon={icons.newFile}
          onClick={onNewNote}
          tooltip="New note"
          shortcut="⌘N"
        />
        <RibbonButton
          icon={icons.graph}
          onClick={onOpenGraph}
          tooltip="Graph view"
          shortcut="⌘G"
        />
        <RibbonButton
          icon={icons.command}
          onClick={onOpenCommandPalette}
          tooltip="Command palette"
          shortcut="⌘P"
        />
      </div>

      {/* Plugin icons section */}
      {pluginIcons.length > 0 && (
        <>
          <Separator />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            {pluginIcons.map((plugin) => (
              <RibbonButton
                key={plugin.id}
                icon={plugin.icon}
                onClick={plugin.onClick}
                tooltip={plugin.tooltip}
              />
            ))}
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom section - Settings */}
      <Separator />
      <RibbonButton
        icon={icons.settings}
        onClick={onOpenSettings}
        tooltip="Settings"
        shortcut="⌘,"
      />

      {/* Collapse button - hidden until hover */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            position: 'absolute',
            right: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '12px',
            height: '24px',
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)',
            borderLeft: 'none',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-faint)',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 150ms ease',
            padding: 0,
          }}
          title="Collapse sidebar"
        >
          {icons.chevronLeft}
        </button>
      )}

    </div>
  );
});
