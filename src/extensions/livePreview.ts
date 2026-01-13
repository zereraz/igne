import { syntaxTree } from '@codemirror/language';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Range, EditorState } from '@codemirror/state';
import {
  WikilinkWidget,
  EmbedWidget,
  TagWidget,
  CheckboxWidget,
  ImageWidget,
  VideoWidget,
  PdfWidget,
  MathWidget,
  CodeBlockWidget,
  CalloutWidget,
  MermaidWidget,
} from './widgets';
import {
  parseEmbedTarget,
  isImageFile,
  isVideoFile,
  isPdfFile,
} from '../utils/embedParams';

export interface LivePreviewConfig {
  onWikilinkClick?: (target: string) => void;
  onWikilinkCmdClick?: (target: string) => void;
  onTagClick?: (tag: string) => void;
  onCheckboxToggle?: (pos: number, checked: boolean) => void;
  onCalloutToggle?: (pos: number) => void;
  resolveWikilink?: (target: string) => { exists: boolean; content?: string } | null;
  resolveImage?: (src: string) => string;
  /** External trigger to force decoration rebuild when files change */
  refreshTrigger?: { current: number };
}

const DEFAULT_CONFIG: Required<LivePreviewConfig> = {
  onWikilinkClick: () => {},
  onWikilinkCmdClick: () => {},
  onTagClick: () => {},
  onCheckboxToggle: () => {},
  onCalloutToggle: () => {},
  resolveWikilink: () => null,
  resolveImage: (src) => src,
  refreshTrigger: { current: 0 },
};

const CONTAINER_NODES = [
  'StrongEmphasis',
  'Emphasis',
  'Link',
  'InlineCode',
  'ATXHeading1',
  'ATXHeading2',
  'ATXHeading3',
  'ATXHeading4',
  'ATXHeading5',
  'ATXHeading6',
  'Strikethrough',
  'Highlight',
  'Wikilink',
  'Embed',
  'Tag',
  'Blockquote',
  'BulletList',
  'OrderedList',
  'ListItem',
  'FencedCode',
];

// List of mark node types (for reference, not directly used)
// These are hidden via cursor-based logic below
// const MARK_NODES = [
//   'HeaderMark', 'EmphasisMark', 'CodeMark', 'LinkMark', 'URL',
//   'StrikethroughMark', 'HighlightMark', 'WikilinkMark', 'EmbedMark',
//   'TagMark', 'QuoteMark', 'ListMark', 'BlockIDMark',
// ];

// Helper to find code blocks
function findCodeBlocks(state: EditorState): { from: number; to: number; language: string; code: string }[] {
  const blocks: ReturnType<typeof findCodeBlocks> = [];
  const doc = state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const match = line.text.match(/^```(\w*)$/);

    if (match) {
      const language = match[1] || 'text';
      const startLine = i;

      // Find closing ```
      let endLine = i + 1;
      while (endLine <= doc.lines) {
        if (doc.line(endLine).text === '```') break;
        endLine++;
      }

      if (endLine <= doc.lines) {
        const codeLines: string[] = [];
        for (let j = startLine + 1; j < endLine; j++) {
          codeLines.push(doc.line(j).text);
        }

        blocks.push({
          from: line.from,
          to: doc.line(endLine).to,
          language,
          code: codeLines.join('\n'),
        });

        i = endLine;
      }
    }
  }

  return blocks;
}

