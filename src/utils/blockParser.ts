/**
 * Block Parser Utility
 *
 * Parses block transclusion syntax: ![[Note#^blockid]]
 * Extracts note name and block ID for embedding specific blocks.
 */

export interface BlockReference {
  /** The target note name */
  note: string;
  /** The block ID (empty when picker should be shown) */
  blockId: string;
  /** Whether this is a block transclusion (has #^) */
  isBlockRef: boolean;
}

/**
 * Parses a block transclusion string
 * @param text - The text to parse (e.g., "![[Note#^blockid]]" or "[[Note#^blockid]]")
 * @returns Parsed block reference or null if not a valid block reference
 */
export function parseBlockReference(text: string): BlockReference | null {
  // Match both ![[Note#^blockid]] and [[Note#^blockid]]
  // The ^ indicates a block reference
  const blockRefRegex = /^!?\[\[([^\]]+?)#(\^([^\]]*))?\]\]$/;
  const match = text.match(blockRefRegex);

  if (!match) {
    return null;
  }

  const note = match[1];
  const blockIdSymbol = match[2]; // ^blockid or ^
  const blockId = match[3] || ''; // blockid or empty string

  // Only consider it a block reference if #^ is present
  if (!blockIdSymbol.startsWith('^')) {
    return null;
  }

  return {
    note,
    blockId,
    isBlockRef: true,
  };
}

/**
 * Extracts block reference from embed syntax
 * @param embedText - The embed text (e.g., "![[Note#^abc123]]")
 * @returns Block reference info or null
 */
export function parseEmbedBlockReference(embedText: string): BlockReference | null {
  return parseBlockReference(embedText);
}

/**
 * Checks if a string is an empty block reference (for picker UI)
 * @param text - The text to check
 * @returns True if this is ![[Note#^]] (empty block ID)
 */
export function isEmptyBlockReference(text: string): boolean {
  const ref = parseBlockReference(text);
  return ref !== null && ref.isBlockRef && ref.blockId === '';
}

/**
 * Formats a block reference string
 * @param note - The note name
 * @param blockId - The block ID
 * @param isEmbed - Whether this is an embed (![[...]]) or wikilink ([[...]])
 * @returns Formatted block reference string
 */
export function formatBlockReference(note: string, blockId: string, isEmbed = true): string {
  const prefix = isEmbed ? '!' : '';
  return `${prefix}[[${note}#^${blockId}]]`;
}

/**
 * Normalizes a block ID by removing invalid characters
 * Block IDs should only contain alphanumeric characters and hyphens
 * @param blockId - The block ID to normalize
 * @returns Normalized block ID
 */
export function normalizeBlockId(blockId: string): string {
  return blockId.replace(/[^a-zA-Z0-9-]/g, '');
}
