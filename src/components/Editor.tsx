import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchWikilinks } from '../utils/wikilinkCompletion';
import { createLivePreview } from '../extensions/livePreview';
import { createMarkdownLanguage } from '../extensions/markdownLanguage';
import { searchStore } from '../stores/searchStore';
import type { WikilinkSearchResult, EditorChangeHandler, WikilinkClickHandler } from '../types';

interface WikilinkSearchState {
  position: { top: number; left: number };
  query: string;
}

interface EditorProps {
  content: string;
  onChange: EditorChangeHandler;
  onWikilinkClick?: WikilinkClickHandler;
  onWikilinkCmdClick?: WikilinkClickHandler;
}

export function Editor({ content, onChange, onWikilinkClick, onWikilinkCmdClick }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const [wikilinkSearch, setWikilinkSearch] = useState<WikilinkSearchState | null>(null);
  const [searchResults, setSearchResults] = useState<WikilinkSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keep onChange ref updated
  onChangeRef.current = onChange;

  // Search when query changes
  const performSearch = useCallback((query: string) => {
    setSearchResults(searchWikilinks(query));
    setSelectedIndex(0);
  }, []);

  // Handle wikilink selection
  const selectWikilink = useCallback((name: string) => {
    const view = viewRef.current;
    if (!view || !wikilinkSearch) return;

    const insertText = name;

    // Find the [[]] pattern and replace the inner ]]
    const docText = view.state.doc.toString();
    const cursorPos = view.state.selection.main.head;

    // Look backward from cursor for [[ followed by ]]
    // The cursor is between the ] characters, so we need to find [[ before and ]] after
    const beforeCursor = docText.slice(0, cursorPos);
    const afterCursor = docText.slice(cursorPos);

    // Match [[ at the end of beforeCursor
    const openMatch = beforeCursor.match(/\[\[$/);
    // Match ]] at the start of afterCursor
    const closeMatch = afterCursor.match(/^\]\]/);

    if (openMatch && closeMatch) {
      // Found [[]] with cursor in the middle
      const from = cursorPos - 2; // Position of first [
      const to = cursorPos + 2; // Position after second ]
      view.dispatch({
        changes: { from, to, insert: `[[${insertText}]]` },
        selection: { anchor: from + insertText.length + 4 }, // After the closing ]]
      });
      setWikilinkSearch(null);
      return;
    }

    // Fallback: search for [[]] pattern in the document
    const pattern = /\[\[\]\]/g;
    let match;
    while ((match = pattern.exec(docText)) !== null) {
      const matchPos = match.index;
      // Check if this [[]] is near the cursor
      if (matchPos <= cursorPos && matchPos + 4 >= cursorPos) {
        view.dispatch({
          changes: { from: matchPos, to: matchPos + 4, insert: `[[${insertText}]]` },
          selection: { anchor: matchPos + insertText.length + 4 },
        });
        setWikilinkSearch(null);
        return;
      }
    }

    setWikilinkSearch(null);
  }, [wikilinkSearch]);

  // Handle keyboard in wikilink search
  const handleWikilinkKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      selectWikilink(searchResults[selectedIndex].name);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setWikilinkSearch(null);
    }
  }, [searchResults, selectedIndex, selectWikilink]);

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      oneDark,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      createMarkdownLanguage(),
      // Keymap to auto-close [ and trigger wikilink search for [[
      keymap.of([
        {
          key: '[',
          run: (view) => {
            const pos = view.state.selection.main.head;
            const line = view.state.doc.lineAt(pos);

            // Check if we just typed [ after another [
            const textBefore = line.text.slice(0, pos - line.from);
            if (textBefore.endsWith('[')) {
              // We typed [[ - insert [ and closing brackets, show popup
              view.dispatch({
                changes: { from: pos, to: pos, insert: '[]]' },
                selection: { anchor: pos + 2 }, // Cursor between the inner brackets
              });

              // Get cursor coordinates for popup
              const coords = view.coordsAtPos(pos + 2);
              if (coords) {
                setWikilinkSearch({
                  position: { top: coords.bottom + 4, left: coords.left },
                  query: '',
                });
                performSearch('');
              }
              return true;
            }

            // Just [, auto-close it
            view.dispatch({
              changes: { from: pos, to: pos, insert: '[]' },
              selection: { anchor: pos + 1 }, // Cursor between brackets
            });
            return true;
          },
        },
      ]),
      createLivePreview({
        onWikilinkClick: onWikilinkClick || (() => {}),
        onWikilinkCmdClick: onWikilinkCmdClick || (() => {}),
        resolveWikilink: (target: string) => {
          const exists = searchStore.noteExists(target);
          return exists ? { exists: true } : { exists: false };
        },
      }),
      placeholder('Start writing...'),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          onChangeRef.current(newContent);
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '15px',
          lineHeight: '1.6',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        },
        '.cm-content': {
          padding: '1rem',
        },
        '.cm-line': {
          padding: '0',
        },
        '.cm-placeholder': {
          color: '#52525b',
        },
        // Live preview heading styles
        '.cm-heading-1': {
          fontSize: '2em',
          fontWeight: 'bold',
          lineHeight: '1.2',
          marginTop: '0.5em',
          marginBottom: '0.25em',
        },
        '.cm-heading-2': {
          fontSize: '1.5em',
          fontWeight: 'bold',
          lineHeight: '1.3',
          marginTop: '0.5em',
          marginBottom: '0.25em',
        },
        '.cm-heading-3': {
          fontSize: '1.25em',
          fontWeight: 'bold',
          lineHeight: '1.4',
          marginTop: '0.5em',
          marginBottom: '0.25em',
        },
        '.cm-heading-4': {
          fontSize: '1.1em',
          fontWeight: 'bold',
          lineHeight: '1.4',
          marginTop: '0.5em',
          marginBottom: '0.25em',
        },
        '.cm-heading-5': {
          fontSize: '1em',
          fontWeight: 'bold',
          lineHeight: '1.4',
        },
        '.cm-heading-6': {
          fontSize: '0.9em',
          fontWeight: 'bold',
          lineHeight: '1.4',
        },
        // Bold and italic
        '.cm-strong': {
          fontWeight: 'bold',
        },
        '.cm-em': {
          fontStyle: 'italic',
        },
        // Inline code
        '.cm-inline-code': {
          backgroundColor: '#27272a',
          color: '#a78bfa',
          padding: '0.125rem 0.25rem',
          borderRadius: '0.25rem',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          fontSize: '0.9em',
        },
        // Strikethrough
        '.cm-strike': {
          textDecoration: 'line-through',
        },
        // Blockquote
        '.cm-blockquote': {
          borderLeft: '3px solid #3f3f46',
          paddingLeft: '0.75rem',
          marginLeft: '0',
          color: '#a1a1aa',
          fontStyle: 'italic',
        },
        // Lists
        '.cm-list': {
          paddingLeft: '0.5rem',
        },
        // Tooltip styles
        '.cm-tooltip': {
          backgroundColor: '#27272a',
          border: '1px solid #3f3f46',
          borderRadius: '0.25rem',
        },
        '.cm-tooltip-autocomplete': {
          maxWidth: '300px',
        },
        '.cm-tooltip-autocomplete ul': {
          maxHeight: '200px',
        },
        '.cm-tooltip-autocomplete ul li': {
          color: '#a1a1aa',
          padding: '0.25rem 0.5rem',
        },
        '.cm-tooltip-autocomplete ul li[aria-selected]': {
          backgroundColor: '#3f3f46',
          color: 'white',
        },
        // Strikethrough
        '.cm-strikethrough': {
          textDecoration: 'line-through',
          color: '#71717a',
        },
        // Highlight
        '.cm-highlight': {
          backgroundColor: 'rgba(250, 204, 21, 0.3)',
          padding: '0 2px',
          borderRadius: '2px',
        },
        // Wikilinks
        '.cm-wikilink': {
          color: '#a78bfa',
          cursor: 'pointer',
          textDecoration: 'none',
          borderBottom: '1px dashed #a78bfa',
        },
        '.cm-wikilink:hover': {
          color: '#c4b5fd',
          borderBottomStyle: 'solid',
        },
        '.cm-wikilink-missing': {
          color: '#f87171',
          borderBottomColor: '#f87171',
        },
        '.cm-wikilink-missing:hover': {
          color: '#fca5a5',
        },
        // Tags
        '.cm-tag-pill': {
          display: 'inline-block',
          backgroundColor: '#3f3f46',
          color: '#a78bfa',
          padding: '1px 8px',
          borderRadius: '12px',
          fontSize: '0.85em',
          cursor: 'pointer',
        },
        '.cm-tag-pill:hover': {
          backgroundColor: '#52525b',
        },
        // Embeds
        '.cm-embed': {
          margin: '12px 0',
          border: '1px solid #3f3f46',
          borderRadius: '6px',
          backgroundColor: '#18181b',
          overflow: 'hidden',
        },
        '.cm-embed-header': {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: '#27272a',
          borderBottom: '1px solid #3f3f46',
          cursor: 'pointer',
        },
        '.cm-embed-header:hover': {
          backgroundColor: '#3f3f46',
        },
        '.cm-embed-icon': {
          fontSize: '14px',
        },
        '.cm-embed-title': {
          color: '#a78bfa',
          fontSize: '0.9em',
        },
        '.cm-embed-body': {
          padding: '12px',
          color: '#d4d4d8',
          fontSize: '0.9em',
        },
        '.cm-embed-missing': {
          color: '#71717a',
          fontStyle: 'italic',
        },
        // Images
        '.cm-image-container': {
          margin: '12px 0',
        },
        '.cm-image': {
          maxWidth: '100%',
          borderRadius: '6px',
        },
        '.cm-image-error': {
          color: '#f87171',
          fontStyle: 'italic',
        },
        // Tasks
        '.cm-task-checkbox': {
          width: '16px',
          height: '16px',
          marginRight: '8px',
          cursor: 'pointer',
          accentColor: '#a78bfa',
        },
        // Math
        '.cm-math-inline': {
          display: 'inline',
        },
        '.cm-math-block': {
          display: 'block',
          textAlign: 'center',
          margin: '12px 0',
        },
        '.cm-math-fallback, .cm-math-error': {
          fontFamily: 'ui-monospace, monospace',
          color: '#f87171',
        },
        // Code blocks
        '.cm-codeblock': {
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: '6px',
          padding: '12px',
          margin: '12px 0',
          overflowX: 'auto',
        },
        '.cm-codeblock code': {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.9em',
          color: '#e4e4e7',
        },
        // Callouts
        '.cm-callout': {
          margin: '12px 0',
          borderRadius: '6px',
          borderLeft: '4px solid',
          overflow: 'hidden',
        },
        '.cm-callout-header': {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          cursor: 'pointer',
          fontWeight: '500',
        },
        '.cm-callout-icon': {
          fontSize: '16px',
        },
        '.cm-callout-fold': {
          marginLeft: 'auto',
          fontSize: '10px',
          opacity: '0.5',
        },
        '.cm-callout-body': {
          padding: '8px 12px',
        },
        // Callout types
        '.cm-callout-note': {
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
        },
        '.cm-callout-info': {
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
        },
        '.cm-callout-tip': {
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.1)',
        },
        '.cm-callout-warning': {
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
        },
        '.cm-callout-danger': {
          borderColor: '#f87171',
          backgroundColor: 'rgba(248, 113, 113, 0.1)',
        },
        '.cm-callout-example': {
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167, 139, 250, 0.1)',
        },
        '.cm-callout-quote': {
          borderColor: '#71717a',
          backgroundColor: 'rgba(113, 113, 122, 0.1)',
        },
        '.cm-callout-bug': {
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
        },
        '.cm-callout-success': {
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
        },
        '.cm-callout-failure': {
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
        },
        '.cm-callout-question': {
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167, 139, 250, 0.1)',
        },
        '.cm-callout-important': {
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
        },
        '.cm-callout-caution': {
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
        },
        // Mermaid
        '.cm-mermaid': {
          display: 'flex',
          justifyContent: 'center',
          margin: '12px 0',
        },
        '.cm-mermaid-error': {
          color: '#f87171',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.9em',
        },
      }),
    ];

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update document content when content prop changes (external updates)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: content,
        },
      });
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: '#18181b',
      }}
    >
      {/* Wikilink Search Popup */}
      {wikilinkSearch && (
        <div
          style={{
            position: 'fixed',
            top: wikilinkSearch.position.top,
            left: wikilinkSearch.position.left,
            zIndex: 1000,
            minWidth: '280px',
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '2px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
          }}
          onKeyDown={handleWikilinkKeyDown}
        >
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              borderBottom: '1px solid #3f3f46',
            }}
          >
            <input
              type="text"
              value={wikilinkSearch.query}
              onChange={(e) => {
                setWikilinkSearch((prev) => prev ? { ...prev, query: e.target.value } : null);
                performSearch(e.target.value);
              }}
              placeholder="Search notes..."
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e4e4e7',
                fontSize: '13px',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
              autoFocus
            />
            <span style={{ color: '#71717a', fontSize: '11px' }}>Esc</span>
          </div>

          {/* Results */}
          {searchResults.length > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {searchResults.map((result, index) => (
                <div
                  key={result.path}
                  onClick={() => selectWikilink(result.name)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: index === selectedIndex ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                    borderLeft: index === selectedIndex ? '2px solid #a78bfa' : '2px solid transparent',
                    color: index === selectedIndex ? '#e4e4e7' : '#a1a1aa',
                    fontSize: '12px',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {result.name}
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {wikilinkSearch.query && searchResults.length === 0 && (
            <div
              style={{
                padding: '16px 12px',
                textAlign: 'center',
                color: '#71717a',
                fontSize: '12px',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              No notes found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
