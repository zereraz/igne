import { useMemo, useState } from 'react';
import { Link, X } from 'lucide-react';
import { searchStore } from '../stores/searchStore';
import type { FileSelectHandler, Nullable } from '../types';

interface BacklinksPanelProps {
  currentFilePath: Nullable<string>;
  onBacklinkClick: FileSelectHandler;
}

export function BacklinksPanel({ currentFilePath, onBacklinkClick }: BacklinksPanelProps) {
  const backlinks = useMemo(() => {
    if (!currentFilePath) return [];
    return searchStore.findBacklinks(currentFilePath);
  }, [currentFilePath]);

  const [collapsed, setCollapsed] = useState(false);

  if (!currentFilePath || backlinks.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: 'var(--background-secondary)',
        borderTop: '1px solid var(--background-modifier-border)',
        borderLeft: '1px solid var(--background-modifier-border)',
        borderTopLeftRadius: '6px',
        color: 'var(--text-faint)',
        fontSize: '11px',
        fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
      }}
      onMouseEnter={() => setCollapsed(false)}
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          title={`${backlinks.length} backlink${backlinks.length > 1 ? 's' : ''}`}
        >
          <Link size={12} />
          <span>{backlinks.length}</span>
        </button>
      ) : (
        <>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 4px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              opacity: 0.5,
            }}
            title="Collapse"
          >
            <X size={10} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link size={10} />
            <span style={{ opacity: 0.7 }}>
              {backlinks.length} link{backlinks.length > 1 ? 's' : ''}:
            </span>
          </div>
          {backlinks.slice(0, 3).map((backlink) => (
            <button
              key={backlink.path}
              onClick={() => onBacklinkClick(searchStore.getOsPath(backlink.path))}
              style={{
                padding: '2px 6px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(var(--color-accent-rgb), 0.2)',
                borderRadius: '3px',
                color: 'var(--color-accent)',
                fontSize: '11px',
                fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
                cursor: 'pointer',
                transition: 'all 100ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(var(--color-accent-rgb), 0.1)';
                e.currentTarget.style.borderColor = 'rgba(var(--color-accent-rgb), 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(var(--color-accent-rgb), 0.2)';
              }}
              title={backlink.name}
            >
              {backlink.name.length > 25 ? backlink.name.slice(0, 25) + '...' : backlink.name}
            </button>
          ))}
          {backlinks.length > 3 && (
            <span style={{ opacity: 0.5, fontSize: '10px' }}>
              +{backlinks.length - 3}
            </span>
          )}
        </>
      )}
    </div>
  );
}
