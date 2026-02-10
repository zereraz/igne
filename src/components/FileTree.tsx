import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { useState, memo, useMemo } from 'react';
import { FileEntry } from '../types';

interface FileTreeProps {
  entries: FileEntry[];
  selectedPath: string | null;
  onSelect: (path: string, newTab?: boolean) => void;
  onContextMenu?: (path: string, isFolder: boolean, x: number, y: number) => void;
  onDrop?: (sourcePath: string, targetPath: string) => void;
}

const getRowStyle = (depth: number, isSelected: boolean, isDragOver: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  paddingLeft: `${depth * 12 + 8}px`,
  paddingRight: '0.5rem',
  paddingTop: '0.25rem',
  paddingBottom: '0.25rem',
  cursor: 'pointer',
  borderRadius: '0.25rem',
  backgroundColor: isDragOver ? 'var(--background-tertiary)' : (isSelected ? 'var(--background-tertiary)' : 'transparent'),
  color: isSelected ? 'var(--color-accent)' : 'inherit',
  border: isDragOver ? '1px dashed var(--color-accent)' : 'none',
});

const getRowHoverStyle = (isHovered: boolean, isSelected: boolean, isDragOver: boolean) => ({
  backgroundColor: isDragOver ? 'var(--background-tertiary)' : (isSelected ? 'var(--background-tertiary)' : (isHovered ? 'var(--background-modifier-hover)' : 'transparent')),
});

function collectDuplicateNames(entries: FileEntry[]): Set<string> {
  const counts = new Map<string, number>();
  function walk(items: FileEntry[]) {
    for (const item of items) {
      if (!item.is_dir) {
        counts.set(item.name, (counts.get(item.name) || 0) + 1);
      }
      if (item.children) walk(item.children);
    }
  }
  walk(entries);
  const dupes = new Set<string>();
  for (const [name, count] of counts) {
    if (count > 1) dupes.add(name);
  }
  return dupes;
}

export const FileTree = memo(function FileTree({ entries, selectedPath, onSelect, onContextMenu, onDrop }: FileTreeProps) {
  const duplicateNames = useMemo(() => collectDuplicateNames(entries), [entries]);
  return (
    <div style={{ fontSize: '0.875rem' }}>
      {entries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onDrop={onDrop}
          duplicateNames={duplicateNames}
        />
      ))}
    </div>
  );
});

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string, newTab?: boolean) => void;
  onContextMenu?: (path: string, isFolder: boolean, x: number, y: number) => void;
  onDrop?: (sourcePath: string, targetPath: string) => void;
  duplicateNames: Set<string>;
}

function FileTreeItem({ entry, depth, selectedPath, onSelect, onContextMenu, onDrop, duplicateNames }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const isSelected = selectedPath === entry.path;

  const handleClick = (e: React.MouseEvent) => {
    if (entry.is_dir) {
      setExpanded(!expanded);
    } else {
      const isNewTab = (e.metaKey || e.ctrlKey);
      onSelect(entry.path, isNewTab);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(entry.path, entry.is_dir, e.clientX, e.clientY);
  };

  const handleDragStart = (e: React.DragEvent) => {
    setDraggedItem(entry.path);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', entry.path);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (entry.is_dir && draggedItem && draggedItem !== entry.path) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const sourcePath = e.dataTransfer.getData('text/plain');
    if (sourcePath && sourcePath !== entry.path && entry.is_dir) {
      onDrop?.(sourcePath, entry.path);
    }
    setDraggedItem(null);
  };

  return (
    <div>
      <div
        style={{ ...getRowStyle(depth, isSelected, isDragOver), ...getRowHoverStyle(isHovered, isSelected, isDragOver) }}
        onClick={(e) => handleClick(e)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={handleContextMenu}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-file={entry.is_dir ? undefined : entry.name}
        data-folder={entry.is_dir ? entry.name : undefined}
      >
        {entry.is_dir ? (
          <>
            {expanded ? (
              <ChevronDown style={{ width: '1rem', height: '1rem', color: 'var(--text-faint)', flexShrink: 0 }} />
            ) : (
              <ChevronRight style={{ width: '1rem', height: '1rem', color: 'var(--text-faint)', flexShrink: 0 }} />
            )}
            <Folder style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)', flexShrink: 0 }} />
          </>
        ) : (
          <>
            <span style={{ width: '1rem', flexShrink: 0 }} />
            <File style={{ width: '1rem', height: '1rem', color: 'var(--text-faint)', flexShrink: 0 }} />
          </>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name.replace('.md', '')}
          {!entry.is_dir && duplicateNames.has(entry.name) && (() => {
            const segments = entry.path.split('/');
            const parent = segments.length >= 2 ? segments[segments.length - 2] : null;
            return parent ? (
              <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem', marginLeft: '0.35rem' }}>
                {parent}/
              </span>
            ) : null;
          })()}
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
              onContextMenu={onContextMenu}
              onDrop={onDrop}
              duplicateNames={duplicateNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}
