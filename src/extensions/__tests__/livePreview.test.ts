import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { livePreview } from '../livePreview';
import { SPECS } from './fixtures';

// Helper to create an editor with given document and cursor position
function createEditor(doc: string, cursorPos: number): EditorView {
  const state = EditorState.create({
    doc,
    selection: { anchor: cursorPos },
    extensions: [markdown(), livePreview],
  });

  // Create a mock parent element
  const parent = document.createElement('div');
  return new EditorView({ state, parent });
}

// Helper to get hidden decoration ranges (only replace decorations, not mark)
function getHiddenRanges(view: EditorView): [number, number][] {
  const ranges: [number, number][] = [];

  // Access the decorations from the plugin
  const plugin = view.plugin(livePreview);
  if (!plugin) {
    return ranges;
  }

  // Iterate through decorations
  plugin.decorations.between(0, view.state.doc.length, (from, to, deco) => {
    // Check for explicit isHidden tag
    const spec = (deco as any).spec;
    if (spec?.isHidden === true) {
      ranges.push([from, to]);
    }
  });

  return ranges;
}

// Helper to format ranges for comparison
function formatRanges(ranges: [number, number][]): string {
  return ranges.map(([from, to]) => `[${from},${to}]`).join(', ');
}

describe('livePreview - data-driven specs', () => {
  SPECS.forEach(([desc, doc, cursor, expected]) => {
    it(`[${desc}]`, () => {
      const view = createEditor(doc, cursor);
      const actual = getHiddenRanges(view);

      // Format for better error messages
      const expectedStr = formatRanges(expected as [number, number][]);
      const actualStr = formatRanges(actual);

      expect(actual, `Expected hidden ranges: [${expectedStr}], but got: [${actualStr}]`).toEqual(
        expected as [number, number][]
      );
    });
  });
});

describe('livePreview - core behavior', () => {
  describe('HeaderMark hiding', () => {
    it('hides # when cursor on different line', () => {
      const view = createEditor('# Heading\ntext', 12);
      expect(getHiddenRanges(view)).toContainEqual([0, 1]);
    });

    it('shows # when cursor on same line', () => {
      const view = createEditor('# Heading\ntext', 5);
      expect(getHiddenRanges(view)).not.toContainEqual([0, 1]);
    });

    it('handles ## through ######', () => {
      for (let i = 1; i <= 6; i++) {
        const hashes = '#'.repeat(i) + ' ';
        const view = createEditor(`${hashes}Heading\ntext`, hashes.length + 10);
        expect(getHiddenRanges(view)).toContainEqual([0, i]);
      }
    });
  });

  describe('EmphasisMark hiding (bold)', () => {
    it('hides ** when cursor outside bold', () => {
      const view = createEditor('hello **bold** world', 2);
      expect(getHiddenRanges(view)).toContainEqual([6, 8]); // opening **
      expect(getHiddenRanges(view)).toContainEqual([12, 14]); // closing **
    });

    it('shows ** when cursor inside bold text', () => {
      const view = createEditor('hello **bold** world', 10);
      expect(getHiddenRanges(view)).not.toContainEqual([6, 8]);
      expect(getHiddenRanges(view)).not.toContainEqual([12, 14]);
    });

    it('shows ** when cursor at parent boundary (start)', () => {
      const view = createEditor('**bold**', 0);
      expect(getHiddenRanges(view)).toHaveLength(0);
    });

    it('shows ** when cursor at parent boundary (end)', () => {
      const view = createEditor('**bold**', 8);
      expect(getHiddenRanges(view)).toHaveLength(0);
    });
  });

  describe('update behavior', () => {
    it('updates decorations after document change', () => {
      const view = createEditor('# Heading\nother', 8);
      // Initially, cursor is on Heading line, so # should show
      expect(getHiddenRanges(view)).toHaveLength(0);

      // Move cursor to next line
      view.dispatch({
        selection: { anchor: 12 },
      });

      // Now # should be hidden
      expect(getHiddenRanges(view)).toContainEqual([0, 1]);
    });

    it('updates decorations after typing', () => {
      const view = createEditor('text', 4);
      expect(getHiddenRanges(view)).toHaveLength(0);

      // Type some bold text
      view.dispatch({
        changes: { from: 4, to: 4, insert: '**bold**' },
      });

      // Cursor is now at end of document, inside the bold
      // So ** should not be hidden
      expect(getHiddenRanges(view)).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty document', () => {
      const view = createEditor('', 0);
      expect(getHiddenRanges(view)).toHaveLength(0);
    });

    it('handles plain text with no markdown', () => {
      const view = createEditor('just plain text here', 10);
      expect(getHiddenRanges(view)).toHaveLength(0);
    });

    it('handles incomplete markdown (no closing)', () => {
      const view = createEditor('hello **world', 8);
      // Should not hide opening ** since there's no closing
      expect(getHiddenRanges(view)).toHaveLength(0);
    });

    it('handles multiple bold sections', () => {
      const view = createEditor('a **b** c **d**', 8);
      // Cursor is in " c " between the two bold sections
      // All ** pairs should be hidden
      expect(getHiddenRanges(view)).toContainEqual([2, 4]);
      expect(getHiddenRanges(view)).toContainEqual([5, 7]);
      expect(getHiddenRanges(view)).toContainEqual([10, 12]);
      expect(getHiddenRanges(view)).toContainEqual([13, 15]);
    });
  });

  describe('nested formatting', () => {
    it('handles bold containing italic', () => {
      const doc = '**bold *italic* bold**';
      const view = createEditor(doc, 11); // cursor in "italic"

      // Cursor is inside both bold and italic, so all marks show
      const ranges = getHiddenRanges(view);
      expect(ranges).toHaveLength(0);
    });

    it('handles cursor in outer bold only', () => {
      const doc = '**bold *italic* bold**';
      const view = createEditor(doc, 5); // cursor in "bold "

      // Cursor is inside bold but outside italic, so only * marks hidden
      const ranges = getHiddenRanges(view);
      expect(ranges).toContainEqual([7, 8]); // opening *
      expect(ranges).toContainEqual([14, 15]); // closing *
      expect(ranges).not.toContainEqual([0, 2]); // opening ** should show
      expect(ranges).not.toContainEqual([20, 22]); // closing ** should show
    });
  });
});
