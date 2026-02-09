import { syntaxTree } from '@codemirror/language';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Range, EditorState, StateField, StateEffect, RangeSet } from '@codemirror/state';
import { logger } from '../utils/logger';
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
  /** Resolve heading transclusion */
  resolveHeading?: (note: string, heading: string) => { exists: boolean; content?: string; headingLevel?: number };
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
  resolveHeading: () => ({ exists: false }),
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

// Helper to find code blocks (excludes mermaid blocks which are handled separately)
function findCodeBlocks(state: EditorState): { from: number; to: number; language: string; code: string }[] {
  const blocks: ReturnType<typeof findCodeBlocks> = [];
  const doc = state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const match = line.text.match(/^```(\w*)$/);

    if (match) {
      const language = match[1] || 'text';

      // Skip mermaid blocks - they're handled separately by findMermaidBlocks
      if (language.toLowerCase() === 'mermaid') {
        // Find closing ``` and skip past it
        let endLine = i + 1;
        while (endLine <= doc.lines) {
          if (doc.line(endLine).text === '```') break;
          endLine++;
        }
        if (endLine <= doc.lines) {
          i = endLine;
        }
        continue;
      }
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

// Simple marker decoration for atomic ranges
const atomicMarker = Decoration.mark({});

// Cached block-level scan results — recomputed only on docChanged
interface BlockScanCache {
  codeBlocks: ReturnType<typeof findCodeBlocks>;
  mathBlocks: ReturnType<typeof findMathBlocks>;
  mermaidBlocks: ReturnType<typeof findMermaidBlocks>;
  callouts: ReturnType<typeof findCallouts>;
}

function computeBlockScans(state: EditorState): BlockScanCache {
  return {
    codeBlocks: findCodeBlocks(state),
    mathBlocks: findMathBlocks(state),
    mermaidBlocks: findMermaidBlocks(state),
    callouts: findCallouts(state),
  };
}

// === TREE SCAN CACHE ===
// Stores syntax tree node positions so we can skip re-walking the tree on cursor-only updates.
// Each entry records the node's name, range, and its innermost container parent range.

// Nodes whose decorations depend on cursor position
const CURSOR_SENSITIVE_MARKS = new Set([
  'HeaderMark', 'EmphasisMark', 'CodeMark', 'LinkMark',
  'StrikethroughMark', 'HighlightMark', 'URL',
]);

const CURSOR_SENSITIVE_WIDGETS = new Set([
  'Wikilink', 'Embed', 'Tag', 'Image', 'Link',
]);

// Styling-only nodes (cursor-independent)
const STYLE_NODES: Record<string, string> = {
  'StrongEmphasis': 'cm-strong',
  'Emphasis': 'cm-em',
  'InlineCode': 'cm-inline-code',
  'Strikethrough': 'cm-strikethrough',
  'Highlight': 'cm-highlight',
};

interface CachedTreeNode {
  name: string;
  from: number;
  to: number;
  // Innermost container parent (for cursor-in-parent checks)
  parentName: string | null;
  parentFrom: number;
  parentTo: number;
}

interface TreeScanCache {
  nodes: CachedTreeNode[];
  // Pre-computed cursor-independent decorations (styling marks, checkboxes)
  // These never change on selectionSet-only updates
  stableInlineDecos: Range<Decoration>[];
}

function buildTreeScanCache(state: EditorState, config: Required<LivePreviewConfig>): TreeScanCache {
  const nodes: CachedTreeNode[] = [];
  const stableInlineDecos: Range<Decoration>[] = [];
  const parentStack: { name: string; from: number; to: number }[] = [];
  const doc = state.doc;

  syntaxTree(state).iterate({
    enter(node) {
      if (CONTAINER_NODES.includes(node.name)) {
        parentStack.push({ name: node.name, from: node.from, to: node.to });
      }

      const parent = parentStack[parentStack.length - 1] ?? null;

      // Cursor-independent styling decorations
      const styleClass = STYLE_NODES[node.name];
      if (styleClass) {
        stableInlineDecos.push(Decoration.mark({ class: styleClass }).range(node.from, node.to));
        return;
      }

      // Heading styling (also cursor-independent)
      if (node.name.startsWith('ATXHeading') && !node.name.endsWith('Mark')) {
        const level = parseInt(node.name.slice(-1)) || 1;
        stableInlineDecos.push(Decoration.mark({ class: `cm-heading-${level}` }).range(node.from, node.to));
        return;
      }

      // Task checkboxes (cursor-independent)
      if (node.name === 'TaskMarker') {
        const text = doc.sliceString(node.from, node.to);
        const checked = text.includes('x') || text.includes('X');
        stableInlineDecos.push(
          Decoration.replace({
            widget: new CheckboxWidget(checked, node.from, config.onCheckboxToggle),
          }).range(node.from, node.to)
        );
        return;
      }

      // Cache cursor-sensitive nodes for fast replay
      if (CURSOR_SENSITIVE_MARKS.has(node.name) || CURSOR_SENSITIVE_WIDGETS.has(node.name)) {
        nodes.push({
          name: node.name,
          from: node.from,
          to: node.to,
          parentName: parent?.name ?? null,
          parentFrom: parent?.from ?? 0,
          parentTo: parent?.to ?? 0,
        });
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

  return { nodes, stableInlineDecos };
}

// Replay cursor-sensitive decorations using cached node positions.
// This is an O(k) array loop (k = cursor-sensitive nodes) instead of an O(n) tree walk.
function buildCursorSensitiveDecorations(
  cache: TreeScanCache,
  state: EditorState,
  config: Required<LivePreviewConfig>,
): { inlineDecorations: Range<Decoration>[]; blockDecorations: Range<Decoration>[]; blockRanges: { from: number; to: number }[] } {
  const inlineDecorations: Range<Decoration>[] = [...cache.stableInlineDecos];
  const blockDecorations: Range<Decoration>[] = [];
  const blockRanges: { from: number; to: number }[] = [];
  const resolvedEmbeds = new Set<string>();
  const { head: cursor } = state.selection.main;
  const cursorLine = state.doc.lineAt(cursor).number;
  const doc = state.doc;

  for (const node of cache.nodes) {
    const cursorInParent = node.parentName !== null && cursor >= node.parentFrom && cursor <= node.parentTo;
    const cursorOnLine = doc.lineAt(node.from).number === cursorLine;

    // === MARK HIDING ===
    if (node.name === 'HeaderMark') {
      if (!cursorOnLine) {
        inlineDecorations.push(Decoration.replace({ isHidden: true }).range(node.from, node.to));
      }
      continue;
    }

    if (node.name === 'EmphasisMark' || node.name === 'CodeMark' || node.name === 'LinkMark' ||
        node.name === 'StrikethroughMark' || node.name === 'HighlightMark') {
      if (node.name === 'CodeMark' && node.parentName === 'FencedCode') continue;
      if (!cursorInParent) {
        inlineDecorations.push(Decoration.replace({ isHidden: true }).range(node.from, node.to));
      }
      continue;
    }

    if (node.name === 'URL') {
      if (!cursorInParent) {
        inlineDecorations.push(Decoration.replace({ isHidden: true }).range(node.from, node.to));
      }
      continue;
    }

    // === WIDGETS ===
    if (node.name === 'Wikilink' && !cursorInParent) {
      const text = doc.sliceString(node.from, node.to);
      const match = text.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      if (match) {
        const target = match[1];
        const display = match[2] || target;
        const resolved = config.resolveWikilink(target);
        inlineDecorations.push(
          Decoration.replace({
            widget: new WikilinkWidget(target, display, resolved?.exists ?? false, config.onWikilinkClick, config.onWikilinkCmdClick),
          }).range(node.from, node.to)
        );
      }
      continue;
    }

    // Link/URL that might be a wikilink
    if ((node.name === 'Link' || node.name === 'URL') && !cursorInParent) {
      const text = doc.sliceString(node.from, node.to);
      const wikilinkMatch = text.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
      if (wikilinkMatch) {
        const target = wikilinkMatch[1];
        const display = wikilinkMatch[2] || target;
        const resolved = config.resolveWikilink(target);
        inlineDecorations.push(
          Decoration.replace({
            widget: new WikilinkWidget(target, display, resolved?.exists ?? false, config.onWikilinkClick, config.onWikilinkCmdClick),
          }).range(node.from, node.to)
        );
      }
      continue;
    }

    // Embeds (block-level)
    if (node.name === 'Embed' && !cursorInParent) {
      const text = doc.sliceString(node.from, node.to);
      const match = text.match(/!\[\[([^\]]+)\]\]/);
      if (match) {
        const target = match[1];
        const { path, params } = parseEmbedTarget(target);
        const resolved = config.resolveWikilink(path);
        blockRanges.push({ from: node.from, to: node.to });

        if (isImageFile(path)) {
          const imageSrc = config.resolveImage ? config.resolveImage(path) : path;
          blockDecorations.push(Decoration.replace({ widget: new ImageWidget(imageSrc, params.alt || path, params.width, params.height, params.title, params.align), block: true }).range(node.from, node.to));
        } else if (isVideoFile(path)) {
          const videoSrc = config.resolveImage ? config.resolveImage(path) : path;
          blockDecorations.push(Decoration.replace({ widget: new VideoWidget(videoSrc, params.width, params.height, params.autoplay, params.loop, params.muted, params.controls, params.align), block: true }).range(node.from, node.to));
        } else if (isPdfFile(path)) {
          const pdfSrc = config.resolveImage ? config.resolveImage(path) : path;
          blockDecorations.push(Decoration.replace({ widget: new PdfWidget(pdfSrc, params.page, params.width, params.height, params.toolbar, params.align), block: true }).range(node.from, node.to));
        } else {
          let content = resolved?.content ?? null;
          if (resolvedEmbeds.has(path)) { content = null; } else { resolvedEmbeds.add(path); }
          blockDecorations.push(Decoration.replace({ widget: new EmbedWidget(target, content, config.onWikilinkClick), block: true }).range(node.from, node.to));
        }
      }
      continue;
    }

    // Image nodes that are embeds (block-level)
    if (node.name === 'Image' && !cursorInParent) {
      const text = doc.sliceString(node.from, node.to);
      const embedMatch = text.match(/^!\[\[([^\]]+)\]\]$/);
      if (embedMatch) {
        const target = embedMatch[1];
        const { path, params } = parseEmbedTarget(target);
        const resolved = config.resolveWikilink(path);
        blockRanges.push({ from: node.from, to: node.to });

        if (isImageFile(path)) {
          const imageSrc = config.resolveImage ? config.resolveImage(path) : path;
          blockDecorations.push(Decoration.replace({ widget: new ImageWidget(imageSrc, params.alt || path, params.width, params.height, params.title, params.align), block: true }).range(node.from, node.to));
        } else if (isVideoFile(path)) {
          const videoSrc = config.resolveImage ? config.resolveImage(path) : path;
          blockDecorations.push(Decoration.replace({ widget: new VideoWidget(videoSrc, params.width, params.height, params.autoplay, params.loop, params.muted, params.controls, params.align), block: true }).range(node.from, node.to));
        } else {
          let content = resolved?.content ?? null;
          if (resolvedEmbeds.has(path)) { content = null; } else { resolvedEmbeds.add(path); }
          blockDecorations.push(Decoration.replace({ widget: new EmbedWidget(target, content, config.onWikilinkClick), block: true }).range(node.from, node.to));
        }
        continue;
      }

      // Standard markdown image (also block-level)
      const match = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        const alt = match[1];
        const src = config.resolveImage(match[2]);
        blockDecorations.push(Decoration.replace({ widget: new ImageWidget(src, alt), block: true }).range(node.from, node.to));
      }
      continue;
    }

    // Tags
    if (node.name === 'Tag' && !cursorInParent) {
      const tag = doc.sliceString(node.from + 1, node.to);
      inlineDecorations.push(Decoration.replace({ widget: new TagWidget(tag, config.onTagClick) }).range(node.from, node.to));
      continue;
    }
  }

  return { inlineDecorations, blockDecorations, blockRanges };
}

// Build decorations separated into inline and block categories
// Block decorations cannot be provided via ViewPlugin, they must use StateField
// Also returns blockRanges for atomicRanges facet
function buildAllDecorations(
  view: EditorView,
  config: LivePreviewConfig,
  cachedBlockScans?: BlockScanCache,
  cachedTreeScan?: TreeScanCache,
): { inline: DecorationSet; block: DecorationSet; blockRanges: { from: number; to: number }[] } {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { head: cursor } = view.state.selection.main;
  const cursorLine = view.state.doc.lineAt(cursor).number;
  const doc = view.state.doc;

  // Use cached tree scan if available (selectionSet-only updates)
  const treeScan = cachedTreeScan ?? buildTreeScanCache(view.state, fullConfig);
  const { inlineDecorations, blockDecorations, blockRanges } = buildCursorSensitiveDecorations(treeScan, view.state, fullConfig);

  // === BLOCK-LEVEL RENDERING ===
  // Use cached scans when available (selectionSet-only updates), otherwise compute fresh
  const blockScans = cachedBlockScans ?? computeBlockScans(view.state);

  // Code blocks (hide ticks, show rendered code)
  for (const block of blockScans.codeBlocks) {
    const startLine = doc.lineAt(block.from);
    const endLine = doc.lineAt(block.to);
    const cursorInsideBlock = cursorLine >= startLine.number && cursorLine <= endLine.number;

    if (!cursorInsideBlock) {
      blockRanges.push({ from: block.from, to: block.to });
      blockDecorations.push(
        Decoration.replace({
          widget: new CodeBlockWidget(block.code, block.language),
          block: true,
        }).range(block.from, block.to)
      );
    }
  }

  // Math blocks
  for (const block of blockScans.mathBlocks) {
    if (block.display) {
      const startLine = doc.lineAt(block.from);
      const endLine = doc.lineAt(block.to);
      const cursorInsideBlock = cursorLine >= startLine.number && cursorLine <= endLine.number;

      if (!cursorInsideBlock) {
        blockRanges.push({ from: block.from, to: block.to });
        blockDecorations.push(
          Decoration.replace({
            widget: new MathWidget(block.latex, block.display),
            block: true,
          }).range(block.from, block.to)
        );
      }
    } else {
      const cursorInRange = cursor >= block.from && cursor <= block.to;
      if (!cursorInRange) {
        inlineDecorations.push(
          Decoration.replace({
            widget: new MathWidget(block.latex, block.display),
          }).range(block.from, block.to)
        );
      }
    }
  }

  // Mermaid diagrams
  for (const block of blockScans.mermaidBlocks) {
    const startLine = doc.lineAt(block.from);
    const endLine = doc.lineAt(block.to);
    const cursorInsideBlock = cursorLine >= startLine.number && cursorLine <= endLine.number;

    if (!cursorInsideBlock) {
      blockRanges.push({ from: block.from, to: block.to });
      blockDecorations.push(
        Decoration.replace({
          widget: new MermaidWidget(block.code),
          block: true,
        }).range(block.from, block.to)
      );
    }
  }

  // Callouts
  for (const callout of blockScans.callouts) {
    const startLine = doc.lineAt(callout.from);
    const endLine = doc.lineAt(callout.to);
    if (cursorLine >= startLine.number && cursorLine <= endLine.number) {
      continue;
    }
    blockRanges.push({ from: callout.from, to: callout.to });
    blockDecorations.push(
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

  return {
    inline: Decoration.set(inlineDecorations, true),
    block: Decoration.set(blockDecorations, true),
    blockRanges,
  };
}

// Effect to update block decorations in the StateField
const setBlockDecorations = StateEffect.define<DecorationSet>();

// Effect to update atomic ranges (for cursor motion around block widgets)
const setAtomicRanges = StateEffect.define<RangeSet<Decoration>>();

export function createLivePreview(config: LivePreviewConfig = {}) {
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config };
  const refreshTrigger = resolvedConfig.refreshTrigger;
  let lastRefreshTrigger = refreshTrigger?.current ?? 0;

  // StateField for block decorations (required by CodeMirror for block-level widgets)
  const blockDecorationsField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(value, tr) {
      // Check for our effect to update decorations
      for (const effect of tr.effects) {
        if (effect.is(setBlockDecorations)) {
          return effect.value;
        }
      }
      // Map through document changes
      if (tr.docChanged) {
        return value.map(tr.changes);
      }
      return value;
    },
    provide: (field) => EditorView.decorations.from(field),
  });

  // StateField for atomic ranges (used by cursor motion to skip over block widgets)
  const atomicRangesField = StateField.define<RangeSet<Decoration>>({
    create() {
      logger.debug('livePreview', 'atomicRangesField.create()');
      return RangeSet.empty;
    },
    update(value, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setAtomicRanges)) {
          logger.debug('livePreview', 'atomicRangesField.update() - setAtomicRanges effect');
          return effect.value;
        }
      }
      if (tr.docChanged) {
        logger.debug('livePreview', 'atomicRangesField.update() - docChanged');
        return value.map(tr.changes);
      }
      return value;
    },
    provide: (field) => EditorView.atomicRanges.of((view) => {
      logger.debug('livePreview', 'atomicRanges.of() provider called');
      return view.state.field(field);
    }),
  });

  // ViewPlugin for inline decorations and coordinating block decoration updates
  const livePreviewPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      pendingBlockUpdate: DecorationSet | null = null;
      pendingAtomicRanges: RangeSet<Decoration> | null = null;
      blockScanCache: BlockScanCache | null = null;
      treeScanCache: TreeScanCache | null = null;

      constructor(view: EditorView) {
        // Initial build: compute everything fresh, cache both scans
        this.blockScanCache = computeBlockScans(view.state);
        this.treeScanCache = buildTreeScanCache(view.state, resolvedConfig);
        const result = buildAllDecorations(view, resolvedConfig, this.blockScanCache, this.treeScanCache);
        this.decorations = result.inline;
        // Store pending block updates — dispatched by the updateListener (not rAF)
        this.pendingBlockUpdate = result.block;
        this.pendingAtomicRanges = this.buildAtomicRanges(result.blockRanges);
      }

      buildAtomicRanges(ranges: { from: number; to: number }[]): RangeSet<Decoration> {
        if (ranges.length === 0) return RangeSet.empty;
        const sorted = [...ranges].sort((a, b) => a.from - b.from);
        const markers: Range<Decoration>[] = sorted.map((r) => atomicMarker.range(r.from, r.to));
        return RangeSet.of(markers);
      }

      update(update: ViewUpdate) {
        // Skip if this update was caused by our own block-decoration dispatch
        const isOwnUpdate = update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(setBlockDecorations) || e.is(setAtomicRanges))
        );
        if (isOwnUpdate) {
          return;
        }

        const currentTrigger = refreshTrigger?.current ?? 0;
        const triggerChanged = currentTrigger !== lastRefreshTrigger;

        // Determine if content actually changed (vs just cursor/selection)
        const contentChanged = update.docChanged ||
          update.viewportChanged ||
          triggerChanged ||
          syntaxTree(update.startState) !== syntaxTree(update.state);

        if (contentChanged || update.selectionSet) {
          // Invalidate caches only when content changes
          if (contentChanged) {
            this.blockScanCache = computeBlockScans(update.view.state);
            this.treeScanCache = buildTreeScanCache(update.view.state, resolvedConfig);
          }
          // On selectionSet-only: reuse cached tree + block scans (O(k) replay, no tree walk)

          const result = buildAllDecorations(
            update.view, resolvedConfig,
            this.blockScanCache ?? undefined,
            this.treeScanCache ?? undefined,
          );
          this.decorations = result.inline;
          // Store pending block updates — dispatched by the updateListener
          this.pendingBlockUpdate = result.block;
          this.pendingAtomicRanges = this.buildAtomicRanges(result.blockRanges);

          if (triggerChanged) {
            lastRefreshTrigger = currentTrigger;
          }
        }
      }

      destroy() {
        this.pendingBlockUpdate = null;
        this.pendingAtomicRanges = null;
        this.blockScanCache = null;
        this.treeScanCache = null;
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

  // updateListener fires AFTER the ViewPlugin.update() cycle completes,
  // so it's safe to dispatch here. This eliminates the rAF double-render:
  // block decorations are now delivered in the same update round.
  const blockDecorationDispatcher = EditorView.updateListener.of((update) => {
    // Skip our own dispatches to avoid infinite loops
    const isOwnUpdate = update.transactions.some((tr) =>
      tr.effects.some((e) => e.is(setBlockDecorations) || e.is(setAtomicRanges))
    );
    if (isOwnUpdate) return;

    const plugin = update.view.plugin(livePreviewPlugin);
    if (!plugin) return;

    const effects: StateEffect<any>[] = [];
    if (plugin.pendingBlockUpdate) {
      effects.push(setBlockDecorations.of(plugin.pendingBlockUpdate));
      plugin.pendingBlockUpdate = null;
    }
    if (plugin.pendingAtomicRanges) {
      effects.push(setAtomicRanges.of(plugin.pendingAtomicRanges));
      plugin.pendingAtomicRanges = null;
    }
    if (effects.length > 0) {
      update.view.dispatch({ effects });
    }
  });

  return [blockDecorationsField, atomicRangesField, livePreviewPlugin, blockDecorationDispatcher];
}

// Static version for tests (no config) - returns just inline decorations to avoid the error
export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    treeScanCache: TreeScanCache | null = null;
    blockScanCache: BlockScanCache | null = null;

    constructor(view: EditorView) {
      this.treeScanCache = buildTreeScanCache(view.state, DEFAULT_CONFIG);
      this.blockScanCache = computeBlockScans(view.state);
      const result = buildAllDecorations(view, DEFAULT_CONFIG, this.blockScanCache, this.treeScanCache);
      this.decorations = result.inline;
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        if (update.docChanged) {
          this.treeScanCache = buildTreeScanCache(update.view.state, DEFAULT_CONFIG);
          this.blockScanCache = computeBlockScans(update.view.state);
        }
        const result = buildAllDecorations(update.view, DEFAULT_CONFIG, this.blockScanCache ?? undefined, this.treeScanCache ?? undefined);
        this.decorations = result.inline;
      }
    }
  },
  { decorations: (v) => v.decorations }
);
