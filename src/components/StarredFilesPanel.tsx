import { useState, useEffect } from 'react';
import { Star, FileText, StarOff } from 'lucide-react';
import { loadStarredFiles, toggleStarredFile } from '../utils/starredFiles';
import { searchStore } from '../stores/searchStore';

interface StarredFilesPanelProps {
  vaultPath: string | null;
  currentFilePath: string | null;
  onFileSelect: (path: string) => void;
  onRefresh: () => void;
}

export function StarredFilesPanel({
  vaultPath,
  currentFilePath,
  onFileSelect,
  onRefresh,
}: StarredFilesPanelProps) {
  const [starredPaths, setStarredPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vaultPath) {
      loadStarred();
    }
  }, [vaultPath]);

  const loadStarred = async () => {
    if (!vaultPath) return;

    setLoading(true);
    try {
      const starred = await loadStarredFiles(vaultPath);
      setStarredPaths(starred);
    } catch (error) {
      console.error('Failed to load starred files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStar = async (filePath: string) => {
    if (!vaultPath) return;

    try {
      const isNowStarred = await toggleStarredFile(vaultPath, filePath);
      setStarredPaths(prev => {
        const newSet = new Set(prev);
        if (isNowStarred) {
          newSet.add(filePath);
        } else {
          newSet.delete(filePath);
        }
        return newSet;
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  if (!vaultPath) {
    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          color: '#71717a',
          fontSize: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        }}
      >
        No vault open
      </div>
    );
  }

  const starredFiles = Array.from(starredPaths)
    .map(path => {
      const doc = searchStore.searchFiles('').find(d => d.path === path);
      return doc ? { path, name: doc.name } : null;
    })
    .filter((f): f is { path: string; name: string } => f !== null);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #3f3f46',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <Star size={14} style={{ color: '#fbbf24' }} />
          Starred Files
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#71717a',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          }}
        >
          {starredFiles.length} file{starredFiles.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Starred Files List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: '#71717a',
              fontSize: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            }}
          >
            Loading...
          </div>
        ) : starredFiles.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: '#71717a',
              fontSize: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              lineHeight: '1.6',
            }}
          >
            No starred files yet.
            <br />
            Star files from the context menu to access them quickly.
          </div>
        ) : (
          starredFiles.map((file) => (
            <div
              key={file.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                marginBottom: '4px',
                backgroundColor: file.path === currentFilePath ? 'rgba(167, 139, 250, 0.1)' : 'transparent',
                border: '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 100ms ease',
              }}
              onMouseEnter={(e) => {
                if (file.path !== currentFilePath) {
                  e.currentTarget.style.backgroundColor = 'rgba(167, 139, 250, 0.05)';
                  e.currentTarget.style.borderColor = '#3f3f46';
                }
              }}
              onMouseLeave={(e) => {
                if (file.path !== currentFilePath) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <FileText
                size={14}
                style={{
                  color: file.path === currentFilePath ? '#a78bfa' : '#71717a',
                  flexShrink: 0,
                }}
              />
              <span
                onClick={() => onFileSelect(file.path)}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  color: file.path === currentFilePath ? '#e4e4e7' : '#a1a1aa',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStar(file.path);
                }}
                style={{
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#fbbf24',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px',
                  opacity: 0.7,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.1)';
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.7';
                }}
                title="Remove star"
              >
                <StarOff size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
