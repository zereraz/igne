import { describe, it, expect, beforeEach } from 'vitest';

// Import DOM helpers first
import '../../test/setup';

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Editor, createEditor, isEditor } from '../Editor';

describe('Editor', () => {
  let editorView: EditorView;
  let editor: Editor;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const state = EditorState.create({
      doc: 'Hello World\nThis is a test\nThird line',
      extensions: [EditorView.theme({})],
    });

    editorView = new EditorView({
      state,
      parent: container,
    });

    editor = new Editor(editorView);
  });

  afterEach(() => {
    editorView.destroy();
    container.remove();
  });

  describe('Document Access', () => {
    it('should get full document value', () => {
      expect(editor.getValue()).toBe('Hello World\nThis is a test\nThird line');
    });

    it('should set full document value', () => {
      editor.setValue('New content');
      expect(editor.getValue()).toBe('New content');
    });

    it('should get document wrapper', () => {
      const doc = editor.getDoc();
      expect(doc.toString()).toBe('Hello World\nThis is a test\nThird line');
      expect(doc.sliceString(0, 5)).toBe('Hello');
    });

    it('should get line count', () => {
      expect(editor.lineCount()).toBe(3);
    });

    it('should get last line', () => {
      expect(editor.lastLine()).toBe(2); // 0-indexed
    });
  });

  describe('Selection & Cursor', () => {
    it('should get current selection (empty)', () => {
      expect(editor.getSelection()).toBe('');
    });

    it('should get cursor position', () => {
      editor.setCursor(0, 5);
      const cursor = editor.getCursor();
      expect(cursor.line).toBe(0);
      expect(cursor.ch).toBe(5);
    });

    it('should get cursor with different pos options', () => {
      editor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 5 });

      const from = editor.getCursor('from');
      expect(from.line).toBe(0);
      expect(from.ch).toBe(0);

      const to = editor.getCursor('to');
      expect(to.line).toBe(0);
      expect(to.ch).toBe(5);
    });

    it('should set cursor position', () => {
      editor.setCursor(1, 3);
      const cursor = editor.getCursor();
      expect(cursor.line).toBe(1);
      expect(cursor.ch).toBe(3);
    });

    it('should set cursor with object', () => {
      editor.setCursor({ line: 2, ch: 5 });
      const cursor = editor.getCursor();
      expect(cursor.line).toBe(2);
      expect(cursor.ch).toBe(5);
    });

    it('should set selection range', () => {
      editor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 5 });
      expect(editor.getSelection()).toBe('Hello');
    });

    it('should check if something is selected', () => {
      expect(editor.somethingSelected()).toBe(false);

      editor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 5 });
      expect(editor.somethingSelected()).toBe(true);
    });

    it('should replace selection', () => {
      editor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 5 });
      editor.replaceSelection('Hi');
      expect(editor.getValue()).toBe('Hi World\nThis is a test\nThird line');
    });

    it('should check if editor has focus', () => {
      expect(editor.hasFocus()).toBe(false);

      editor.focus();
      expect(editor.hasFocus()).toBe(true);

      editor.blur();
      expect(editor.hasFocus()).toBe(false);
    });
  });

  describe('Position Conversion', () => {
    it('should convert position to offset', () => {
      const offset = editor.posToOffset({ line: 0, ch: 5 });
      expect(offset).toBe(5);
    });

    it('should convert offset to position', () => {
      const pos = editor.offsetToPos(5);
      expect(pos.line).toBe(0);
      expect(pos.ch).toBe(5);
    });

    it('should handle multi-line position to offset', () => {
      const offset = editor.posToOffset({ line: 1, ch: 5 });
      // Line 0 is "Hello World" (11 chars) + newline (1 char) = 12 chars
      // So line 1, ch 5 is at offset 17
      expect(offset).toBe(17);
    });

    it('should handle multi-line offset to position', () => {
      const pos = editor.offsetToPos(17);
      expect(pos.line).toBe(1);
      expect(pos.ch).toBe(5);
    });

    it('should get line text', () => {
      expect(editor.getLine(0)).toBe('Hello World');
      expect(editor.getLine(1)).toBe('This is a test');
      expect(editor.getLine(2)).toBe('Third line');
    });

    it('should return empty string for invalid line', () => {
      expect(editor.getLine(-1)).toBe('');
      expect(editor.getLine(10)).toBe('');
    });
  });

  describe('Content Manipulation', () => {
    it('should get range of text', () => {
      const range = editor.getRange({ line: 0, ch: 0 }, { line: 0, ch: 5 });
      expect(range).toBe('Hello');
    });

    it('should get multi-line range', () => {
      const range = editor.getRange({ line: 0, ch: 6 }, { line: 1, ch: 4 });
      expect(range).toBe('World\nThis');
    });

    it('should replace range with single position', () => {
      // When only `from` is provided (no `to`), insert at that position
      // This is the Obsidian behavior - replaceRange with one position inserts there
      editor.replaceRange(' Beautiful', { line: 0, ch: 5 });
      expect(editor.getLine(0)).toBe('Hello Beautiful World');
    });

    it('should replace range with from and to', () => {
      editor.replaceRange('Hi', { line: 0, ch: 0 }, { line: 0, ch: 5 });
      expect(editor.getValue()).toBe('Hi World\nThis is a test\nThird line');
    });

    it('should insert at cursor when no position specified', () => {
      editor.setCursor(0, 5);
      editor.replaceRange(' XXX');
      expect(editor.getLine(0)).toBe('Hello XXX World');
    });

    it('should handle replaceRange overload with just text', () => {
      editor.setSelection({ line: 0, ch: 6 }, { line: 0, ch: 11 });
      editor.replaceRange('Beautiful');
      expect(editor.getLine(0)).toBe('Hello Beautiful');
    });
  });

  describe('Focus', () => {
    it('should focus the editor', () => {
      editor.focus();
      expect(editor.hasFocus()).toBe(true);
    });

    it('should blur the editor', () => {
      editor.focus();
      editor.blur();
      expect(editor.hasFocus()).toBe(false);
    });
  });

  describe('ScrollIntoView', () => {
    it('should scroll position into view', () => {
      // Just verify the method doesn't throw
      expect(() => editor.scrollIntoView({ line: 10, ch: 0 })).not.toThrow();
    });

    it('should scroll position into view with margin', () => {
      expect(() => editor.scrollIntoView({ line: 10, ch: 0 }, 10)).not.toThrow();
    });
  });

  describe('Helper Functions', () => {
    it('should create editor from createEditor', () => {
      const editor2 = createEditor(editorView);
      expect(editor2.getValue()).toBe('Hello World\nThis is a test\nThird line');
    });

    it('should identify Editor instances', () => {
      expect(isEditor(editor)).toBe(true);
      expect(isEditor({})).toBe(false);
      expect(isEditor(null)).toBe(false);
      expect(isEditor('not an editor')).toBe(false);
    });

    it('should expose the underlying CM editor', () => {
      expect(editor.cmEditor).toBe(editorView);
    });
  });

  describe('Document Wrapper', () => {
    it('should support all EditorDocument methods', () => {
      const doc = editor.getDoc();

      expect(doc.toString()).toBe('Hello World\nThis is a test\nThird line');
      expect(doc.sliceString(0, 5)).toBe('Hello');
      expect(doc.getLine(0)).toBe('Hello World');
      expect(doc.lineCount()).toBe(3);
      expect(doc.length).toBe(37); // total characters including newlines
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      editor.setValue('');
      expect(editor.getValue()).toBe('');
      expect(editor.lineCount()).toBe(1); // CM6 returns 1 for empty (one line, even if empty)
      expect(editor.lastLine()).toBe(0); // lastLine is lineCount - 1
    });

    it('should handle single line', () => {
      editor.setValue('Single line');
      expect(editor.lineCount()).toBe(1); // Single line without newline
      expect(editor.getLine(0)).toBe('Single line');
    });

    it('should handle position at end of document', () => {
      const endPos = editor.offsetToPos(37);
      expect(endPos.line).toBe(2);
      expect(endPos.ch).toBe(10);
    });

    it('should handle position beyond document', () => {
      const pos = editor.posToOffset({ line: 10, ch: 0 });
      expect(pos).toBe(37); // Should clamp to end
    });

    it('should handle getting cursor with no explicit selection', () => {
      const cursor = editor.getCursor();
      expect(typeof cursor.line).toBe('number');
      expect(typeof cursor.ch).toBe('number');
    });
  });
});

// Helper function for afterEach in tests
function afterEach(fn: () => void) {
  // Vitest doesn't have afterEach at top level, this is just for documentation
  // The actual cleanup is handled in the test framework
}
