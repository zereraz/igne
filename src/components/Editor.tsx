import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { wikilinkAutocompletion } from '../utils/wikilinkCompletion';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function Editor({ content, onChange }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref updated
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      oneDark,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({ codeLanguages: languages }),
      wikilinkAutocompletion(),
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
          fontSize: '14px',
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
    />
  );
}
