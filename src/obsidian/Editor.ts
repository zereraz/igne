// =============================================================================
// Editor - Wrapper around CodeMirror 6 for Obsidian Compatibility
// =============================================================================

import { EditorView } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
import type {
  EditorPosition,
  EditorSelection,
  EditorDocument,
} from './types';

/**
 * Obsidian-compatible Editor class wrapping CodeMirror 6
 *
 * This provides the Obsidian Editor API around CodeMirror 6,
 * allowing plugins to interact with the editor in a familiar way.
 */
export class Editor {
  private cm: EditorView;

  constructor(cmEditor: EditorView) {
    this.cm = cmEditor;
  }

  // ==========================================================================
  // Document Access
  // ==========================================================================

  /**
   * Get the document object
   */
  getDoc(): EditorDocument {
    return new EditorDocumentWrapper(this.cm.state.doc);
  }

  /**
   * Get the full content of the editor
   */
  getValue(): string {
    return this.cm.state.doc.toString();
  }

  /**
   * Set the full content of the editor
   */
  setValue(content: string): void {
    this.cm.dispatch({
      changes: { from: 0, to: this.cm.state.doc.length, insert: content },
    });
  }

  // ==========================================================================
  // Selection & Cursor
  // ==========================================================================

  /**
   * Get the current selection
   */
  getSelection(): string {
    const { from, to } = this.cm.state.selection.main;
    return this.cm.state.doc.sliceString(from, to);
  }

  /**
   * Replace the current selection with text
   */
  replaceSelection(replacement: string): void {
    const { from, to } = this.cm.state.selection.main;
    this.cm.dispatch({
      changes: { from, to, insert: replacement },
      selection: { anchor: from + replacement.length },
    });
  }

  /**
   * Get the current cursor position
   * @param pos - Which cursor position to get ('from' | 'to' | 'head' | 'anchor')
   */
  getCursor(pos?: 'from' | 'to' | 'head' | 'anchor'): EditorPosition {
    const selection = this.cm.state.selection.main;

    if (pos === 'from' || pos === 'anchor') {
      return this.posToPosition(selection.from);
    }
    // 'to' or 'head' or undefined - default to head
    return this.posToPosition(selection.to);
  }

  /**
   * Set the cursor position
   * @param pos - Line number or EditorPosition object
   * @param ch - Column (only used if pos is a number)
   */
  setCursor(pos: EditorPosition | number, ch?: number): void {
    let targetPos: EditorPosition;

    if (typeof pos === 'number') {
      targetPos = { line: pos, ch: ch ?? 0 };
    } else {
      targetPos = pos;
    }

    const offset = this.posToOffset(targetPos);
    this.cm.dispatch({
      selection: { anchor: offset, head: offset },
      scrollIntoView: true,
    });
  }

  /**
   * Set the selection range
   * @param anchor - The anchor position (start of selection)
   * @param head - The head position (end of selection, defaults to anchor if not provided)
   */
  setSelection(anchor: EditorPosition, head?: EditorPosition): void {
    const anchorOffset = this.posToOffset(anchor);
    const headOffset = head ? this.posToOffset(head) : anchorOffset;

    this.cm.dispatch({
      selection: { anchor: anchorOffset, head: headOffset },
    });
  }

  /**
   * Check if something is selected
   */
  somethingSelected(): boolean {
    const { from, to } = this.cm.state.selection.main;
    return from !== to;
  }

  /**
   * Check if the editor has focus
   */
  hasFocus(): boolean {
    return this.cm.hasFocus;
  }

  // ==========================================================================
  // Position Conversion
  // ==========================================================================

  /**
   * Convert a position offset to line/ch coordinates
   */
  offsetToPos(offset: number): EditorPosition {
    return this.posToPosition(offset);
  }

  /**
   * Convert line/ch coordinates to a position offset
   */
  posToOffset(pos: EditorPosition): number {
    const doc = this.cm.state.doc;
    if (pos.line >= doc.lines) {
      return doc.length;
    }

    const line = doc.line(pos.line + 1); // CM6 lines are 1-indexed
    const offset = line.from + Math.min(pos.ch, line.length);
    return offset;
  }

  /**
   * Get the line at a given position
   */
  getLine(line: number): string {
    const doc = this.cm.state.doc;
    if (line < 0 || line >= doc.lines) {
      return '';
    }
    return doc.line(line + 1).text;
  }

