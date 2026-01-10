import { Tag } from 'lucide-react';
import { useTags } from './useTags';

interface TagsPanelProps {
  files: Array<{ path: string; content?: string }>;
  onTagClick?: (tag: string) => void;
}

export function TagsPanel({ files, onTagClick }: TagsPanelProps) {
  const tags = useTags(files);

  if (tags.length === 0) {
    return (
      <div className="tags-panel-empty" style={{ padding: '1rem', color: '#71717a', textAlign: 'center' }}>
        <p>No tags found</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Add #tags to your notes
        </p>
      </div>
    );
  }

  return (
    <div className="tags-panel">
      <div
        className="tags-panel-header"
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #27272a',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#a1a1aa',
        }}
      >
        Tags
      </div>
      <div
        className="tags-panel-content"
        style={{
          padding: '0.5rem 0',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        }}
      >
        {tags.map((tagInfo) => {
          const parts = tagInfo.tag.split('/');
          const displayName = parts[parts.length - 1];
          const namespace = parts.length > 1 ? parts[0] : null;

          return (
            <div
              key={tagInfo.tag}
              onClick={() => onTagClick?.(tagInfo.tag)}
              style={{
                padding: '0.25rem 1rem',
                paddingLeft: namespace ? `${0.5 + (parts.length - 1) * 0.75}rem` : '1rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#e4e4e7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#a1a1aa';
              }}
            >
              <Tag size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {namespace && (
                  <span style={{ opacity: 0.6 }}>
                    {namespace}/
                  </span>
                )}
                {displayName}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  opacity: 0.5,
                  fontWeight: 500,
                }}
              >
                {tagInfo.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
