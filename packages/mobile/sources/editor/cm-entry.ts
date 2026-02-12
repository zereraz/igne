/**
 * CodeMirror 6 entry point for the mobile WebView editor.
 *
 * Imports the same extensions as the desktop editor and exposes
 * a message-passing bridge for React Native WebView communication.
 */

import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches } from '@codemirror/search';
import { createMarkdownLanguage } from '../../../../src/extensions/markdownLanguage';
import { createLivePreview } from '../../../../src/extensions/livePreview';

// Current theme state
let currentTheme: 'dark' | 'light' = 'dark';
let editor: EditorView | null = null;

// CSS variable definitions for dark/light themes (mirrors obsidian.css)
const themes = {
  dark: {
    '--background-primary': '#1e1e2e',
    '--background-secondary': '#181825',
    '--background-modifier-border': '#45475a',
    '--background-modifier-hover': '#313244',
    '--background-tertiary': '#313244',
    '--text-normal': '#cdd6f4',
    '--text-muted': '#a6adc8',
    '--text-faint': '#6c7086',
    '--color-accent': '#89b4fa',
    '--color-accent-rgb': '137, 180, 250',
    '--color-accent-1': '#b4d0fb',
    '--color-red': '#f38ba8',
    '--color-red-rgb': '243, 139, 168',
    '--color-red-1': '#f5a3b8',
    '--color-green': '#a6e3a1',
    '--color-green-rgb': '166, 227, 161',
    '--color-yellow': '#f9e2af',
    '--color-yellow-rgb': '249, 226, 175',
    '--color-blue': '#89b4fa',
    '--color-blue-rgb': '137, 180, 250',
    '--color-orange': '#fab387',
    '--color-orange-rgb': '250, 179, 135',
    '--text-highlight-bg': 'rgba(249, 226, 175, 0.2)',
    '--code-background': '#313244',
  },
  light: {
    '--background-primary': '#ffffff',
    '--background-secondary': '#f5f5f5',
    '--background-modifier-border': '#e6e6e6',
    '--background-modifier-hover': '#f0f0f0',
    '--background-tertiary': '#ebebeb',
    '--text-normal': '#1e1e2e',
    '--text-muted': '#5c5f77',
    '--text-faint': '#9399b2',
    '--color-accent': '#1e66f5',
    '--color-accent-rgb': '30, 102, 245',
    '--color-accent-1': '#0052d9',
    '--color-red': '#d20f39',
    '--color-red-rgb': '210, 15, 57',
    '--color-red-1': '#b80d33',
    '--color-green': '#40a02b',
    '--color-green-rgb': '64, 160, 43',
    '--color-yellow': '#df8e1d',
    '--color-yellow-rgb': '223, 142, 29',
    '--color-blue': '#1e66f5',
    '--color-blue-rgb': '30, 102, 245',
    '--color-orange': '#fe640b',
    '--color-orange-rgb': '254, 100, 11',
    '--text-highlight-bg': 'rgba(223, 142, 29, 0.2)',
    '--code-background': '#f5f5f5',
  },
} as const;

function applyTheme(theme: 'dark' | 'light') {
  currentTheme = theme;
  const vars = themes[theme];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  document.body.style.backgroundColor = vars['--background-primary'];
  document.body.style.color = vars['--text-normal'];
}