// Helper to find callouts
function findCallouts(
  state: EditorState
): { from: number; to: number; type: string; title: string; content: string; folded: boolean }[] {
  const callouts: ReturnType<typeof findCallouts> = [];
  const doc = state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const match = line.text.match(/^>\s*\[!(\w+)\]([+-])?\s*(.*)?$/);

    if (match) {
      const type = match[1].toLowerCase();
      const folded = match[2] === '-';
      const title = match[3] || '';

      // Find extent of callout (all following > lines)
      let endLine = i;
      while (endLine < doc.lines) {
        const nextLine = doc.line(endLine + 1);
        if (!nextLine.text.startsWith('>')) break;
        endLine++;
      }

      // Extract content (lines after header, stripped of >)
      const contentLines: string[] = [];
      for (let j = i + 1; j <= endLine; j++) {
        contentLines.push(doc.line(j).text.replace(/^>\s?/, ''));
      }

      callouts.push({
        from: line.from,
        to: doc.line(endLine).to,
        type,
        title,
        content: contentLines.join('\n'),
        folded,
      });

      i = endLine; // Skip processed lines
    }
  }

  return callouts;
}

// Helper to find math blocks
function findMathBlocks(state: EditorState): { from: number; to: number; latex: string; display: boolean }[] {
  const blocks: ReturnType<typeof findMathBlocks> = [];
  const text = state.doc.toString();

  // Block math $$...$$
  const blockRegex = /\$\$\n?([\s\S]+?)\n?\$\$/g;
  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    blocks.push({
      from: match.index,
      to: match.index + match[0].length,
      latex: match[1],
      display: true,
    });
  }

  // Inline math $...$
  const inlineRegex = /\$([^\$\n]+)\$/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    // Skip if inside block math
    if (blocks.some((b) => match!.index >= b.from && match!.index < b.to)) continue;

    blocks.push({
      from: match.index,
      to: match.index + match[0].length,
      latex: match[1],
      display: false,
    });
  }

  return blocks;
}

// Helper to find mermaid blocks
function findMermaidBlocks(state: EditorState): { from: number; to: number; code: string }[] {
  const blocks: ReturnType<typeof findMermaidBlocks> = [];
  const doc = state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const match = line.text.match(/^```mermaid$/i);

    if (match) {
      const startLine = i;

      // Find closing ```
      let endLine = i + 1;
      while (endLine <= doc.lines) {
        if (doc.line(endLine).text === '```') break;
        endLine++;
      }

      if (endLine <= doc.lines) {
        const codeLines: string[] = [];
        for (let j = startLine + 1; j < endLine; j++) {
          codeLines.push(doc.line(j).text);
        }

        blocks.push({
          from: line.from,
          to: doc.line(endLine).to,
          code: codeLines.join('\n'),
        });

        i = endLine;
      }
    }
  }

  return blocks;
}

