import { ExternalLink, FileText, Hash, Link2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface BlockEmbedProps {
  /** The source note name */
  noteName: string;
  /** The block ID */
  blockId: string;
  /** The block content */
  content: string | null;
  /** The block type */
  blockType?: 'paragraph' | 'list' | 'callout' | 'quote' | 'code' | 'heading' | 'task' | 'table' | 'unknown';
  /** Callback to navigate to source note */
  onOpen: () => void;
  /** Optional callback to jump to specific block in source */
  onGoToBlock?: () => void;
}

export function BlockEmbed({
  noteName,
  blockId,
  content,
  blockType = 'unknown',
  onOpen,
  onGoToBlock,
}: BlockEmbedProps) {
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
          <Hash size={14} />
          <span>Block not found: {blockId}</span>
        </div>
      </div>
    );
  }

  // Get block type icon
  const getBlockIcon = () => {
    switch (blockType) {
      case 'list':
      case 'task':
        return '📝';
      case 'callout':
        return '💡';
      case 'quote':
        return '💬';
      case 'code':
        return '💻';
      case 'heading':
        return '📌';
      default:
        return '📄';
    }
  };

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
          borderLeft: '2px solid #22c55e',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>{getBlockIcon()}</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#e4e4e7',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
            }}
          >
            {noteName}#{blockId}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {onGoToBlock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGoToBlock();
              }}
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
                e.currentTarget.style.borderColor = '#22c55e';
                e.currentTarget.style.color = '#22c55e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3f3f46';
                e.currentTarget.style.color = '#a1a1aa';
              }}
              title="Go to block in source note"
            >
              <Link2 size={12} />
              Jump
            </button>
          )}
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
              e.currentTarget.style.borderColor = '#22c55e';
              e.currentTarget.style.color = '#22c55e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3f3f46';
              e.currentTarget.style.color = '#a1a1aa';
            }}
            title="Open source note"
          >
            <ExternalLink size={12} />
            Open
          </button>
        </div>
      </div>

      {/* Block Content */}
      <div
        style={{
          padding: '14px',
          fontSize: '13px',
          color: '#a1a1aa',
          lineHeight: 1.6,
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
