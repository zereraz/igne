import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { livePreview } from '../livePreview';
import { createMarkdownLanguage } from '../markdownLanguage';
import { SPECS } from './fixtures';
import { getMediaType } from '../widgets';

// Helper to create an editor with given document and cursor position
function createEditor(doc: string, cursorPos: number): EditorView {
  const state = EditorState.create({
    doc,
    selection: { anchor: cursorPos },
    extensions: [createMarkdownLanguage(), livePreview],
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

// Helper to check if wikilink at position is rendered as a widget
function hasWikilinkWidget(view: EditorView, from: number, to: number): boolean {
  const plugin = view.plugin(livePreview);
  if (!plugin) return false;

  let hasReplacement = false;
  plugin.decorations.between(from, to, (f, t, deco) => {
    if (f === from && t === to && deco.spec.widget) {
      hasReplacement = true;
    }
  });
  return hasReplacement;
}

// Helper to check if tag at position is rendered as a widget
function hasTagWidget(view: EditorView, from: number, to: number): boolean {
  const plugin = view.plugin(livePreview);
  if (!plugin) return false;

  let hasReplacement = false;
  plugin.decorations.between(from, to, (f, t, deco) => {
    if (f === from && t === to && deco.spec.widget) {
      hasReplacement = true;
    }
  });
  return hasReplacement;
}

// Debug helper to get actual tag positions
function getTagPositions(view: EditorView): Array<{from: number; to: number; text: string}> {
  const positions: Array<{from: number; to: number; text: string}> = [];
  syntaxTree(view.state).iterate({
    enter(node) {
      if (node.name === 'Tag') {
        const text = view.state.doc.sliceString(node.from, node.to);
        positions.push({ from: node.from, to: node.to, text });
      }
    }
  });
  return positions;
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

describe('livePreview - wikilink behavior', () => {
  const wikilinkDoc = 'See [[my-note]] for more';
  // wikilink spans positions 4-15 in the document

  it('renders wikilink as widget when cursor is AWAY from it', () => {
    const view = createEditor(wikilinkDoc, 0); // cursor at start
    // Position 4-15 is [[my-note]]
    expect(hasWikilinkWidget(view, 4, 15)).toBe(true);
  });

  it('renders wikilink as widget when cursor is on different line', () => {
    const view = createEditor('text\nSee [[my-note]]\nmore', 0); // cursor at start
    // wikilink at 9-20 (text\n is 5 chars, so 4+5=9, 15+5=20)
    expect(hasWikilinkWidget(view, 9, 20)).toBe(true);
  });

  it('shows raw wikilink when cursor is INSIDE the wikilink', () => {
    const view = createEditor(wikilinkDoc, 10); // cursor inside [[my-note]]
    // When cursor is inside, wikilink should NOT be replaced with widget
    expect(hasWikilinkWidget(view, 4, 15)).toBe(false);
  });

  it('shows raw wikilink when cursor is right before [[', () => {
    const view = createEditor(wikilinkDoc, 4); // cursor at [[
    expect(hasWikilinkWidget(view, 4, 15)).toBe(false);
  });

  it('shows raw wikilink when cursor is right after ]]', () => {
    const view = createEditor(wikilinkDoc, 15); // cursor after ]]
    expect(hasWikilinkWidget(view, 4, 15)).toBe(false);
  });

  it('shows raw wikilink when cursor is at start of link text', () => {
    const view = createEditor(wikilinkDoc, 6); // cursor at "my-note" start
    expect(hasWikilinkWidget(view, 4, 15)).toBe(false);
  });

  it('shows raw wikilink when cursor is at end of link text', () => {
    const view = createEditor(wikilinkDoc, 13); // cursor before ]]
    expect(hasWikilinkWidget(view, 4, 15)).toBe(false);
  });

  it('shows raw wikilink for wikilink with alias', () => {
    const doc = 'See [[my-note|Display Name]] for more';
    const view = createEditor(doc, 10); // cursor inside wikilink
    // [[my-note|Display Name]] spans positions 4-28
    expect(hasWikilinkWidget(view, 4, 28)).toBe(false);
  });

  it('renders widget for wikilink with alias when cursor is away', () => {
    const doc = 'See [[my-note|Display Name]] for more';
    const view = createEditor(doc, 0); // cursor away
    expect(hasWikilinkWidget(view, 4, 28)).toBe(true);
  });

  it('handles multiple wikilinks - cursor on first only', () => {
    const doc = '[[first]] and [[second]] text';
    // first: positions 0-9 (widget range), second: positions 14-24 (widget range)
    const view = createEditor(doc, 3); // cursor inside first wikilink

    // First wikilink should show raw (no widget)
    expect(hasWikilinkWidget(view, 0, 9)).toBe(false);
    // Second wikilink should be widget
    expect(hasWikilinkWidget(view, 14, 24)).toBe(true);
  });

  it('handles multiple wikilinks - cursor on second only', () => {
    const doc = '[[first]] and [[second]] text';
    // first: positions 0-9 (widget range), second: positions 14-24 (widget range)
    const view = createEditor(doc, 18); // cursor inside second wikilink

    // First wikilink should be widget
    expect(hasWikilinkWidget(view, 0, 9)).toBe(true);
    // Second wikilink should show raw (no widget)
    expect(hasWikilinkWidget(view, 14, 24)).toBe(false);
  });

  it('handles multiple wikilinks - cursor between them', () => {
    const doc = '[[first]] and [[second]] text';
    // first: positions 0-9 (widget range), second: positions 14-24 (widget range)
    const view = createEditor(doc, 10); // cursor between wikilinks

    // Both should be widgets
    expect(hasWikilinkWidget(view, 0, 9)).toBe(true);
    expect(hasWikilinkWidget(view, 14, 24)).toBe(true);
  });
});

describe('livePreview - tag behavior', () => {
  it('renders tag as widget when cursor is away', () => {
    const doc = '#tag1 text';
    const view = createEditor(doc, 10); // cursor after tag
    const positions = getTagPositions(view);
    expect(positions.length).toBe(1);
    expect(hasTagWidget(view, positions[0].from, positions[0].to)).toBe(true);
  });

  it('shows raw tag when cursor is inside the tag', () => {
    const doc = '#tag1 text';
    const view = createEditor(doc, 2); // cursor inside tag
    const positions = getTagPositions(view);
    expect(hasTagWidget(view, positions[0].from, positions[0].to)).toBe(false);
  });

  it('shows raw tag when cursor is at start of tag', () => {
    const doc = '#tag1 text';
    const view = createEditor(doc, 0); // cursor at start
    const positions = getTagPositions(view);
    expect(hasTagWidget(view, positions[0].from, positions[0].to)).toBe(false);
  });

  it('shows raw tag when cursor is at end of tag', () => {
    const doc = '#tag1 text';
    const view = createEditor(doc, 5); // cursor at end of tag
    const positions = getTagPositions(view);
    expect(hasTagWidget(view, positions[0].from, positions[0].to)).toBe(false);
  });

  it('handles multiple tags - first tag renders as widget', () => {
    const doc = '#tag1 text #tag2 more';
    const view = createEditor(doc, 10); // cursor between tags
    const positions = getTagPositions(view);
    expect(positions.length).toBe(2);

    // Both tags should be widgets when cursor is between them
    expect(hasTagWidget(view, positions[0].from, positions[0].to)).toBe(true);
    expect(hasTagWidget(view, positions[1].from, positions[1].to)).toBe(true);
  });

  it('handles multiple tags - cursor inside first tag only', () => {
    const doc = '#tag1 text #tag2 more';
    const view = createEditor(doc, 2); // cursor inside first tag
    const positions = getTagPositions(view);
    expect(positions.length).toBe(2);

    // First tag should be raw (cursor inside), second should be widget
    expect(hasTagWidget(view, positions[0].from, positions[0].to)).toBe(false);
    expect(hasTagWidget(view, positions[1].from, positions[1].to)).toBe(true);
  });

  it('handles tag at very start with cursor later in doc', () => {
    const doc = '#tag1 some text here';
    const view = createEditor(doc, 20); // cursor well after tag
    const positions = getTagPositions(view);
    expect(positions.length).toBe(1);

    expect(hasTagWidget(view, positions[0].from, positions[0].to)).toBe(true);
  });

  it('handles single tag at start of line', () => {
    // Bug fix: #tag at start of line should be recognized
    const doc = '#tag\nsome text';
    const view = createEditor(doc, 10); // cursor after the line
    const positions = getTagPositions(view);
    expect(positions.length).toBe(1);

    expect(hasTagWidget(view, positions[0].from, positions[0].to)).toBe(true);
  });
});

describe('getMediaType - media type detection', () => {
  describe('audio file detection', () => {
    it('detects MP3 files', () => {
      expect(getMediaType('audio.mp3')).toBe('audio');
      expect(getMediaType('AUDIO.MP3')).toBe('audio');
      expect(getMediaType('/path/to/audio.mp3')).toBe('audio');
    });

    it('detects WAV files', () => {
      expect(getMediaType('sound.wav')).toBe('audio');
      expect(getMediaType('SOUND.WAV')).toBe('audio');
    });

    it('detects OGG files', () => {
      expect(getMediaType('music.ogg')).toBe('audio');
    });

    it('detects M4A files', () => {
      expect(getMediaType('song.m4a')).toBe('audio');
    });

    it('detects FLAC files', () => {
      expect(getMediaType('lossless.flac')).toBe('audio');
    });

    it('detects AAC files', () => {
      expect(getMediaType('audio.aac')).toBe('audio');
    });

    it('detects WMA files', () => {
      expect(getMediaType('audio.wma')).toBe('audio');
    });
  });

  describe('video file detection', () => {
    it('detects MP4 files', () => {
      expect(getMediaType('video.mp4')).toBe('video');
      expect(getMediaType('VIDEO.MP4')).toBe('video');
      expect(getMediaType('/path/to/video.mp4')).toBe('video');
    });

    it('detects WebM files', () => {
      expect(getMediaType('animation.webm')).toBe('video');
    });

    it('detects MOV files', () => {
      expect(getMediaType('movie.mov')).toBe('video');
    });

    it('detects OGV files', () => {
      expect(getMediaType('video.ogv')).toBe('video');
    });

    it('detects MKV files', () => {
      expect(getMediaType('video.mkv')).toBe('video');
    });

    it('detects AVI files', () => {
      expect(getMediaType('video.avi')).toBe('video');
    });

    it('detects M4V files', () => {
      expect(getMediaType('video.m4v')).toBe('video');
    });
  });

  describe('non-media file detection', () => {
    it('returns null for markdown files', () => {
      expect(getMediaType('note.md')).toBe(null);
    });

    it('returns null for image files', () => {
      expect(getMediaType('image.png')).toBe(null);
      expect(getMediaType('image.jpg')).toBe(null);
      expect(getMediaType('image.gif')).toBe(null);
    });

    it('returns null for text files', () => {
      expect(getMediaType('document.txt')).toBe(null);
    });

    it('returns null for PDF files', () => {
      expect(getMediaType('document.pdf')).toBe(null);
    });

    it('returns null for files without extensions', () => {
      expect(getMediaType('audio')).toBe(null);
    });
  });
});
