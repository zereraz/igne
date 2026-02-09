import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If true, only show a single "OK" button (alert style) */
  alertOnly?: boolean;
  /** Makes confirm button red for destructive actions */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  alertOnly = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

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
          minWidth: '360px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--text-normal)',
            marginBottom: '0.75rem',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: '1.25rem',
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
          }}
        >
          {!alertOnly && (
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
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: destructive ? 'var(--color-red)' : 'var(--color-accent)',
              border: 'none',
              borderRadius: '0.375rem',
              color: 'var(--text-on-accent)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {alertOnly ? 'OK' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
