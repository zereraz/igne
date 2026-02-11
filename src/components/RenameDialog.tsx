import { useState, useEffect, useRef } from 'react';
import { FocusTrapWrapper } from './FocusTrapWrapper';

interface RenameDialogProps {
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
  isFolder?: boolean;
  existingNames?: string[];
}

export function RenameDialog({ currentName, onClose, onRename, isFolder = false, existingNames = [] }: RenameDialogProps) {
  // Strip .md extension for display (markdown files only)
  const isMarkdown = !isFolder && (currentName.endsWith('.md') || currentName.endsWith('.markdown'));
  const displayName = isMarkdown ? currentName.replace(/\.(md|markdown)$/, '') : currentName;

  const [name, setName] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input and select text on mount
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Check for duplicate name
  const getFinalName = (input: string) => {
    const trimmed = input.trim();
    if (isMarkdown && !trimmed.endsWith('.md') && !trimmed.endsWith('.markdown')) {
      return `${trimmed}.md`;
    }
    return trimmed;
  };

  const finalName = name.trim() ? getFinalName(name) : '';
  const isDuplicate = finalName && finalName !== currentName && existingNames.some(
    n => n.toLowerCase() === finalName.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isDuplicate) {
      onRename(getFinalName(name));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <FocusTrapWrapper>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rename"
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
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--background-modifier-border)',
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
            color: 'var(--text-normal)',
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
              backgroundColor: 'var(--background-primary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '0.375rem',
              color: 'var(--text-normal)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
            placeholder="Enter new name"
          />
          {isDuplicate && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-red)',
                marginBottom: '0.75rem',
                marginTop: '-0.5rem',
              }}
            >
              A {isFolder ? 'folder' : 'file'} with this name already exists
            </div>
          )}
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
                backgroundColor: 'var(--background-tertiary)',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'var(--text-normal)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-modifier-border-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--background-tertiary)'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!isDuplicate || !name.trim()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isDuplicate || !name.trim() ? 'var(--interactive-normal)' : 'var(--color-accent)',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'var(--text-on-accent)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
            >
              Rename
            </button>
          </div>
        </form>
        </div>
      </div>
    </FocusTrapWrapper>
  );
}