  /**
   * Get the number of lines in the document
   * CM6's doc.lines property returns the actual line count
   */
  lineCount(): number {
    const doc = this.cm.state.doc;
    // CM6's lines property already returns the actual line count
    // For empty documents, return 0
    return doc.lines;
  }

  /**
   * Get the last line number
   */
  lastLine(): number {
    return Math.max(-1, this.lineCount() - 1);
  }

  // ==========================================================================
  // Content Manipulation
  // ==========================================================================

  /**
   * Get a range of text
   */
  getRange(from: EditorPosition, to: EditorPosition): string {
    const fromOffset = this.posToOffset(from);
    const toOffset = this.posToOffset(to);
    return this.cm.state.doc.sliceString(fromOffset, toOffset);
  }

  /**
   * Replace a range of text or insert at cursor
   * @param text - The text to insert
   * @param from - The start position (if not provided, inserts at cursor)
   * @param to - The end position (if not provided, inserts at from position)
   */
  replaceRange(text: string, from?: EditorPosition, to?: EditorPosition): void {
    if (!from) {
      // Insert at cursor, replacing selection if any
      const selection = this.cm.state.selection.main;
      this.cm.dispatch({
        changes: { from: selection.from, to: selection.to, insert: text },
        selection: { anchor: selection.from + text.length },
      });
    } else {
      const fromOffset = this.posToOffset(from);
      const toOffset = to ? this.posToOffset(to) : fromOffset;
      this.cm.dispatch({
        changes: { from: fromOffset, to: toOffset, insert: text },
      });
    }
  }

  // ==========================================================================
  // Transaction Support (for advanced use)
  // ==========================================================================

  /**
   * Apply a transaction to the editor
   */
  transaction(transaction: Transaction): void {
    this.cm.dispatch(transaction);
  }

  /**
   * Get the current editor state
   */
  getState(): EditorState {
    return this.cm.state;
  }

  // ==========================================================================
  // Scrolling
  // ==========================================================================

  /**
   * Scroll a given position into view
   */
  scrollIntoView(pos: EditorPosition, margin?: number): void {
    const offset = this.posToOffset(pos);
    this.cm.dispatch({
      scrollIntoView: true,
      effects: [EditorView.scrollIntoView(offset, { yMargin: margin })],
    });
  }

  // ==========================================================================
  // Focus
  // ==========================================================================

  /**
   * Focus the editor
   */
  focus(): void {
    this.cm.focus();
  }

  /**
   * Remove focus from the editor
   */
  blur(): void {
    this.cm.contentDOM.blur();
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Internal: Convert CM6 offset to EditorPosition
   */
  private posToPosition(offset: number): EditorPosition {
    const doc = this.cm.state.doc;
    // Clamp offset to valid range
    const clampedOffset = Math.max(0, Math.min(offset, doc.length));

    // Handle empty document
    if (doc.length === 0) {
      return { line: 0, ch: 0 };
    }

    const line = doc.lineAt(clampedOffset);

    return {
      line: line.number - 1, // Convert to 0-indexed
      ch: clampedOffset - line.from,
    };
  }

  /**
   * Get the underlying CodeMirror editor
   * This is for internal use and advanced integrations
   */
  get cmEditor(): EditorView {
    return this.cm;
  }
}

/**
 * Wrapper for CodeMirror Document to match Obsidian's EditorDocument interface
 */
class EditorDocumentWrapper implements EditorDocument {
  constructor(private doc: EditorState['doc']) {}

  toString(): string {
    return this.doc.toString();
  }

  sliceString(from: number, to?: number): string {
    return this.doc.sliceString(from, to);
  }

  getLine(line: number): string {
    if (line < 0 || line >= this.doc.lines) {
      return '';
    }
    return this.doc.line(line + 1).text;
  }

  /** Get the number of lines */
  lineCount(): number {
    // CM6's lines property already returns the actual line count
    return this.doc.lines;
  }

  /** Get the length of the document */
  get length(): number {
    return this.doc.length;
  }
}

/**
 * Type guard to check if an object is an Editor instance
 */
export function isEditor(obj: unknown): obj is Editor {
  return obj instanceof Editor;
}

/**
 * Helper to create an Editor instance from a CodeMirror EditorView
 */
export function createEditor(cmView: EditorView): Editor {
  return new Editor(cmView);
}
