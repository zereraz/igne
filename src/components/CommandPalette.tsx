import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Terminal, Hash, FileText, Clock } from 'lucide-react';
import { searchStore } from '../stores/searchStore';
import type { ModalProps } from '../types';

interface Command {
  id: string;
  name: string;
  shortcut?: string;
  action: () => void;
  category?: 'file' | 'view' | 'edit' | 'help';
}

interface CommandPaletteProps extends Omit<ModalProps, 'title' | 'style' | 'className'> {
  commands: Command[];
  recentCommands?: string[];
  onCommandRun: (commandId: string) => void;
  onSelectFile?: (path: string) => void;
}

type Mode = 'commands' | 'files' | 'tags' | 'symbols';

export function CommandPalette({
  isOpen,
  onClose,
  commands,
  recentCommands = [],
  onCommandRun,
  onSelectFile,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('commands');
  const [results, setResults] = useState<(Command | { path: string; name: string; type: 'file' | 'tag' | 'symbol' })[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setMode('commands');
      setSelectedIndex(0);
      updateResults('', 'commands');
    }
  }, [isOpen]);

  // Update results based on query and mode
  const updateResults = useCallback((searchQuery: string, currentMode: Mode) => {
    if (currentMode === 'commands') {
      // Filter commands by query
      let filteredCommands = commands.filter(cmd =>
        cmd.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Show recent commands first when query is empty
      if (!searchQuery && recentCommands.length > 0) {
        const recent = filteredCommands.filter(cmd => recentCommands.includes(cmd.id));
        const other = filteredCommands.filter(cmd => !recentCommands.includes(cmd.id));
        filteredCommands = [...recent, ...other];
      }

      setResults(filteredCommands);
    } else if (currentMode === 'files' && onSelectFile) {
      const searchResults = searchStore.searchFilesWithOsPaths(searchQuery);
      setResults(searchResults.map(doc => ({ ...doc, type: 'file' as const })));
    } else if (currentMode === 'tags') {
      // Search for tags in files
      const allFiles = searchStore.searchFiles('');
      const tags = new Set<string>();

      allFiles.forEach(doc => {
        const tagMatches = doc.content.matchAll(/#(\w+)/g);
        for (const match of tagMatches) {
          tags.add(match[1]);
        }
      });

      const filteredTags = Array.from(tags)
        .filter(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(tag => ({ name: tag, path: `#${tag}`, type: 'tag' as const }));

      setResults(filteredTags);
    } else if (currentMode === 'symbols') {
      // Search for headings (symbols) in current file
      // This is a simplified version - would need current file content to be fully functional
      setResults([]);
    }

    setSelectedIndex(0);
  }, [commands, recentCommands, onSelectFile]);

  // Update results when query or mode changes
  useEffect(() => {
    updateResults(query, mode);
  }, [query, mode, updateResults]);

  // Detect prefix mode from query
  const detectMode = useCallback((input: string): Mode => {
    if (input.startsWith('>')) return 'commands';
    if (input.startsWith('#')) return 'tags';
    if (input.startsWith('@')) return 'files';
    if (input.startsWith(':')) return 'symbols';
    return mode;
  }, [mode]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Detect and handle prefix mode changes
    if (newValue.startsWith('>') && newValue.length === 1) {
      setMode('commands');
      setQuery('');
      return;
    }
    if (newValue.startsWith('#') && newValue.length === 1) {
      setMode('tags');
      setQuery('');
      return;
    }
    if (newValue.startsWith('@') && newValue.length === 1) {
      setMode('files');
      setQuery('');
      return;
    }
    if (newValue.startsWith(':') && newValue.length === 1) {
      setMode('symbols');
      setQuery('');
      return;
    }

    setQuery(newValue);
  };

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
        const selected = results[selectedIndex];

        if ('action' in selected) {
          // It's a command
          selected.action();
          onCommandRun(selected.id);
        } else if (selected.type === 'file' && onSelectFile) {
          // It's a file
          onSelectFile(selected.path);
        } else if (selected.type === 'tag') {
          // It's a tag - convert to search query
          setQuery(`tag:${selected.name}`);
          setMode('files');
        }

        onClose();
        setQuery('');
      } else if (e.key === 'Escape') {
        onClose();
        setQuery('');
      }
    },
    [results, selectedIndex, onClose, onCommandRun, onSelectFile]
  );

  if (!isOpen) return null;

  const getPlaceholder = () => {
    switch (mode) {
      case 'commands': return 'Type a command or >';
      case 'files': return 'Search files...';
      case 'tags': return 'Search tags...';
      case 'symbols': return 'Search symbols...';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'commands': return Terminal;
      case 'files': return FileText;
      case 'tags': return Hash;
      case 'symbols': return Search;
    }
  };

  const ModeIcon = getIcon();

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
          width: '560px',
          maxWidth: '90%',
          backgroundColor: '#27272a',
          borderRadius: '2px',
          border: '1px solid #3f3f46',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #3f3f46',
          }}
        >
          <ModeIcon size={18} style={{ color: '#71717a', marginRight: '12px', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={mode === 'commands' ? query : query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e4e4e7',
              fontSize: '14px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            }}
          />
          {/* Mode indicator */}
          {mode !== 'commands' && (
            <div
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                backgroundColor: '#3f3f46',
                borderRadius: '2px',
                fontSize: '11px',
                color: '#a1a1aa',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              }}
            >
              {mode === 'files' && '@'}
              {mode === 'tags' && '#'}
              {mode === 'symbols' && ':'}
            </div>
          )}
        </div>

        {/* Mode Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '8px 16px',
            borderBottom: '1px solid #3f3f46',
          }}
        >
          <button
            onClick={() => { setMode('commands'); setQuery(''); }}
            style={{
              padding: '4px 8px',
              backgroundColor: mode === 'commands' ? 'rgba(167, 139, 250, 0.2)' : 'transparent',
              border: '1px solid transparent',
              borderRadius: '2px',
              color: mode === 'commands' ? '#a78bfa' : '#71717a',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Terminal size={12} />
            Commands
          </button>
          <button
            onClick={() => { setMode('files'); setQuery(''); }}
            style={{
              padding: '4px 8px',
              backgroundColor: mode === 'files' ? 'rgba(167, 139, 250, 0.2)' : 'transparent',
              border: '1px solid transparent',
              borderRadius: '2px',
              color: mode === 'files' ? '#a78bfa' : '#71717a',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileText size={12} />
            Files
          </button>
          <button
            onClick={() => { setMode('tags'); setQuery(''); }}
            style={{
              padding: '4px 8px',
              backgroundColor: mode === 'tags' ? 'rgba(167, 139, 250, 0.2)' : 'transparent',
              border: '1px solid transparent',
              borderRadius: '2px',
              color: mode === 'tags' ? '#a78bfa' : '#71717a',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Hash size={12} />
            Tags
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
            }}
          >
            {mode === 'commands' && !query && recentCommands.length > 0 && selectedIndex < recentCommands.length && (
              <div
                style={{
                  padding: '8px 16px',
                  fontSize: '11px',
                  color: '#71717a',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Clock size={12} />
                Recent
              </div>
            )}
            {results.map((result, index) => (
              <div
                key={'id' in result ? result.id : result.path}
                onClick={() => {
                  if ('action' in result) {
                    result.action();
                    onCommandRun(result.id);
                  } else if (result.type === 'file' && onSelectFile) {
                    onSelectFile(result.path);
                  }
                  onClose();
                  setQuery('');
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                  borderLeft: index === selectedIndex ? '2px solid #a78bfa' : '2px solid transparent',
                  transition: 'background-color 100ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {'action' in result ? (
                    <Terminal size={16} style={{ color: index === selectedIndex ? '#a78bfa' : '#71717a', flexShrink: 0 }} />
                  ) : result.type === 'file' ? (
                    <FileText size={16} style={{ color: index === selectedIndex ? '#a78bfa' : '#71717a', flexShrink: 0 }} />
                  ) : (
                    <Hash size={16} style={{ color: index === selectedIndex ? '#a78bfa' : '#71717a', flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      color: index === selectedIndex ? '#e4e4e7' : '#a1a1aa',
                      fontSize: '13px',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                    }}
                  >
                    {'action' in result ? result.name : result.name}
                  </span>
                </div>
                {'shortcut' in result && result.shortcut && (
                  <kbd
                    style={{
                      padding: '2px 6px',
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '2px',
                      fontSize: '11px',
                      color: '#71717a',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                    }}
                  >
                    {result.shortcut}
                  </kbd>
                )}
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
              color: '#71717a',
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            }}
          >
            No results found
          </div>
        )}

        {/* Help Footer */}
        {!query && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #3f3f46',
              color: '#71717a',
              fontSize: '11px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>↑↓</kbd> navigate
            </span>
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>Enter</kbd> open
            </span>
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>Esc</kbd> close
            </span>
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>@</kbd> files
            </span>
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>#</kbd> tags
            </span>
            <span>
              <kbd style={{ color: '#a1a1aa', marginRight: '4px' }}>:</kbd> symbols
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
