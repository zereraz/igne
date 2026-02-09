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
    }, 300);
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
        backgroundColor: '#27272a',
        border: '1px solid #3f3f46',
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
          color: '#a1a1aa',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '2px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.color = '#e4e4e7';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#a1a1aa';
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
              color: '#71717a',
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
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '2px',
              color: '#e4e4e7',
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
            backgroundColor: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '2px',
            color: '#e4e4e7',
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
            color: '#a1a1aa',
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
            color: '#a1a1aa',
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
            color: '#a1a1aa',
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
            color: '#71717a',
            marginBottom: '8px',
            padding: '6px 8px',
            backgroundColor: '#18181b',
            borderRadius: '2px',
            border: '1px solid #3f3f46',
            lineHeight: '1.4',
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 500, color: '#a1a1aa' }}>Advanced search operators:</div>
          <div>• <code style={{ color: '#a78bfa' }}>tag:important</code> - Search by tag</div>
          <div>• <code style={{ color: '#a78bfa' }}>file:note</code> - Search in filename</div>
          <div>• <code style={{ color: '#a78bfa' }}>path:journal/</code> - Search in folder</div>
          <div>• <code style={{ color: '#a78bfa' }}>#tag</code> - Alternative tag syntax</div>
        </div>
      )}

      {/* Result count */}
      {resultCount !== undefined && (
        <div
          style={{
            fontSize: '12px',
            color: '#71717a',
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
            backgroundColor: query.trim() ? '#3f3f46' : '#27272a',
            border: '1px solid #52525b',
            borderRadius: '2px',
            color: '#a1a1aa',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (query.trim()) {
              e.currentTarget.style.backgroundColor = '#52525b';
              e.currentTarget.style.borderColor = '#71717a';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = query.trim() ? '#3f3f46' : '#27272a';
            e.currentTarget.style.borderColor = '#52525b';
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
            backgroundColor: query.trim() ? '#3f3f46' : '#27272a',
            border: '1px solid #52525b',
            borderRadius: '2px',
            color: '#a1a1aa',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (query.trim()) {
              e.currentTarget.style.backgroundColor = '#52525b';
              e.currentTarget.style.borderColor = '#71717a';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = query.trim() ? '#3f3f46' : '#27272a';
            e.currentTarget.style.borderColor = '#52525b';
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
            backgroundColor: query.trim() ? '#a78bfa' : '#27272a',
            border: '1px solid #a78bfa',
            borderRadius: '2px',
            color: query.trim() ? '#18181b' : '#52525b',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (query.trim()) {
              e.currentTarget.style.backgroundColor = '#8b5cf6';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = query.trim() ? '#a78bfa' : '#27272a';
          }}
        >
          <ReplaceAll size={14} />
          Replace All
        </button>
      </div>
    </div>
  );
}