function createEditor(content: string) {
  const container = document.getElementById('editor');
  if (!container) return;

  // Clear any existing editor
  if (editor) {
    editor.destroy();
    editor = null;
  }

  const baseTheme = EditorView.theme({
    '&': {
      backgroundColor: 'var(--background-primary)',
      color: 'var(--text-normal)',
      height: '100%',
      fontSize: '16px',
      lineHeight: '1.6',
    },
    '.cm-content': {
      caretColor: 'var(--color-accent)',
      padding: '16px',
      fontFamily: '-apple-system, system-ui, sans-serif',
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
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: '-apple-system, system-ui, sans-serif',
    },
    '.cm-line': { padding: '0' },
    '.cm-placeholder': { color: 'var(--text-faint)' },
    // Headings
    '.cm-heading-1': { fontSize: '1.8em', fontWeight: 'bold', lineHeight: '1.2', marginTop: '0.5em', marginBottom: '0.25em' },
    '.cm-heading-2': { fontSize: '1.4em', fontWeight: 'bold', lineHeight: '1.3', marginTop: '0.5em', marginBottom: '0.25em' },
    '.cm-heading-3': { fontSize: '1.2em', fontWeight: 'bold', lineHeight: '1.4', marginTop: '0.5em', marginBottom: '0.25em' },
    '.cm-heading-4': { fontSize: '1.1em', fontWeight: 'bold', lineHeight: '1.4', marginTop: '0.5em', marginBottom: '0.25em' },
    '.cm-heading-5': { fontSize: '1em', fontWeight: 'bold', lineHeight: '1.4' },
    '.cm-heading-6': { fontSize: '0.9em', fontWeight: 'bold', lineHeight: '1.4' },
    // Formatting
    '.cm-strong': { fontWeight: 'bold' },
    '.cm-em': { fontStyle: 'italic' },
    '.cm-inline-code': {
      backgroundColor: 'var(--code-background)',
      color: 'var(--color-accent)',
      padding: '0.125rem 0.25rem',
      borderRadius: '0.25rem',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
      fontSize: '0.9em',
    },
    '.cm-strike, .cm-strikethrough': { textDecoration: 'line-through', color: 'var(--text-faint)' },
    '.cm-highlight': { backgroundColor: 'var(--text-highlight-bg)', padding: '0 2px', borderRadius: '2px' },
    '.cm-blockquote': {
      borderLeft: '3px solid var(--background-modifier-border)',
      paddingLeft: '0.75rem',
      color: 'var(--text-muted)',
      fontStyle: 'italic',
    },
    '.cm-list': { paddingLeft: '0.5rem' },
    // Wikilinks
    '.cm-wikilink': {
      color: 'var(--color-accent)',
      cursor: 'pointer',
      textDecoration: 'none',
      borderBottom: '1px dashed var(--color-accent)',
    },
    '.cm-wikilink-missing': { color: 'var(--color-red)', borderBottomColor: 'var(--color-red)' },
    // Tags
    '.cm-tag-pill': {
      display: 'inline-block',
      backgroundColor: 'var(--background-modifier-hover)',
      color: 'var(--color-accent)',
      padding: '1px 8px',
      borderRadius: '12px',
      fontSize: '0.85em',
    },
    // Tasks
    '.cm-task-checkbox': {
      width: '18px',
      height: '18px',
      marginRight: '8px',
      accentColor: 'var(--color-accent)',
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
    // Callouts
    '.cm-callout': { margin: '12px 0', borderRadius: '6px', borderLeft: '4px solid', overflow: 'hidden' },
    '.cm-callout-header': { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontWeight: '500' },
    '.cm-callout-icon': { fontSize: '16px' },
    '.cm-callout-fold': { marginLeft: 'auto', fontSize: '10px', opacity: '0.5' },
    '.cm-callout-body': { padding: '8px 12px' },
    '.cm-callout-note, .cm-callout-info': { borderColor: 'var(--color-blue)', backgroundColor: 'rgba(var(--color-blue-rgb), 0.1)' },
    '.cm-callout-tip, .cm-callout-success': { borderColor: 'var(--color-green)', backgroundColor: 'rgba(var(--color-green-rgb), 0.1)' },
    '.cm-callout-warning, .cm-callout-important, .cm-callout-caution': { borderColor: 'var(--color-yellow)', backgroundColor: 'rgba(var(--color-yellow-rgb), 0.1)' },
    '.cm-callout-danger, .cm-callout-bug, .cm-callout-failure': { borderColor: 'var(--color-red)', backgroundColor: 'rgba(var(--color-red-rgb), 0.1)' },
    '.cm-callout-example, .cm-callout-question': { borderColor: 'var(--color-accent)', backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)' },
    '.cm-callout-quote': { borderColor: 'var(--text-faint)', backgroundColor: 'var(--background-modifier-hover)' },
    // Embeds
    '.cm-embed': { margin: '12px 0', border: '1px solid var(--background-modifier-border)', borderRadius: '6px', overflow: 'hidden' },
    '.cm-embed-header': { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--background-secondary)', borderBottom: '1px solid var(--background-modifier-border)' },
    '.cm-embed-title': { color: 'var(--color-accent)', fontSize: '0.9em' },
    '.cm-embed-body': { padding: '12px', color: 'var(--text-normal)', fontSize: '0.9em' },
    '.cm-embed-missing': { color: 'var(--text-faint)', fontStyle: 'italic' },
    // Images
    '.cm-image-container': { margin: '12px 0' },
    '.cm-image': { maxWidth: '100%', borderRadius: '6px' },
    '.cm-image-error': { color: 'var(--color-red)', fontStyle: 'italic' },
    // Math
    '.cm-math-inline': { display: 'inline' },
    '.cm-math-block': { display: 'block', textAlign: 'center', margin: '12px 0' },
    '.cm-math-fallback, .cm-math-error': { fontFamily: 'ui-monospace, monospace', color: 'var(--color-red)' },
    // Mermaid
    '.cm-mermaid': { display: 'flex', justifyContent: 'center', margin: '12px 0' },
    '.cm-mermaid-error': { color: 'var(--color-red)', fontFamily: 'ui-monospace, monospace', fontSize: '0.9em' },
  }, { dark: false });

  const extensions = [
    baseTheme,
    EditorView.lineWrapping,
    history(),
    highlightSelectionMatches(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    createMarkdownLanguage(),
    createLivePreview({
      onWikilinkClick: (target: string) => {
        // Send wikilink click to React Native
        postMessage({ type: 'wikilinkClick', target });
      },
      resolveWikilink: (_target: string) => {
        // For now, all wikilinks are treated as potentially existing
        // The RN side handles navigation
        return { exists: true };
      },
      resolveImage: (src: string) => {
        // Images need to be resolved by the RN side
        // For now return as-is; RN will send resolved URLs
        return src;
      },
    }),
    placeholder('Start writing...'),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        postMessage({
          type: 'contentChange',
          content: update.state.doc.toString(),
        });
      }
    }),
  ];

  const state = EditorState.create({
    doc: content,
    extensions,
  });

  editor = new EditorView({
    state,
    parent: container,
  });
}

