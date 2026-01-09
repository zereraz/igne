export const SPECS: readonly [
  desc: string,
  doc: string,
  cursorPos: number,
  expectedHiddenRanges: readonly (readonly [number, number])[],
][] = [
  // HeaderMark tests - HeaderMark only includes the # characters, not the space
  ['basic heading hides #', '# Heading\ntext', 10, [[0, 1]]],
  ['cursor in heading shows #', '# Heading\ntext', 3, []],
  ['## heading hides ##', '## Heading\ntext', 12, [[0, 2]]],
  ['### heading hides ###', '### Heading\ntext', 13, [[0, 3]]],
  ['#### heading hides ####', '#### Heading\ntext', 15, [[0, 4]]],
  ['##### heading hides #####', '##### Heading\ntext', 16, [[0, 5]]],
  ['###### heading hides ######', '###### Heading\ntext', 17, [[0, 6]]],
  ['cursor at start of heading', '# Heading', 0, []],
  ['cursor at end of heading', '# Heading', 8, []],
  ['cursor on # shows it', '# Heading', 1, []],

  // StrongEmphasis (bold) tests
  ['bold hides ** when cursor outside', 'hello **bold** world', 2, [[6, 8], [12, 14]]],
  ['cursor inside bold shows **', 'hello **bold** world', 10, []],
  ['cursor at bold start shows **', '**bold**', 0, []],
  ['cursor at bold end shows **', '**bold**', 8, []],
  ['cursor at opening ** end', '**bold**', 2, []],
  ['cursor at closing ** start', '**bold**', 6, []],
  ['bold at start of doc', '**bold** text', 10, [[0, 2], [6, 8]]],
  ['bold at end of doc', 'text **bold**', 4, [[5, 7], [11, 13]]],
  ['multiple bold sections', 'a **b** c **d**', 8, [[2, 4], [5, 7], [10, 12], [13, 15]]],

  // Emphasis (italic) tests
  ['italic hides * when cursor outside', 'hello *italic* world', 2, [[6, 7], [13, 14]]],
  ['cursor inside italic shows *', 'hello *italic* world', 11, []],
  ['cursor at italic start shows *', '*italic*', 0, []],
  ['cursor at italic end shows *', '*italic*', 8, []],

  // InlineCode tests
  ['inline code hides backticks when cursor outside', 'hello `code` world', 2, [[6, 7], [11, 12]]],
  ['cursor inside inline code shows backticks', 'hello `code` world', 9, []],
  ['cursor at inline code start shows backticks', '`code`', 0, []],
  ['cursor at inline code end shows backticks', '`code`', 6, []],

  // Strikethrough tests - not parsed by @lezer/markdown
  // ['strikethrough hides ~~ when cursor outside', 'hello ~~strike~~ world', 2, [[6, 8], [14, 16]]],
  // ['cursor inside strikethrough shows ~~', 'hello ~~strike~~ world', 11, []],

  // Link tests
  ['link hides [text](url) when cursor outside', 'click [here](https://example.com)', 2, [[6, 7], [11, 12], [12, 13], [13, 32], [32, 33]]],
  ['cursor inside link text shows marks', 'click [here](url)', 8, []],
  ['cursor inside link URL shows marks', 'click [here](url)', 14, []],

  // Blockquote tests
  ['blockquote hides > when cursor outside', '> quote', 5, []],  // cursor is inside content
  ['cursor inside blockquote shows >', '> quote', 3, []],

  // List tests
  ['bullet list hides - when cursor outside', '- item', 6, []],  // cursor is inside content
  ['cursor inside list item shows -', '- item', 3, []],
  ['ordered list hides 1. when cursor outside', '1. item', 7, []],  // cursor is inside content
  ['cursor inside ordered list shows 1.', '1. item', 3, []],

  // Nested formatting
  ['bold containing italic', '**bold *italic* bold**', 11, []],
  ['cursor in outer bold only', '**bold *italic* bold**', 5, [[7, 8], [14, 15]]],
  ['cursor in inner italic', '**bold *italic* bold**', 11, []],

  // Adjacent formatting
  ['bold then italic', '**bold***italic*', 15, [[0, 2], [6, 8]]],
  ['cursor in bold section', '**bold***italic*', 5, [[8, 9], [15, 16]]],
  ['cursor in italic section', '**bold***italic*', 13, [[0, 2], [6, 8]]],

  // Edge cases
  ['empty document', '', 0, []],
  ['plain text no markdown', 'just plain text', 5, []],
  ['incomplete bold', 'hello **world', 8, []], // no closing **
  ['incomplete italic', 'hello *world', 8, []], // no closing *

  // Multiple lines
  ['heading then text', '# Heading\nmore text', 12, [[0, 1]]],
  ['text then heading', 'text\n# Heading', 0, [[5, 6]]],

  // Whitespace variations
  ['heading with no space after #', '#Heading', 0, []], // not a valid heading
  ['bold with space inside', '**bold ** text', 8, []], // incomplete

  // Code blocks (should not hide)
  ['code block should not hide ticks', '```\ncode\n```', 6, []],
];

// Type alias for individual spec
export type Spec = typeof SPECS[number];
