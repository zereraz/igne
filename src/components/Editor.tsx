import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';

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

    // Create extensions compartments for dynamic updates
    const languageCompartment = new Compartment();

    const extensions = [
      oneDark,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({ codeLanguages: languages }),
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
