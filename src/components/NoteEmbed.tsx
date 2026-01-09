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
          backgroundColor: 'rgba(167, 139, 250, 0.05)',
          border: '1px dashed rgba(167, 139, 250, 0.3)',
          borderRadius: '2px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#71717a',
            fontSize: '12px',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
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
        backgroundColor: '#27272a',
        border: '1px solid #3f3f46',
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
          backgroundColor: '#1f1f23',
          borderBottom: '1px solid #3f3f46',
          borderLeft: '2px solid #a78bfa',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={14} style={{ color: '#a78bfa' }} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#e4e4e7',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
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
            border: '1px solid #3f3f46',
            borderRadius: '2px',
            color: '#a1a1aa',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
            transition: 'border-color 100ms ease, color 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#a78bfa';
            e.currentTarget.style.color = '#a78bfa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#3f3f46';
            e.currentTarget.style.color = '#a1a1aa';
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
          color: '#a1a1aa',
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
