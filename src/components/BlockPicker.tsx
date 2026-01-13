import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, FileText } from 'lucide-react';
import { getBlockList, type BlockType } from '../utils/blockFinder';

export interface BlockItem {
  id: string;
  line: number;
  type: BlockType;
  preview: string;
}

export interface BlockPickerProps {
  isOpen: boolean;
  onClose: () => void;
  noteContent: string;
  noteName: string;
  onSelectBlock: (blockId: string) => void;
}

export function BlockPicker({
  isOpen,
  onClose,
  noteContent,
  noteName,
  onSelectBlock,
}: BlockPickerProps) {
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const blockList = getBlockList(noteContent);
      setBlocks(blockList);
      setSelectedIndex(0);
      setHoveredIndex(null);
    }
  }, [isOpen, noteContent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, blocks.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && blocks.length > 0) {
        e.preventDefault();
        onSelectBlock(blocks[selectedIndex].id);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [blocks, selectedIndex, onClose, onSelectBlock]
  );

  if (!isOpen) return null;

  const getBlockIcon = (type: BlockType): string => {
    switch (type) {
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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '600px',
          maxWidth: '90%',
          backgroundColor: '#27272a',
          borderRadius: '2px',
          border: '1px solid #3f3f46',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #3f3f46',
          }}
        >
          <Hash size={18} style={{ color: '#71717a', marginRight: '12px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: '#e4e4e7',
                fontSize: '14px',
                fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
                fontWeight: 500,
              }}
            >
              Blocks in {noteName}
            </div>
            <div
              style={{
                color: '#71717a',
                fontSize: '11px',
                fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace',
                marginTop: '2px',
              }}
            >
              {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'} available
            </div>
          </div>
        </div>

        {/* Blocks List */}
        {blocks.length > 0 && (
          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
            }}
          >
            {blocks.map((block, index) => {
              const isSelected = index === selectedIndex;
              const isHovered = index === hoveredIndex;

              return (
                <div
                  key={block.id}
                  onClick={() => {
                    onSelectBlock(block.id);
                    onClose();
                  }}
                  onMouseEnter={() => {
                    setHoveredIndex(index);
                    setSelectedIndex(index);
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #22c55e' : '2px solid transparent',
                    transition: 'background-color 100ms ease',
                    borderBottom: '1px solid #3f3f46',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>
                      {getBlockIcon(block.type)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <code
                          style={{
                            color: isSelected ? '#22c55e' : '#a78bfa',
                            fontSize: '12px',
                            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
                            backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '2px',
                          }}
                        >
                          ^{block.id}
                        </code>
                        <span
                          style={{
                            color: '#71717a',
                            fontSize: '11px',
                            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace',
                          }}
                        >
                          Line {block.line}
                        </span>
                      </div>
                      <div
                        style={{
                          color: isSelected || isHovered ? '#e4e4e7' : '#a1a1aa',
                          fontSize: '13px',
                          fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {block.preview || 'Empty block'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Blocks */}
        {blocks.length === 0 && (
          <div
            style={{
              padding: '48px 16px',
              textAlign: 'center',
            }}
          >
            <FileText size={32} style={{ color: '#3f3f46', marginBottom: '12px' }} />
            <div
              style={{
                color: '#71717a',
                fontSize: '13px',
                fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              }}
            >
              No blocks found in this note
            </div>
            <div
              style={{
                color: '#52525b',
                fontSize: '11px',
                fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
                marginTop: '4px',
              }}
            >
              Add block IDs using ^{'{'}block-id{'}'} syntax
            </div>
          </div>
        )}

        {/* Help Footer */}
        {blocks.length > 0 && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #3f3f46',
              color: '#71717a',
              fontSize: '11px',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              display: 'flex',
              gap: '16px',
            }}
          >
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>↑↓</kbd> navigate
            </span>
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>Enter</kbd> select
            </span>
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>Esc</kbd> close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
