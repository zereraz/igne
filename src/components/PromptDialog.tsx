import { useState, useEffect, useRef } from 'react';

interface PromptDialogProps {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  title,
  message,
  placeholder = '',
  defaultValue = '',
  submitLabel = 'Create',
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
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
      onClick={onCancel}
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
            marginBottom: message ? '0.5rem' : '1rem',
          }}
        >
          {title}
        </h2>
        {message && (
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              marginBottom: '1rem',
            }}
          >
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'var(--background-primary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '0.375rem',
              color: 'var(--text-normal)',
              fontSize: '0.875rem',
              outline: 'none',
              marginBottom: '1rem',
            }}
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
              onClick={onCancel}
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
              disabled={!value.trim()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: value.trim() ? 'var(--color-accent)' : 'var(--interactive-normal)',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'var(--text-on-accent)',
                fontSize: '0.875rem',
                cursor: value.trim() ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (value.trim()) e.currentTarget.style.backgroundColor = 'var(--color-accent-2)'; }}
              onMouseLeave={(e) => { if (value.trim()) e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
