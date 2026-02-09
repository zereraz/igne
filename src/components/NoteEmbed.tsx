import { ExternalLink, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteEmbedProps {
  noteName: string;
  content: string | null;
  onOpen: () => void;
}

export function NoteEmbed({ noteName, content, onOpen }: NoteEmbedProps) {
  // Not found state with dashed border (action indicator)
  if (!content) {
    return (
      <div
        style={{
          marginTop: '16px',
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: 'rgba(var(--color-accent-rgb), 0.05)',
          border: '1px dashed rgba(var(--color-accent-rgb), 0.3)',
          borderRadius: '2px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-faint)',
            fontSize: '12px',
            fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
          }}
        >
          <FileText size={14} />
          <span>Note not found: {noteName}</span>
        </div>
      </div>
    );
  }

  // Extract preview content
  const lines = content.split('\n');
  let previewContent = '';
  let previewStarted = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    previewStarted = true;
    previewContent += trimmed + ' ';
    if (previewContent.length > 200) {
      previewContent = previewContent.substring(0, 200) + '...';
      break;
    }
  }

  if (!previewStarted) {
    previewContent = 'Empty note';
  }

  return (
    <div
      style={{
        marginTop: '16px',
        marginBottom: '16px',
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      {/* Header with left accent border */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          backgroundColor: 'var(--background-secondary-alt, var(--background-secondary))',
          borderBottom: '1px solid var(--background-modifier-border)',
          borderLeft: '2px solid var(--color-accent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={14} style={{ color: 'var(--color-accent)' }} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-normal)',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            }}
          >
            {noteName}
          </span>
        </div>
        <button
          onClick={onOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: 'transparent',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '2px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            transition: 'border-color 100ms ease, color 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.color = 'var(--color-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <ExternalLink size={12} />
          Open
        </button>
      </div>

      {/* Preview Content */}
      <div
        style={{
          padding: '14px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          maxHeight: '200px',
          overflowY: 'auto',
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
      </div>
    </div>
  );
}
