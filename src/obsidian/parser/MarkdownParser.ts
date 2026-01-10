// =============================================================================
// MarkdownParser - Parse Markdown Content and Extract Metadata
// =============================================================================

import {
  CachedMetadata,
  Pos,
  FrontMatterCache,
} from '../types';

export class MarkdownParser {
  /**
   * Parse markdown content and extract all metadata
   */
  parse(content: string, _filePath: string): CachedMetadata {
    const metadata: CachedMetadata = {};
    const lines = content.split('\n');

    // Extract frontmatter (YAML between --- ... ---)
    const frontmatterResult = this.extractFrontmatter(lines);
    if (frontmatterResult) {
      metadata.frontmatter = frontmatterResult.data;
      metadata.frontmatterPosition = frontmatterResult.position;
    }

    // Parse each line for markdown elements
    let inCodeBlock = false;
    let inFrontmatter = false;

    for (let lineOffset = 0; lineOffset < lines.length; lineOffset++) {
      const line = lines[lineOffset];
      const trimmedLine = line.trim();

      // Skip frontmatter
      if (lineOffset === 0 && trimmedLine === '---') {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter && trimmedLine === '---') {
        inFrontmatter = false;
        continue;
      }
      if (inFrontmatter) continue;

      // Track code blocks
      if (trimmedLine.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      // Parse inline fields (Key:: value)
      const inlineFieldMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)::\s*(.+)$/);
      if (inlineFieldMatch) {
        metadata.frontmatter = metadata.frontmatter || {};
        const key = inlineFieldMatch[1];
        const value = inlineFieldMatch[2].trim();
        // Store inline fields in frontmatter
        metadata.frontmatter[key] = value;
      }

      // Calculate position for this line
      const getOffset = () => {
        let offset = 0;
        for (let i = 0; i < lineOffset; i++) {
          offset += lines[i].length + 1; // +1 for newline
        }
        return offset;
      };

      const createPos = (colStart: number, colEnd: number): Pos => ({
        start: { line: lineOffset, col: colStart, offset: getOffset() + colStart },
        end: { line: lineOffset, col: colEnd, offset: getOffset() + colEnd },
      });

      // Check for heading (# ...)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        metadata.headings = metadata.headings || [];
        metadata.headings.push({
          position: createPos(0, line.length),
          heading: headingMatch[2],
          level: headingMatch[1].length,
        });
      }

      // Check for wikilinks [[...]]
      const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      let wikilinkMatch;
      while ((wikilinkMatch = wikilinkRegex.exec(line)) !== null) {
        metadata.links = metadata.links || [];
        metadata.links.push({
          position: createPos(wikilinkMatch.index, wikilinkMatch.index + wikilinkMatch[0].length),
          link: wikilinkMatch[1],
          original: wikilinkMatch[0],
          displayText: wikilinkMatch[2],
        });
      }

      // Check for embeds ![[...]]
      const embedRegex = /!\[\[([^\]]+)\]\]/g;
      let embedMatch;
      while ((embedMatch = embedRegex.exec(line)) !== null) {
        metadata.embeds = metadata.embeds || [];
        metadata.embeds.push({
          position: createPos(embedMatch.index, embedMatch.index + embedMatch[0].length),
          link: embedMatch[1],
          original: embedMatch[0],
        });
      }

      // Check for tags #tag (but not in code or URLs)
      const tagRegex = /(?<!\w)#([a-zA-Z0-9_\-\/]+)/g;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(line)) !== null) {
        metadata.tags = metadata.tags || [];
        metadata.tags.push({
          position: createPos(tagMatch.index, tagMatch.index + tagMatch[0].length),
          tag: '#' + tagMatch[1], // Include the # prefix for compatibility
        });
      }

      // Check for block IDs ^blockid at end of line
      const blockMatch = line.match(/\^([a-zA-Z0-9\-]+)$/);
      if (blockMatch) {
        metadata.blocks = metadata.blocks || {};
        const blockId = blockMatch[1];
        const blockIndex = line.lastIndexOf('^');
        metadata.blocks[blockId] = {
          position: createPos(blockIndex, line.length),
          id: blockId,
        };
      }

      // Check for list items with task markers
      const taskMatch = line.match(/^[\s\t]*(?:[-*+]|\d+\.)\s+\[([ x])\]\s*(.*)$/i);
      if (taskMatch) {
        metadata.listItems = metadata.listItems || [];
        metadata.listItems.push({
          position: createPos(0, line.length),
          task: taskMatch[1].toLowerCase() === 'x' ? ' ' : 'x', // Invert: space = done, x = todo
        });
      }
    }

    return metadata;
  }

  /**
   * Extract YAML frontmatter from markdown
   */
  private extractFrontmatter(lines: string[]): { data: FrontMatterCache; position: Pos } | null {
    if (lines.length < 2 || lines[0].trim() !== '---') {
      return null;
    }

    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIdx = i;
        break;
      }
    }

    if (endIdx === -1) {
      return null;
    }

    // Extract YAML content
    const yamlLines = lines.slice(1, endIdx);

    // Simple YAML parser (key: value pairs)
    const data: FrontMatterCache = {};
    for (const line of yamlLines) {
      const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.+)$/);
      if (match) {
        const key = match[1];
        const value = match[2].trim();

        // Try to parse as JSON for arrays and objects
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            // Try direct JSON parse first
            data[key] = JSON.parse(value);
          } catch {
            try {
              // Try to convert YAML array to JSON by quoting unquoted values
              // Convert [tag1, tag2] to ["tag1", "tag2"]
              const content = value.slice(1, -1); // Remove brackets
              const items = content.split(',').map((item) => item.trim());
              // Quote items that aren't already quoted or numbers
              const quoted = items.map((item) => {
                if ((item.startsWith('"') && item.endsWith('"')) ||
                    (item.startsWith("'") && item.endsWith("'")) ||
                    !isNaN(Number(item))) {
                  return item;
                }
                return `"${item}"`;
              });
              data[key] = JSON.parse(`[${quoted.join(',')}]`);
            } catch {
              data[key] = value;
            }
          }
        } else if (value.startsWith('{') && value.endsWith('}')) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        } else if (value.toLowerCase() === 'true') {
          data[key] = true;
        } else if (value.toLowerCase() === 'false') {
          data[key] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          data[key] = Number(value);
        } else {
          data[key] = value;
        }
      }
    }

    // Calculate position
    let offset = 0;
    for (let i = 0; i < endIdx + 1; i++) {
      offset += lines[i].length + 1;
    }

    return {
      data,
      position: {
        start: { line: 0, col: 0, offset: 0 },
        end: { line: endIdx, col: lines[endIdx].length, offset },
      },
    };
  }
}
