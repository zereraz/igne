import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText } from 'lucide-react';
import { FocusTrapWrapper } from './FocusTrapWrapper';
import { searchStore } from '../stores/searchStore';
import { safeArrayIndex } from '../utils/clamp';
import type { SearchResult, ModalProps } from '../types';

interface QuickSwitcherProps extends Omit<ModalProps, 'title' | 'style' | 'className'> {
  onSelectFile: (path: string) => void;
}

export function QuickSwitcher({ isOpen, onClose, onSelectFile }: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults(searchStore.searchFilesWithOsPaths(''));
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setResults(searchStore.searchFilesWithOsPaths(query));
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const idx = safeArrayIndex(selectedIndex, results.length);
        onSelectFile(results[idx].path);
        onClose();
        setQuery('');
      } else if (e.key === 'Escape') {
        onClose();
        setQuery('');
      }
    },
    [results, selectedIndex, onClose, onSelectFile]
  );

  if (!isOpen) return null;

  return (
    <FocusTrapWrapper>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Switcher"
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
          width: '520px',
          maxWidth: '90%',
          backgroundColor: 'var(--background-secondary)',
          borderRadius: '2px',
          border: '1px solid var(--background-modifier-border)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          className="igne-search-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--background-modifier-border)',
          }}
        >
          <Search size={18} style={{ color: 'var(--text-faint)', marginRight: '12px', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-normal)',
              fontSize: '14px',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            }}
            className="igne-search-input"
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
            }}
          >
            {results.map((result, index) => (
              <div
                key={result.path}
                onClick={() => {
                  onSelectFile(result.path);
                  onClose();
                  setQuery('');
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
                  borderLeft: index === selectedIndex ? '2px solid var(--color-accent)' : '2px solid transparent',
                  transition: 'background-color 100ms ease',
                }}
              >
                <FileText size={16} style={{ color: index === selectedIndex ? 'var(--color-accent)' : 'var(--text-faint)', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      color: index === selectedIndex ? 'var(--text-normal)' : 'var(--text-muted)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
                    }}
                  >
                    {result.name}
                  </span>
                  {(() => {
                    const folderPath = result.path.split('/').slice(0, -1).join('/');
                    return folderPath ? (
                      <span
                        style={{
                          color: 'var(--text-faint)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {folderPath}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {query && results.length === 0 && (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-faint)',
              fontSize: '13px',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            }}
          >
            No files found
          </div>
        )}

        {/* Help Footer */}
        {!query && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--background-modifier-border)',
              color: 'var(--text-faint)',
              fontSize: '11px',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
              display: 'flex',
              gap: '16px',
            }}
          >
            <span>
              <kbd style={{ color: 'var(--text-muted)', marginRight: '4px' }}>↑↓</kbd> navigate
            </span>
            <span>
              <kbd style={{ color: 'var(--text-muted)', marginRight: '4px' }}>Enter</kbd> open
            </span>
            <span>
              <kbd style={{ color: 'var(--text-muted)', marginRight: '4px' }}>Esc</kbd> close
            </span>
          </div>
        )}
        </div>
      </div>
    </FocusTrapWrapper>
  );
}
