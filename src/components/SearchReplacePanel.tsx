import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, ArrowDown, ReplaceAll, Replace } from 'lucide-react';

interface SearchReplacePanelProps {
  onFind: (query: string, options: FindOptions) => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
  onReplace: (query: string, replacement: string, options: FindOptions) => void;
  onReplaceAll: (query: string, replacement: string, options: FindOptions) => void;
  onClose: () => void;
  resultCount?: number;
  currentResult?: number;
}

export interface FindOptions {
  caseSensitive: boolean;
  regex: boolean;
  wholeWord: boolean;
}

export function SearchReplacePanel({
  onFind,
  onFindNext,
  onFindPrevious,
  onReplace,
  onReplaceAll,
  onClose,
  resultCount,
  currentResult,
}: SearchReplacePanelProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const findOptions: FindOptions = {
    caseSensitive,
    regex,
    wholeWord,
  };

  const handleReplace = useCallback(() => {
    if (query.trim()) {
      onReplace(query, replacement, findOptions);
    }
  }, [query, replacement, findOptions, onReplace]);

  const handleReplaceAll = useCallback(() => {
    if (query.trim()) {
      onReplaceAll(query, replacement, findOptions);
    }
  }, [query, replacement, findOptions, onReplaceAll]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          onFindPrevious();
        } else {
          onFindNext();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onFindNext, onFindPrevious, onClose]
  );

  // Auto-search when query or options change (setup only, no navigation)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        onFind(query, { caseSensitive, regex, wholeWord });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query, caseSensitive, regex, wholeWord, onFind]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '4px',
        padding: '12px',
        zIndex: 1000,
        minWidth: '400px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '2px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
          e.currentTarget.style.color = 'var(--text-normal)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        <X size={16} />
      </button>

      {/* Search input */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-faint)',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find... (use tag:, file:, path: for advanced search)"
            style={{
              width: '100%',
              padding: '6px 8px 6px 32px',
              backgroundColor: 'var(--background-primary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '2px',
              color: 'var(--text-normal)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Replace input */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Replace with..."
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '2px',
            color: 'var(--text-normal)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>

      {/* Options */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '8px',
          flexWrap: 'wrap',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            style={{
              width: '14px',
              height: '14px',
              cursor: 'pointer',
            }}
          />
          Case Sensitive
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={regex}
            onChange={(e) => setRegex(e.target.checked)}
            style={{
              width: '14px',
              height: '14px',
              cursor: 'pointer',
            }}
          />
          Regex
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={wholeWord}
            onChange={(e) => setWholeWord(e.target.checked)}
            style={{
              width: '14px',
              height: '14px',
              cursor: 'pointer',
            }}
          />
          Whole Word
        </label>
      </div>

      {/* Search operators hint */}
      {query && (query.includes('tag:') || query.includes('file:') || query.includes('path:') || query.includes('#')) && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
            marginBottom: '8px',
            padding: '6px 8px',
            backgroundColor: 'var(--background-primary)',
            borderRadius: '2px',
            border: '1px solid var(--background-modifier-border)',
            lineHeight: '1.4',
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 500, color: 'var(--text-muted)' }}>Advanced search operators:</div>
          <div>• <code style={{ color: 'var(--color-accent)' }}>tag:important</code> - Search by tag</div>
          <div>• <code style={{ color: 'var(--color-accent)' }}>file:note</code> - Search in filename</div>
          <div>• <code style={{ color: 'var(--color-accent)' }}>path:journal/</code> - Search in folder</div>
          <div>• <code style={{ color: 'var(--color-accent)' }}>#tag</code> - Alternative tag syntax</div>
        </div>
      )}

      {/* Result count */}
      {resultCount !== undefined && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-faint)',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          {resultCount === 0
            ? 'No results'
            : currentResult !== undefined
            ? `${currentResult} of ${resultCount} results`
            : `${resultCount} result${resultCount !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={onFindNext}
          disabled={!query.trim()}
          style={{
            flex: 1,
            padding: '6px 12px',
            backgroundColor: query.trim() ? 'var(--background-modifier-border)' : 'var(--background-secondary)',
            border: '1px solid var(--interactive-normal)',
            borderRadius: '2px',
            color: 'var(--text-muted)',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (query.trim()) {
              e.currentTarget.style.backgroundColor = 'var(--interactive-normal)';
              e.currentTarget.style.borderColor = 'var(--text-faint)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = query.trim() ? 'var(--background-modifier-border)' : 'var(--background-secondary)';
            e.currentTarget.style.borderColor = 'var(--interactive-normal)';
          }}
        >
          <ArrowDown size={14} />
          Find Next
        </button>

        <button
          onClick={handleReplace}
          disabled={!query.trim()}
          style={{
            flex: 1,
            padding: '6px 12px',
            backgroundColor: query.trim() ? 'var(--background-modifier-border)' : 'var(--background-secondary)',
            border: '1px solid var(--interactive-normal)',
            borderRadius: '2px',
            color: 'var(--text-muted)',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (query.trim()) {
              e.currentTarget.style.backgroundColor = 'var(--interactive-normal)';
              e.currentTarget.style.borderColor = 'var(--text-faint)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = query.trim() ? 'var(--background-modifier-border)' : 'var(--background-secondary)';
            e.currentTarget.style.borderColor = 'var(--interactive-normal)';
          }}
        >
          <Replace size={14} />
          Replace
        </button>

        <button
          onClick={handleReplaceAll}
          disabled={!query.trim()}
          style={{
            flex: 1,
            padding: '6px 12px',
            backgroundColor: query.trim() ? 'var(--color-accent)' : 'var(--background-secondary)',
            border: '1px solid var(--color-accent)',
            borderRadius: '2px',
            color: query.trim() ? 'var(--background-primary)' : 'var(--interactive-normal)',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (query.trim()) {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = query.trim() ? 'var(--color-accent)' : 'var(--background-secondary)';
          }}
        >
          <ReplaceAll size={14} />
          Replace All
        </button>
      </div>
    </div>
  );
}
