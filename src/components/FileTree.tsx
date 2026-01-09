import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { useState } from 'react';
import { FileEntry } from '../types';

interface FileTreeProps {
  entries: FileEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

const getRowStyle = (depth: number, isSelected: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  paddingLeft: `${depth * 12 + 8}px`,
  paddingRight: '0.5rem',
  paddingTop: '0.25rem',
  paddingBottom: '0.25rem',
  cursor: 'pointer',
  borderRadius: '0.25rem',
  backgroundColor: isSelected ? '#3f3f46' : 'transparent',
  color: isSelected ? '#a78bfa' : 'inherit',
});

const getRowHoverStyle = (isHovered: boolean, isSelected: boolean) => ({
  backgroundColor: isSelected ? '#3f3f46' : (isHovered ? '#27272a' : 'transparent'),
});

export function FileTree({ entries, selectedPath, onSelect }: FileTreeProps) {
  return (
    <div style={{ fontSize: '0.875rem' }}>
      {entries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function FileTreeItem({ entry, depth, selectedPath, onSelect }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [isHovered, setIsHovered] = useState(false);

  const isSelected = selectedPath === entry.path;

  const handleClick = () => {
    if (entry.is_dir) {
      setExpanded(!expanded);
    } else {
      onSelect(entry.path);
    }
  };

  return (
    <div>
      <div
        style={{ ...getRowStyle(depth, isSelected), ...getRowHoverStyle(isHovered, isSelected) }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {entry.is_dir ? (
          <>
            {expanded ? (
              <ChevronDown style={{ width: '1rem', height: '1rem', color: '#71717a', flexShrink: 0 }} />
            ) : (
              <ChevronRight style={{ width: '1rem', height: '1rem', color: '#71717a', flexShrink: 0 }} />
            )}
            <Folder style={{ width: '1rem', height: '1rem', color: '#a1a1aa', flexShrink: 0 }} />
          </>
        ) : (
          <>
            <span style={{ width: '1rem', flexShrink: 0 }} />
            <File style={{ width: '1rem', height: '1rem', color: '#71717a', flexShrink: 0 }} />
          </>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name.replace('.md', '')}
        </span>
      </div>

      {entry.is_dir && expanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
