import { useMemo } from 'react';
import { Link, FileText } from 'lucide-react';
import { searchStore } from '../stores/searchStore';

interface BacklinksPanelProps {
  currentFilePath: string | null;
  onBacklinkClick: (path: string) => void;
}

export function BacklinksPanel({ currentFilePath, onBacklinkClick }: BacklinksPanelProps) {
  const backlinks = useMemo(() => {
    if (!currentFilePath) return [];
    return searchStore.findBacklinks(currentFilePath);
  }, [currentFilePath]);

  if (!currentFilePath || backlinks.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        borderTop: '1px solid #3f3f46',
        backgroundColor: '#1f1f23',
        padding: '12px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
          color: '#71717a',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 500,
          fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
        }}
      >
        <Link size={12} />
        <span>Backlinks ({backlinks.length})</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        {backlinks.map((backlink) => (
          <button
            key={backlink.path}
            onClick={() => onBacklinkClick(backlink.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textAlign: 'left',
              padding: '6px 10px',
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '2px',
              color: '#a1a1aa',
              fontSize: '12px',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              cursor: 'pointer',
              transition: 'border-color 100ms ease, color 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#a78bfa';
              e.currentTarget.style.color = '#e4e4e7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3f3f46';
              e.currentTarget.style.color = '#a1a1aa';
            }}
          >
            <FileText size={12} style={{ color: '#71717a' }} />
            {backlink.name}
          </button>
        ))}
      </div>
    </div>
  );
}
