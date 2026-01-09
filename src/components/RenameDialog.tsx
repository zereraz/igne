import { useState, useEffect, useRef } from 'react';

interface RenameDialogProps {
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export function RenameDialog({ currentName, onClose, onRename }: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input and select text on mount
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRename(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#27272a',
          border: '1px solid #3f3f46',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          minWidth: '400px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#e4e4e7',
            marginBottom: '1rem',
          }}
        >
          Rename
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '0.375rem',
              color: '#e4e4e7',
              fontSize: '0.875rem',
              outline: 'none',
              marginBottom: '1rem',
            }}
            placeholder="Enter new name"
          />
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3f3f46',
                border: 'none',
                borderRadius: '0.375rem',
                color: '#e4e4e7',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#52525b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f46'}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#7c3aed',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