function buildDecorations(view: EditorView, config: LivePreviewConfig): DecorationSet {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const decorations: Range<Decoration>[] = [];
  const { head: cursor } = view.state.selection.main;
  const cursorLine = view.state.doc.lineAt(cursor).number;
  const doc = view.state.doc;

  let parentStack: { name: string; from: number; to: number }[] = [];

  // === SYNTAX TREE ITERATION ===
  syntaxTree(view.state).iterate({
    enter(node) {
      // Track container nodes
      if (CONTAINER_NODES.includes(node.name)) {
        parentStack.push({ name: node.name, from: node.from, to: node.to });
      }

      const parent = parentStack[parentStack.length - 1];
      const cursorInParent = parent && cursor >= parent.from && cursor <= parent.to;
      const cursorOnLine = view.state.doc.lineAt(node.from).number === cursorLine;

      // === MARK HIDING ===

      // Line-based hiding (headers)
      if (node.name === 'HeaderMark') {
        if (!cursorOnLine) {
          decorations.push(Decoration.replace({ isHidden: true }).range(node.from, node.to));
        }
        return;
      }

      // Parent-based hiding (inline marks)
      // Skip CodeMark hiding for FencedCode (code blocks are handled separately)
      if (['EmphasisMark', 'CodeMark', 'LinkMark', 'StrikethroughMark', 'HighlightMark'].includes(node.name)) {
        // Don't hide CodeMark when parent is FencedCode
        if (node.name === 'CodeMark' && parent?.name === 'FencedCode') {
          return;
        }
        if (!cursorInParent) {
          decorations.push(Decoration.replace({ isHidden: true }).range(node.from, node.to));
        }
        return;
      }

      // URL and link marks hide when cursor outside link
      if (node.name === 'URL' || node.name === 'LinkMark') {
        if (!cursorInParent) {
          decorations.push(Decoration.replace({ isHidden: true }).range(node.from, node.to));
        }
        return;
      }

      // === STYLING ===

      // Headings
      if (node.name.startsWith('ATXHeading')) {
        const level = parseInt(node.name.slice(-1)) || 1;
        decorations.push(Decoration.mark({ class: `cm-heading-${level}` }).range(node.from, node.to));
        return;
      }

      // Bold
      if (node.name === 'StrongEmphasis') {
        decorations.push(Decoration.mark({ class: 'cm-strong' }).range(node.from, node.to));
        return;
      }

      // Italic
      if (node.name === 'Emphasis') {
        decorations.push(Decoration.mark({ class: 'cm-em' }).range(node.from, node.to));
        return;
      }

      // Inline code
      if (node.name === 'InlineCode') {
        decorations.push(Decoration.mark({ class: 'cm-inline-code' }).range(node.from, node.to));
        return;
      }

      // Strikethrough
      if (node.name === 'Strikethrough') {
        decorations.push(Decoration.mark({ class: 'cm-strikethrough' }).range(node.from, node.to));
        return;
      }

      // Fallback: detect strikethrough in Emphasis nodes
      if (node.name === 'Emphasis') {
        const text = doc.sliceString(node.from, node.to);
        if (text.startsWith('~~') && text.endsWith('~~')) {
          decorations.push(Decoration.mark({ class: 'cm-strikethrough' }).range(node.from, node.to));
          return;
        }
      }

      // Highlight
      if (node.name === 'Highlight') {
        decorations.push(Decoration.mark({ class: 'cm-highlight' }).range(node.from, node.to));
        return;
      }

      // Fallback: detect highlight in Emphasis nodes
      if (node.name === 'Emphasis' || node.name === 'StrongEmphasis') {
        const text = doc.sliceString(node.from, node.to);
        if (text.startsWith('==') && text.endsWith('==')) {
          decorations.push(Decoration.mark({ class: 'cm-highlight' }).range(node.from, node.to));
          return;
        }
      }

      // === WIDGETS ===

      // Wikilinks - render as pills when cursor is NOT inside
      // When cursor touches the wikilink, show raw [[link]] for editing
      if (node.name === 'Wikilink' && !cursorInParent) {
        const text = doc.sliceString(node.from, node.to);
        const match = text.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
        if (match) {
          const target = match[1];
          const display = match[2] || target;
          const resolved = fullConfig.resolveWikilink(target);

          decorations.push(
            Decoration.replace({
              widget: new WikilinkWidget(
                target,
                display,
                resolved?.exists ?? false,
                fullConfig.onWikilinkClick,
                fullConfig.onWikilinkCmdClick
              ),
            }).range(node.from, node.to)
          );
        }
        return;
      }

      // Handle Link nodes that are actually wikilinks (parsed as links by standard parser)
      // Only render as widget when cursor is NOT inside
      if ((node.name === 'Link' || node.name === 'URL') && !cursorInParent) {
        const text = doc.sliceString(node.from, node.to);
        // Check if this looks like a wikilink [[...]]
        const wikilinkMatch = text.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
        if (wikilinkMatch) {
          const target = wikilinkMatch[1];
          const display = wikilinkMatch[2] || target;
          const resolved = fullConfig.resolveWikilink(target);

          decorations.push(
            Decoration.replace({
              widget: new WikilinkWidget(
                target,
                display,
                resolved?.exists ?? false,
                fullConfig.onWikilinkClick,
                fullConfig.onWikilinkCmdClick
              ),
            }).range(node.from, node.to)
          );
          return;
        }
      }

      // Embeds - render content inline when cursor outside
      if (node.name === 'Embed' && !cursorInParent) {
        const text = doc.sliceString(node.from, node.to);
        const match = text.match(/!\[\[([^\]]+)\]\]/);
        if (match) {
          const target = match[1];
          const { path, params } = parseEmbedTarget(target);
          const resolved = fullConfig.resolveWikilink(path);

          // Determine embed type based on file extension
          if (isImageFile(path)) {
            // Image embed with parameters
            const imageSrc = fullConfig.resolveImage ? fullConfig.resolveImage(path) : path;
            decorations.push(
              Decoration.replace({
                widget: new ImageWidget(
                  imageSrc,
                  params.alt || path,
                  params.width,
                  params.height,
                  params.title,
                  params.align
                ),
                block: true,
              }).range(node.from, node.to)
            );
          } else if (isVideoFile(path)) {
            // Video embed with parameters
            const videoSrc = fullConfig.resolveImage ? fullConfig.resolveImage(path) : path;
            decorations.push(
              Decoration.replace({
                widget: new VideoWidget(
                  videoSrc,
                  params.width,
                  params.height,
                  params.autoplay,
                  params.loop,
                  params.muted,
                  params.controls,
                  params.align
                ),
                block: true,
              }).range(node.from, node.to)
            );
          } else if (isPdfFile(path)) {
            // PDF embed with parameters
            const pdfSrc = fullConfig.resolveImage ? fullConfig.resolveImage(path) : path;
            decorations.push(
              Decoration.replace({
                widget: new PdfWidget(
                  pdfSrc,
                  params.page,
                  params.width,
                  params.height,
                  params.toolbar,
                  params.align
                ),
                block: true,
              }).range(node.from, node.to)
            );
          } else {
            // Default note embed
            decorations.push(
              Decoration.replace({
                widget: new EmbedWidget(
                  target,
                  resolved?.content ?? null,
                  fullConfig.onWikilinkClick
                ),
                block: true,
              }).range(node.from, node.to)
            );
          }
        }
        return;
      }

      // Handle Image nodes that are actually embeds (parsed as images by standard parser)
      if (node.name === 'Image' && !cursorInParent) {
        const text = doc.sliceString(node.from, node.to);
        const embedMatch = text.match(/^!\[\[([^\]]+)\]\]$/);
        if (embedMatch) {
          const target = embedMatch[1];
          const { path, params } = parseEmbedTarget(target);
          const resolved = fullConfig.resolveWikilink(path);

          // Determine embed type based on file extension
          if (isImageFile(path)) {
            // Image embed with parameters
            const imageSrc = fullConfig.resolveImage ? fullConfig.resolveImage(path) : path;
            decorations.push(
              Decoration.replace({
                widget: new ImageWidget(
                  imageSrc,
                  params.alt || path,
                  params.width,
                  params.height,
                  params.title,
                  params.align
                ),
                block: true,
              }).range(node.from, node.to)
            );
          } else if (isVideoFile(path)) {
            // Video embed with parameters
            const videoSrc = fullConfig.resolveImage ? fullConfig.resolveImage(path) : path;
            decorations.push(
              Decoration.replace({
                widget: new VideoWidget(
                  videoSrc,
                  params.width,
                  params.height,
                  params.autoplay,
                  params.loop,
                  params.muted,
                  params.controls,
                  params.align
                ),
                block: true,
              }).range(node.from, node.to)
            );
            return;
          } else {
            // Default note embed
            decorations.push(
              Decoration.replace({
                widget: new EmbedWidget(
                  target,
                  resolved?.content ?? null,
                  fullConfig.onWikilinkClick
                ),
                block: true,
              }).range(node.from, node.to)
            );
          }
          return;
        }
      }

      // Tags - render as pills when cursor outside
      if (node.name === 'Tag' && !cursorInParent) {
        const tag = doc.sliceString(node.from + 1, node.to); // skip #
        decorations.push(
          Decoration.replace({
            widget: new TagWidget(tag, fullConfig.onTagClick),
          }).range(node.from, node.to)
        );
        return;
      }

      // Task checkboxes
      if (node.name === 'TaskMarker') {
        const text = doc.sliceString(node.from, node.to);
        const checked = text.includes('x') || text.includes('X');
        decorations.push(
          Decoration.replace({
            widget: new CheckboxWidget(checked, node.from, fullConfig.onCheckboxToggle),
          }).range(node.from, node.to)
        );
        return;
      }

      // Images
      if (node.name === 'Image' && !cursorInParent) {
        const text = doc.sliceString(node.from, node.to);
        const match = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) {
          const alt = match[1];
          const src = fullConfig.resolveImage(match[2]);
          decorations.push(
            Decoration.replace({
              widget: new ImageWidget(src, alt),
              block: true,
            }).range(node.from, node.to)
          );
        }
        return;
      }
    },
    leave(node) {
      if (
        parentStack.length &&
        parentStack[parentStack.length - 1].from === node.from &&
        parentStack[parentStack.length - 1].to === node.to
      ) {
        parentStack.pop();
      }
    },
  });

  // === BLOCK-LEVEL RENDERING ===

  // Code blocks (hide ticks, show rendered code)
  const codeBlocks = findCodeBlocks(view.state);
  for (const block of codeBlocks) {
    const line = doc.lineAt(block.from);
    if (line.number !== cursorLine && cursor >= block.from && cursor <= block.to) {
      // Cursor inside code block, show raw
      continue;
    }
    if (cursor < block.from || cursor > block.to) {
      decorations.push(
        Decoration.replace({
          widget: new CodeBlockWidget(block.code, block.language),
          block: true,
        }).range(block.from, block.to)
      );
    }
  }

  // Math blocks
  const mathBlocks = findMathBlocks(view.state);
  for (const block of mathBlocks) {
    if (cursor >= block.from && cursor <= block.to) continue; // Cursor inside, show raw
    decorations.push(
      Decoration.replace({
        widget: new MathWidget(block.latex, block.display),
        block: block.display,
      }).range(block.from, block.to)
    );
  }

  // Mermaid diagrams
  const mermaidBlocks = findMermaidBlocks(view.state);
  for (const block of mermaidBlocks) {
    if (cursor >= block.from && cursor <= block.to) continue; // Cursor inside, show raw
    decorations.push(
      Decoration.replace({
        widget: new MermaidWidget(block.code),
        block: true,
      }).range(block.from, block.to)
    );
  }

  // Callouts
  const callouts = findCallouts(view.state);
  for (const callout of callouts) {
    const startLine = doc.lineAt(callout.from);
    const endLine = doc.lineAt(callout.to);
    if (cursorLine >= startLine.number && cursorLine <= endLine.number) {
      // Cursor inside callout, show raw
      continue;
    }
    decorations.push(
      Decoration.replace({
        widget: new CalloutWidget(
          callout.type,
          callout.title,
          callout.content,
          callout.folded,
          () => fullConfig.onCalloutToggle(callout.from)
        ),
        block: true,
      }).range(callout.from, callout.to)
    );
  }

  return Decoration.set(decorations, true);
}

export function createLivePreview(config: LivePreviewConfig = {}) {
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config };
  const refreshTrigger = resolvedConfig.refreshTrigger;
  let lastRefreshTrigger = refreshTrigger?.current ?? 0;

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, resolvedConfig);
      }

      update(update: ViewUpdate) {
        // Rebuild decorations when files change (refreshTrigger incremented)
        const currentTrigger = refreshTrigger?.current ?? 0;
        const triggerChanged = currentTrigger !== lastRefreshTrigger;

        if (update.docChanged || update.selectionSet || update.viewportChanged || triggerChanged) {
          this.decorations = buildDecorations(update.view, resolvedConfig);
          if (triggerChanged) {
            lastRefreshTrigger = currentTrigger;
          }
        }
      }
    },
    { decorations: (v) => v.decorations }
  );
}

// Static version for tests (no config)
export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view, DEFAULT_CONFIG);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view, DEFAULT_CONFIG);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
