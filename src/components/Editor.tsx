import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, SearchQuery, setSearchQuery, findNext, findPrevious, search } from '@codemirror/search';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { searchWikilinks } from '../utils/wikilinkCompletion';
import { createLivePreview } from '../extensions/livePreview';
import { createMarkdownLanguage } from '../extensions/markdownLanguage';
import { searchStore } from '../stores/searchStore';
import { handleImagePaste, handleImageDrop } from '../utils/imageHandler';
import { extractHeadingContent, headingCache } from '../utils/headingFinder';
import { safeArrayIndex } from '../utils/clamp';
import { SearchReplacePanel, FindOptions } from './SearchReplacePanel';
import { complete } from '../services/aiService';
import { summarizePrompt, continuePrompt, fixPrompt, askPrompt } from '../services/aiPrompts';
import { globalSettingsStore } from '../stores/GlobalSettingsStore';
import type { WikilinkSearchResult, EditorChangeHandler, WikilinkClickHandler } from '../types';

interface WikilinkSearchState {
  position: { top: number; left: number };
  query: string;
}

interface SlashCommandState {
  position: { top: number; left: number };
  slashPos: number;
  phase: 'select' | 'input';
  selectedCommand?: SlashCommand;
}

interface SlashCommand {
  id: 'summarize' | 'continue' | 'fix' | 'ask';
  label: string;
  description: string;
  needsInput: boolean;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'summarize', label: '/summarize', description: 'Summarize this note', needsInput: false },
  { id: 'continue', label: '/continue', description: 'Continue writing', needsInput: false },
  { id: 'fix', label: '/fix', description: 'Fix selected text', needsInput: false },
  { id: 'ask', label: '/ask', description: 'Ask about this note', needsInput: true },
];

interface EditorProps {
  content: string;
  onChange: EditorChangeHandler;
  onWikilinkClick?: WikilinkClickHandler;
  onWikilinkCmdClick?: WikilinkClickHandler;
  onCursorPositionChange?: (line: number, column: number) => void;
  onScrollToPosition?: (position: number) => void;
  vaultPath?: string | null;
  currentFilePath?: string | null;
  scrollPosition?: number;
  refreshTrigger?: { current: number };
  lineWrapping?: boolean;
  readableLineLength?: boolean;
}

