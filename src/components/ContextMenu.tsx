import { Edit, Trash2, FilePlus, FolderPlus, ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  isFolder: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onNewNote?: () => void;
  onNewFolder?: () => void;
  onOpenInNewTab?: () => void;
}

export function ContextMenu({
  x,
  y,
  isFolder,
  onClose,
  onRename,
  onDelete,
  onNewNote,
  onNewFolder,
  onOpenInNewTab,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    fontSize: '12px',
    color: 'var(--text-normal)',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    fontFamily: 'var(--font-interface)',
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '2px',
        boxShadow: '0 10px 15px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        minWidth: '160px',
        padding: '4px',
      }}
    >
      {!isFolder && onOpenInNewTab && (
        <button
          style={menuItemStyle}
          onClick={() => {
            onOpenInNewTab();
            onClose();
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
          Open in new tab
        </button>
      )}
      <button
        style={menuItemStyle}
        onClick={() => {
          onRename();
          onClose();
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Edit size={14} style={{ color: 'var(--text-muted)' }} />
        Rename
      </button>
      <button
        style={{
          ...menuItemStyle,
          color: 'var(--color-red)',
        }}
        onClick={() => {
          onDelete();
          onClose();
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--background-modifier-error)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Trash2 size={14} />
        Delete
      </button>
      {isFolder && (
        <>
          <div style={{ height: '1px', backgroundColor: 'var(--background-modifier-border)', margin: '4px 8px' }} />
          {onNewNote && (
            <button
              style={menuItemStyle}
              onClick={() => {
                onNewNote();
                onClose();
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <FilePlus size={14} style={{ color: 'var(--text-muted)' }} />
              New Note
            </button>
          )}
          {onNewFolder && (
            <button
              style={menuItemStyle}
              onClick={() => {
                onNewFolder();
                onClose();
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <FolderPlus size={14} style={{ color: 'var(--text-muted)' }} />
              New Folder
            </button>
          )}
        </>
      )}
    </div>
  );
}
