import { MarkdownConfig } from '@lezer/markdown';

// Helper to create style objects that satisfy the Tag type
const createStyle = (style: string) => style as any;

// Strikethrough ~~text~~
export const Strikethrough: MarkdownConfig = {
  defineNodes: [
    { name: 'Strikethrough', style: createStyle('strikethrough') },
    { name: 'StrikethroughMark' },
  ],
  parseInline: [{
    name: 'Strikethrough',
    before: 'Emphasis',  // Run before standard emphasis parser
    parse(cx: any, next: number, pos: number) {
      if (next !== 126 /* ~ */ || cx.char(pos + 1) !== 126) return -1;
      const start = pos;
      pos += 2;
      let end = pos;
      while (end < cx.end) {
        if (cx.char(end) === 126 && cx.char(end + 1) === 126) break;
        end++;
      }
      if (end >= cx.end || end === pos) return -1;
      const parseInline = cx.parseInline?.bind(cx);
      const children = parseInline ? parseInline(pos, end) : [];
      return cx.addElement(cx.elt('Strikethrough', start, end + 2, [
        cx.elt('StrikethroughMark', start, start + 2),
        ...children,
        cx.elt('StrikethroughMark', end, end + 2),
      ]));
    },
  }],
};

// Highlight ==text==
export const Highlight: MarkdownConfig = {
  defineNodes: [
    { name: 'Highlight', style: createStyle('highlight') },
    { name: 'HighlightMark' },
  ],
  parseInline: [{
    name: 'Highlight',
    before: 'Emphasis',  // Run before standard emphasis parser
    parse(cx: any, next: number, pos: number) {
      if (next !== 61 /* = */ || cx.char(pos + 1) !== 61) return -1;
      const start = pos;
      pos += 2;
      let end = pos;
      while (end < cx.end) {
        if (cx.char(end) === 61 && cx.char(end + 1) === 61) break;
        end++;
      }
      if (end >= cx.end || end === pos) return -1;
      const parseInline = cx.parseInline?.bind(cx);
      const children = parseInline ? parseInline(pos, end) : [];
      return cx.addElement(cx.elt('Highlight', start, end + 2, [
        cx.elt('HighlightMark', start, start + 2),
        ...children,
        cx.elt('HighlightMark', end, end + 2),
      ]));
    },
  }],
};

// Wikilink [[note]] and [[note|display]]
export const Wikilink: MarkdownConfig = {
  defineNodes: [
    { name: 'Wikilink', style: createStyle('wikilink') },
    { name: 'WikilinkMark' },
    { name: 'WikilinkTarget' },
    { name: 'WikilinkAlias' },
    { name: 'WikilinkPipe' },
  ],
  parseInline: [{
    name: 'Wikilink',
    before: 'Link',  // Run before the standard Link parser
    parse(cx: any, next: number, pos: number) {
      if (next !== 91 /* [ */ || cx.char(pos + 1) !== 91) return -1;
      const start = pos;
      pos += 2;

      let targetEnd = pos;
      let aliasStart = -1;
      let end = -1;

      while (targetEnd < cx.end) {
        const c = cx.char(targetEnd);
        if (c === 124 /* | */) { aliasStart = targetEnd; break; }
        if (c === 93 /* ] */ && cx.char(targetEnd + 1) === 93) { end = targetEnd; break; }
        targetEnd++;
      }

      if (aliasStart > 0) {
        // Find closing ]]
        end = aliasStart + 1;
        while (end < cx.end) {
          if (cx.char(end) === 93 && cx.char(end + 1) === 93) break;
          end++;
        }
        if (end >= cx.end) return -1;

        return cx.addElement(cx.elt('Wikilink', start, end + 2, [
          cx.elt('WikilinkMark', start, start + 2),
          cx.elt('WikilinkTarget', start + 2, aliasStart),
          cx.elt('WikilinkPipe', aliasStart, aliasStart + 1),
          cx.elt('WikilinkAlias', aliasStart + 1, end),
          cx.elt('WikilinkMark', end, end + 2),
        ]));
      }

      if (end < 0) return -1;

      return cx.addElement(cx.elt('Wikilink', start, end + 2, [
        cx.elt('WikilinkMark', start, start + 2),
        cx.elt('WikilinkTarget', start + 2, end),
        cx.elt('WikilinkMark', end, end + 2),
      ]));
    },
  }],
};

