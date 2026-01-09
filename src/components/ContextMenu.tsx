import { Edit, Trash2, FilePlus, FolderPlus } from 'lucide-react';
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
    color: '#e4e4e7',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        backgroundColor: '#27272a',
        border: '1px solid #3f3f46',
        borderRadius: '2px',
        boxShadow: '0 10px 15px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        minWidth: '160px',
        padding: '4px',
      }}
    >
      <button
        style={menuItemStyle}
        onClick={() => {
          onRename();
          onClose();
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3f3f46')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Edit size={14} style={{ color: '#a1a1aa' }} />
        Rename
      </button>
      <button
        style={{
          ...menuItemStyle,
          color: '#ef4444',
        }}
        onClick={() => {
          onDelete();
          onClose();
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Trash2 size={14} />
        Delete
      </button>
      {isFolder && (
        <>
          <div style={{ height: '1px', backgroundColor: '#3f3f46', margin: '4px 8px' }} />
          {onNewNote && (
            <button
              style={menuItemStyle}
              onClick={() => {
                onNewNote();
                onClose();
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3f3f46')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <FilePlus size={14} style={{ color: '#a1a1aa' }} />
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
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3f3f46')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <FolderPlus size={14} style={{ color: '#a1a1aa' }} />
              New Folder
            </button>
          )}
        </>
      )}
    </div>
  );
}