export function Editor({ content, onChange, onWikilinkClick, onWikilinkCmdClick, onCursorPositionChange, vaultPath, currentFilePath, scrollPosition, refreshTrigger, lineWrapping = true, readableLineLength = true }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onWikilinkClickRef = useRef(onWikilinkClick);
  const onWikilinkCmdClickRef = useRef(onWikilinkCmdClick);
  const currentFilePathRef = useRef(currentFilePath);
  const [wikilinkSearch, setWikilinkSearch] = useState<WikilinkSearchState | null>(null);
  const [searchResults, setSearchResults] = useState<WikilinkSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchResultCount, setSearchResultCount] = useState<number | undefined>();
  const [currentResultIndex, setCurrentResultIndex] = useState<number | undefined>();
  const scrollPositionRef = useRef<number>(0);

  // Slash command state
  const [slashCommand, setSlashCommand] = useState<SlashCommandState | null>(null);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [slashInput, setSlashInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const slashCommandRef = useRef<SlashCommandState | null>(null);
  slashCommandRef.current = slashCommand;

  // Keep refs updated
  onChangeRef.current = onChange;
  onWikilinkClickRef.current = onWikilinkClick;
  onWikilinkCmdClickRef.current = onWikilinkCmdClick;
  currentFilePathRef.current = currentFilePath;

  const closeSearchPanel = useCallback(() => {
    setShowSearchPanel(false);
    const view = viewRef.current;
    if (view) {
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
    }
    setSearchResultCount(undefined);
    setCurrentResultIndex(undefined);
  }, []);

  // Close search panel when switching tabs
  useEffect(() => {
    closeSearchPanel();
  }, [currentFilePath]);

  // Close search panel on Escape or click outside
  useEffect(() => {
    if (!showSearchPanel) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSearchPanel();
        viewRef.current?.focus();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-search-panel]')) {
        closeSearchPanel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchPanel, closeSearchPanel]);

  // Search when query changes
  const performSearch = useCallback((query: string) => {
    setSearchResults(searchWikilinks(query));
    setSelectedIndex(0);
  }, []);

  // Handle wikilink selection
  const selectWikilink = useCallback((name: string) => {
    const view = viewRef.current;
    if (!view || !wikilinkSearch) return;

    const docText = view.state.doc.toString();
    const cursorPos = view.state.selection.main.head;

    // After the keymap inserts []], the cursor is between the ]] characters
    // So beforeCursor ends with [[]] and afterCursor starts with ]]
    // We need to find the last [[ before cursor and first ]] after cursor

    // Find the last [[ before cursor
    const lastOpen = docText.lastIndexOf('[[', cursorPos);
    // Find the first ]] after cursor
    const firstClose = docText.indexOf(']]', cursorPos);

    if (lastOpen !== -1 && firstClose !== -1 && lastOpen < firstClose) {
      // Found [[...]] pattern with cursor inside
      const from = lastOpen;
      const to = firstClose + 2;
      view.dispatch({
        changes: { from, to, insert: `[[${name}]]` },
        selection: { anchor: from + name.length + 4 },
      });
      setWikilinkSearch(null);
      return;
    }

    // Fallback: search for [[]] pattern in the document
    const pattern = /\[\[\]\]/g;
    let match;
    while ((match = pattern.exec(docText)) !== null) {
      const matchPos = match.index;
      if (matchPos <= cursorPos && matchPos + 4 >= cursorPos) {
        view.dispatch({
          changes: { from: matchPos, to: matchPos + 4, insert: `[[${name}]]` },
          selection: { anchor: matchPos + name.length + 4 },
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
      const idx = safeArrayIndex(selectedIndex, searchResults.length);
      selectWikilink(searchResults[idx].name);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setWikilinkSearch(null);
    }
  }, [searchResults, selectedIndex, selectWikilink]);

  // Handle find in search panel - uses CodeMirror's search for highlighting
  const handleFind = useCallback((query: string, options: FindOptions) => {
    const view = viewRef.current;
    if (!view || !query.trim()) {
      // Clear search when query is empty
      if (view) {
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
      }
      setSearchResultCount(0);
      setCurrentResultIndex(undefined);
      return;
    }

    try {
      // Parse search operators for tag search
      let searchTerm = query;
      const tagMatch = query.match(/^tag:(.+)$/i);
      const hashTagMatch = query.match(/^#(.+)$/);

      if (tagMatch) {
        searchTerm = `#${tagMatch[1].trim()}`;
      } else if (hashTagMatch) {
        searchTerm = `#${hashTagMatch[1].trim()}`;
      }

      // Create CodeMirror search query - this highlights all matches
      const searchQuery = new SearchQuery({
        search: searchTerm,
        caseSensitive: options.caseSensitive,
        regexp: options.regex,
        wholeWord: options.wholeWord,
      });

      // Set the search query to highlight all matches
      view.dispatch({ effects: setSearchQuery.of(searchQuery) });

      // Count matches manually for display
      const doc = view.state.doc.toString();
      const flags = options.caseSensitive ? 'g' : 'gi';
      let pattern: RegExp;

      if (options.regex) {
        pattern = new RegExp(searchTerm, flags);
        // Safety check: test against a short string to catch catastrophic backtracking
        const testStart = performance.now();
        pattern.test('a'.repeat(25));
        if (performance.now() - testStart > 100) {
          throw new Error('Regex too slow — possible catastrophic backtracking');
        }
        pattern.lastIndex = 0;
      } else if (options.wholeWord) {
        pattern = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags);
      } else {
        pattern = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      }

      const matches: number[] = [];
      let match;
      const MAX_MATCHES = 10000;
      while ((match = pattern.exec(doc)) !== null) {
        matches.push(match.index);
        if (match[0].length === 0) pattern.lastIndex++; // prevent infinite loop on zero-width match
        if (matches.length >= MAX_MATCHES) break;
      }

      setSearchResultCount(matches.length);

      if (matches.length > 0) {
        // Always select the first match in the document on query change.
        // findNext/findPrevious handle relative navigation.
        const matchPos = matches[0];
        pattern.lastIndex = matchPos;
        const m = pattern.exec(doc);
        const matchLen = m ? m[0].length : searchTerm.length;
        view.dispatch({
          selection: { anchor: matchPos, head: matchPos + matchLen },
          scrollIntoView: true,
        });
        setCurrentResultIndex(1);
      } else {
        setCurrentResultIndex(undefined);
      }
    } catch (e) {
      console.error('Search error:', e);
      setSearchResultCount(0);
      setCurrentResultIndex(undefined);
    }
  }, []);

  // Navigate to next search match
  const handleFindNext = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    findNext(view);
    // Update current result index
    if (searchResultCount && searchResultCount > 0) {
      setCurrentResultIndex(prev => {
        if (prev === undefined) return 1;
        return prev >= searchResultCount ? 1 : prev + 1;
      });
    }
  }, [searchResultCount]);

  // Navigate to previous search match
  const handleFindPrevious = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    findPrevious(view);
    // Update current result index
    if (searchResultCount && searchResultCount > 0) {
      setCurrentResultIndex(prev => {
        if (prev === undefined) return searchResultCount;
        return prev <= 1 ? searchResultCount : prev - 1;
      });
    }
  }, [searchResultCount]);

  // Handle replace in search panel
  const handleReplace = useCallback((query: string, replacement: string, options: FindOptions) => {
    const view = viewRef.current;
    if (!view || !query.trim()) return;

    try {
      const selection = view.state.selection.main;
      const selectedText = view.state.doc.sliceString(selection.from, selection.to);

      // Create search pattern
      let searchPattern = query;
      if (options.wholeWord) {
        searchPattern = `\\b${query}\\b`;
      }

      const flags = options.caseSensitive ? '' : 'i';
      const pattern = options.regex
        ? new RegExp(searchPattern, flags)
        : new RegExp(searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      // Replace if selection matches
      if (pattern.test(selectedText)) {
        view.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: replacement,
          },
        });
      }
    } catch (e) {
      console.error('Replace error:', e);
    }
  }, []);

  // Handle replace all
  const handleReplaceAll = useCallback((query: string, replacement: string, options: FindOptions) => {
    const view = viewRef.current;
    if (!view || !query.trim()) return;

    try {
      const doc = view.state.doc.toString();

      // Create search pattern
      let searchPattern = query;
      if (options.wholeWord) {
        searchPattern = `\\b${query}\\b`;
      }

      const flags = options.caseSensitive ? 'g' : 'gi';
      const pattern = options.regex
        ? new RegExp(searchPattern, flags)
        : new RegExp(searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      let match;
      const changes: { from: number; to: number; insert: string }[] = [];
      const MAX_MATCHES = 10000;

      // Find all matches and create replacement changes
      pattern.lastIndex = 0;
      while ((match = pattern.exec(doc)) !== null) {
        changes.push({
          from: match.index,
          to: match.index + match[0].length,
          insert: replacement,
        });
        if (match[0].length === 0) pattern.lastIndex++;
        if (changes.length >= MAX_MATCHES) break;
      }

      if (changes.length > 0) {
        view.dispatch({
          changes,
        });
      }
    } catch (e) {
      console.error('Replace all error:', e);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Theme-aware base theme using CSS variables
    const baseTheme = EditorView.theme({
      '&': {
        backgroundColor: 'var(--background-primary)',
        color: 'var(--text-normal)',
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-content': {
        caretColor: 'var(--color-accent)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--color-accent)',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'rgba(var(--color-accent-rgb), 0.3)',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--background-modifier-hover)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--background-primary)',
        color: 'var(--text-faint)',
        border: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--background-secondary)',
        color: 'var(--text-muted)',
        border: 'none',
      },
      '.cm-tooltip': {
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
      },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: 'var(--background-modifier-hover)',
      },
      // Search highlighting
      '.cm-searchMatch': {
        backgroundColor: 'rgba(var(--color-yellow-rgb), 0.3)',
        outline: '1px solid rgba(var(--color-yellow-rgb), 0.5)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(var(--color-yellow-rgb), 0.5)',
      },
      // Hide built-in CM search panel — we use our own React panel
      '.cm-search.cm-panel': {
        display: 'none',
      },
    }, { dark: false }); // We handle dark/light via CSS variables

    const extensions = [
      baseTheme,
      // Line wrapping - wrap long lines to fit the editor width
      ...(lineWrapping ? [EditorView.lineWrapping] : []),
      history(),
      search({
        top: true,
        // Suppress built-in search panel — we use our own React SearchReplacePanel
        createPanel: () => ({ dom: document.createElement('span'), top: true }),
      }),
      highlightSelectionMatches(), // Highlight all matches when text is selected
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        {
          key: 'Mod-f',
          run: () => {
            setShowSearchPanel(true);
            return true;
          },
        },
      ]),
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
      // Slash command trigger: "/" at empty line start
      keymap.of([
        {
          key: '/',
          run: (view) => {
            const pos = view.state.selection.main.head;
            const line = view.state.doc.lineAt(pos);
            const textBefore = line.text.slice(0, pos - line.from);

            // Only trigger on empty line (or whitespace-only before cursor)
            if (textBefore.trim() !== '') return false;

            // Check if AI server is configured
            const settings = globalSettingsStore.getSettings();
            if (!settings.aiServerUrl) return false;

            // Insert the "/" and show popup
            view.dispatch({
              changes: { from: pos, to: pos, insert: '/' },
              selection: { anchor: pos + 1 },
            });

            const coords = view.coordsAtPos(pos + 1);
            if (coords) {
              setSlashCommand({
                position: { top: coords.bottom + 4, left: coords.left },
                slashPos: line.from,
                phase: 'select',
              });
              setSlashFilter('');
              setSlashSelectedIndex(0);
            }
            return true;
          },
        },
      ]),
      createLivePreview({
        onWikilinkClick: (target: string) => onWikilinkClickRef.current?.(target),
        onWikilinkCmdClick: (target: string) => onWikilinkCmdClickRef.current?.(target),
        resolveWikilink: (target: string) => {
          const exists = searchStore.noteExists(target);
          return exists ? { exists: true } : { exists: false };
        },
        resolveImage: (src: string) => {
          // Convert vault-relative path to Tauri asset URL
          if (!vaultPath) return src;
          // If already a URL, return as-is
          if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('asset://')) {
            return src;
          }
          // Build full path and convert to Tauri asset URL
          const fullPath = `${vaultPath}/${src}`;
          return convertFileSrc(fullPath);
        },
        resolveHeading: (note: string, heading: string) => {
          const filePath = searchStore.getFilePathByName(note);
          if (!filePath) {
            return { exists: false };
          }

          // Check cache first
          const cached = headingCache.getHeadingContent(filePath, heading);
          if (cached) {
            return {
              exists: true,
              content: cached.content,
              headingLevel: cached.headingLevel,
            };
          }

          // Return not found (will be updated by background refresh)
          return { exists: false };
        },
        refreshTrigger,
      }),
      placeholder('Start writing...'),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          onChangeRef.current(currentFilePathRef.current || '', newContent);

          // Track slash command filter
          if (slashCommandRef.current?.phase === 'select') {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            if (line.text.startsWith('/')) {
              setSlashFilter(line.text.slice(1));
              setSlashSelectedIndex(0);
            } else {
              setSlashCommand(null);
            }
          }
        }
        if (update.selectionSet) {
          const cursorPos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(cursorPos);
          const column = cursorPos - line.from + 1; // 1-indexed column
          onCursorPositionChange?.(line.number, column);
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: 'var(--font-text-size, 15px)',
          lineHeight: '1.6',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'var(--font-text-theme, var(--font-default, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif))',
          backgroundColor: 'var(--background-primary)',
        },
        '.cm-content': {
          maxWidth: 'var(--readable-line-length, none)',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: '2rem 2rem',
        },
        '.cm-line': {
          padding: '0',
        },
        '.cm-placeholder': {
          color: 'var(--text-faint)',
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
          backgroundColor: 'var(--code-background)',
          color: 'var(--color-accent)',
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
          borderLeft: '3px solid var(--background-modifier-border)',
          paddingLeft: '0.75rem',
          marginLeft: '0',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        },
        // Lists
        '.cm-list': {
          paddingLeft: '0.5rem',
        },
        // Tooltip styles
        '.cm-tooltip': {
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '0.25rem',
        },
        '.cm-tooltip-autocomplete': {
          maxWidth: '300px',
        },
        '.cm-tooltip-autocomplete ul': {
          maxHeight: '200px',
        },
        '.cm-tooltip-autocomplete ul li': {
          color: 'var(--text-muted)',
          padding: '0.25rem 0.5rem',
        },
        '.cm-tooltip-autocomplete ul li[aria-selected]': {
          backgroundColor: 'var(--background-modifier-hover)',
          color: 'var(--text-normal)',
        },
        // Strikethrough
        '.cm-strikethrough': {
          textDecoration: 'line-through',
          color: 'var(--text-faint)',
        },
        // Highlight
        '.cm-highlight': {
          backgroundColor: 'var(--text-highlight-bg)',
          padding: '0 2px',
          borderRadius: '2px',
        },
        // Wikilinks
        '.cm-wikilink': {
          color: 'var(--color-accent)',
          cursor: 'pointer',
          textDecoration: 'none',
          borderBottom: '1px dashed var(--color-accent)',
        },
        '.cm-wikilink:hover': {
          color: 'var(--color-accent-1)',
          borderBottomStyle: 'solid',
        },
        '.cm-wikilink-missing': {
          color: 'var(--color-red)',
          borderBottomColor: 'var(--color-red)',
        },
        '.cm-wikilink-missing:hover': {
          color: 'var(--color-red-1)',
        },
        // Tags
        '.cm-tag-pill': {
          display: 'inline-block',
          backgroundColor: 'var(--background-modifier-hover)',
          color: 'var(--color-accent)',
          padding: '1px 8px',
          borderRadius: '12px',
          fontSize: '0.85em',
          cursor: 'pointer',
        },
        '.cm-tag-pill:hover': {
          backgroundColor: 'var(--background-tertiary)',
        },
        // Embeds
        '.cm-embed': {
          margin: '12px 0',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '6px',
          backgroundColor: 'var(--background-primary)',
          overflow: 'hidden',
        },
        '.cm-embed-header': {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--background-secondary)',
          borderBottom: '1px solid var(--background-modifier-border)',
          cursor: 'pointer',
        },
        '.cm-embed-header:hover': {
          backgroundColor: 'var(--background-modifier-hover)',
        },
        '.cm-embed-icon': {
          fontSize: '14px',
        },
        '.cm-embed-title': {
          color: 'var(--color-accent)',
          fontSize: '0.9em',
        },
        '.cm-embed-body': {
          padding: '12px',
          color: 'var(--text-normal)',
          fontSize: '0.9em',
        },
        '.cm-embed-missing': {
          color: 'var(--text-faint)',
          fontStyle: 'italic',
        },
        // Heading embeds
        '.cm-heading-embed': {
          margin: '12px 0',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '6px',
          backgroundColor: 'var(--background-primary)',
          overflow: 'hidden',
        },
        '.cm-heading-embed-body': {
          padding: '12px',
          color: 'var(--text-normal)',
          fontSize: '0.9em',
        },
        '.cm-heading-embed-content': {
          marginTop: '8px',
          lineHeight: '1.6',
        },
        '.cm-heading-embed-content .cm-heading': {
          marginTop: '0.5em',
          marginBottom: '0.25em',
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
          color: 'var(--color-red)',
          fontStyle: 'italic',
        },
        // Tasks
        '.cm-task-checkbox': {
          width: '16px',
          height: '16px',
          marginRight: '8px',
          cursor: 'pointer',
          accentColor: 'var(--color-accent)',
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
          color: 'var(--color-red)',
        },
        // Code blocks
        '.cm-codeblock': {
          backgroundColor: 'var(--code-background)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '6px',
          padding: '12px',
          margin: '12px 0',
          overflowX: 'auto',
        },
        '.cm-codeblock code': {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.9em',
          color: 'var(--text-normal)',
        },
        // Callouts - keep semantic colors for these
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
        // Callout types (keep semantic colors)
        '.cm-callout-note': {
          borderColor: 'var(--color-blue)',
          backgroundColor: 'rgba(var(--color-blue-rgb), 0.1)',
        },
        '.cm-callout-info': {
          borderColor: 'var(--color-blue)',
          backgroundColor: 'rgba(var(--color-blue-rgb), 0.1)',
        },
        '.cm-callout-tip': {
          borderColor: 'var(--color-green)',
          backgroundColor: 'rgba(var(--color-green-rgb), 0.1)',
        },
        '.cm-callout-warning': {
          borderColor: 'var(--color-yellow)',
          backgroundColor: 'rgba(var(--color-yellow-rgb), 0.1)',
        },
        '.cm-callout-danger': {
          borderColor: 'var(--color-red)',
          backgroundColor: 'rgba(var(--color-red-rgb), 0.1)',
        },
        '.cm-callout-example': {
          borderColor: 'var(--color-accent)',
          backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)',
        },
        '.cm-callout-quote': {
          borderColor: 'var(--text-faint)',
          backgroundColor: 'var(--background-modifier-hover)',
        },
        '.cm-callout-bug': {
          borderColor: 'var(--color-red)',
          backgroundColor: 'rgba(var(--color-red-rgb), 0.1)',
        },
        '.cm-callout-success': {
          borderColor: 'var(--color-green)',
          backgroundColor: 'rgba(var(--color-green-rgb), 0.1)',
        },
        '.cm-callout-failure': {
          borderColor: 'var(--color-red)',
          backgroundColor: 'rgba(var(--color-red-rgb), 0.1)',
        },
        '.cm-callout-question': {
          borderColor: 'var(--color-accent)',
          backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)',
        },
        '.cm-callout-important': {
          borderColor: 'var(--color-yellow)',
          backgroundColor: 'rgba(var(--color-yellow-rgb), 0.1)',
        },
        '.cm-callout-caution': {
          borderColor: 'var(--color-orange)',
          backgroundColor: 'rgba(var(--color-orange-rgb), 0.1)',
        },
        // Mermaid
        '.cm-mermaid': {
          display: 'flex',
          justifyContent: 'center',
          margin: '12px 0',
        },
        '.cm-mermaid-error': {
          color: 'var(--color-red)',
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

    // Expose view on DOM element for E2E testing
    if (view.dom) {
      (view.dom as any).__editorView = view;
    }

    // Auto-focus the editor
    view.focus();

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
      // Focus editor when switching to new/empty file
      if (content === '') {
        view.focus();
      }
    }
  }, [content]);

  // Handle scroll to position
  useEffect(() => {
    if (scrollPosition !== undefined && scrollPosition !== scrollPositionRef.current) {
      const view = viewRef.current;
      if (!view) return;

      scrollPositionRef.current = scrollPosition;

      // Validate position is within document bounds
      const docLength = view.state.doc.length;
      const validPosition = Math.min(Math.max(0, scrollPosition), docLength);

      // Scroll to the position, centering it vertically
      view.dispatch({
        selection: { anchor: validPosition, head: validPosition },
        effects: EditorView.scrollIntoView(validPosition, { y: 'center' }),
      });
    }
  }, [scrollPosition]);

  // Pre-fetch heading content for all ![[Note#Heading]] references
  useEffect(() => {
    if (!content) return;

    const fetchHeadingContent = async () => {
      // Find all heading transclusions: ![[Note#Heading]]
      const headingRefRegex = /!\[\[([^#\]]+)#([^\]]+)\]\]/g;
      const matches = [...content.matchAll(headingRefRegex)];

      for (const match of matches) {
        const note = match[1].trim();
        const heading = match[2].trim();

        const filePath = searchStore.getFilePathByName(note);
        if (!filePath) continue;

        // Check if already cached
        const cached = headingCache.getHeadingContent(filePath, heading);
        if (cached) continue;

        try {
          const noteContent = await invoke<string>('read_file', { path: filePath });
          const result = extractHeadingContent(noteContent, heading);

          if (result) {
            headingCache.setHeadingContent(filePath, heading, {
              content: result.content,
              headingLevel: result.heading.level,
            });
          } else {
            headingCache.setHeadingContent(filePath, heading, null);
          }

          // Trigger re-render to show updated content
          if (refreshTrigger) {
            refreshTrigger.current++;
          }
        } catch {
          headingCache.setHeadingContent(filePath, heading, null);
        }
      }
    };

    fetchHeadingContent();
  }, [content, refreshTrigger]);

  // Execute a slash command
  const executeSlashCommand = useCallback(async (command: SlashCommand, askQuestion?: string) => {
    const view = viewRef.current;
    if (!view) return;

    const settings = globalSettingsStore.getSettings();
    if (!settings.aiServerUrl) {
      setSlashCommand(null);
      return;
    }

    setAiGenerating(true);
    setSlashCommand(null);

    const doc = view.state.doc.toString();
    const sel = view.state.sliceDoc(
      view.state.selection.main.from,
      view.state.selection.main.to
    );

    let messages;
    switch (command.id) {
      case 'summarize': messages = summarizePrompt(doc); break;
      case 'continue': messages = continuePrompt(doc); break;
      case 'fix': messages = fixPrompt(sel || doc); break;
      case 'ask': messages = askPrompt(doc, askQuestion || ''); break;
    }

    try {
      const result = await complete(settings.aiServerUrl, settings.aiProvider, settings.aiModel, messages);

      if (command.id === 'fix' && view.state.selection.main.from !== view.state.selection.main.to) {
        // /fix with selection: replace selected text
        const { from, to } = view.state.selection.main;
        view.dispatch({ changes: { from, to, insert: result } });
      } else {
        // Replace the "/" line
        const pos = view.state.selection.main.head;
        const line = view.state.doc.lineAt(pos);
        view.dispatch({ changes: { from: line.from, to: line.to, insert: result } });
      }
    } catch (err: any) {
      console.error('[ai] Error:', err.message);
    } finally {
      setAiGenerating(false);
    }
  }, []);

  // Keyboard handler for slash command popup (capture phase to beat CM6)
  useEffect(() => {
    if (!slashCommand) return;

    const handler = (e: KeyboardEvent) => {
      if (slashCommand.phase === 'select') {
        const filtered = SLASH_COMMANDS.filter(c => c.label.includes('/' + slashFilter));
        if (e.key === 'ArrowDown') {
          e.preventDefault(); e.stopPropagation();
          setSlashSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault(); e.stopPropagation();
          setSlashSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filtered.length > 0) {
          e.preventDefault(); e.stopPropagation();
          const cmd = filtered[slashSelectedIndex] || filtered[0];
          if (cmd.needsInput) {
            setSlashCommand(prev => prev ? { ...prev, phase: 'input', selectedCommand: cmd } : null);
            setSlashInput('');
          } else {
            executeSlashCommand(cmd);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation();
          setSlashCommand(null);
        }
      } else if (slashCommand.phase === 'input') {
        if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation();
          setSlashCommand(null);
        }
        // Enter for input is handled by the React input's onKeyDown
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-slash-popup]')) {
        setSlashCommand(null);
      }
    };

    window.addEventListener('keydown', handler, true);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handler, true);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [slashCommand, slashFilter, slashSelectedIndex, executeSlashCommand]);

  // Handle image paste and drop
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !vaultPath || !currentFilePath) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const handled = await handleImagePaste(e.clipboardData, {
        vaultPath,
        currentFilePath,
        onInsert: (markdown) => {
          const view = viewRef.current;
          if (!view) return;

          const pos = view.state.selection.main.head;
          view.dispatch({
            changes: { from: pos, to: pos, insert: markdown },
          });
        },
      });

      if (handled) {
        e.preventDefault();
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const handled = await handleImageDrop(e.dataTransfer, {
        vaultPath,
        currentFilePath,
        onInsert: (markdown) => {
          const view = viewRef.current;
          if (!view) return;

          const pos = view.state.selection.main.head;
          view.dispatch({
            changes: { from: pos, to: pos, insert: markdown },
          });
        },
      });

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    container.addEventListener('paste', handlePaste as any);
    container.addEventListener('drop', handleDrop as any);
    container.addEventListener('dragover', handleDragOver as any);

    return () => {
      container.removeEventListener('paste', handlePaste as any);
      container.removeEventListener('drop', handleDrop as any);
      container.removeEventListener('dragover', handleDragOver as any);
    };
  }, [vaultPath, currentFilePath]);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--background-primary)',
        '--readable-line-length': readableLineLength ? '900px' : 'none',
      } as React.CSSProperties}
    >
      {/* Wikilink Search Popup */}
      {wikilinkSearch && (
        <div
          style={{
            position: 'fixed',
            top: wikilinkSearch.position.top + 300 > window.innerHeight
              ? Math.max(0, wikilinkSearch.position.top - 300)
              : wikilinkSearch.position.top,
            left: wikilinkSearch.position.left,
            zIndex: 1000,
            minWidth: '280px',
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)',
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
              borderBottom: '1px solid var(--background-modifier-border)',
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
                color: 'var(--text-normal)',
                fontSize: '13px',
                fontFamily: 'var(--font-interface)',
              }}
              autoFocus
            />
            <span style={{ color: 'var(--text-faint)', fontSize: '11px' }}>Esc</span>
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
                    backgroundColor: index === selectedIndex ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
                    borderLeft: index === selectedIndex ? '2px solid var(--color-accent)' : '2px solid transparent',
                    color: index === selectedIndex ? 'var(--text-normal)' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-interface)',
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
                color: 'var(--text-faint)',
                fontSize: '12px',
                fontFamily: 'var(--font-interface)',
              }}
            >
              No notes found
            </div>
          )}
        </div>
      )}

      {/* Slash Command Popup — select phase */}
      {slashCommand?.phase === 'select' && (() => {
        const filtered = SLASH_COMMANDS.filter(c => c.label.includes('/' + slashFilter));
        return (
          <div
            data-slash-popup
            style={{
              position: 'fixed',
              top: slashCommand.position.top + 200 > window.innerHeight
                ? Math.max(0, slashCommand.position.top - 200)
                : slashCommand.position.top,
              left: slashCommand.position.left,
              zIndex: 1000,
              minWidth: '220px',
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '2px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
          >
            {filtered.map((cmd, index) => (
              <div
                key={cmd.id}
                onClick={() => {
                  if (cmd.needsInput) {
                    setSlashCommand(prev => prev ? { ...prev, phase: 'input', selectedCommand: cmd } : null);
                    setSlashInput('');
                  } else {
                    executeSlashCommand(cmd);
                  }
                }}
                onMouseEnter={() => setSlashSelectedIndex(index)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === slashSelectedIndex ? 'rgba(var(--color-accent-rgb), 0.15)' : 'transparent',
                  borderLeft: index === slashSelectedIndex ? '2px solid var(--color-accent)' : '2px solid transparent',
                  color: index === slashSelectedIndex ? 'var(--text-normal)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-interface)',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{cmd.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>{cmd.description}</div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px', fontFamily: 'var(--font-interface)' }}>
                No matching commands
              </div>
            )}
          </div>
        );
      })()}

      {/* Slash Command Popup — input phase (/ask) */}
      {slashCommand?.phase === 'input' && (
        <div
          data-slash-popup
          style={{
            position: 'fixed',
            top: slashCommand.position.top + 100 > window.innerHeight
              ? Math.max(0, slashCommand.position.top - 100)
              : slashCommand.position.top,
            left: slashCommand.position.left,
            zIndex: 1000,
            minWidth: '280px',
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '2px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '6px', fontFamily: 'var(--font-interface)' }}>
              Ask about this note:
            </div>
            <input
              type="text"
              value={slashInput}
              onChange={e => setSlashInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && slashInput.trim()) {
                  e.preventDefault();
                  executeSlashCommand(slashCommand.selectedCommand!, slashInput.trim());
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setSlashCommand(null);
                }
              }}
              placeholder="Type your question..."
              autoFocus
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--background-modifier-border)',
                color: 'var(--text-normal)',
                fontSize: '13px',
                fontFamily: 'var(--font-interface)',
                padding: '6px 0',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* AI Loading Toast */}
      {aiGenerating && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          right: '20px',
          zIndex: 999,
          padding: '8px 16px',
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-interface)',
        }}>
          AI generating...
        </div>
      )}

      {/* Search and Replace Panel */}
      {showSearchPanel && (
        <SearchReplacePanel
          onFind={handleFind}
          onFindNext={handleFindNext}
          onFindPrevious={handleFindPrevious}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
          onClose={closeSearchPanel}
          resultCount={searchResultCount}
          currentResult={currentResultIndex}
        />
      )}
    </div>
  );
}
