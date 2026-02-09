import React, { useEffect, useRef } from 'react';
import { useOutline } from './useOutline';
import { Hash } from 'lucide-react';

interface OutlinePanelProps {
  content: string;
  onHeadingClick?: (position: number, headingText: string) => void;
  currentLine?: number;
}

export function OutlinePanel({ content, onHeadingClick, currentLine }: OutlinePanelProps) {
  const headings = useOutline(content);
  const activeHeadingRef = useRef<HTMLDivElement>(null);

  // Find the current active heading based on cursor line
  const activeHeadingId = React.useMemo(() => {
    if (!currentLine) return null;

    // Find the last heading before or at the current line
    let activeId: string | null = null;
    for (const heading of headings) {
      if (heading.line <= currentLine) {
        activeId = heading.id;
      } else {
        break;
      }
    }
    return activeId;
  }, [currentLine, headings]);

  // Auto-scroll to active heading
  useEffect(() => {
    if (activeHeadingRef.current) {
      activeHeadingRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeHeadingId]);

  if (headings.length === 0) {
    return (
      <div className="outline-panel-empty" style={{ padding: '1rem', color: 'var(--text-faint)', textAlign: 'center' }}>
        <p>No headings found</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Add # headings to generate outline
        </p>
      </div>
    );
  }

  return (
    <div className="outline-panel">
      <div
        className="outline-panel-header"
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--background-secondary)',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
        }}
      >
        Outline
      </div>
      <div
        className="outline-panel-content"
        style={{
          padding: '0.5rem 0',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        }}
      >
        {headings.map((heading) => {
          const isActive = heading.id === activeHeadingId;
          return (
            <div
              key={heading.id}
              ref={isActive ? activeHeadingRef : null}
              onClick={() => onHeadingClick?.(heading.position, heading.text)}
              style={{
                padding: '0.25rem 1rem',
                paddingLeft: `${0.5 + heading.level * 0.75}rem`,
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: isActive ? 'var(--color-accent)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'rgba(var(--color-accent-rgb), 0.1)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
                  e.currentTarget.style.color = 'var(--text-normal)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Hash size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {heading.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