// Post message to React Native
function postMessage(msg: Record<string, unknown>) {
  try {
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  } catch {
    // Ignore
  }
}

// Listen for messages from React Native
window.addEventListener('message', (e) => {
  try {
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

    switch (msg.type) {
      case 'setContent': {
        if (!editor) {
          // First time: create editor with content
          if (msg.theme) applyTheme(msg.theme);
          createEditor(msg.content || '');
        } else {
          // Update existing editor content
          const currentDoc = editor.state.doc.toString();
          if (currentDoc !== msg.content) {
            editor.dispatch({
              changes: {
                from: 0,
                to: currentDoc.length,
                insert: msg.content || '',
              },
            });
          }
        }
        break;
      }
      case 'setTheme': {
        if (msg.theme === 'dark' || msg.theme === 'light') {
          applyTheme(msg.theme);
        }
        break;
      }
      case 'focus': {
        editor?.focus();
        break;
      }
    }
  } catch {
    // Ignore parse errors
  }
});

// Also handle document.addEventListener for iOS WebView
document.addEventListener('message', ((e: any) => {
  try {
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    window.dispatchEvent(new MessageEvent('message', { data: e.data }));
  } catch {
    // Ignore
  }
}) as EventListener);

// Signal ready
postMessage({ type: 'ready' });

// Apply initial dark theme
applyTheme('dark');
