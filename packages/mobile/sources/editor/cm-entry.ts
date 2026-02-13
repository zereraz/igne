/**
 * CodeMirror 6 entry point for the mobile WebView editor.
 *
 * Uses vanilla @codemirror/lang-markdown for mobile — the desktop
 * livePreview/markdownLanguage extensions depend on Tauri, katex,
 * mermaid etc. which don't work in a WebView context.
 */

import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches } from '@codemirror/search';
import { markdown } from '@codemirror/lang-markdown';

let editor: EditorView | null = null;

const themes = {
  dark: {
    '--background-primary': '#1e1e2e',
    '--background-secondary': '#181825',
    '--background-modifier-border': '#45475a',
    '--background-modifier-hover': '#313244',
    '--text-normal': '#cdd6f4',
    '--text-muted': '#a6adc8',
    '--text-faint': '#6c7086',
    '--color-accent': '#89b4fa',
    '--color-accent-rgb': '137, 180, 250',
    '--code-background': '#313244',
  },
  light: {
    '--background-primary': '#ffffff',
    '--background-secondary': '#f5f5f5',
    '--background-modifier-border': '#e6e6e6',
    '--background-modifier-hover': '#f0f0f0',
    '--text-normal': '#1e1e2e',
    '--text-muted': '#5c5f77',
    '--text-faint': '#9399b2',
    '--color-accent': '#1e66f5',
    '--color-accent-rgb': '30, 102, 245',
    '--code-background': '#f5f5f5',
  },
} as const;

function applyTheme(theme: 'dark' | 'light') {
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
    '.cm-heading-1': { fontSize: '1.8em', fontWeight: 'bold', lineHeight: '1.2', marginTop: '0.5em', marginBottom: '0.25em' },
    '.cm-heading-2': { fontSize: '1.4em', fontWeight: 'bold', lineHeight: '1.3', marginTop: '0.5em', marginBottom: '0.25em' },
    '.cm-heading-3': { fontSize: '1.2em', fontWeight: 'bold', lineHeight: '1.4', marginTop: '0.5em', marginBottom: '0.25em' },
    '.cm-heading-4': { fontSize: '1.1em', fontWeight: 'bold', lineHeight: '1.4', marginTop: '0.5em', marginBottom: '0.25em' },
    '.cm-heading-5': { fontSize: '1em', fontWeight: 'bold', lineHeight: '1.4' },
    '.cm-heading-6': { fontSize: '0.9em', fontWeight: 'bold', lineHeight: '1.4' },
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
    '.cm-blockquote': {
      borderLeft: '3px solid var(--background-modifier-border)',
      paddingLeft: '0.75rem',
      color: 'var(--text-muted)',
      fontStyle: 'italic',
    },
  }, { dark: false });

  const extensions = [
    baseTheme,
    EditorView.lineWrapping,
    history(),
    highlightSelectionMatches(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown(),
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

  editor = new EditorView({
    state: EditorState.create({ doc: content, extensions }),
    parent: container,
  });
}

function postMessage(msg: Record<string, unknown>) {
  try {
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  } catch (_e) {
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
          if (msg.theme) applyTheme(msg.theme);
          createEditor(msg.content || '');
        } else {
          const currentDoc = editor.state.doc.toString();
          if (currentDoc !== msg.content) {
            editor.dispatch({
              changes: { from: 0, to: currentDoc.length, insert: msg.content || '' },
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
  } catch (_e) {
    // Ignore parse errors
  }
});

// iOS WebView uses document message event
document.addEventListener('message', ((e: any) => {
  try {
    window.dispatchEvent(new MessageEvent('message', { data: e.data }));
  } catch (_e) {
    // Ignore
  }
}) as EventListener);

// Initialize with baked-in content if available
const initTheme = (window as any).__INIT_THEME__ || 'dark';
applyTheme(initTheme);

const initContent = (window as any).__INIT_CONTENT__;
if (typeof initContent === 'string') {
  createEditor(initContent);
}

// Signal ready
function signalReady() {
  if ((window as any).ReactNativeWebView) {
    postMessage({ type: 'ready' });
  } else {
    setTimeout(signalReady, 50);
  }
}
signalReady();