// Embed ![[note]]
export const Embed: MarkdownConfig = {
  defineNodes: [
    { name: 'Embed', style: createStyle('embed') },
    { name: 'EmbedMark' },
    { name: 'EmbedTarget' },
  ],
  parseInline: [{
    name: 'Embed',
    before: 'Image',  // Run before the standard Image parser
    parse(cx: any, next: number, pos: number) {
      if (next !== 33 /*! */ || cx.char(pos + 1) !== 91 /* [ */ || cx.char(pos + 2) !== 91) return -1;
      const start = pos;
      pos += 3;

      let end = pos;
      while (end < cx.end) {
        if (cx.char(end) === 93 /* ] */ && cx.char(end + 1) === 93) break;
        end++;
      }
      if (end >= cx.end || end === pos) return -1;

      return cx.addElement(cx.elt('Embed', start, end + 2, [
        cx.elt('EmbedMark', start, start + 3),
        cx.elt('EmbedTarget', start + 3, end),
        cx.elt('EmbedMark', end, end + 2),
      ]));
    },
  }],
};

// Block ID ^block-id
export const BlockID: MarkdownConfig = {
  defineNodes: [
    { name: 'BlockID', style: createStyle('blockid') },
    { name: 'BlockIDMark' },
  ],
  parseInline: [{
    name: 'BlockID',
    parse(cx: any, next: number, pos: number) {
      if (next !== 94 /* ^ */) return -1;
      const start = pos;
      pos++;

      while (pos < cx.end) {
        const c = cx.char(pos);
        if (!(c >= 48 && c <= 57) && /* 0-9 */
            !(c >= 65 && c <= 90) && /* A-Z */
            !(c >= 97 && c <= 122) && /* a-z */
            c !== 45) { /* - */
          break;
        }
        pos++;
      }

      if (pos === start + 1) return -1; // no ID after ^

      // Must be at end of line or followed by whitespace
      if (pos < cx.end) {
        const c = cx.char(pos);
        if (c !== 32 && c !== 10 && c !== 13) return -1;
      }

      return cx.addElement(cx.elt('BlockID', start, pos, [
        cx.elt('BlockIDMark', start, start + 1),
      ]));
    },
  }],
};

// Tag #tag and #nested/tag
export const Tag: MarkdownConfig = {
  defineNodes: [
    { name: 'Tag', style: createStyle('tag') },
    { name: 'TagMark' },
  ],
  parseInline: [{
    name: 'Tag',
    parse(cx: any, next: number, pos: number) {
      if (next !== 35 /* # */) return -1;
      // Must be preceded by whitespace or start of line
      if (pos > 0) {
        const prev = cx.char(pos - 1);
        if (prev !== 32 && prev !== 10 && prev !== 13) return -1;
      }

      const start = pos;
      pos++;

      // Must start with letter or digit
      const firstChar = cx.char(pos);
      if (!((firstChar >= 48 && firstChar <= 57) || /* 0-9 */
            (firstChar >= 65 && firstChar <= 90) || /* A-Z */
            (firstChar >= 97 && firstChar <= 122))) { /* a-z */
        return -1;
      }

      while (pos < cx.end) {
        const c = cx.char(pos);
        if (!(c >= 48 && c <= 57) && /* 0-9 */
            !(c >= 65 && c <= 90) && /* A-Z */
            !(c >= 97 && c <= 122) && /* a-z */
            c !== 47 && /* / */
            c !== 45) { /* - */
          break;
        }
        pos++;
      }

      if (pos === start + 1) return -1;

      return cx.addElement(cx.elt('Tag', start, pos, [
        cx.elt('TagMark', start, start + 1),
      ]));
    },
  }],
};

// Task list - [ ] and - [x]
export const TaskMarker: MarkdownConfig = {
  defineNodes: [
    { name: 'TaskMarker', style: createStyle('taskmarker') },
  ],
  parseInline: [{
    name: 'TaskMarker',
    parse(cx: any, next: number, pos: number) {
      // Match [ ] or [x] or [X]
      if (next !== 91 /* [ */) return -1;

      const inner = cx.char(pos + 1);
      if (inner !== 32 && /* space */
          inner !== 120 && /* x */
          inner !== 88) { /* X */
        return -1;
      }

      if (cx.char(pos + 2) !== 93 /* ] */) return -1;

      // Must be at start of line (after list marker)
      if (pos > 0) {
        const prev = cx.char(pos - 1);
        if (prev !== 45 && /* - */
            prev !== 42 && /* * */
            prev !== 43) { /* + */
          // Check for digit + dot (ordered list)
          let i = pos - 1;
          while (i >= 0 && cx.char(i) >= 48 && cx.char(i) <= 57) i--;
          if (i < 0 || cx.char(i) !== 46) return -1;
        }
      }

      return cx.addElement(cx.elt('TaskMarker', pos, pos + 3));
    },
  }],
};
