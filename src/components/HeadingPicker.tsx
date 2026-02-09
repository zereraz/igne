import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, ChevronRight, FileText } from 'lucide-react';
import { getHeadingHierarchy, type HeadingNode } from '../utils/headingFinder';

interface HeadingPickerProps {
  noteName: string;
  noteContent: string | null;
  onSelect: (heading: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function HeadingPicker({ noteName, noteContent, onSelect, onClose, position }: HeadingPickerProps) {
  const [headings, setHeadings] = useState<HeadingNode[]>([]);
  const [hoveredHeading, setHoveredHeading] = useState<string | null>(null);

  useEffect(() => {
    if (noteContent) {
      setHeadings(getHeadingHierarchy(noteContent));
    }
  }, [noteContent]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.heading-picker')) {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const renderHeadingNode = useCallback((node: HeadingNode, depth: number = 0): React.ReactNode => {
    const indent = depth * 16;

    return (
      <div key={`${node.line}-${node.text}`} className="heading-node">
        <div
          className="heading-item"
          style={{
            padding: '6px 12px',
            paddingLeft: `${12 + indent}px`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-normal)',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
            transition: 'background-color 100ms ease',
          }}
          onClick={() => onSelect(node.text)}
          onMouseEnter={() => setHoveredHeading(node.text)}
          onMouseLeave={() => setHoveredHeading(null)}
        >
          {depth > 0 && <ChevronRight size={12} style={{ color: 'var(--text-faint)', minWidth: '12px' }} />}
          <FileText size={14} style={{ color: 'var(--color-accent)', minWidth: '14px' }} />
          <span style={{ flex: 1 }}>{node.text}</span>
        </div>

        {hoveredHeading === node.text && (
          <div
            style={{
              position: 'fixed',
              left: position.left + 280,
              top: position.top,
              width: '300px',
              maxHeight: '400px',
              overflow: 'auto',
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={() => setHoveredHeading(node.text)}
            onMouseLeave={() => setHoveredHeading(null)}
          >
            <div style={{ fontWeight: 500, color: 'var(--text-normal)', marginBottom: '8px' }}>{node.text}</div>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {getPreviewForHeading(node, noteContent || '')}
            </div>
          </div>
        )}

        {node.children.length > 0 && (
          <div className="heading-children">
            {node.children.map((child) => renderHeadingNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [noteContent, position, hoveredHeading, onSelect]);

  if (!noteContent) {
    return (
      <div
        className="heading-picker"
        style={{
          position: 'fixed',
          left: position.left,
          top: position.top,
          width: '260px',
          maxHeight: '400px',
          overflow: 'auto',
          backgroundColor: 'var(--background-secondary-alt, var(--background-secondary))',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            padding: '12px',
            borderBottom: '1px solid var(--background-modifier-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-normal)' }}>Headings in {noteName}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '12px', color: 'var(--text-faint)', fontSize: '13px' }}>
          Note not found
        </div>
      </div>
    );
  }

  if (headings.length === 0) {
    return (
      <div
        className="heading-picker"
        style={{
          position: 'fixed',
          left: position.left,
          top: position.top,
          width: '260px',
          maxHeight: '400px',
          overflow: 'auto',
          backgroundColor: 'var(--background-secondary-alt, var(--background-secondary))',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            padding: '12px',
            borderBottom: '1px solid var(--background-modifier-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-normal)' }}>Headings in {noteName}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '12px', color: 'var(--text-faint)', fontSize: '13px' }}>
          No headings found
        </div>
      </div>
    );
  }

  return (
    <div
      className="heading-picker"
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        width: '260px',
        maxHeight: '400px',
        overflow: 'auto',
        backgroundColor: 'var(--background-secondary-alt, var(--background-secondary))',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--background-modifier-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-normal)' }}>Headings in {noteName}</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div className="heading-list">
        {headings.map((heading) => renderHeadingNode(heading))}
      </div>
    </div>
  );
}

function getPreviewForHeading(node: HeadingNode, content: string): string {
  const lines = content.split('\n');
  const previewLines: string[] = [];

  // Start from the line after the heading
  for (let i = node.line + 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      const level = match[1].length;

      // Stop if we hit a heading of same or higher level
      if (level <= node.level) {
        break;
      }
    }

    previewLines.push(line);

    // Limit preview length
    if (previewLines.join('\n').length > 200) {
      break;
    }
  }

  const preview = previewLines.join('\n').trim();
  return preview.length > 200 ? preview.substring(0, 200) + '...' : preview || '(empty section)';
}
