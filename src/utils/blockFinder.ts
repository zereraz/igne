/**
 * Block Finder Utility
 *
 * Scans notes for block IDs and extracts block content.
 * Blocks are defined by the ^block-id syntax.
 */

export interface BlockInfo {
  /** The block ID (without the ^) */
  id: string;
  /** The line number where the block starts (1-indexed) */
  line: number;
  /** The type of block */
  type: BlockType;
  /** The content of the block (including the block ID) */
  content: string;
  /** The character position where the block starts */
  position: number;
}

export type BlockType =
  | 'paragraph'
  | 'list'
  | 'callout'
  | 'quote'
  | 'code'
  | 'heading'
  | 'task'
  | 'table'
  | 'unknown';

/**
 * Block index for caching block lookups
 */
interface BlockIndex {
  [notePath: string]: {
    blocks: BlockInfo[];
    timestamp: number;
  };
}

// Simple in-memory cache
const blockIndex: BlockIndex = {};
const CACHE_TTL = 5000; // 5 seconds
let indexTimestamp = 0;

/**
 * Parses a line to determine its block type
 */
function parseBlockType(line: string): BlockType {
  const trimmed = line.trim();

  // Callout: > [!type] or just >
  if (trimmed.startsWith('>')) {
    return trimmed.match(/^>\s*\[!/) ? 'callout' : 'quote';
  }

  // Code block
  if (trimmed.match(/^```/)) {
    return 'code';
  }

  // Heading
  if (trimmed.startsWith('#')) {
    return 'heading';
  }

  // Task list
  if (trimmed.match(/^\s*[-*+]\s*\[[ xX]\]/)) {
    return 'task';
  }

  // Regular list
  if (trimmed.match(/^\s*[-*+]\s/) || trimmed.match(/^\s*\d+\.\s/)) {
    return 'list';
  }

  // Table
  if (trimmed.includes('|')) {
    return 'table';
  }

  return 'paragraph';
}

/**
 * Extracts the block ID from a line
 * @param line - The line to parse
 * @returns The block ID (without ^) or null
 */
export function extractBlockId(line: string): string | null {
  const match = line.match(/\^([a-zA-Z0-9-]+)\s*$/);
  return match ? match[1] : null;
}

/**
 * Finds all blocks in a note content
 * @param content - The note content
 * @param notePath - Optional path for caching
 * @returns Array of block info
 */
export function findBlocks(content: string, notePath?: string): BlockInfo[] {
  // Check cache first
  if (notePath && blockIndex[notePath]) {
    const cached = blockIndex[notePath];
    const now = Date.now();
    if (now - cached.timestamp < CACHE_TTL && indexTimestamp === cached.timestamp) {
      return cached.blocks;
    }
  }

  const blocks: BlockInfo[] = [];
  const lines = content.split('\n');
  let position = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const blockId = extractBlockId(line);

    if (blockId) {
      blocks.push({
        id: blockId,
        line: i + 1,
        type: parseBlockType(line),
        content: line,
        position,
      });
    }

    position += line.length + 1; // +1 for newline
  }

  // Cache the results
  if (notePath) {
    const now = Date.now();
    blockIndex[notePath] = {
      blocks,
      timestamp: now,
    };
    indexTimestamp = now;
  }

  return blocks;
}

/**
 * Finds a specific block by ID in a note
 * @param content - The note content
 * @param blockId - The block ID to find
 * @param notePath - Optional path for caching
 * @returns Block info or null if not found
 */
export function findBlockById(content: string, blockId: string, notePath?: string): BlockInfo | null {
  const blocks = findBlocks(content, notePath);
  return blocks.find((b) => b.id === blockId) || null;
}

/**
 * Extracts the full content of a block including its children
 * For lists, callouts, quotes - includes nested content
 * @param content - The full note content
 * @param blockInfo - The block info from findBlockById
 * @returns The full block content with context
 */
export function extractBlockContent(content: string, blockInfo: BlockInfo): string {
  const lines = content.split('\n');
  const startLine = blockInfo.line - 1; // Convert to 0-indexed

  // For simple blocks, just return the line
  const type = blockInfo.type;
  if (type === 'paragraph' || type === 'heading' || type === 'task') {
    return blockInfo.content;
  }

  // For structured blocks, find the extent
  const indent = getIndentLevel(lines[startLine]);
  let endLine = startLine;

  // For lists, callouts, quotes - include all nested content
  if (type === 'list' || type === 'callout' || type === 'quote') {
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const lineIndent = getIndentLevel(line);
      const trimmed = line.trim();

      // Continue while lines are indented more than the parent
      // or same level (for list items)
      // or same level with quote prefix (for callout/quote continuation)
      if (lineIndent > indent ||
          (lineIndent === indent && isListItem(line)) ||
          (lineIndent === indent && trimmed.startsWith('>'))) {
        endLine = i;
      } else if (lineIndent <= indent && trimmed !== '' && !trimmed.startsWith('>')) {
        break;
      }
    }
  }

  // Extract the content range
  return lines.slice(startLine, endLine + 1).join('\n');
}

/**
 * Gets the indentation level of a line
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Checks if a line is a list item
 */
function isListItem(line: string): boolean {
  return /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line);
}

/**
 * Clears the block cache for a specific note
 * Call this when a note is modified
 */
export function clearBlockCache(notePath?: string): void {
  if (notePath) {
    delete blockIndex[notePath];
  } else {
    // Clear all cache
    Object.keys(blockIndex).forEach((key) => delete blockIndex[key]);
  }
  indexTimestamp = Date.now();
}

/**
 * Gets all block IDs for a note (for autocomplete/picker)
 * @param content - The note content
 * @param notePath - Optional path for caching
 * @returns Array of block IDs with preview text
 */
export function getBlockList(content: string, notePath?: string): Array<{
  id: string;
  line: number;
  type: BlockType;
  preview: string;
}> {
  const blocks = findBlocks(content, notePath);
  return blocks.map((b) => ({
    id: b.id,
    line: b.line,
    type: b.type,
    preview: b.content.replace(/\^([a-zA-Z0-9-]+)\s*$/, '').trim(),
  }));
}
