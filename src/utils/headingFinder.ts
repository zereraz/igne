/**
 * Find headings and their content in markdown notes
 *
 * This module provides utilities to:
 * - Find all headings in a markdown document
 * - Extract content under a specific heading
 * - Handle nested heading hierarchies
 */

export interface HeadingInfo {
  text: string;
  level: number;
  line: number;
  position: number; // offset in document
}

export interface HeadingContent {
  heading: HeadingInfo;
  content: string;
  includesNested: boolean; // whether content includes nested headings
}

/**
 * Parse all headings from markdown content
 * @param content - The markdown content
 * @returns Array of heading information
 */
export function findAllHeadings(content: string): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  const lines = content.split('\n');
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      const level = match[1].length;
      const text = match[2].trim();

      headings.push({
        text,
        level,
        line: i,
        position: offset,
      });
    }

    offset += line.length + 1; // +1 for newline
  }

  return headings;
}

/**
 * Find a specific heading by text
 * @param content - The markdown content
 * @param headingText - The heading text to search for
 * @returns The heading info or null if not found
 */
export function findHeading(content: string, headingText: string): HeadingInfo | null {
  const headings = findAllHeadings(content);

  // Try exact match first
  const exactMatch = headings.find((h) => h.text === headingText);
  if (exactMatch) {
    return exactMatch;
  }

  // Try case-insensitive match
  const caseInsensitiveMatch = headings.find((h) => h.text.toLowerCase() === headingText.toLowerCase());
  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  return null;
}

/**
 * Extract content under a specific heading
 * Content includes everything from the heading to the next heading of same or higher level
 * @param content - The markdown content
 * @param headingText - The heading text
 * @returns The heading content or null if not found
 */
export function extractHeadingContent(content: string, headingText: string): HeadingContent | null {
  const heading = findHeading(content, headingText);
  if (!heading) {
    return null;
  }

  const lines = content.split('\n');
  const contentLines: string[] = [];
  let includesNested = false;

  // Start from the line after the heading
  for (let i = heading.line + 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      const level = match[1].length;

      // Stop if we hit a heading of same or higher level
      if (level <= heading.level) {
        break;
      }

      // Include nested headings
      includesNested = true;
    }

    contentLines.push(line);
  }

  return {
    heading,
    content: contentLines.join('\n'),
    includesNested,
  };
}

/**
 * Get heading hierarchy for a note (tree structure)
 * @param content - The markdown content
 * @returns Array of heading hierarchies
 */
export interface HeadingNode extends HeadingInfo {
  children: HeadingNode[];
}

export function getHeadingHierarchy(content: string): HeadingNode[] {
  const headings = findAllHeadings(content);
  const root: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const heading of headings) {
    const node: HeadingNode = { ...heading, children: [] };

    // Pop stack until we find the parent (lower level)
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level heading
      root.push(node);
    } else {
      // Child of current parent
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}

/**
 * Search for headings by text (fuzzy search)
 * @param content - The markdown content
 * @param query - The search query
 * @returns Array of matching headings
 */
export function searchHeadings(content: string, query: string): HeadingInfo[] {
  const headings = findAllHeadings(content);
  const lowerQuery = query.toLowerCase();

  return headings.filter((h) => h.text.toLowerCase().includes(lowerQuery));
}

/**
 * Cache for heading lookups
 */
class HeadingCache {
  private cache = new Map<string, HeadingInfo[]>();
  private contentCache = new Map<string, string>();
  private headingContentCache = new Map<string, { content: string; headingLevel: number } | null>();

  set(filePath: string, content: string) {
    this.contentCache.set(filePath, content);
    this.cache.set(filePath, findAllHeadings(content));
  }

  get(filePath: string): HeadingInfo[] | null {
    return this.cache.get(filePath) || null;
  }

  find(filePath: string, headingText: string): HeadingInfo | null {
    const headings = this.cache.get(filePath);
    if (!headings) return null;

    return headings.find((h) => h.text === headingText) || null;
  }

  /**
   * Get cached heading content result
   * Returns null if not found or not cached
   */
  getHeadingContent(filePath: string, headingText: string): { content: string; headingLevel: number } | null {
    const key = `${filePath}::${headingText}`;
    return this.headingContentCache.get(key) || null;
  }

  /**
   * Cache heading content result
   */
  setHeadingContent(filePath: string, headingText: string, result: { content: string; headingLevel: number } | null) {
    const key = `${filePath}::${headingText}`;
    this.headingContentCache.set(key, result);
  }

  hasContent(filePath: string, content: string): boolean {
    const cached = this.contentCache.get(filePath);
    return cached === content;
  }

  clear(filePath: string) {
    this.cache.delete(filePath);
    this.contentCache.delete(filePath);
    // Clear heading content cache for this file
    for (const key of this.headingContentCache.keys()) {
      if (key.startsWith(filePath + '::')) {
        this.headingContentCache.delete(key);
      }
    }
  }

  clearAll() {
    this.cache.clear();
    this.contentCache.clear();
    this.headingContentCache.clear();
  }
}

export const headingCache = new HeadingCache();
